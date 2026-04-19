const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const {
  getAllReturns,
  getReturnById,
  getPurchaseOrderItemsForReturn,
  createReturn,
  sendReturnEmail,
} = require("../controllers/returnController");

const { verifyToken } = require("../middleware/authMiddleware");

const uploadDir = path.join(process.cwd(), "uploads", "return-photos");
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

router.get("/", verifyToken, getAllReturns);
router.get("/po-items/:purchaseOrderId", verifyToken, getPurchaseOrderItemsForReturn);
router.get("/:id", verifyToken, getReturnById);
router.post("/", verifyToken, upload.array("photos", 10), createReturn);
router.post("/:id/send-email", verifyToken, sendReturnEmail);

module.exports = router;