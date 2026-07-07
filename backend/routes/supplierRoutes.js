const express = require("express");
const router = express.Router();

const {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/supplierController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager", "operations"), getAllSuppliers);
router.get("/:id", verifyToken, allowRoles("manager", "operations"), getSupplierById);
router.post("/", verifyToken, allowRoles("manager", "operations"), createSupplier);
router.put("/:id", verifyToken, allowRoles("manager", "operations"), updateSupplier);
router.delete("/:id", verifyToken, allowRoles("manager"), deleteSupplier);

module.exports = router;