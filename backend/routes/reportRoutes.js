const express = require("express");
const router = express.Router();

const {
  getStockSummaryReport,
  getLowStockReport,
  getStockMovementsReport,
  getDispatchReport,
  getWastageReport,
  getReturnReport,
  getExportDocumentReport,
} = require("../controllers/reportController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/stock-summary", verifyToken, allowRoles("manager", "operations", "supervisor", "logistics"), getStockSummaryReport);
router.get("/low-stock", verifyToken, allowRoles("manager", "operations", "supervisor"), getLowStockReport);
router.get("/stock-movements", verifyToken, allowRoles("manager", "operations", "supervisor"), getStockMovementsReport);
router.get("/dispatch", verifyToken, allowRoles("manager", "operations", "supervisor", "logistics"), getDispatchReport);
router.get("/wastage", verifyToken, allowRoles("manager", "operations", "supervisor"), getWastageReport);
router.get("/returns", verifyToken, allowRoles("manager", "operations", "supervisor"), getReturnReport);
router.get("/export-documents", verifyToken, allowRoles("manager", "operations", "supervisor", "logistics"), getExportDocumentReport);

module.exports = router;