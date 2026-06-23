const User = require("../models/User");
const Parking = require("../models/Parking");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Notification = require("../models/Notification");

// GET ADMIN METRICS
exports.getAdminMetrics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalSpots = await Parking.countDocuments();
    const activeSpots = await Parking.countDocuments({ isApproved: true });
    
    // Top operational metrics
    const pendingHostApprovals = await User.countDocuments({ verifiedHost: "pending" });
    const pendingListingApprovals = await Parking.countDocuments({ isApproved: false, verificationStatus: "pending" });
    const openRefundRequests = await Payment.countDocuments({ status: "refund_pending" });
    const reportedListings = await Parking.countDocuments({ reports: { $gt: 0 } });

    // Aggregate total earnings
    const payments = await Payment.find({ status: "captured" });
    const totalEarnings = payments.reduce((sum, pay) => sum + pay.amount, 0);

    // Secondary metrics
    const activeUsers = await User.countDocuments({ isActive: true });
    const activeHosts = await User.countDocuments({ role: "host", verifiedHost: "verified" });

    res.json({
      pendingHostApprovals,
      pendingListingApprovals,
      openRefundRequests,
      reportedListings,
      totalEarnings,
      totalUsers,
      totalBookings,
      totalSpots,
      pendingApprovals: pendingListingApprovals, // backward compatibility
      activeSpots,
      activeUsers,
      activeHosts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL USERS
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// TOGGLE USER STATUS (BAN/UNBAN)
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Do not allow banning self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot ban yourself" });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User account has been ${user.isActive ? "activated" : "deactivated"}`,
      user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET PENDING AND REPORTED LISTINGS
exports.getAdminListings = async (req, res) => {
  try {
    const pendingListings = await Parking.find({ isApproved: false, verificationStatus: "pending" }).populate("hostId", "name email");
    const reportedListings = await Parking.find({ reports: { $gt: 0 } }).populate("hostId", "name email");
    
    const mapListing = (spot) => {
      const s = spot.toObject();
      s.host = s.hostId;
      return s;
    };

    res.json({ 
      pending: pendingListings.map(mapListing), 
      reported: reportedListings.map(mapListing) 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// APPROVE LISTING
exports.approveParkingListing = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id);
    if (!parking) {
      return res.status(404).json({ message: "Parking spot not found" });
    }

    parking.isApproved = true;
    parking.verificationStatus = "approved";
    parking.isActive = true;
    parking.rejectionReason = null;
    await parking.save();

    console.log(`[Listing Approved] ID: ${parking._id} | Title: "${parking.title}" | Host: ${parking.hostId}`);

    res.json({ message: "Parking spot listing approved successfully", parking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE LISTING
exports.deleteParkingListing = async (req, res) => {
  try {
    const parking = await Parking.findByIdAndDelete(req.params.id);
    if (!parking) {
      return res.status(404).json({ message: "Parking spot not found" });
    }
    res.json({ message: "Parking spot listing deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL PAYMENTS
exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate({
        path: "bookingId",
        populate: [
          { path: "userId", select: "name email" },
          { path: "parkingId", select: "title address" }
        ]
      })
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET PENDING HOST VERIFICATIONS
exports.getPendingHosts = async (req, res) => {
  try {
    const hosts = await User.find({ verifiedHost: "pending" }).select("-password").sort({ updatedAt: -1 });
    res.json(hosts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// VERIFY HOST (APPROVE OR REJECT)
exports.verifyHost = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "verified" or "rejected"

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be verified or rejected" });
    }

    const host = await User.findById(id);
    if (!host) {
      return res.status(404).json({ message: "User not found" });
    }

    host.verifiedHost = status;
    if (status === "verified") {
      host.role = "host";
      // Host approval DOES NOT auto-approve listings. Each listing requires separate moderation.
    } else {
      // Reject listings of this host
      await Parking.updateMany(
        { hostId: host._id },
        { isApproved: false, verificationStatus: "rejected" }
      );
    }

    await host.save();

    // Create host notification
    await Notification.create({
      userId: host._id,
      title: status === "verified" ? "Host Verification Approved!" : "Host Application Rejected",
      message: status === "verified"
        ? "Congratulations! Your host verification has been approved. You can now list and manage your parking spaces."
        : "Your application was rejected. Please verify your government ID and address proof details and submit again.",
      type: status === "verified" ? "host_alert" : "cancellation"
    });

    res.json({
      message: `Host status has been updated to ${status}`,
      host: {
        _id: host._id,
        name: host.name,
        email: host.email,
        phone: host.phone,
        role: host.role,
        verifiedHost: host.verifiedHost
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// REJECT PARKING LISTING
exports.rejectParkingListing = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id);
    if (!parking) {
      return res.status(404).json({ message: "Parking spot not found" });
    }

    const { reason } = req.body;

    parking.isApproved = false;
    parking.verificationStatus = "rejected";
    parking.isActive = false;
    parking.rejectionReason = reason || null;
    await parking.save();

    console.log(`[Listing Rejected] ID: ${parking._id} | Title: "${parking.title}" | Host: ${parking.hostId} | Reason: ${reason || "none given"}`);

    // Notify Host
    await Notification.create({
      userId: parking.hostId,
      title: "Parking Listing Rejected",
      message: reason
        ? `Your parking listing for "${parking.title}" has been rejected. Reason: ${reason}. You can edit your listing and resubmit it for review.`
        : `Your parking listing for "${parking.title}" has been rejected. Please review coordinates, address, and pricing before re-submitting.`,
      type: "host_alert"
    });

    res.json({ message: "Parking spot listing rejected successfully", parking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// SUSPEND LISTING
exports.suspendParkingListing = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id);
    if (!parking) {
      return res.status(404).json({ message: "Parking spot not found" });
    }

    parking.isActive = false;
    await parking.save();

    // Notify Host
    await Notification.create({
      userId: parking.hostId,
      title: "Listing Suspended",
      message: `Your listing for "${parking.title}" has been suspended due to trust and safety policy reviews.`,
      type: "host_alert"
    });

    res.json({ message: "Listing suspended successfully", parking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UNSUSPEND LISTING
exports.unsuspendParkingListing = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id);
    if (!parking) {
      return res.status(404).json({ message: "Parking spot not found" });
    }

    parking.isActive = true;
    await parking.save();

    // Notify Host
    await Notification.create({
      userId: parking.hostId,
      title: "Listing Suspension Lifted",
      message: `Your listing for "${parking.title}" has been reactivated and is now visible to drivers.`,
      type: "host_alert"
    });

    res.json({ message: "Listing suspension lifted successfully", parking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET DISPUTES (Refund requests and reported listings)
exports.getDisputes = async (req, res) => {
  try {
    // Find refund pending payments
    const refundRequests = await Payment.find({ status: "refund_pending" })
      .populate({
        path: "bookingId",
        populate: { path: "userId", select: "name email phone" }
      });

    // Find reported listings
    const reportedListings = await Parking.find({ reports: { $gt: 0 } })
      .populate("hostId", "name email");

    res.json({
      refundRequests,
      reportedListings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// RESOLVE REFUND REQUEST
exports.resolveRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminNotes } = req.body; // "approve" or "reject", adminNotes

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be approve or reject" });
    }

    const payment = await Payment.findById(id).populate("bookingId");
    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    const booking = payment.bookingId;

    if (action === "approve") {
      payment.status = "refunded";
      await payment.save();

      if (booking) {
        booking.status = "refunded";
        booking.refundAdminNotes = adminNotes || "Approved by Admin";
        booking.refundResolutionDate = new Date();
        await booking.save();

        // Resolve open tickets for this booking
        const Issue = require("../models/Issue");
        await Issue.updateMany(
          { bookingId: booking._id, status: "open" },
          { status: "resolved", adminNotes: adminNotes || "Approved refund", resolvedAt: new Date() }
        );

        // Notify Driver
        await Notification.create({
          userId: booking.userId,
          title: "Refund Approved 💳",
          message: `Your refund of ₹${payment.amount} has been approved and processed. Admin notes: ${adminNotes || 'None'}.`,
          type: "refund_approved"
        });

        // Socket emit
        const io = req.app.get("io");
        if (io) {
          io.to(booking.userId.toString()).emit("notification", {
            title: "Refund Approved 💳",
            message: `Your refund of ₹${payment.amount} has been approved.`
          });
        }
      }
    } else {
      // Revert status to captured (no refund)
      payment.status = "captured";
      await payment.save();

      if (booking) {
        booking.status = "paid"; // Revert to paid/active status
        booking.refundAdminNotes = adminNotes || "Rejected by Admin";
        booking.refundResolutionDate = new Date();
        await booking.save();

        // Close open tickets
        const Issue = require("../models/Issue");
        await Issue.updateMany(
          { bookingId: booking._id, status: "open" },
          { status: "resolved", adminNotes: adminNotes || "Rejected refund", resolvedAt: new Date() }
        );

        // Notify Driver
        await Notification.create({
          userId: booking.userId,
          title: "Refund Request Rejected ❌",
          message: `Your refund request has been rejected. Admin notes: ${adminNotes || 'None'}.`,
          type: "refund_rejected"
        });

        // Socket emit
        const io = req.app.get("io");
        if (io) {
          io.to(booking.userId.toString()).emit("notification", {
            title: "Refund Request Rejected ❌",
            message: `Your refund request of ₹${payment.amount} was rejected.`
          });
        }
      }
    }

    res.json({ message: `Refund request has been ${action}d`, payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET PLATFORM ACTIVITIES
exports.getPlatformActivities = async (req, res) => {
  try {
    const activities = [];

    // 1. Host Applications / Approvals
    const hostUsers = await User.find({ verifiedHost: { $ne: "none" } })
      .sort({ updatedAt: -1 })
      .limit(10);
    
    for (const u of hostUsers) {
      if (u.verifiedHost === "pending") {
        activities.push({
          type: "host_applied",
          message: `Host Application Submitted by ${u.name}`,
          timestamp: u.updatedAt
        });
      } else if (u.verifiedHost === "verified") {
        activities.push({
          type: "host_approved",
          message: `Host Account Approved: ${u.name}`,
          timestamp: u.updatedAt
        });
      } else if (u.verifiedHost === "rejected") {
        activities.push({
          type: "host_rejected",
          message: `Host Account Rejected: ${u.name}`,
          timestamp: u.updatedAt
        });
      }
    }

    // 2. Parking Listings Created
    const parkings = await Parking.find()
      .sort({ createdAt: -1 })
      .limit(15);
    
    for (const p of parkings) {
      activities.push({
        type: "listing_created",
        message: `Listing Created: "${p.title}" at ${p.address}`,
        timestamp: p.createdAt
      });

      if (p.isApproved) {
        activities.push({
          type: "listing_approved",
          message: `Listing Approved: "${p.title}"`,
          timestamp: p.updatedAt
        });
      }
    }

    // 3. Bookings Completed
    const bookings = await Booking.find()
      .populate("userId", "name")
      .sort({ updatedAt: -1 })
      .limit(15);
    
    for (const b of bookings) {
      if (b.status === "completed") {
        activities.push({
          type: "booking_completed",
          message: `Booking Completed: Driver ${b.userId?.name || "User"} checked out successfully`,
          timestamp: b.updatedAt
        });
      }
    }

    // 4. Refund Requests
    const refundPayments = await Payment.find({ status: { $in: ["refund_pending", "refunded"] } })
      .populate({ path: "bookingId", populate: { path: "userId" } })
      .sort({ updatedAt: -1 })
      .limit(10);
    
    for (const pay of refundPayments) {
      if (pay.status === "refund_pending") {
        activities.push({
          type: "refund_requested",
          message: `Refund Requested: ₹${pay.amount} for Booking ID ${pay.bookingId?._id}`,
          timestamp: pay.updatedAt
        });
      } else if (pay.status === "refunded") {
        activities.push({
          type: "refund_approved",
          message: `Refund Approved: ₹${pay.amount} for Booking ID ${pay.bookingId?._id}`,
          timestamp: pay.updatedAt
        });
      }
    }

    // 5. Reviews
    const Review = require("../models/Review");
    const reviews = await Review.find()
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .limit(10);
    
    for (const r of reviews) {
      activities.push({
        type: "review_submitted",
        message: `Review Submitted: Driver ${r.userId?.name || "User"} rated spot ${r.rating}⭐`,
        timestamp: r.createdAt
      });
    }

    // Sort chronologically
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities.slice(0, 15));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL TICKETS FOR ADMIN
exports.getTickets = async (req, res) => {
  try {
    const Issue = require("../models/Issue");
    const tickets = await Issue.find()
      .populate("userId", "name email phone")
      .populate({
        path: "bookingId",
        populate: { path: "parkingId" }
      })
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE TICKET FOR ADMIN (admin notes, resolved)
exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const Issue = require("../models/Issue");
    const ticket = await Issue.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (status !== undefined) ticket.status = status;
    if (adminNotes !== undefined) ticket.adminNotes = adminNotes;
    if (status === "resolved") ticket.resolvedAt = new Date();

    await ticket.save();
    res.json({ message: "Ticket updated successfully", ticket });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET SYSTEM HEALTH
exports.getSystemHealth = async (req, res) => {
  try {
    const User = require("../models/User");
    const Booking = require("../models/Booking");
    const mongoose = require("mongoose");

    const activeUsers = await User.countDocuments({ isActive: true });
    const activeHosts = await User.countDocuments({ role: "host", verifiedHost: "verified" });
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const bookingsToday = await Booking.countDocuments({ createdAt: { $gte: startOfToday } });
    
    // Configurations Check
    const configChecks = {
      firebase: Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY),
      cloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      googleMaps: Boolean(process.env.VITE_GOOGLE_MAPS_API_KEY && process.env.VITE_GOOGLE_MAPS_API_KEY !== "YOUR_GOOGLE_MAPS_API_KEY")
    };

    res.json({
      activeUsers,
      activeHosts,
      bookingsToday,
      uptime: process.uptime(),
      dbConnected: mongoose.connection.readyState === 1,
      configChecks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// SEED DEMO DATA (One-Click Production-Safe Seeding)
exports.seedDemoData = async (req, res) => {
  try {
    const User = require("../models/User");
    const Parking = require("../models/Parking");
    const Booking = require("../models/Booking");
    const Review = require("../models/Review");
    const Testimonial = require("../models/Testimonial");

    console.log("[Seeder] Executing one-click demo data seeding...");

    // 1. Create or get basic users
    let hostUser = await User.findOne({ email: "host@asap.io" });
    if (!hostUser) {
      hostUser = await User.create({
        name: "Aditi Host",
        email: "host@asap.io",
        role: "host",
        phone: "+91 99999 88888",
        verifiedHost: "verified",
        phoneVerified: true,
        emailVerified: true
      });
    }

    let driverUser = await User.findOne({ email: "driver@asap.io" });
    if (!driverUser) {
      driverUser = await User.create({
        name: "Rahul Driver",
        email: "driver@asap.io",
        role: "driver",
        phone: "+91 99999 77777",
        phoneVerified: true,
        emailVerified: true
      });
    }

    let adminUser = await User.findOne({ email: "admin@asap.io" });
    if (!adminUser) {
      await User.create({
        name: "ASAP Admin",
        email: "admin@asap.io",
        role: "admin",
        phone: "+91 99999 66666",
        phoneVerified: true,
        emailVerified: true
      });
    }

    // 2. Seed parking spots if none exist
    const parkingCount = await Parking.countDocuments();
    let seededSpot;
    if (parkingCount === 0) {
      seededSpot = await Parking.create({
        title: "Premium BKC Garage Hub",
        address: "Bandra Kurla Complex, Mumbai, Maharashtra",
        location: { type: "Point", coordinates: [72.8634, 19.0607] },
        pricePerHour: 100,
        vehicleType: "car",
        availableSlots: 8,
        totalSlots: 10,
        slots: 10,
        rating: 4.8,
        totalBookings: 24,
        hostId: hostUser._id,
        startTime: "00:00",
        endTime: "23:59",
        isApproved: true,
        verificationStatus: "approved",
        isActive: true,
        images: [{
          url: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80",
          public_id: "seed_bkc_premium"
        }]
      });
      await Parking.create({
        title: "IIT Powai Security Lot",
        address: "IIT Bombay, Powai, Mumbai, Maharashtra",
        location: { type: "Point", coordinates: [72.9135, 19.1334] },
        pricePerHour: 60,
        vehicleType: "car",
        availableSlots: 4,
        totalSlots: 5,
        slots: 5,
        rating: 4.5,
        totalBookings: 12,
        hostId: hostUser._id,
        startTime: "08:00",
        endTime: "22:00",
        isApproved: true,
        verificationStatus: "approved",
        isActive: true,
        images: [{
          url: "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=600&q=80",
          public_id: "seed_powai_lot"
        }]
      });
    } else {
      seededSpot = await Parking.findOne();
    }

    // 3. Seed testimonials if none exist
    const testCount = await Testimonial.countDocuments();
    if (testCount === 0) {
      await Testimonial.create({
        name: "Rohan Sharma",
        role: "Frequent Driver",
        rating: 5,
        comment: "ASAP Parking completely resolved the chaos of parking. Finding a spot was extremely seamless!",
        avatar: "https://randomuser.me/api/portraits/men/32.jpg"
      });
    }

    // 4. Seed bookings and reviews
    const bookingCount = await Booking.countDocuments();
    if (bookingCount === 0 && seededSpot && driverUser) {
      const pastStart = new Date();
      pastStart.setDate(pastStart.getDate() - 2);
      pastStart.setHours(10, 0, 0, 0);
      const pastEnd = new Date(pastStart);
      pastEnd.setHours(12, 0, 0, 0);

      const pastBooking = await Booking.create({
        userId: driverUser._id,
        parkingId: seededSpot._id,
        startTime: pastStart,
        endTime: pastEnd,
        totalPrice: 200,
        paymentStatus: "paid",
        status: "completed",
        checkedIn: true,
        checkedInAt: pastStart,
        checkInTime: pastStart,
        checkOutTime: pastEnd,
        reviewed: true,
        qrToken: "qr_past_demo_token"
      });

      await Review.create({
        userId: driverUser._id,
        parkingId: seededSpot._id,
        bookingId: pastBooking._id,
        rating: 5,
        feedback: "Awesome location, clean driveway, and host was very responsive. Highly recommend!"
      });

      const futureStart = new Date();
      futureStart.setDate(futureStart.getDate() + 1);
      futureStart.setHours(14, 0, 0, 0);
      const futureEnd = new Date(futureStart);
      futureEnd.setHours(16, 0, 0, 0);

      await Booking.create({
        userId: driverUser._id,
        parkingId: seededSpot._id,
        startTime: futureStart,
        endTime: futureEnd,
        totalPrice: 200,
        paymentStatus: "paid",
        status: "paid",
        checkedIn: false,
        qrToken: "qr_future_demo_token"
      });

      console.log("[Seeder] Created demo bookings and reviews.");
    }

    res.json({ message: "Demo dataset seeded successfully! (Non-destructive check complete)" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

