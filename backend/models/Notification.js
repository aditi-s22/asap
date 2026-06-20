const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      "booking_confirmed", "reminder", "cancellation", "payment_success", "host_alert",
      "host_approved", "listing_approved", "refund_approved", "refund_rejected",
      "review_reminder", "upcoming_booking_reminder", "check_in_reminder"
    ],
    default: "booking_confirmed"
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
