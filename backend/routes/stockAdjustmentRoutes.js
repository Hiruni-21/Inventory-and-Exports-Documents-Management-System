const express = require("express");
const router = express.Router();

const {
  getAllStockAdjustments,
  createStockAdjustment,
} = require("../controllers/stockAdjustmentController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager", "operations", "supervisor"), getAllStockAdjustments);
router.post("/", verifyToken, allowRoles("manager", "operations", "supervisor"), createStockAdjustment);

module.exports = router;