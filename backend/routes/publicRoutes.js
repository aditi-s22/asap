const express = require("express");
const { getStats, getTestimonials, getNotifications } = require("../controllers/publicController");

const router = express.Router();

router.get("/stats", getStats);
router.get("/testimonials", getTestimonials);
router.get("/notifications", getNotifications);

module.exports = router;
