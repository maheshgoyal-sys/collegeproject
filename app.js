require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose'); // Mongoose for MongoDB interaction
const bcrypt = require('bcrypt');
const College = require('./models/maincollege'); // Import the College model
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// --- MongoDB Connection ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit process if database connection fails
    });

// --- Middleware ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(cookieParser());
// --- Routes ---
const userModel = require('./models/register');
const browsecollege = require('./models/browsecollege');
const mainCollege = require('./models/maincollege');
const Contact = require('./models/contact');
// GET route for the home page (displays the form)
const auth = (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            req.isAuthenticated = false;
            req.user = null;
            return next(); // Proceed without authentication
        }

        jwt.verify(token, "swfwcfwc", (err, decoded) => {
            if (err) {
                req.isAuthenticated = false;
                req.user = null;
                res.clearCookie('token'); // Clear invalid token
                return next();
            }
            req.isAuthenticated = true;
            req.user = decoded; // Decoded should contain { email: 'user@example.com' }
            next();
        });
    } catch (err) {
        req.isAuthenticated = false;
        req.user = null;
        res.clearCookie('token');
        next();
    }
};
app.get('/', auth, (req, res) => {
    res.render('index', {
        isAuthenticated: req.isAuthenticated,
        userName: req.user ? req.user.email : null,
        predictionResult: null,
        inputData: null,
        errors: null
    });
});
app.get('/about', auth, function(req, res) {
    res.render('about', { isAuthenticated: req.isAuthenticated, userName: req.user ? req.user.email : null });
});
app.get('/contact', auth, function(req, res) {
    res.render('contact', { isAuthenticated: req.isAuthenticated, userName: req.user ? req.user.email : null });
});
app.get('/privacy-policy', auth, function(req, res) {
    res.render('privacy-policy', { isAuthenticated: req.isAuthenticated, userName: req.user ? req.user.email : null });
});
app.get('/terms-and-conditions', auth, function(req, res) {
    res.render('terms-and-conditions', { isAuthenticated: req.isAuthenticated, userName: req.user ? req.user.email : null });
});
app.get('/predict', auth, function(req, res) {
    if (!req.isAuthenticated) {
        return res.redirect('/login');
    }

    res.render('predict', {
        isAuthenticated: req.isAuthenticated,
        userName: req.user ? req.user.email : null,
        inputData: {},                // ✅ Always provide this
        errors: [],                   // ✅ For validation messages
        predictionResult: null        // ✅ For displaying results
    });
});

