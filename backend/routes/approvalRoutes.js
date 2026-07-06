const express = require("express");
const router = express.Router();

const {
  listApprovals,
  getApprovalCounts,
  createApproval,
  approveApproval,
  rejectApproval,
} = require("../controllers/approvalController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager", "operations"), listApprovals);
router.get("/counts", verifyToken, allowRoles("manager", "operations"), getApprovalCounts);

router.post(
  "/",
  verifyToken,
  allowRoles("manager", "operations", "logistics", "supervisor"),
  createApproval
);

router.post("/:id/approve", verifyToken, allowRoles("manager"), approveApproval);
router.post("/:id/reject", verifyToken, allowRoles("manager"), rejectApproval);

module.exports = router;