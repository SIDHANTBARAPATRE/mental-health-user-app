const axios     = require("axios");
const BAEReport = require("../models/BAEReport");

const FLASK = process.env.FLASK_URL || "http://127.0.0.1:5001";

const proxyPost = async (path, body, res) => {
  const url = `${FLASK}${path}`;
  console.log(`[bae] POST → ${url}`);
  try {
    const r = await axios.post(url, body);
    res.json(r.data);
  } catch (err) {
    console.error(`[bae] POST ${url} failed:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

const proxyGet = async (path, query, res) => {
  const url = `${FLASK}${path}`;
  console.log(`[bae] GET → ${url}`, query);
  try {
    const r = await axios.get(url, { params: query });
    res.json(r.data);
  } catch (err) {
    console.error(`[bae] GET ${url} failed:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.startSession   = (req, res) => proxyPost("/bae/session/start",   req.body, res);
exports.tatSubmit      = (req, res) => proxyPost("/bae/tat/submit",       req.body, res);
exports.tatScene       = (req, res) => proxyGet(`/bae/tat/scene/${req.params.n}`, { session_id: req.query.session_id }, res);
exports.watWords       = (req, res) => proxyGet("/bae/wat/words",         { mode: req.query.mode || "full" }, res);
exports.watSubmit      = (req, res) => proxyPost("/bae/wat/submit",       req.body, res);
exports.srtSituations  = (req, res) => proxyGet("/bae/srt/situations",    { mode: req.query.mode || "full" }, res);
exports.srtSubmit      = (req, res) => proxyPost("/bae/srt/submit",       req.body, res);
exports.sdtPerspectives= (req, res) => proxyGet("/bae/sdt/perspectives",  {}, res);
exports.sdtSubmit      = (req, res) => proxyPost("/bae/sdt/submit",       req.body, res);
exports.baPatterns     = (req, res) => proxyGet("/bae/ba/patterns",       {}, res);
exports.baSubmit       = (req, res) => proxyPost("/bae/ba/submit",        req.body, res);
exports.finishSession  = (req, res) => proxyPost("/bae/session/finish",   req.body, res);

// ── GET /api/bae/session/report?session_id=  → generate PNG + save to MongoDB only ──
exports.getReport = async (req, res) => {
  const { session_id } = req.query;
  const url = `${FLASK}/bae/session/report?session_id=${session_id}`;
  console.log(`[bae] Generating and saving report for session ${session_id}`);
  try {
    // 1. Fetch PNG bytes from Flask
    const flaskRes  = await axios.get(url, { responseType: "arraybuffer" });
    const pngBuffer = Buffer.from(flaskRes.data);
    const base64Png = pngBuffer.toString("base64");

    // 2. Fetch session summary to store alongside
    let summary     = {};
    let sessionMeta = {};
    try {
      const finRes = await axios.post(`${FLASK}/bae/session/finish`, { session_id });
      summary      = finRes.data.summary   || {};
      sessionMeta  = finRes.data;
    } catch (_) {}

    // 3. Save to MongoDB (upsert — no duplicates on retry)
    await BAEReport.findOneAndUpdate(
      { sessionId: session_id },
      {
        userId:    req.user.id,          // ✅ fixed
        sessionId: session_id,
        name:      sessionMeta.name      || "Cadet",
        target:    sessionMeta.target    || "",
        attempt:   sessionMeta.attempt   || "",
        timestamp: sessionMeta.timestamp || new Date().toISOString(),
        summary,
        reportPng: base64Png,
      },
      { upsert: true, new: true }
    );
    console.log(`[bae] Report saved to MongoDB for session ${session_id}`);

    // 4. Return simple success — no file sent to browser
    res.json({ success: true, message: "Report saved to database." });

  } catch (err) {
    console.error("[bae] report save failed:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/bae/reports → list all reports for logged-in user ──────────────
exports.getReports = async (req, res) => {
  try {
    const reports = await BAEReport.find({ userId: req.user.id })  // ✅ fixed
      .select("-reportPng")
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/bae/reports/:id → get one report with PNG ──────────────────────
exports.getReportById = async (req, res) => {
  try {
    const report = await BAEReport.findOne({
      _id: req.params.id, userId: req.user.id  // ✅ fixed
    });
    if (!report) return res.status(404).json({ error: "Report not found" });

    const pngBuffer = Buffer.from(report.reportPng, "base64");
    res.set("Content-Type", "image/png");
    res.set("Content-Disposition", `attachment; filename=BAE_Report_${report.name}_${report.attempt}.png`);
    res.set("Access-Control-Expose-Headers", "Content-Disposition");
    res.send(pngBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── multer upload handler ─────────────────────────────────────────────────────
exports.tatUpload = async (req, res) => {
  const url = `${FLASK}/bae/tat/upload`;
  console.log(`[bae] POST → ${url} (multipart upload)`);
  try {
    const FormData = require("form-data");
    const form     = new FormData();
    if (req.body && req.body.session_id) {
      form.append("session_id", req.body.session_id);
    }
    if (req.files) {
      for (const [fieldname, fileArr] of Object.entries(req.files)) {
        const f = Array.isArray(fileArr) ? fileArr[0] : fileArr;
        form.append(fieldname, f.buffer, { filename: f.originalname, contentType: f.mimetype });
      }
    }
    const r = await axios.post(url, form, { headers: form.getHeaders() });
    res.json(r.data);
  } catch (err) {
    console.error("[bae] upload failed:", err.message);
    res.status(500).json({ error: err.message });
  }
};