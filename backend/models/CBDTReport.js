const mongoose = require("mongoose");

const cbdtReportSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: String, required: true, unique: true },
    name:      { type: String },

    // mode: one of the 5 Vanguard protocols
    mode: {
      type: String,
      enum: ["nda", "army", "navy", "air_force", "terror_survivor"],
    },
    modeLabel: { type: String },

    timestamp:        { type: String },
    totalTurns:       { type: Number },
    distortionCounts: { type: Object, default: {} },
    riskFlags:        { type: Array,  default: [] },
    reportPng:        { type: String },   // base64-encoded PNG
  },
  { timestamps: true }
);

module.exports = mongoose.model("CBDTReport", cbdtReportSchema);