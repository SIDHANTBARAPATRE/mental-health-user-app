const mongoose = require("mongoose");

const miReportSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  cadetName:   { type: String, required: true },
  focusArea:   { type: String, required: true },
  focusKey:    { type: String, required: true },

  analysis: {
    readiness_score:     { type: Number },
    avg_words:           { type: Number },
    total_turns:         { type: Number },
    change_talk_markers: { type: [String] },
    resistance_markers:  { type: [String] }
  },

  reportText:  { type: String, required: true },
  messages:    { type: Array,  default: [] },
  emaLoaded:   { type: Boolean, default: false },
  userType:    { type: String, default: null }

}, { timestamps: true });

module.exports = mongoose.model("MIReport", miReportSchema);