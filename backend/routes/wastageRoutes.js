const express = require("express");
const router = express.Router();

const {
  getAllWastage,
  createWastage,
} = require("../controllers/wastageController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager", "operations", "supervisor"), getAllWastage);
router.post("/", verifyToken, allowRoles("manager", "operations", "supervisor"), createWastage);

module.exports = router;