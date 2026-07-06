const express = require("express");
const router = express.Router();

const {
  getAllGrn,
  getGrnById,
  getPurchaseOrderItemsForGrn,
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
router.post("/", verifyToken, allowRoles("manager", "operations"), createGrn);

module.exports = router;