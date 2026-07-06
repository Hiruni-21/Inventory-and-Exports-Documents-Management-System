const express = require("express");
const router = express.Router();
const { getAllUsers, createUser } = require("../controllers/userController");
const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("admin"), getAllUsers);
router.post("/", verifyToken, allowRoles("admin"), createUser);

module.exports = router;