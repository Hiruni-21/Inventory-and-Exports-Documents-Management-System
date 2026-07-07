const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
  getAllUsers,
  getCurrentUserProfile,
  updateCurrentUserProfile,
  updateCurrentUserProfilePhoto,
  createUser,
} = require("../controllers/userController");
const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

const upload = multer({ dest: path.join(__dirname, "..", "uploads", "tmp") });

router.get("/", verifyToken, allowRoles("admin"), getAllUsers);
router.get("/profile", verifyToken, getCurrentUserProfile);
router.put("/profile", verifyToken, updateCurrentUserProfile);
router.post("/profile/photo", verifyToken, upload.single("profilePhoto"), updateCurrentUserProfilePhoto);
router.post("/", verifyToken, allowRoles("admin"), createUser);

module.exports = router;