const axios = require("axios");
const EMAResult = require("../models/emaResult.model");
const User = require("../models/User");

const FLASK = process.env.FLASK_URL || "http://127.0.0.1:5001";

// GET /api/ema/user-types
exports.getUserTypes = async (req, res) => {
  try {
    const response = await axios.get(`${FLASK}/ema/user-types`);
    res.json(response.data);
  } catch (error) {
    console.error("EMA getUserTypes:", error.message || error);
    if (flaskUnavailable(error)) {
      return res.status(503).json({
        error: "Assessment engine is not running. Start ml-services (port 5001).",
      });
    }
    const status = error.response?.status || 500;
    res.status(status).json({
      error: error.response?.data?.error || "Failed to fetch user types",
    });
  }
};

function flaskUnavailable(error) {
  return (
    error.code === "ECONNREFUSED" ||
    error.code === "ENOTFOUND" ||
    error.code === "ETIMEDOUT" ||
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(error.message || "")
  );
}

// GET /api/ema/questions
exports.getQuestions = async (req, res) => {
  try {
    const userType = req.query.user_type;
    const model = req.query.model || "DPBM-1";
    const url = userType
      ? `${FLASK}/ema/questions?user_type=${encodeURIComponent(userType)}`
      : `${FLASK}/ema/questions?model=${encodeURIComponent(model)}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("EMA getQuestions:", error.message || error);
    if (flaskUnavailable(error)) {
      return res.status(503).json({
        error:
          "Assessment engine is not running. Start ml-services (port 5001) — see RUN.md.",
      });
    }
    const status = error.response?.status || 500;
    res.status(status).json({
      error: error.response?.data?.error || "Failed to fetch questions",
    });
  }
};

// GET /api/ema/mi-handoff
exports.getMiHandoff = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const userType = req.query.user_type || undefined;
    const response = await axios.get(`${FLASK}/ema/mi-handoff`, {
      params: { name: user.operatorId, user_type: userType },
    });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({
      error: error.response?.data?.error || "Failed to load EMA handoff for MI",
    });
  }
};

// POST /api/ema/submit
exports.submitAnswers = async (req, res) => {
  try {
    const { user_type, model, answers } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    const flaskResponse = await axios.post(`${FLASK}/ema/submit`, {
      user_type,
      model,
      name: user.operatorId,
      answers,
    });

    const result = flaskResponse.data;

    await EMAResult.create({
      user:           user._id,
      operatorId:     user.operatorId,
      userType:       result.user_type || user_type,
      model:          result.model,
      overallScore:   result.overall_score,
      band:           result.band     || null,
      severity:       result.severity || null,
      pattern:        result.pattern,
      sectionScores:  result.section_scores,
      feedback:       result.feedback,
      riskFlags:      result.risk_flags      || [],
      riskFlagCount:  result.risk_flag_count || 0,
      miHandoff:      result.mi_handoff      || null,
      emaExport:      result.ema_export      || null,
      jsonExportPath: result.json_export_path || null,
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "EMA submission failed" });
  }
};