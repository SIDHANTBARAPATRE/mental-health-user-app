const axios    = require("axios");
const MIReport = require("../models/MIReport");
const EMAResult = require("../models/emaResult.model");
const User     = require("../models/User");

const FLASK = process.env.FLASK_URL || "http://127.0.0.1:5001";

// Helper: parse ema_export from request body if present
function parseEmaExport(body) {
  if (body.ema_export) return body.ema_export;
  return null;
}

// Helper: load latest EMA export from MongoDB for this user
async function loadLatestEmaExport(userId, userType) {
  const query = { user: userId };
  if (userType) query.userType = userType;
  const doc = await EMAResult.findOne(query).sort({ createdAt: -1 });
  if (!doc) return null;
  // Reconstruct the export shape the Flask MI engine expects
  return {
    schema_version: "1.0",
    generated_at:   doc.createdAt,
    subject: {
      name:      doc.operatorId,
      user_type: doc.userType,
    },
    assessment: {
      model:           doc.model,
      overall_score:   doc.overallScore,
      section_scores:  doc.sectionScores,
      band:            doc.band,
      severity:        doc.severity,
      pattern:         doc.pattern,
      risk_flags:      doc.riskFlags,
      risk_flag_count: doc.riskFlagCount,
    },
    feedback_snapshot: doc.feedback,
    mi_handoff:        doc.miHandoff,
  };
}

// Resolve EMA export: prefer body, fall back to DB
async function resolveEmaForMi(user, body) {
  const fromBody = parseEmaExport(body);
  if (fromBody) return fromBody;
  return loadLatestEmaExport(user._id, body.user_type);
}

// POST /api/mi/start
exports.startSession = async (req, res) => {
  try {
    const { focus_choice } = req.body;
    const user       = await User.findById(req.user.id);
    const ema_export = await resolveEmaForMi(user, req.body);

    const response = await axios.post(`${FLASK}/mi/start`, {
      name:         user.name?.trim() || user.operatorId,
      focus_choice,
      user_type:    req.body.user_type || ema_export?.subject?.user_type,
      ema_export,
    });

    res.json(response.data);
  } catch (err) {
    console.error("[mi] startSession:", err.message);
    res.status(500).json({ error: "Failed to start MI session" });
  }
};

// POST /api/mi/chat
exports.chat = async (req, res) => {
  try {
    const { messages, is_final } = req.body;
    const user = await User.findById(req.user.id);

    const ema_export = await resolveEmaForMi(user, req.body);

    const response = await axios.post(`${FLASK}/mi/chat`, {
      name:         user.name?.trim() || user.operatorId,
      messages,
      is_final:     is_final || false,
      focus_choice: req.body.focus_choice,
      user_type:    req.body.user_type || ema_export?.subject?.user_type,
      ema_export,
    });

    res.json(response.data);
  } catch (err) {
    console.error("[mi] chat:", err.message);
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data?.error || "MI chat failed" });
  }
};

// POST /api/mi/finish
exports.finishSession = async (req, res) => {
  try {
    const { focus_choice, messages } = req.body;
    const user       = await User.findById(req.user.id);
    const ema_export = await resolveEmaForMi(user, req.body);

    const flaskRes = await axios.post(`${FLASK}/mi/finish`, {
      name:         user.operatorId,
      focus_choice,
      messages,
      user_type:    req.body.user_type || ema_export?.subject?.user_type,
      ema_export,
    });

    const { analysis, reportText, focusArea, focusKey, ema_loaded } = flaskRes.data;

    const report = await MIReport.create({
      userId:    user._id,
      cadetName: user.operatorId,
      focusArea,
      focusKey,
      analysis,
      reportText,
      messages,
      emaLoaded: ema_loaded || false,
      userType:  ema_export?.subject?.user_type || req.body.user_type || null,
    });

    res.status(201).json({
      message:    "Session complete. Report saved.",
      reportId:   report._id,
      analysis,
      ema_loaded,
    });
  } catch (err) {
    console.error("[mi] finishSession:", err.message);
    res.status(500).json({ error: "Failed to finish MI session" });
  }
};

// GET /api/mi/reports
exports.getReports = async (req, res) => {
  try {
    const reports = await MIReport
      .find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select("-messages");
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/mi/reports/:id
exports.getReportById = async (req, res) => {
  try {
    const report = await MIReport.findOne({
      _id:    req.params.id,
      userId: req.user.id,
    });
    if (!report) return res.status(404).json({ message: "Not found" });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};