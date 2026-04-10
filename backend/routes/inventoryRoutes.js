const express = require("express");
const router = express.Router();

const {
  getInventory,
  getLowStockItems,
  getExpiryItems,
  getBatchesByItemId,
  getInventoryValuation,
  getStockMovements,
} = require("../controllers/inventoryController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getInventory);
router.get("/low-stock", verifyToken, getLowStockItems);
router.get("/expiry", verifyToken, getExpiryItems);
router.get("/batches/:itemId", verifyToken, getBatchesByItemId);
router.get("/valuation", verifyToken, getInventoryValuation);
router.get("/movements", verifyToken, getStockMovements);

module.exports = router;