const express = require("express");
const router = express.Router();

const {
  getAllReturns,
  createReturn,
} = require("../controllers/returnController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllReturns);
router.post("/", verifyToken, createReturn);

module.exports = router;