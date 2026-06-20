const express = require("express");
const router = express.Router();
const { updateUserProfile, applyForHost, toggleFavorite, getFavorites, getUserNotifications, markNotificationRead, createTicket, markAllNotificationsRead } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

// Protected route to update profile
router.put("/profile", protect, updateUserProfile);

// Apply for host verification
router.post("/host-application", protect, applyForHost);

// Favorites logic
router.post("/favorites", protect, toggleFavorite);
router.get("/favorites", protect, getFavorites);

const { validate, schemas } = require("../middleware/validator");

// Tickets logic
router.post("/tickets", protect, validate(schemas.createTicket), createTicket);

// Notifications logic
router.get("/notifications", protect, getUserNotifications);
router.patch("/notifications/read-all", protect, markAllNotificationsRead);
router.patch("/notifications/:id/read", protect, markNotificationRead);

module.exports = router;
