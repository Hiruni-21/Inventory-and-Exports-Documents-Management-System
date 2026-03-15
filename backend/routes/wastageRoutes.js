const express = require("express");
const router = express.Router();

const {
  getAllWastage,
  createWastage,
} = require("../controllers/wastageController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllWastage);
router.post("/", verifyToken, createWastage);

module.exports = router;