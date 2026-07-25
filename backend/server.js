const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");

require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const emaRoutes  = require("./routes/ema.routes.js");
const miRoutes   = require("./routes/mi.routes");
const baeRoutes  = require("./routes/bae.routes");
const cbdtRoutes = require("./routes/cbdt.routes");
const ocRoutes   = require("./routes/oc.routes");   // ← added

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/ema",  emaRoutes);
app.use("/api/mi",   miRoutes);
app.use("/api/bae",  baeRoutes);
app.use("/api/cbdt", cbdtRoutes);
app.use("/api/oc",   ocRoutes);                     // ← added

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo Connected"))
  .catch(err => console.log(err));

app.listen(process.env.PORT, () =>
  console.log("Server running on port", process.env.PORT)
);