// Load environment variables
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const nodemailer = require("nodemailer");

// Models
const User = require("./models/user");
const Feedback = require("./models/feedback");

const app = express();
const PORT = process.env.PORT || 5000;

// Fix Render routing & security warnings
app.disable("x-powered-by");
app.set("trust proxy", 1);

// CORS (Render + Postman Safe)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "User-Agent",
      "Origin",
      "X-Requested-With",
    ],
    credentials: false,
  })
);

// Handle preflight
app.options("*", cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validate ENV
if (!process.env.JWT_SECRET) {
  console.error("❌ ERROR: Missing JWT_SECRET");
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error("❌ ERROR: Missing MONGO_URI");
  process.exit(1);
}

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

// Health check for Render
app.get("/", (req, res) => {
  res.send("SD Fruits Bowl API is running 👍");
});

// --------------------- REGISTER -----------------------
app.post("/api/register", async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password)
      return res
        .status(400)
        .json({ message: "Phone number and password required" });

    const exists = await User.findOne({ phoneNumber });
    if (exists)
      return res.status(409).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    await new User({ phoneNumber, password: hashed }).save();
    res
      .status(201)
      .json({ success: true, message: "User registered successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
});

// --------------------- LOGIN -----------------------
app.post("/api/login", async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password)
      return res
        .status(400)
        .json({ message: "Phone number and password required" });

    const user = await User.findOne({ phoneNumber });
    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      success: true,
      token,
      message: "Login successful",
      userId: user._id,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --------------------- DELETE USER -----------------------
app.delete("/api/delete-user", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber)
      return res.status(400).json({ message: "Phone number required" });

    const result = await User.deleteOne({ phoneNumber });

    if (result.deletedCount === 0)
      return res.status(404).json({ message: "User not found" });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Deletion failed", error: err.message });
  }
});

// ----------------------- FEEDBACK -----------------------
app.post("/api/feedback", async (req, res) => {
  try {
    const { fullName, location, subject, rating, message, date } = req.body;

    if (!fullName || !location || !subject || !rating || !message || !date) {
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });
    }

    await new Feedback({
      fullName,
      location,
      subject,
      rating,
      message,
      date,
    }).save();

    res.json({ success: true, message: "Feedback saved" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ❗️IMPORTANT: DO NOT ADD app.get("*") or any wildcard here!!

// Start server
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
