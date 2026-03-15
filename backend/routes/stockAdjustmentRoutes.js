const express = require("express");
const router = express.Router();

const {
  getAllStockAdjustments,
  createStockAdjustment,
} = require("../controllers/stockAdjustmentController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllStockAdjustments);
router.post("/", verifyToken, createStockAdjustment);

module.exports = router;