const express = require("express");
const router = express.Router();

const {
  getInventory,
  getLowStockItems,
  getExpiryItems,
  getBatchesByItemId,
  getInventoryValuation,
} = require("../controllers/inventoryController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager", "operations", "supervisor"), getInventory);
router.get("/low-stock", verifyToken, allowRoles("manager", "operations", "supervisor"), getLowStockItems);
router.get("/expiry", verifyToken, allowRoles("manager", "operations", "supervisor"), getExpiryItems);
router.get("/batches/:itemId", verifyToken, allowRoles("manager", "operations", "supervisor"), getBatchesByItemId);
router.get("/valuation", verifyToken, allowRoles("manager", "operations", "supervisor"), getInventoryValuation);

module.exports = router;