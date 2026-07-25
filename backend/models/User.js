const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  operatorId: { type: String, required: true, unique: true },
  name:       { type: String, default: "" },
  email:      { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  role: {
    type:    String,
    required: true,
    enum:    ["cadet", "army_men", "ptsd_victim"],
  },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);