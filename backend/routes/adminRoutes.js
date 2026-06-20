const express = require("express");
const router = express.Router();
const {
  getAdminMetrics,
  getUsers,
  toggleUserStatus,
  getAdminListings,
  approveParkingListing,
  rejectParkingListing,
  deleteParkingListing,
  getPayments,
  getPendingHosts,
  verifyHost,
  getDisputes,
  resolveRefund,
  suspendParkingListing,
  unsuspendParkingListing,
  getPlatformActivities,
  getTickets,
  updateTicket,
  getSystemHealth,
  seedDemoData
} = require("../controllers/adminController");
const { protect, admin } = require("../middleware/authMiddleware");

// All admin routes are protected by protect and admin middlewares
router.use(protect);
router.use(admin);

router.get("/metrics", getAdminMetrics);
router.get("/users", getUsers);
router.patch("/users/:id/status", toggleUserStatus);
router.get("/listings", getAdminListings);
router.patch("/parking/:id/approve", approveParkingListing);
router.patch("/parking/:id/reject", rejectParkingListing);
router.patch("/parking/:id/suspend", suspendParkingListing);
router.patch("/parking/:id/unsuspend", unsuspendParkingListing);
router.delete("/parking/:id", deleteParkingListing);
router.get("/payments", getPayments);
router.get("/hosts/pending", getPendingHosts);
router.patch("/hosts/:id/verify", verifyHost);
router.get("/disputes", getDisputes);
router.patch("/payments/:id/refund", resolveRefund);
router.get("/activities", getPlatformActivities);
router.get("/tickets", getTickets);
router.patch("/tickets/:id", updateTicket);
router.get("/health", getSystemHealth);
router.post("/seed-demo", seedDemoData);

module.exports = router;

