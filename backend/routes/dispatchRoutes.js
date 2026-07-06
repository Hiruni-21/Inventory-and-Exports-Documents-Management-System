const express = require("express");
const router = express.Router();

const {
  getAllDispatches,
  getDispatchById,
  createDispatch,
  markDispatchDelivered,
} = require("../controllers/dispatchController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager", "supervisor", "logistics"), getAllDispatches);
router.get("/:id", verifyToken, allowRoles("manager", "supervisor", "logistics"), getDispatchById);
router.post("/", verifyToken, allowRoles("manager", "supervisor", "logistics"), createDispatch);
router.put(
  "/:id/delivered",
  verifyToken,
  allowRoles("manager", "supervisor", "logistics"),
  markDispatchDelivered
);

module.exports = router;