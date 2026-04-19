const express = require("express");
const router = express.Router();

const {
  getAllExportDocuments,
  getExportDocumentsByDispatchId,
  updateExportDocumentsByDispatchId,
} = require("../controllers/exportDocumentController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllExportDocuments);
router.get("/by-dispatch/:globalDispatchId", verifyToken, getExportDocumentsByDispatchId);
router.put("/by-dispatch/:globalDispatchId", verifyToken, updateExportDocumentsByDispatchId);

module.exports = router;