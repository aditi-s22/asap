const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  addParking,
  getAllParking,
  getParkingById,
  getNearbyParking,
  getHostParkings,
  updateParking,
  deleteParking,
  getHostMetrics,
  searchParking,
  getLiveAvailability,
  getRecommended,
  getDeals,
  addReview,
  getReviews,
  reportListing
} = require("../controllers/parkingController");

const router = express.Router();

// HOMEPAGE / DISCOVERY ROUTES
router.get("/search", searchParking);
router.get("/availability", getLiveAvailability);
router.get("/recommended", getRecommended);
router.get("/deals", getDeals);

// NORMAL ROUTES
router.get("/", getAllParking);
router.get("/search/nearby", getNearbyParking);
router.get("/:id", getParkingById);
router.get("/:id/reviews", getReviews);

const { validate, schemas } = require("../middleware/validator");

// PROTECTED ROUTES (Requires valid JWT)
router.post("/", protect, validate(schemas.addParking), addParking);
router.put("/:id", protect, updateParking);
router.delete("/:id", protect, deleteParking);
router.post("/:id/reviews", protect, validate(schemas.addReview), addReview);
router.post("/:id/report", protect, reportListing);

// HOST ROUTES (owner or admin only)
router.get("/host/:hostId", protect, getHostParkings);
router.get("/host/:hostId/metrics", protect, getHostMetrics);

module.exports = router;