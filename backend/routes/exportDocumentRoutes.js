const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const router = express.Router();

const {
  getAllExportDocuments,
  getExportDocumentShipments,
  getExportDocumentById,
  updateExportDocuments,
  updateExportDocumentsByDispatchId,
  uploadExportDocumentFile,
} = require("../controllers/exportDocumentController");

const { verifyToken } = require("../middleware/authMiddleware");

const uploadDir = path.join(__dirname, "..", "uploads", "export-docs");
fs.mkdirSync(uploadDir, { recursive: true });

const safeFileName = (name = "file") =>
  String(name)
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "") || "file";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "") || ".pdf";
    const base = path.basename(file.originalname || "document", ext);
    const docType = String(req.params.docType || "document")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

    cb(
      null,
      `${Date.now()}-${req.params.globalDispatchId}-${docType}-${safeFileName(base)}${ext}`
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (allowed.includes(file.mimetype)) {
      return cb(null, true);
    }

    cb(new Error("Only PDF, JPG, PNG, or WEBP files are allowed"));
  },
});

router.get("/", verifyToken, getAllExportDocuments);
router.get("/shipments", verifyToken, getExportDocumentShipments);
router.post(
  "/by-dispatch/:globalDispatchId/upload/:docType",
  verifyToken,
  upload.single("file"),
  uploadExportDocumentFile
);
router.put("/by-dispatch/:globalDispatchId", verifyToken, updateExportDocumentsByDispatchId);
router.get("/:id", verifyToken, getExportDocumentById);
router.put("/:id", verifyToken, updateExportDocuments);

module.exports = router;