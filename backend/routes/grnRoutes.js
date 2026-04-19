const express = require("express");
const router = express.Router();

const {
  getAllGrn,
  getGrnById,
  getPurchaseOrderItemsForGrn,
  createGrn,
  verifyGrn,
} = require("../controllers/grnController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllGrn);
router.get("/po-items/:purchaseOrderId", verifyToken, getPurchaseOrderItemsForGrn);
router.get("/:id", verifyToken, getGrnById);
router.post("/", verifyToken, createGrn);
router.put("/:id/verify", verifyToken, verifyGrn);

module.exports = router;