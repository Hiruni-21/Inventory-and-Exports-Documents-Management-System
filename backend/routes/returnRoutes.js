const express = require("express");
const router = express.Router();

const {
  getAllReturns,
  createReturn,
  sendReturnNote,
} = require("../controllers/returnController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager", "operations", "supervisor"), getAllReturns);
router.post("/", verifyToken, allowRoles("manager", "operations", "supervisor"), createReturn);
router.post("/:id/send", verifyToken, allowRoles("manager", "operations"), sendReturnNote);

module.exports = router;