const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const cbdt    = require("../controllers/cbdt.controller");

router.post("/session/start",  auth, cbdt.startSession);
router.post("/session/chat",   auth, cbdt.chat);
router.post("/session/finish", auth, cbdt.finishSession);  // saves PNG to MongoDB
router.get("/reports",         auth, cbdt.getReports);
router.get("/reports/:id",     auth, cbdt.getReportById);

module.exports = router;