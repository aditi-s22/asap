const User = require("../models/User");

// UPDATE USER PROFILE (SAFE FIELDS ONLY — never role/verifiedHost/verification flags)
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.profileImage !== undefined) user.profileImage = req.body.profileImage;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      verifiedHost: updatedUser.verifiedHost,
      phoneVerified: updatedUser.phoneVerified,
      emailVerified: updatedUser.emailVerified,
      govIdImage: updatedUser.govIdImage,
      addressProofImage: updatedUser.addressProofImage,
      favorites: updatedUser.favorites,
      profileImage: updatedUser.profileImage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// APPLY FOR HOST VERIFICATION (only sets verifiedHost -> "pending", never "verified"/"role")
exports.applyForHost = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verifiedHost === "pending" || user.verifiedHost === "verified") {
      return res.status(400).json({ message: `Host application already ${user.verifiedHost}` });
    }

    const { govIdImage, addressProofImage, phone } = req.body;
    if (!govIdImage || !addressProofImage) {
      return res.status(400).json({ message: "Government ID and address proof images are required" });
    }

    if (phone !== undefined) user.phone = phone;
    user.govIdImage = govIdImage;
    user.addressProofImage = addressProofImage;
    user.verifiedHost = "pending";

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      verifiedHost: updatedUser.verifiedHost,
      phoneVerified: updatedUser.phoneVerified,
      emailVerified: updatedUser.emailVerified,
      govIdImage: updatedUser.govIdImage,
      addressProofImage: updatedUser.addressProofImage,
      favorites: updatedUser.favorites,
      profileImage: updatedUser.profileImage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// TOGGLE FAVORITE
exports.toggleFavorite = async (req, res) => {
    try {
        const { parkingId } = req.body;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const isFavorited = user.favorites.includes(parkingId);
        
        if (isFavorited) {
            user.favorites.pull(parkingId);
        } else {
            user.favorites.push(parkingId);
        }
        
        await user.save();
        res.json({ favorites: user.favorites });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET FAVORITES
exports.getFavorites = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate("favorites");
        res.json(user.favorites);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET USER NOTIFICATIONS
exports.getUserNotifications = async (req, res) => {
    try {
        const Notification = require("../models/Notification");
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// MARK NOTIFICATION AS READ
exports.markNotificationRead = async (req, res) => {
    try {
        const Notification = require("../models/Notification");
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { isRead: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// CREATE ISSUE TICKET (POST /api/users/tickets)
exports.createTicket = async (req, res) => {
  try {
    const { bookingId, category, description } = req.body;
    if (!bookingId || !category || !description) {
      return res.status(400).json({ message: "Booking ID, category, and description are required" });
    }

    const Booking = require("../models/Booking");
    const Issue = require("../models/Issue");
    const Payment = require("../models/Payment");
    const Notification = require("../models/Notification");

    const booking = await Booking.findById(bookingId).populate("parkingId");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Verify ownership
    if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const ticket = await Issue.create({
      bookingId,
      userId: req.user._id,
      category,
      description,
      status: "open"
    });

    // Automatically flag booking as refund_pending for admin review
    booking.status = "refund_pending";
    booking.refundReason = `Issue reported: ${category} - ${description}`;
    await booking.save();

    // Set Payment record status to refund_pending
    await Payment.updateMany({ bookingId }, { status: "refund_pending" });

    // Create user notification
    await Notification.create({
      userId: req.user._id,
      title: "Issue Ticket Opened",
      message: `Your issue regarding "${booking.parkingId?.title || 'spot'}" has been logged. Status: refund_pending.`,
      type: "cancellation"
    });

    // Notify admins
    const admins = await User.find({ role: "admin" });
    for (const adminUser of admins) {
      await Notification.create({
        userId: adminUser._id,
        title: "Dispute Issue Ticket Opened",
        message: `Driver ${req.user.name} reported: "${category}" for spot "${booking.parkingId.title}".`,
        type: "host_alert"
      });
    }

    // Socket emit
    const io = req.app.get("io");
    if (io) {
      admins.forEach(adminUser => {
        io.to(adminUser._id.toString()).emit("notification", {
          title: "New Dispute Ticket",
          message: `Driver ${req.user.name} reported an issue: ${category}`
        });
      });
    }

    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// MARK ALL NOTIFICATIONS AS READ
exports.markAllNotificationsRead = async (req, res) => {
  try {
    const Notification = require("../models/Notification");
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
