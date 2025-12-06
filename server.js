// Load environment variables
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');

// Models
const User = require('./models/user');
const Feedback = require('./models/feedback');

const app = express();
const PORT = process.env.PORT || 5000;

// -----------------------------------------
// ✅ Validate required .env variables
// -----------------------------------------
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

if (!JWT_SECRET) {
  console.error("❌ ERROR: JWT_SECRET is not set in .env file");
  process.exit(1);
}

if (!MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI is not set in .env file");
  process.exit(1);
}

// Optional Email Config
if (!process.env.MAIL_USER || !process.env.MAIL_PASS || !process.env.MAIL_TO) {
  console.warn("⚠️ WARNING: Email config missing (.env MAIL_USER, MAIL_PASS, MAIL_TO)");
}

// -----------------------------------------
// Middleware
// -----------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -----------------------------------------
// 🟢 FIX: Render + Postman CORS (FULL UNLOCK)
// -----------------------------------------
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "User-Agent",
    "Origin",
    "X-Requested-With"
  ],
  credentials: false
}));

// Handle OPTIONS preflight for ALL routes
app.options("*", cors());

// -----------------------------------------
// Database Connection
// -----------------------------------------
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch(err => console.error("MongoDB connection error:", err));

// -----------------------------------------
// Test Route
// -----------------------------------------
app.get("/", (req, res) => {
  res.send("SD Fruits Bowl API is running ✅");
});

// -----------------------------------------
// REGISTER
// -----------------------------------------
app.post('/api/register', async (req, res) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).json({ message: "Phone number and password required" });
  }

  try {
    const exists = await User.findOne({ phoneNumber });
    if (exists) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await new User({ phoneNumber, password: hashed }).save();

    res.status(201).json({ success: true, message: "User registered successfully" });

  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

// -----------------------------------------
// LOGIN
// -----------------------------------------
app.post('/api/login', async (req, res) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).json({ message: "Phone number and password required" });
  }

  try {
    const user = await User.findOne({ phoneNumber });

    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });

    res.json({
      success: true,
      message: "Login successful",
      token,
      userId: user._id
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// -----------------------------------------
// DELETE USER
// -----------------------------------------
app.delete('/api/delete-user', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ message: "Phone number required" });
  }

  try {
    const result = await User.deleteOne({ phoneNumber });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, message: "User deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: "Deletion failed", error: err.message });
  }
});

// -----------------------------------------
// FEEDBACK ROUTE
// -----------------------------------------
app.post('/api/feedback', async (req, res) => {
  try {
    const { fullName, location, subject, rating, message, date } = req.body;

    if (!fullName || !location || !subject || !rating || !message || !date) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const allowedSubjects = ['Complaints', 'Suggestions', 'Enquiry', 'General', 'Compliment'];
    const normalized = subject.trim();

    const validSubject = allowedSubjects.find(
      s => s.toLowerCase() === normalized.toLowerCase()
    );

    if (!validSubject) {
      return res.status(400).json({
        success: false,
        message: `Invalid subject. Allowed: ${allowedSubjects.join(', ')}`,
        received: normalized
      });
    }

    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be 1–5"
      });
    }

    await new Feedback({
      fullName: fullName.trim(),
      location: location.trim(),
      subject: validSubject,
      rating: ratingNum,
      message: message.trim(),
      date: date.trim()
    }).save();

    // Optional Email Sending
    let emailSent = false;

    if (process.env.MAIL_USER && process.env.MAIL_PASS && process.env.MAIL_TO) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.MAIL_USER.trim(),
            pass: process.env.MAIL_PASS.trim(),
          },
        });

        await transporter.verify();

        const htmlTemplate = `
          <h2>New Feedback Received</h2>
          <p><b>Name:</b> ${fullName}</p>
          <p><b>Location:</b> ${location}</p>
          <p><b>Subject:</b> ${validSubject}</p>
          <p><b>Rating:</b> ${ratingNum}</p>
          <p><b>Message:</b> ${message}</p>
          <p><b>Date:</b> ${date}</p>
        `;

        await transporter.sendMail({
          from: process.env.MAIL_USER,
          to: process.env.MAIL_TO,
          subject: `New Feedback from ${fullName}`,
          html: htmlTemplate
        });

        emailSent = true;
      } catch (emailError) {
        console.error("Email Error:", emailError.message);
      }
    }

    res.json({
      success: true,
      message: emailSent ? "Feedback saved & email sent" : "Feedback saved",
      emailSent
    });

  } catch (error) {
    console.error("Feedback Error:", error);
    res.status(500).json({ success: false, message: "Feedback failed", error: error.message });
  }
});

// -----------------------------------------
// Start Server
// -----------------------------------------
app.listen(PORT, () => {
  console.log(`Authentication Server running on ${PORT}`);
});
