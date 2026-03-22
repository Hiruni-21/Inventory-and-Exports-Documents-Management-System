const express = require("express");
const router = express.Router();
const { getAllUsers, createUser } = require("../controllers/userController");
const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager"), getAllUsers);
router.post("/", verifyToken, allowRoles("manager"), createUser);

module.exports = router;