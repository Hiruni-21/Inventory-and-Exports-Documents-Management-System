const express = require("express");
const router = express.Router();

const {
  getAllGrn,
  getGrnById,
  getPurchaseOrderItemsForGrn,
  createGrn,
} = require("../controllers/grnController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllGrn);
router.get("/:id", verifyToken, getGrnById);
router.get("/po-items/:purchaseOrderId", verifyToken, getPurchaseOrderItemsForGrn);
router.post("/", verifyToken, createGrn);

module.exports = router;