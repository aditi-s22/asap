const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: "Verified User"
  },
  rating: {
    type: Number,
    required: true
  },
  comment: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model("Testimonial", testimonialSchema);
