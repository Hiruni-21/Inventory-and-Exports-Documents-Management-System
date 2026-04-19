const express = require("express");
const router = express.Router();

const {
  getSupplierOrders,
  getSupplierOrderById,
  respondToSupplierOrder,
  getSupplierReturns,
  getSupplierReturnById,
  respondToSupplierReturn,
  getSupplierMessages,
  createSupplierMessage,
} = require("../controllers/supplierPortalController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/orders", verifyToken, allowRoles("supplier"), getSupplierOrders);
router.get("/orders/:id", verifyToken, allowRoles("supplier"), getSupplierOrderById);
router.post("/orders/:id/respond", verifyToken, allowRoles("supplier"), respondToSupplierOrder);

router.get("/returns", verifyToken, allowRoles("supplier"), getSupplierReturns);
router.get("/returns/:id", verifyToken, allowRoles("supplier"), getSupplierReturnById);
router.post("/returns/:id/respond", verifyToken, allowRoles("supplier"), respondToSupplierReturn);

router.get("/messages", verifyToken, allowRoles("supplier"), getSupplierMessages);
router.post("/messages", verifyToken, allowRoles("supplier"), createSupplierMessage);

module.exports = router;