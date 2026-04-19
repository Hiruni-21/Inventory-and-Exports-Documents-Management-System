const express = require("express");
const router = express.Router();

const {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  approvePurchaseOrder,
  sendPurchaseOrder,
} = require("../controllers/purchaseOrderController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllPurchaseOrders);
router.get("/:id", verifyToken, getPurchaseOrderById);
router.post("/", verifyToken, createPurchaseOrder);
router.put("/:id/approve", verifyToken, approvePurchaseOrder);
router.put("/:id/send", verifyToken, sendPurchaseOrder);

module.exports = router;