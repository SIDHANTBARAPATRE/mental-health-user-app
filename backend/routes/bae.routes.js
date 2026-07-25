const express = require("express");
const multer  = require("multer");
const router  = express.Router();
const auth    = require("../middleware/auth");
const bae     = require("../controllers/bae.controller");

const upload = multer({ storage: multer.memoryStorage() });

// Session
router.post("/session/start",   auth, bae.startSession);
router.post("/session/finish",  auth, bae.finishSession);
router.get("/session/report",   auth, bae.getReport);      // fetch PNG + auto-save to MongoDB

// TAT
router.post("/tat/upload",      auth, upload.any(), bae.tatUpload);
router.post("/tat/submit",      auth, bae.tatSubmit);
router.get("/tat/scene/:n",     auth, bae.tatScene);

// WAT
router.get("/wat/words",        auth, bae.watWords);
router.post("/wat/submit",      auth, bae.watSubmit);

// SRT
router.get("/srt/situations",   auth, bae.srtSituations);
router.post("/srt/submit",      auth, bae.srtSubmit);

// SDT
router.get("/sdt/perspectives", auth, bae.sdtPerspectives);
router.post("/sdt/submit",      auth, bae.sdtSubmit);

// BA
router.get("/ba/patterns",      auth, bae.baPatterns);
router.post("/ba/submit",       auth, bae.baSubmit);

// Saved reports
router.get("/reports",          auth, bae.getReports);
router.get("/reports/:id",      auth, bae.getReportById);

module.exports = router;