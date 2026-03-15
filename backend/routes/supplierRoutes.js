const express = require("express");
const router = express.Router();

const {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/supplierController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllSuppliers);
router.get("/:id", verifyToken, getSupplierById);
router.post("/", verifyToken, createSupplier);
router.put("/:id", verifyToken, updateSupplier);
router.delete("/:id", verifyToken, deleteSupplier);

module.exports = router;