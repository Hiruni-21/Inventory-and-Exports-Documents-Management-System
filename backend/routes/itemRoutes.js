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

router.get("/", verifyToken, allowRoles("manager", "operations"), getAllItems);
router.get("/:id", verifyToken, allowRoles("manager", "operations"), getItemById);

router.post("/", verifyToken, allowRoles("manager", "operations"), createItem);
router.put("/:id", verifyToken, allowRoles("manager", "operations"), updateItem);
router.delete("/:id", verifyToken, allowRoles("manager"), deleteItem);

module.exports = router;