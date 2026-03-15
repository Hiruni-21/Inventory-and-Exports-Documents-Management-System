const express = require("express");
const router = express.Router();
const { loginUser, getMe } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/login", loginUser);
router.get("/me", verifyToken, getMe);

module.exports = router;