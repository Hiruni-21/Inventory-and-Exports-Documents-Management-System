const express = require("express");
const router = express.Router();

const {
  getAllGrn,
  getGrnById,
  getPurchaseOrderItemsForGrn,
  getGrnBatches,
  createGrn,
} = require("../controllers/grnController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager", "operations"), getAllGrn);
router.get(
  "/po-items/:purchaseOrderId",
  verifyToken,
  allowRoles("manager", "operations"),
  getPurchaseOrderItemsForGrn
);
router.get("/:id", verifyToken, allowRoles("manager", "operations"), getGrnById);
router.get("/:id/batches", verifyToken, allowRoles("manager", "operations"), getGrnBatches);
router.post("/", verifyToken, allowRoles("manager", "operations"), createGrn);

module.exports = router;