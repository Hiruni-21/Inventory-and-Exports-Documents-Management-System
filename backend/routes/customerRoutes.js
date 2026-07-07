const express = require("express");
const router = express.Router();

const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customerController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager", "operations"), getCustomers);
router.get("/:id", verifyToken, allowRoles("manager", "operations"), getCustomerById);
router.post("/", verifyToken, allowRoles("manager", "operations"), createCustomer);
router.put("/:id", verifyToken, allowRoles("manager", "operations"), updateCustomer);
router.delete("/:id", verifyToken, allowRoles("manager"), deleteCustomer);

module.exports = router;