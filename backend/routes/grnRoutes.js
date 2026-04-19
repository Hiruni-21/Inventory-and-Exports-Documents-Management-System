const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const {
  getAllGrn,
  getGrnById,
  getPurchaseOrderItemsForGrn,
  createGrn,
  verifyGrn,
} = require("../controllers/grnController");

const { verifyToken } = require("../middleware/authMiddleware");

const uploadDir = path.join(process.cwd(), "uploads", "grn-photos");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = String(file.originalname || "photo")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
});

router.get("/", verifyToken, getAllGrn);
router.get("/po-items/:purchaseOrderId", verifyToken, getPurchaseOrderItemsForGrn);
router.get("/:id", verifyToken, getGrnById);
router.post("/", verifyToken, upload.array("photos", 10), createGrn);
router.put("/:id/verify", verifyToken, verifyGrn);

module.exports = router;