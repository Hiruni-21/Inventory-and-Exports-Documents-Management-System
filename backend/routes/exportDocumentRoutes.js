const express = require("express");
const router = express.Router();

const {
  getAllExportDocuments,
  getExportDocumentById,
  updateExportDocuments,
  updateExportDocumentsByDispatchId,
} = require("../controllers/exportDocumentController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllExportDocuments);
router.get("/:id", verifyToken, getExportDocumentById);
router.put("/by-dispatch/:globalDispatchId", verifyToken, updateExportDocumentsByDispatchId);
router.put("/:id", verifyToken, updateExportDocuments);

module.exports = router;