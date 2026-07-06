const express = require("express");
const router = express.Router();

const {
  getAllExportDocuments,
  getExportDocumentShipments,
  getExportDocumentById,
  updateExportDocuments,
  updateExportDocumentsByDispatchId,
} = require("../controllers/exportDocumentController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager", "supervisor", "logistics"), getAllExportDocuments);
router.get(
  "/shipments",
  verifyToken,
  allowRoles("manager", "supervisor", "logistics"),
  getExportDocumentShipments
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