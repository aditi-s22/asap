const express = require("express");

const {
  firebaseSession,
  refreshAccessToken,
  logout,
  login
} = require("../controllers/authController");

const { validate, schemas } = require("../middleware/validator");

const router = express.Router();

router.post("/login", validate(schemas.login), login);
router.post("/firebase-session", firebaseSession);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);

module.exports = router;
