const express = require("express");
const router = express.Router();

const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager", "operations"), getAllCategories);
router.get("/:id", verifyToken, allowRoles("manager", "operations"), getCategoryById);

router.post("/", verifyToken, allowRoles("manager", "operations"), createCategory);
router.put("/:id", verifyToken, allowRoles("manager", "operations"), updateCategory);
router.delete("/:id", verifyToken, allowRoles("manager"), deleteCategory);

module.exports = router;