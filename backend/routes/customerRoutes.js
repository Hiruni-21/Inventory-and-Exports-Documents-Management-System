const express = require("express");
const router = express.Router();

const { getCustomers } = require("../controllers/customerController");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getCustomers);

module.exports = router;