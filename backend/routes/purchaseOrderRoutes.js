const express = require("express");
const router = express.Router();

const {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  getPurchaseItemsBySupplier,
  createPurchaseOrder,
  updatePurchaseOrder,
} = require("../controllers/purchaseOrderController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");
const sendController = require("../controllers/purchaseOrderSendController");

router.get("/", verifyToken, allowRoles("manager", "operations"), getAllPurchaseOrders);

router.get(
  "/supplier/:supplierId/items",
  verifyToken,
  allowRoles("manager", "operations"),
  getPurchaseItemsBySupplier
);

router.post("/:id/render-pdf", verifyToken, allowRoles("manager", "operations"), sendController.renderPdf);
router.post("/:id/send-email", verifyToken, allowRoles("manager", "operations"), sendController.sendEmail);
router.post("/:id/send-whatsapp", verifyToken, allowRoles("manager", "operations"), sendController.sendWhatsapp);
router.post("/:id/send-all", verifyToken, allowRoles("manager", "operations"), sendController.sendAll);
router.get("/:id/document", verifyToken, allowRoles("manager", "operations"), sendController.getDocument);

router.get("/:id", verifyToken, allowRoles("manager", "operations"), getPurchaseOrderById);
router.post("/", verifyToken, allowRoles("manager", "operations"), createPurchaseOrder);
router.patch("/:id", verifyToken, allowRoles("manager"), updatePurchaseOrder);

module.exports = router;