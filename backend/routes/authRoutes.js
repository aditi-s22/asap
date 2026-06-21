const express = require("express");

const {
  firebaseSession,
  refreshAccessToken,
  logout
} = require("../controllers/authController");

const router = express.Router();

// Firebase Authentication is the sole sign-in path — there is deliberately no
// password-based /login route here. A prior "DEV/TEST LOGIN BYPASS" controller
// accepted any non-empty password string for any email with no verification
// against anything, and was reachable in production with no NODE_ENV gate; it
// was also the silent fallback the frontend's Login page took on ANY Firebase
// sign-in failure (including a genuinely wrong password), making it a live
// authentication bypass for every account in the system. Removed entirely.
router.post("/firebase-session", firebaseSession);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);

module.exports = router;
