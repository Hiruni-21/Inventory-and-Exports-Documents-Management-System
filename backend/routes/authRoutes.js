const express = require("express");
const router = express.Router();
const { loginUser, getMe, forgotPassword, resetPassword } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/login", loginUser);
router.get("/me", verifyToken, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;