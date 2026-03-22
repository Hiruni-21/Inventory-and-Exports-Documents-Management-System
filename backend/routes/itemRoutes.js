const express = require("express");
const router = express.Router();

const {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
} = require("../controllers/itemController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, getAllItems);
router.get("/:id", verifyToken, getItemById);

router.post("/", verifyToken, allowRoles("manager", "ops"), createItem);
router.put("/:id", verifyToken, allowRoles("manager", "ops"), updateItem);
router.delete("/:id", verifyToken, allowRoles("manager"), deleteItem);

module.exports = router;