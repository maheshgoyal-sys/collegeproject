const mongoose = require('mongoose');



const contactSchema = new mongoose.Schema({
    name: String,
  mobile: String,  // Use String to avoid number issues with leading 0
  email: String,
  subject: String,
  message: String
});

module.exports = mongoose.model('Contact', contactSchema);