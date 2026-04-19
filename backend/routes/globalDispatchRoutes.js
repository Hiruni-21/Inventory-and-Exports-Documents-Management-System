const express = require("express");
const router = express.Router();

const {
  getAllGlobalDispatches,
  getGlobalDispatchById,
  createGlobalDispatch,
  markGlobalDispatchDelivered,
} = require("../controllers/globalDispatchController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllGlobalDispatches);
router.get("/:id", verifyToken, getGlobalDispatchById);
router.post("/", verifyToken, createGlobalDispatch);
router.put("/:id/deliver", verifyToken, markGlobalDispatchDelivered);

module.exports = router;