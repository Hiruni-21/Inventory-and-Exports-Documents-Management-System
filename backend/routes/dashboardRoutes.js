const express = require("express");
const router = express.Router();

const {
  getDashboardSummary,
  getStockMovementChart,
  getMonthlyDispatchChart,
  getMonthlyExportChart,
} = require("../controllers/dashboardController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/summary", verifyToken, getDashboardSummary);
router.get("/stock-movements-chart", verifyToken, getStockMovementChart);
router.get("/monthly-dispatch-chart", verifyToken, getMonthlyDispatchChart);
router.get("/monthly-export-chart", verifyToken, getMonthlyExportChart);

module.exports = router;