const mongoose = require("mongoose");



const keystrokeMetricsSchema = new mongoose.Schema(

  {

    keystrokes:       { type: Number },

    backspaces:       { type: Number },

    longPauses:       { type: Number },

    peakPauseSec:     { type: Number },

    firstKeyDelaySec: { type: Number },

    revisionRatio:    { type: Number },

    charsPerMin:      { type: Number },

    wordCount:        { type: Number },

    charCount:        { type: Number },

    thinkingIndex:    { type: Number },

    cognitiveNote:    { type: String },

    timeUsed:         { type: Number },

    timedOut:         { type: Boolean },

  },

  { _id: false }

);



const answerSchema = new mongoose.Schema({

  scenarioId:        { type: Number, required: true },

  title:             { type: String, required: true },

  answer:            { type: String, required: true },

  timedOut:          { type: Boolean, default: false },

  timeUsed:          { type: Number },

  timeLimit:         { type: Number },

  keystrokeMetrics:  keystrokeMetricsSchema,

});



const ocSchema = new mongoose.Schema({

  user_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  completedAt: { type: Date, default: Date.now },

  userType:    {

    type: String,

    enum: ["NDA", "ARMY", "NAVY", "AIRFORCE", "PTSD", "NAVY_PTSD"],

    default: "NDA",

  },

  answers:        [answerSchema],

  sessionMetrics: { type: Object, default: {} },

});



module.exports = mongoose.model("Oc", ocSchema);

