const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  category: {
    type: String,
    enum: ["Parking Full", "Wrong Location", "Unsafe Area", "Host Unresponsive", "Other"],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["open", "resolved"],
    default: "open"
  },
  adminNotes: {
    type: String
  },
  resolvedAt: {
    type: Date
  }
}, { timestamps: true });

issueSchema.index({ bookingId: 1 });
issueSchema.index({ userId: 1 });
issueSchema.index({ status: 1 });

module.exports = mongoose.model("Issue", issueSchema);
