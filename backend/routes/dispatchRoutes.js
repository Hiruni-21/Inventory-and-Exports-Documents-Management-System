const express = require("express");
const router = express.Router();

const {
  getAllDispatches,
  getDispatchById,
  createDispatch,
  markDispatchDelivered,
} = require("../controllers/dispatchController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllDispatches);
router.get("/:id", verifyToken, getDispatchById);
router.post("/", verifyToken, createDispatch);
router.put("/:id/delivered", verifyToken, markDispatchDelivered);

module.exports = router;