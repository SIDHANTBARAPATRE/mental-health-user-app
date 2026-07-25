const mongoose = require("mongoose");

const emaResultSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  operatorId:     String,
  userType:       String,
  model:          String,
  overallScore:   Number,
  band:           String,
  severity:       String,
  pattern:        String,
  sectionScores:  Object,
  feedback:       Object,
  riskFlags:      { type: Array,  default: [] },
  riskFlagCount:  { type: Number, default: 0 },
  miHandoff:      { type: Object, default: null },
  emaExport:      { type: Object, default: null },
  jsonExportPath: { type: String, default: null }

}, { timestamps: true });

module.exports = mongoose.model("EMAResult", emaResultSchema);