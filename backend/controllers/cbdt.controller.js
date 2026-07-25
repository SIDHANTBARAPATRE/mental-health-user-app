const axios      = require("axios");
const CBDTReport = require("../models/CBDTReport");
const User       = require("../models/User");

const FLASK = process.env.FLASK_URL || "http://127.0.0.1:5001";

const ROLE_TO_MODE = {
  cadet:       "nda",
  army_men:    "army",
  ptsd_victim: "terror_survivor",
};

// ── POST /api/cbdt/session/start ─────────────────────────────
// Accepts: { name?, mode? } — defaults from logged-in user profile
exports.startSession = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const name = (req.body.name || user?.name || user?.operatorId || "Participant").trim();
    const mode = req.body.mode || ROLE_TO_MODE[user?.role] || "nda";
    const r = await axios.post(`${FLASK}/cbdt/session/start`, { name, mode });
    res.json(r.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const msg = err.response?.data?.error || err.message;
    console.error("[cbdt] start failed:", msg);
    res.status(status).json({ error: msg });
  }
};

// ── POST /api/cbdt/session/chat ──────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { session_id, message } = req.body;
    if (!session_id) {
      return res.status(400).json({ error: "session_id is required" });
    }
    const r = await axios.post(`${FLASK}/cbdt/session/chat`, { session_id, message });
    res.json(r.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const msg = err.response?.data?.error || err.message;
    console.error("[cbdt] chat failed:", msg);
    res.status(status).json({ error: msg });
  }
};

// ── POST /api/cbdt/session/finish ────────────────────────────
// Calls Flask finish → gets summary + PNG → saves to MongoDB
exports.finishSession = async (req, res) => {
  try {
    const { session_id } = req.body;

    // 1. Get summary + trigger PNG generation on Flask
    const finishRes = await axios.post(`${FLASK}/cbdt/session/finish`, { session_id });
    const summary   = finishRes.data;

    // 2. Fetch the PNG from Flask as binary
    const pngRes    = await axios.get(
      `${FLASK}/cbdt/session/report?session_id=${session_id}`,
      { responseType: "arraybuffer" }
    );
    const base64Png = Buffer.from(pngRes.data).toString("base64");

    // 3. Save to MongoDB (upsert — safe on retry)
    await CBDTReport.findOneAndUpdate(
      { sessionId: session_id },
      {
        userId:           req.user.id,
        sessionId:        session_id,
        name:             summary.name,
        mode:             summary.mode,
        modeLabel:        summary.mode_label,
        timestamp:        summary.timestamp,
        totalTurns:       summary.total_turns,
        distortionCounts: summary.distortion_counts,
        riskFlags:        summary.risk_flags,
        reportPng:        base64Png,
      },
      { upsert: true, new: true }
    );

    console.log(`[cbdt] Report saved to MongoDB for session ${session_id}`);
    res.json({ success: true, message: "CBDT report saved." });

  } catch (err) {
    console.error("[cbdt] finish failed:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/cbdt/reports ────────────────────────────────────
// List all reports for logged-in user (no PNG)
exports.getReports = async (req, res) => {
  try {
    const reports = await CBDTReport.find({ userId: req.user.id })
      .select("-reportPng")
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/cbdt/reports/:id ────────────────────────────────
// Download PNG for one report
exports.getReportById = async (req, res) => {
  try {
    const report = await CBDTReport.findOne({
      _id: req.params.id, userId: req.user.id
    });
    if (!report) return res.status(404).json({ error: "Report not found" });

    const pngBuffer = Buffer.from(report.reportPng, "base64");
    res.set("Content-Type", "image/png");
    res.set("Content-Disposition", `attachment; filename=CBDT_Profile_${report.name}_${report.mode}.png`);
    res.set("Access-Control-Expose-Headers", "Content-Disposition");
    res.send(pngBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};