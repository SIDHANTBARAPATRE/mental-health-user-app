const Oc = require("../models/Oc");

const VALID_USER_TYPES = ["NDA", "ARMY", "NAVY", "AIRFORCE", "PTSD", "NAVY_PTSD"];

exports.saveAssessment = async (req, res) => {
  try {
    const { answers, userType, sessionMetrics } = req.body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: "No answers provided" });
    }

    const resolvedUserType = VALID_USER_TYPES.includes(userType) ? userType : "NDA";

    const record = new Oc({
      user_id: req.user.id,
      userType: resolvedUserType,
      answers,
      sessionMetrics: sessionMetrics || {},
    });

    await record.save();
    res.status(201).json({ message: "Assessment saved", id: record._id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};