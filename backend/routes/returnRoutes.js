const express = require("express");
const router = express.Router();

const {
  getAllReturns,
  createReturn,
  sendReturnNote,
  renderPdf,
} = require("../controllers/returnController");

const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

router.get("/", verifyToken, allowRoles("manager", "operations", "supervisor"), getAllReturns);
router.post("/", verifyToken, allowRoles("manager", "operations", "supervisor"), createReturn);
router.post("/:id/send", verifyToken, allowRoles("manager", "operations"), sendReturnNote);
router.post("/:id/render-pdf", verifyToken, allowRoles("manager", "operations", "supervisor"), renderPdf);

module.exports = router;