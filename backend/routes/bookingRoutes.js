const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const {
  createBooking,
  getUserBookings,
  getParkingBookings,
  cancelBooking,
  verifyQRToken,
  checkInBooking,
  startSessionBooking,
  checkOutBooking,
  extendBooking
} = require("../controllers/bookingController");

const router = express.Router();

const { validate, schemas } = require("../middleware/validator");

// create booking
router.post("/", protect, validate(schemas.createBooking), createBooking);

// get bookings for a user
router.get("/user/:userId", protect, getUserBookings);

// get bookings for a parking space (host of that spot, or admin)
router.get("/parking/:parkingId", protect, getParkingBookings);

// verify qr token (host of that spot, or admin)
router.get("/verify/:qrToken", protect, verifyQRToken);

// cancel booking
router.patch("/:id/cancel", protect, cancelBooking);

// check-in booking manually
router.post("/check-in", protect, checkInBooking);

// start session
router.patch("/:id/start", protect, startSessionBooking);

// check-out booking
router.patch("/:id/check-out", protect, checkOutBooking);

// extend booking
router.post("/:id/extend", protect, extendBooking);

module.exports = router;