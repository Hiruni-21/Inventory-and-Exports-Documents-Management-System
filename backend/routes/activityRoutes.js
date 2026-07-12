const express = require("express");
const router = express.Router();
const { verifyToken, allowRoles } = require("../middleware/authMiddleware");
const { getActivities } = require("../controllers/activityController");

router.get("/", verifyToken, allowRoles("admin", "manager", "operations"), getActivities);

module.exports = router;
