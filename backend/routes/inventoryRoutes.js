const express = require("express");
const router = express.Router();

const {
  getInventoryList,
  getInventoryBatchesByItem,
  getStockMovements,
  getLowStockItems,
} = require("../controllers/inventoryController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getInventoryList);
router.get("/batches/:itemId", verifyToken, getInventoryBatchesByItem);
router.get("/movements", verifyToken, getStockMovements);
router.get("/low-stock", verifyToken, getLowStockItems);

module.exports = router;