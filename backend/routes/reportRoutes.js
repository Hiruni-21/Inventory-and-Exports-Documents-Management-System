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
  getSupplierPurchaseReport,
  getStockValuationReport,
} = require("../controllers/reportController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

// Existing routes (keeping them just in case they are used elsewhere)
router.get("/stock-summary", verifyToken, allowRoles("manager", "operations", "supervisor", "logistics"), getStockSummaryReport);
router.get("/low-stock", verifyToken, allowRoles("manager", "operations", "supervisor"), getLowStockReport);
router.get("/dispatch", verifyToken, allowRoles("manager", "operations", "supervisor", "logistics"), getDispatchReport);
router.get("/export-documents", verifyToken, allowRoles("manager", "operations", "supervisor", "logistics"), getExportDocumentReport);

// Updated routes for the Reports dashboard
router.get("/supplier-purchase", verifyToken, allowRoles("manager", "operations", "supervisor"), getSupplierPurchaseReport);
router.get("/stock-movement", verifyToken, allowRoles("manager", "operations", "supervisor"), getStockMovementsReport);
router.get("/wastage", verifyToken, allowRoles("manager", "operations", "supervisor"), getWastageReport);
router.get("/returns", verifyToken, allowRoles("manager", "operations", "supervisor"), getReturnReport);
router.get("/valuation", verifyToken, allowRoles("manager", "operations", "supervisor"), getStockValuationReport);

module.exports = router;