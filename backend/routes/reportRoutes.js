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

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/stock-summary", verifyToken, getStockSummaryReport);
router.get("/low-stock", verifyToken, getLowStockReport);
router.get("/stock-movements", verifyToken, getStockMovementsReport);
router.get("/dispatch", verifyToken, getDispatchReport);
router.get("/wastage", verifyToken, getWastageReport);
router.get("/returns", verifyToken, getReturnReport);
router.get("/export-documents", verifyToken, getExportDocumentReport);

module.exports = router;