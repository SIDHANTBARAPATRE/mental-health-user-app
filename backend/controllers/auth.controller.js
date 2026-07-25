const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const VALID_ROLES = ["cadet", "army_men", "ptsd_victim"];

// ================= SIGNUP =================
exports.signup = async (req, res) => {
  try {
    const { operatorId, email, password, role, name } = req.body;

    if (!operatorId || !email || !password || !role)
      return res.status(400).json({ message: "All fields are required." });

    if (!VALID_ROLES.includes(role))
      return res.status(400).json({ message: "Invalid personnel category." });

    const existingUser = await User.findOne({ $or: [{ email }, { operatorId }] });
    if (existingUser)
      return res.status(400).json({ message: "User already exists." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({ operatorId, email, password: hashedPassword, role, name: name?.trim() || "" });

    res.status(201).json({ message: "Registration successful" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Signup failed" });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      $or: [{ email }, { operatorId: email }]
    });

    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      operatorId: user.operatorId,
      role: user.role,
      name: user.name || "",
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Login failed" });
  }
};