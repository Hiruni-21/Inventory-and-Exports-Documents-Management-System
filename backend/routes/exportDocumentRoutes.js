const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads", "export_docs"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

const {
  getAllExportDocuments,
  getExportDocumentShipments,
  getExportDocumentById,
  updateExportDocuments,
  updateExportDocumentsByDispatchId,
  uploadDocument
} = require("../controllers/exportDocumentController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager", "supervisor", "logistics"), getAllExportDocuments);
router.get(
  "/shipments",
  verifyToken,
  allowRoles("manager", "supervisor", "logistics"),
  getExportDocumentShipments
);

router.post(
  "/upload",
  verifyToken,
  allowRoles("manager", "supervisor", "logistics"),
  upload.single("file"),
  uploadDocument
);

router.put(
  "/by-dispatch/:globalDispatchId",
  verifyToken,
  allowRoles("manager", "supervisor", "logistics"),
  updateExportDocumentsByDispatchId
);
router.get("/:id", verifyToken, allowRoles("manager", "supervisor", "logistics"), getExportDocumentById);
router.put("/:id", verifyToken, allowRoles("manager", "supervisor", "logistics"), updateExportDocuments);

module.exports = router;
