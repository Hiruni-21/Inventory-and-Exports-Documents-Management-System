const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controllers/dashboardController");
const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get(
  "/stats",
  verifyToken,
  allowRoles("manager", "operations", "supervisor", "logistics", "supplier", "admin"),
  getDashboardStats
);

module.exports = router;