app.get('/colleges/read',async (req,res)=>{
  const name = req.query.name;

  try {
    const college = await browsecollege.findOne({ name: name });

    if (!college) {
      return res.status(404).send("College not found");
    }

        res.render('readColleges', { college, isAuthenticated: req.isAuthenticated, userName: req.user ? req.user.email : null });
   
  } catch (err) {
    console.error("❌ Error fetching college details:", err);
    res.status(500).send("Server Error");
  }
})
app.get('/register',(req,res)=>{
    res.render("register", { isAuthenticated: req.isAuthenticated, userName: req.user ? req.user.email : null });
 
})
app.post('/register', (req,res)=>{
    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(req.body.password,salt,async (err,hash)=>{
        let createdUser = await userModel.create({
    name: req.body.name,
    email: req.body.email,
    password: hash
});
    let token = jwt.sign({email : req.body.email},"swfwcfwc");
    res.cookie("token",token);
    //ek ack user created
    res.redirect("predict");
        })
    })
   
});
app.post('/colleges/read', async (req, res) => {
  const name = req.body.name?.trim();

  try {
    const colleges = await browsecollege.find({
      name: { $regex: name, $options: 'i' }
    });

    // Add fileName field for image lookup
    const updatedColleges = colleges.map(college => {
      // Log full college object
      console.log("Full college object:", college);

      // Extract name safely
      const resolvedName = college.name || (college._doc && college._doc.name);

      console.log("Resolved name:", resolvedName);

      return {
        ...college.toObject(),
        fileName: resolvedName
          ? resolvedName.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '')
          : 'default'
      };
    });

        res.render('readColleges', { colleges: updatedColleges, isAuthenticated: req.isAuthenticated, userName: req.user ? req.user.email : null });

  } catch (error) {
    console.error("❌ Error fetching colleges:", error.message);
    res.render('readColleges', { colleges: [] });
  }
});
// POST route to handle form submission and predict colleges
app.post('/predict', async (req, res) => {
    const {
        crlRank,
        category,
        categoryRank,
        homeStateStatus,
        homeState,
        gender,
        counsellingType,
        pwdStatus,
        pwdRank
    } = req.body;

    // --- Input Validation ---
    const errors = [];

    if (!crlRank || isNaN(parseInt(crlRank))) {
        errors.push('CRL Rank is required and must be a number.');
    }
    if (category !== 'GEN' && (!categoryRank || isNaN(parseInt(categoryRank)))) {
        errors.push('Category Rank is required for non-General categories.');
    }
    if (pwdStatus === 'yes' && (!pwdRank || isNaN(parseInt(pwdRank)))) {
        errors.push('PwD Rank is required if PwD status is Yes.');
    }
    if (!category) errors.push('Category is required.');
    if (!homeStateStatus) errors.push('Home State Status is required.');
    if (homeStateStatus === 'yes' && !homeState) {
        errors.push('Please select your Home State.');
    }
    if (!gender) errors.push('Gender is required.');
    if (!counsellingType) errors.push('Counselling Type is required.');

    if (errors.length > 0) {
        return res.render('index', {
            predictionResult: null,
            inputData: req.body,
            errors: errors
        });
    }

    // --- Parsing input ---
    const userCRL = parseInt(crlRank);
    const userCategoryRank = category !== 'GEN' ? parseInt(categoryRank) : null;
    const userPwdRank = pwdStatus === 'yes' ? parseInt(pwdRank) : null;
    const year = '2024'; // You can later make this dynamic

    let predictedColleges = [];

    try {
        const colleges = await College.find({}); // Get all colleges

        colleges.forEach(college => {
            let quotaBlock = null;

            // Determine quota type: HS or OS
            if (homeStateStatus === 'yes' && college.quotas?.HS?.[homeState]) {
                quotaBlock = college.quotas.HS[homeState];
            } else if (college.quotas?.OS) {
                quotaBlock = college.quotas.OS;
            }

            if (!quotaBlock) return;

            const categoryBlock = quotaBlock[category];
            if (!categoryBlock) return;

            // Gender handling
            let seatData = categoryBlock.genderNeutral;
            if (gender.toLowerCase() === 'female' && categoryBlock.femaleOnly) {
                seatData = categoryBlock.femaleOnly;
            }

            if (!seatData?.[year]) return;

            const { openingRank, closingRank } = seatData[year];

            let isEligible = false;

            // CRL check
            if (userCRL <= closingRank) isEligible = true;

            // Category rank check
            if (category !== 'GEN' && userCategoryRank && userCategoryRank <= closingRank) {
                isEligible = true;
            }

            // PwD check
            if (
                pwdStatus === 'yes' &&
                quotaBlock?.PwD?.[category]?.genderNeutral?.[year]?.closingRank
            ) {
                const pwdClose = quotaBlock.PwD[category].genderNeutral[year].closingRank;
                if (userPwdRank <= pwdClose) {
                    isEligible = true;
                }
            }

            // Add college to prediction if eligible
            if (isEligible) {
                predictedColleges.push({
                    instituteName: college.instituteName,
                    branch: college.branch,
                    closingRank: closingRank,
                    counsellingType: counsellingType
                });
            }
        });

        // Sort by closing rank
        predictedColleges.sort((a, b) => a.closingRank - b.closingRank);

        res.render('predict', {
            predictionResult: predictedColleges.length > 0 ? predictedColleges : 'No colleges found for your criteria.',
            inputData: req.body,
            errors: null,
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    userName: req.user ? req.user.email : null
        });

    } catch (err) {
        console.error('Prediction error:', err);
        res.render('index', {
            predictionResult: null,
            inputData: req.body,
            errors: ['Server error. Please try again later'],
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    userName: req.user ? req.user.email : null
        });
    }
});

app.get('/login',(req,res)=>{
    res.render("login", { isAuthenticated: req.isAuthenticated, userName: req.user ? req.user.email : null });
  
});
app.post('/login',async (req,res)=>{
    let user = await userModel.findOne({email : req.body.email});
    if(!user) return res.send("Something is wrong");

    bcrypt.compare(req.body.password,user.password,(err,result)=>{
        if(result){
          let token = jwt.sign({ email: user.email }, "swfwcfwc");
                res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' }); 
        res.redirect("/predict");
        }
        else
        res.send("Something went wrong");
    })
});
app.get('/logout', (req, res) => {
    res.clearCookie('token'); // Clear the authentication token cookie
    res.redirect('/'); // Redirect to the home page or login page
});
app.get('/contact',(req,res)=>{
  res.render("contact");
})
app.post('/contact', async (req, res) => {
  try {
    const { name, mobile, email, subject, message } = req.body;

    const newMessage = new Contact({
      name,
      mobile,
      email,
      subject,
      message
    });

    await newMessage.save();

    res.send(`
      <script>
        alert("✅ Your message has been saved to the database!");
        window.location.href = "/contact";
      </script>
    `);
  } catch (err) {
    console.error("❌ Error saving message:", err);
    res.send(`
      <script>
        alert("❌ Error saving message to database.");
        window.location.href = "/contact";
      </script>
    `);
  }
});
// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});