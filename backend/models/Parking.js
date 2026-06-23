const mongoose = require("mongoose");

const parkingSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  address: {
    type: String,
    required: true
  },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },

    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },

  pricePerHour: {
    type: Number,
    required: true
  },

  vehicleType: {
    type: String,
    enum: ["car", "bike", "rv"],
    default: "car"
  },

  availableSlots: {
    type: Number,
    default: 1
  },

  totalSlots: {
    type: Number,
    default: 1
  },

  slots: {
    type: Number,
    default: 1
  },

  rating: {
    type: Number,
    default: 0
  },

  reviewCount: {
    type: Number,
    default: 0
  },

  totalBookings: {
    type: Number,
    default: 0
  },

  discountPercentage: {
    type: Number,
    default: 0
  },

  startTime: {
    type: String, // "08:00"
    default: "00:00"
  },

  endTime: {
    type: String, // "22:00"
    default: "23:59"
  },

  images: {
    type: [{
      url: {
        type: String,
        required: true
      },
      public_id: {
        type: String,
        required: true
      }
    }],
    validate: {
      validator: (v) => Array.isArray(v) && v.length > 0,
      message: "At least one parking image is required"
    }
  },

  rejectionReason: {
    type: String,
    default: null
  },

  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  isActive: {
    type: Boolean,
    default: false
  },

  isApproved: {
    type: Boolean,
    default: false
  },

  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "approved", "rejected"],
    default: "pending"
  },

  reports: {
    type: Number,
    default: 0
  },

  reportedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }]

}, { timestamps: true });

parkingSchema.index({ location: "2dsphere" });
parkingSchema.index({ hostId: 1 });

module.exports = mongoose.model("Parking", parkingSchema);