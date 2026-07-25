const router = require("express").Router();
const ema    = require("../controllers/ema.controller");
const auth   = require("../middleware/auth");

router.get("/user-types",  auth, ema.getUserTypes);
router.get("/questions",   auth, ema.getQuestions);
router.get("/mi-handoff",  auth, ema.getMiHandoff);
router.post("/submit",     auth, ema.submitAnswers);

module.exports = router;