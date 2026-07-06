const express = require("express");
const router = express.Router();

const {
  getAllReturns,
  createReturn,
} = require("../controllers/returnController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager", "operations", "supervisor"), getAllReturns);
router.post("/", verifyToken, allowRoles("manager", "operations", "supervisor"), createReturn);

module.exports = router;