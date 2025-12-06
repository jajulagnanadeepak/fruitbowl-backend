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

// Validate required environment variables
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

// Optional email config
if (!process.env.MAIL_USER || !process.env.MAIL_PASS || !process.env.MAIL_TO) {
    console.warn("⚠️ WARNING: Email configuration missing (.env MAIL_USER, MAIL_PASS, MAIL_TO)");
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*" }));

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch(err => console.error("MongoDB connection error:", err));

// REGISTER
app.post('/api/register', async (req, res) => {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password)
        return res.status(400).json({ message: "Phone number and password required." });

    try {
        const exists = await User.findOne({ phoneNumber });
        if (exists)
            return res.status(409).json({ message: "User already exists." });

        await new User({ phoneNumber, password }).save();
        res.status(201).json({ success: true, message: "User registered successfully" });

    } catch (err) {
        res.status(500).json({ message: "Registration failed", error: err.message });
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password)
        return res.status(400).json({ message: "Phone number and password required." });

    try {
        const user = await User.findOne({ phoneNumber });
        if (!user) return res.status(401).json({ message: "Invalid credentials." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials." });

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

// DELETE USER
app.delete('/api/delete-user', async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber)
        return res.status(400).json({ message: "Phone number required." });

    try {
        const result = await User.deleteOne({ phoneNumber });

        if (result.deletedCount === 0)
            return res.status(404).json({ message: "User not found." });

        res.json({ success: true, message: "User deleted successfully." });

    } catch (err) {
        res.status(500).json({ message: "Deletion failed", error: err.message });
    }
});

// --------------------------------------------------
// ⭐ FEEDBACK ROUTE — Save + Send Premium Email
// --------------------------------------------------
app.post('/api/feedback', async (req, res) => {
    try {
        const { fullName, location, subject, rating, message, date } = req.body;

        // Validate required fields
        if (!fullName || !location || !subject || !rating || !message || !date) {
            return res.status(400).json({ 
                success: false, 
                message: "All fields are required: fullName, location, subject, rating, message, date" 
            });
        }

        // Normalize and validate subject
        const allowedSubjects = ['Complaints', 'Suggestions', 'Enquiry', 'General', 'Compliment'];
        const normalizedSubject = subject.trim();
        
        // Check if subject is valid (case-insensitive)
        const validSubject = allowedSubjects.find(
            s => s.toLowerCase() === normalizedSubject.toLowerCase()
        );

        if (!validSubject) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid subject. Allowed values: ${allowedSubjects.join(', ')}`,
                received: normalizedSubject
            });
        }

        // Validate rating
        const ratingNum = Number(rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({ 
                success: false, 
                message: "Rating must be a number between 1 and 5" 
            });
        }

        // Save Feedback (use normalized subject)
        await new Feedback({
            fullName: fullName.trim(),
            location: location.trim(),
            subject: validSubject, // Use the properly capitalized version
            rating: ratingNum,
            message: message.trim(),
            date: date.trim()
        }).save();

        // Email Config
        const mailUser = process.env.MAIL_USER?.trim();
        const mailPass = process.env.MAIL_PASS?.trim();
        const mailTo = process.env.MAIL_TO?.trim();

        let emailSent = false;

        if (mailUser && mailPass && mailTo) {
            try {
                const transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: { user: mailUser, pass: mailPass },
                });

                await transporter.verify();

                // Gmail-safe premium template (use normalized values)
                const htmlTemplate = `
<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background:#f2f2f2; font-family:Arial, sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
  <tr>
    <td align="center">

      <table width="650" cellpadding="0" cellspacing="0" 
        style="background:#ffffff; border-radius:10px; padding:25px; border:1px solid #e5e5e5;">

        <tr>
          <td align="center" style="padding-bottom:20px;">
            <div style="font-size:32px; color:#ffb400;">⭐</div>
            <div style="font-size:26px; font-weight:bold; color:#333333;">
              New Feedback Received
            </div>
            <div style="width:100%; height:2px; background:#e0e0e0; margin-top:20px;"></div>
          </td>
        </tr>

        <tr>
          <td>
            <table width="100%" cellpadding="10">

              <tr>
                <td width="30%" style="font-weight:bold; color:#0066cc; font-size:16px;">Name:</td>
                <td style="color:#222; font-size:16px;">${fullName.trim()}</td>
              </tr>

              <tr>
                <td style="font-weight:bold; color:#0066cc; font-size:16px;">Location:</td>
                <td style="color:#222; font-size:16px;">${location.trim()}</td>
              </tr>

              <tr>
                <td style="font-weight:bold; color:#0066cc; font-size:16px;">Subject:</td>
                <td style="color:#222; font-size:16px;">${validSubject}</td>
              </tr>

              <tr>
                <td style="font-weight:bold; color:#0066cc; font-size:16px;">Rating:</td>
                <td style="color:#ffb400; font-size:18px; font-weight:bold;">⭐ ${ratingNum}</td>
              </tr>

            </table>
          </td>
        </tr>

        <tr>
          <td style="padding-top:25px;">
            <div style="font-weight:bold; color:#0066cc; font-size:17px; margin-bottom:10px;">
              Message:
            </div>

            <div style="background:#f9fbff; border:1px solid #c7ddff; border-left:5px solid #4a90e2;
              padding:15px; color:#444; line-height:1.5; font-size:15px; border-radius:6px;">
              ${message.trim()}
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding-top:25px; font-size:15px; color:#333;">
            <b style="color:#0066cc;">Date:</b> ${date.trim()}
          </td>
        </tr>

        <tr>
          <td align="center" style="padding-top:35px;">
            <p style="font-size:13px; color:#888;">
              This is an automated message from your Feedback System.
            </p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;

                await transporter.sendMail({
                    from: mailUser,
                    to: mailTo,
                    subject: `New Feedback from ${fullName}`,
                    html: htmlTemplate
                });

                emailSent = true;
                console.log("📩 Email sent successfully!");
            } catch (emailError) {
                console.error("Email Error:", emailError.message);
            }
        }

        res.json({
            success: true,
            message: emailSent ? "Feedback saved & email sent" : "Feedback saved (email skipped)",
            emailSent
        });

    } catch (error) {
        console.error("Feedback Error:", error);
        res.status(500).json({ success: false, message: "Feedback failed", error: error.message });
    }
});

// Start Server
app.listen(PORT, () =>
    console.log(`Authentication Server running on ${PORT}`)
);
