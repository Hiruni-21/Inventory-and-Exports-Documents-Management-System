const express = require("express");
const router = express.Router();

const {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  getPurchaseItemsBySupplier,
  createPurchaseOrder,
} = require("../controllers/purchaseOrderController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllPurchaseOrders);

// Keep this before "/:id"
router.get("/supplier/:supplierId/items", verifyToken, getPurchaseItemsBySupplier);

router.get("/:id", verifyToken, getPurchaseOrderById);
router.post("/", verifyToken, createPurchaseOrder);

module.exports = router;