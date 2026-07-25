const express    = require("express");
const router     = express.Router();
const auth       = require("../middleware/auth");
const { saveAssessment } = require("../controllers/oc.controller");

router.post("/save", auth, saveAssessment);

module.exports = router;