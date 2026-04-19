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
const sendController = require("../controllers/purchaseOrderSendController");

router.get("/", verifyToken, getAllPurchaseOrders);
router.get("/:id", verifyToken, getPurchaseOrderById);
router.post("/", verifyToken, createPurchaseOrder);
router.put("/:id/approve", verifyToken, approvePurchaseOrder);
router.put("/:id/send", verifyToken, sendPurchaseOrder);
router.post("/:id/render-pdf", verifyToken, sendController.renderPdf);
router.post("/:id/send-email", verifyToken, sendController.sendEmail);
router.post("/:id/send-whatsapp", verifyToken, sendController.sendWhatsapp);
router.post("/:id/send-all", verifyToken, sendController.sendAll);
router.get("/:id/document", verifyToken, sendController.getDocument);
module.exports = router;