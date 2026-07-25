const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const mi      = require("../controllers/mi.controller");

router.post("/start",       auth, mi.startSession);
router.post("/chat",        auth, mi.chat);
router.post("/finish",      auth, mi.finishSession);
router.get("/reports",      auth, mi.getReports);
router.get("/reports/:id",  auth, mi.getReportById);

module.exports = router;