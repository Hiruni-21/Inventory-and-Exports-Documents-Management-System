const express = require("express");
const router = express.Router();

const {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/itemCategoryController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllCategories);
router.post("/", verifyToken, allowRoles("manager", "ops"), createCategory);
router.put("/:id", verifyToken, allowRoles("manager", "ops"), updateCategory);
router.delete("/:id", verifyToken, allowRoles("manager"), deleteCategory);

module.exports = router;