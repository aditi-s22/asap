const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  parkingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Parking",
    required: true
  },

  startTime: {
    type: Date,
    required: true
  },

  endTime: {
    type: Date,
    required: true
  },

  totalPrice: {
    type: Number
  },

  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending"
  },

  status: {
    type: String,
    enum: ["pending", "paid", "checked_in", "active", "completed", "cancelled", "refund_pending", "refunded"],
    default: "pending"
  },

  qrToken: {
    type: String,
    unique: true,
    sparse: true
  },

  qrCode: {
    type: String
  },

  directionsLink: {
    type: String
  },
  reviewed: {
    type: Boolean,
    default: false
  },

  razorpayOrderId: {
    type: String
  },

  checkedIn: {
    type: Boolean,
    default: false
  },

  checkedInAt: {
    type: Date
  },

  checkInTime: {
    type: Date
  },

  checkOutTime: {
    type: Date
  },

  refundReason: {
    type: String
  },

  refundAdminNotes: {
    type: String
  },

  refundResolutionDate: {
    type: Date
  }

}, { timestamps: true });

bookingSchema.index({ parkingId: 1, startTime: 1, endTime: 1, status: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);