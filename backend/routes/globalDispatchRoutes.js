const express = require("express");
const router = express.Router();

const {
  getAllGlobalDispatches,
  getGlobalDispatchById,
  createGlobalDispatch,
  clearGlobalDispatch,
  markGlobalDispatchDelivered,
} = require("../controllers/globalDispatchController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager", "supervisor", "logistics"), getAllGlobalDispatches);
router.get("/:id", verifyToken, allowRoles("manager", "supervisor", "logistics"), getGlobalDispatchById);
router.post("/", verifyToken, allowRoles("manager", "supervisor", "logistics"), createGlobalDispatch);
router.put("/:id/clear", verifyToken, allowRoles("manager", "supervisor", "logistics"), clearGlobalDispatch);
router.put(
  "/:id/deliver",
  verifyToken,
  allowRoles("manager", "supervisor", "logistics"),
  markGlobalDispatchDelivered
);

module.exports = router;