const express = require("express");
const router = express.Router();

const {
  getAllItems,
  createItem,
} = require("../controllers/itemController");

const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllItems);
router.post("/", verifyToken, createItem);

module.exports = router;