const express = require("express");
const router = express.Router();

const {
  getAllExportDocuments,
  getExportDocumentShipments,
  getExportDocumentById,
  updateExportDocuments,
  updateExportDocumentsByDispatchId,
} = require("../controllers/exportDocumentController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllExportDocuments);
router.get("/shipments", verifyToken, getExportDocumentShipments);
router.put("/by-dispatch/:globalDispatchId", verifyToken, updateExportDocumentsByDispatchId);
router.get("/:id", verifyToken, getExportDocumentById);
router.put("/:id", verifyToken, updateExportDocuments);

module.exports = router;