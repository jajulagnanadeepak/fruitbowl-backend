// Load environment variables
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const User = require("./models/user");
const Feedback = require("./models/feedback");

const app = express();
const PORT = process.env.PORT || 5000;

// Basic security
app.disable("x-powered-by");
app.set("trust proxy", 1);

// CORS (safe for Render + Postman)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validate ENV
if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

// Health check
app.get("/", (req, res) => {
  res.send("SD Fruits Bowl API is running 👍");
});

// ---------------- REGISTER ----------------
app.post("/api/register", async (req, res) => {
  try {
    let { phoneNumber, password } = req.body;

    phoneNumber = String(phoneNumber); // FIX #1

    if (!phoneNumber || !password)
      return res.status(400).json({ message: "Phone number and password required" });

    const exists = await User.findOne({ phoneNumber });
    if (exists)
      return res.status(409).json({ message: "User already exists" });

    // Schema will hash password automatically
    const user = new User({ phoneNumber, password });
    await user.save();

    res.status(201).json({ success: true, message: "User registered successfully" });

  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

// ---------------- LOGIN ----------------
app.post("/api/login", async (req, res) => {
  try {
    let { phoneNumber, password } = req.body;

    phoneNumber = String(phoneNumber); // FIX #2

    const user = await User.findOne({ phoneNumber });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const match = await user.matchPassword(password); // FIX #3
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ success: true, token, message: "Login successful", userId: user._id });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ---------------- DELETE USER ----------------
app.delete("/api/delete-user", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    const result = await User.deleteOne({ phoneNumber: String(phoneNumber) });

    if (result.deletedCount === 0)
      return res.status(404).json({ message: "User not found" });

    res.json({ success: true, message: "User deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: "Deletion failed", error: err.message });
  }
});

// ---------------- FEEDBACK ----------------
app.post("/api/feedback", async (req, res) => {
  try {
    const { fullName, location, subject, rating, message, date } = req.body;

    if (!fullName || !location || !subject || !rating || !message || !date)
      return res.status(400).json({ success: false, message: "All fields required" });

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

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
