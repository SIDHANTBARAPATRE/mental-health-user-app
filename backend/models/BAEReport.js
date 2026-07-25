const mongoose = require("mongoose");

const BAEReportSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sessionId:  { type: String, required: true },
  name:       { type: String, required: true },
  target:     { type: String, required: true },
  attempt:    { type: String, required: true },
  timestamp:  { type: String },
  summary:    { type: Object },   // composite, readiness, olq_averages etc
  reportPng:  { type: String },   // base64 encoded PNG
}, { timestamps: true });

module.exports = mongoose.model("BAEReport", BAEReportSchema);