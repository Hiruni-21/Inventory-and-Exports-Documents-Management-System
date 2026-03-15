const express = require("express");
const router = express.Router();

const {
  getAllExportDocuments,
  getExportDocumentById,
  getDispatchListForExport,
  getDispatchItemsForExport,
  createExportDocument,
} = require("../controllers/exportDocumentController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllExportDocuments);
router.get("/dispatch-list", verifyToken, getDispatchListForExport);
router.get("/dispatch-items/:dispatchId", verifyToken, getDispatchItemsForExport);
router.get("/:id", verifyToken, getExportDocumentById);
router.post("/", verifyToken, createExportDocument);

module.exports = router;