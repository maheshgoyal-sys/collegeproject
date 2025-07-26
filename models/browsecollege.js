const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: String,
  state: String,
  type: String,
  university: String,
  isAutonomous: Boolean,
});


module.exports = mongoose.model('browsecollege', collegeSchema);