const express = require("express");
const router = express.Router();

const {
  getAllExportDocuments,
  getExportDocumentsByDispatchId,
  getExportDocumentById,
  updateExportDocuments,
  updateExportDocumentsByDispatchId,
} = require("../controllers/exportDocumentController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllExportDocuments);
router.get("/by-dispatch/:globalDispatchId", verifyToken, getExportDocumentsByDispatchId);
router.put("/by-dispatch/:globalDispatchId", verifyToken, updateExportDocumentsByDispatchId);
router.get("/:id", verifyToken, getExportDocumentById);
router.put("/:id", verifyToken, updateExportDocuments);

module.exports = router;