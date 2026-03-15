const express = require("express");
const router = express.Router();

const {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
} = require("../controllers/purchaseOrderController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllPurchaseOrders);
router.get("/:id", verifyToken, getPurchaseOrderById);
router.post("/", verifyToken, createPurchaseOrder);

module.exports = router;