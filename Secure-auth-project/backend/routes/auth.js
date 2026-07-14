const express = require("express");
const router = express.Router();
const humanCheck = require("../middleware/humanCheck");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
 
const User = require("../models/User");
 
require("dotenv").config();
 
const SECRET_KEY = process.env.SECRET_KEY || "secret123";
 
/* ================= EMAIL ================= */
 
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
 
/* ================= HELPERS ================= */
 
function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{15,}$/.test(password);
}
 
function getIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]
    || req.socket.remoteAddress;
}
 
/* ================= REGISTER ================= */
 
router.post("/register", humanCheck, async (req, res) => {
 
  try {
 
    const {
      username,
      email,
      password,
      questions,
      authImage,
      authKeyword
    } = req.body;
 
    /* PASSWORD STRENGTH */
 
    if (!isStrongPassword(password)) {
 
      return res.status(400).json({
        message: "Weak password. Must be 15+ characters with upper, lower, number, and special character."
      });
    }
 
    /* SECURITY QUESTIONS */
 
    if (!questions || questions.length !== 3) {
 
      return res.status(400).json({
        message: "3 security questions required"
      });
    }
 
    /* IMAGE AUTH */
 
    if (!authImage) {
 
      return res.status(400).json({
        message: "Select authentication image"
      });
    }
 
    /* KEYWORD AUTH */
 
    if (!authKeyword || authKeyword.trim() === "") {
 
      return res.status(400).json({
        message: "Authentication keyword is required"
      });
    }
 
    /* CHECK USERNAME */
 
    const existingUser =
      await User.findOne({ username });
 
    if (existingUser) {
 
      return res.status(400).json({
        message: "Username already exists"
      });
    }
 
    /* CHECK EMAIL */
 
    const existingEmail =
      await User.findOne({ email });
 
    if (existingEmail) {
 
      return res.status(400).json({
        message: "Email already exists"
      });
    }
 
    /* HASH PASSWORD */
 
    const hashedPassword =
      await bcrypt.hash(password, 10);
 
    /* HASH SECURITY ANSWERS */
 
    const hashedQuestions =
      await Promise.all(
 
        questions.map(async (q) => ({
 
          question: q.question,
 
          answer:
            await bcrypt.hash(q.answer.toLowerCase().trim(), 10)
 
        }))
      );
 
    /* HASH KEYWORD */
 
    const hashedKeyword =
      await bcrypt.hash(authKeyword.toLowerCase().trim(), 10);
 
    /* CREATE USER */
 
    const user = new User({
 
      username,
 
      email,
 
      password: hashedPassword,
 
      passwordHistory: [hashedPassword],
 
      securityQuestions: hashedQuestions,
 
      authImage,
 
      authKeyword: hashedKeyword
 
    });
 
    await user.save();
 
    res.json({
      message: "Registration successful"
    });
 
  } catch (err) {
 
    console.log(err);
 
    res.status(500).json({
      message: "Server error"
    });
  }
});
 
/* ================= LOGIN IMAGES ================= */
 
router.post("/login-images", async (req, res) => {
 
  try {
 
    const { username } = req.body;
 
    const user = await User.findOne({ username });
 
    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }
 
    const allImages = [
      "cat.jpg",
      "dog.jpg",
      "car.jpg",
      "tree.jpg",
      "beach.jpg",
      "moon.jpg"
    ];
 
    const correctImage = user.authImage;
 
    const otherImages = allImages.filter(img => img !== correctImage);
 
    // pick 2 random wrong images
    otherImages.sort(() => Math.random() - 0.5);
    const wrongImages = otherImages.slice(0, 2);
 
    // combine and shuffle
    const images = [correctImage, ...wrongImages];
    images.sort(() => Math.random() - 0.5);
 
    res.json({ images });
 
  } catch (err) {
 
    console.log(err);
 
    res.status(500).json({
      message: "Server error"
    });
  }
});
 
/* ================= VERIFY IMAGE ================= */
 
router.post("/verify-image", async (req, res) => {
 
  try {
 
    const {
      username,
      image
    } = req.body;
 
    const user =
      await User.findOne({ username });
 
    if (!user) {
 
      return res.status(400).json({
        message: "User not found"
      });
    }
 
    if (user.authImage !== image) {
 
      return res.status(400).json({
        message: "Wrong image selected"
      });
    }
 
    res.json({
      message: "Image verified successfully"
    });
 
  } catch (err) {
 
    console.log(err);
 
    res.status(500).json({
      message: "Server error"
    });
  }
});
 
/* ================= VERIFY KEYWORD ================= */
 
router.post("/verify-keyword", async (req, res) => {
 
  try {
 
    const { username, keyword } = req.body;
 
    const user = await User.findOne({ username });
 
    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }
 
    const valid = await bcrypt.compare(
      keyword.toLowerCase().trim(),
      user.authKeyword
    );
 
    if (!valid) {
      return res.status(400).json({
        message: "Wrong keyword"
      });
    }
 
    res.json({
      message: "Keyword verified successfully"
    });
 
  } catch (err) {
 
    console.log(err);
 
    res.status(500).json({
      message: "Server error"
    });
  }
});
 
/* ================= LOGIN ================= */
 
router.post("/login", async (req, res) => {
 
  try {
 
    const {
      username,
      password
    } = req.body;
 
    const user =
      await User.findOne({ username });
 
    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }
 
    if (user.accountLocked) {
      return res.status(403).json({
        message: "Account locked. Please reset your password to unlock."
      });
    }
 
    const passwordExpired =
      Date.now() - user.passwordCreatedAt >
      90 * 24 * 60 * 60 * 1000;
 
    if (passwordExpired) {
      return res.status(403).json({
        message: "Password expired. Reset required."
      });
    }
 
    const validPassword =
      await bcrypt.compare(
        password,
        user.password
      );
 
    if (!validPassword) {
 
      user.failedAttempts += 1;
 
      if (user.failedAttempts >= 3) {
        user.accountLocked = true;
      }
 
      await user.save();
 
      const remaining = 3 - user.failedAttempts;
 
      return res.status(400).json({
        message: remaining > 0
          ? `Incorrect password. ${remaining} attempt(s) remaining.`
          : "Account locked due to 3 failed attempts. Reset your password to unlock."
      });
    }
 
    user.failedAttempts = 0;
 
    const currentIP = getIP(req);
 
    const currentDevice =
      req.headers["user-agent"];
 
    let additionalAuth = false;
 
    if (
      user.lastIP &&
      user.lastIP !== currentIP
    ) {
      additionalAuth = true;
    }
 
    if (
      user.lastDevice &&
      user.lastDevice !== currentDevice
    ) {
      additionalAuth = true;
    }
 
    user.lastIP = currentIP;
    user.lastDevice = currentDevice;
 
    await user.save();
 
    // randomly pick authentication method: "image" or "keyword"
    const authMethod = Math.random() < 0.5 ? "image" : "keyword";
 
    const token = jwt.sign(
      { id: user._id },
      SECRET_KEY,
      { expiresIn: "1h" }
    );
 
    res.json({
      message: "Login successful",
      token,
      additionalAuth,
      authMethod
    });
 
  } catch (err) {
 
    console.log(err);
 
    res.status(500).json({
      message: "Server error"
    });
  }
});
 
/* ================= SEND OTP ================= */
 
router.post("/send-otp", async (req, res) => {
 
  try {
 
    const { email } = req.body;
 
    const user =
      await User.findOne({ email });
 
    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }
 
    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
 
    user.otp = otp;
 
    user.otpExpires =
      Date.now() + 5 * 60 * 1000;
 
    await user.save();
 
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "OTP Verification",
      text: `Your OTP code is ${otp}`
    });
 
    res.json({
      message: "OTP sent successfully"
    });
 
  } catch (err) {
 
    console.log(err);
 
    res.status(500).json({
      message: "Server error"
    });
  }
});
 
/* ================= VERIFY OTP ================= */
 
router.post("/verify-otp", async (req, res) => {
 
  try {
 
    const { email, otp } = req.body;
 
    const user =
      await User.findOne({ email });
 
    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }
 
    if (
      user.otp !== otp ||
      user.otpExpires < Date.now()
    ) {
      return res.status(400).json({
        message: "Invalid or expired OTP"
      });
    }
 
    user.otp = null;
    user.otpExpires = null;
 
    await user.save();
 
    res.json({
      message: "OTP verified"
    });
 
  } catch (err) {
 
    console.log(err);
 
    res.status(500).json({
      message: "Server error"
    });
  }
});
 
/* ================= GET SECURITY QUESTIONS ================= */
 
router.post("/get-questions", async (req, res) => {
 
  try {
 
    const { email } = req.body;
 
    const user =
      await User.findOne({ email });
 
    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }
 
    res.json({
      questions:
        user.securityQuestions.map(
          q => q.question
        )
    });
 
  } catch (err) {
 
    console.log(err);
 
    res.status(500).json({
      message: "Server error"
    });
  }
});
 
/* ================= VERIFY QUESTIONS ================= */
 
router.post("/verify-questions", async (req, res) => {
 
  try {
 
    const { email, answers } = req.body;
 
    const user =
      await User.findOne({ email });
 
    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }
 
    const valid = await Promise.all(
      user.securityQuestions.map((q, i) =>
        bcrypt.compare(
          answers[i].toLowerCase().trim(),
          q.answer
        )
      )
    );
 
    if (valid.includes(false)) {
      return res.status(400).json({
        message: "Incorrect answers"
      });
    }
 
    const token =
      crypto.randomBytes(32).toString("hex");
 
    user.resetToken = token;
 
    user.resetTokenExpire =
      Date.now() + 10 * 60 * 1000;
 
    await user.save();
 
    res.json({
      message: "Security answers correct",
      token
    });
 
  } catch (err) {
 
    console.log(err);
 
    res.status(500).json({
      message: "Server error"
    });
  }
});
 
/* ================= SEND RESET LINK ================= */
router.post("/send-reset-link", async (req, res) => {
  try {
    const { email } = req.body;
 
    const user = await User.findOne({ email });
 
    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }
 
    const token = crypto.randomBytes(32).toString("hex");
 
    user.resetToken = token;
    user.resetTokenExpire = Date.now() + 15 * 60 * 1000;
 
    await user.save();
 
    const resetLink = `http://127.0.0.1:5500/reset.html?token=${token}`;
 
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Link",
      text: `Click this link to reset your password:\n\n${resetLink}`
    });
 
    console.log("RESET EMAIL SENT:", info.messageId);
 
    return res.json({
      message: "Reset link sent to email"
    });
 
  } catch (err) {
    console.log("RESET ERROR:", err);
 
    return res.status(500).json({
      message: "Failed to send reset email"
    });
  }
});
 
/* ================= FORGOT USERNAME ================= */
 
router.post("/forgot-username", async (req, res) => {
 
  try {
 
    const { email } = req.body;
 
    const user =
      await User.findOne({ email });
 
    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }
 
    await transporter.sendMail({
 
      from: process.env.EMAIL_USER,
 
      to: email,
 
      subject: "Your Username",
 
      text:
        `Your username is: ${user.username}`
    });
 
    res.json({
      message: "Username sent to email"
    });
 
  } catch (err) {
 
    console.log(err);
 
    res.status(500).json({
      message: "Server error"
    });
  }
});
 
/* ================= RESET PASSWORD ================= */
 
router.post("/reset-password", async (req, res) => {
 
  try {
 
    const {
      token,
      newPassword
    } = req.body;
 
    const user = await User.findOne({
 
      resetToken: token,
 
      resetTokenExpire: {
        $gt: Date.now()
      }
    });
 
    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired token"
      });
    }
 
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message: "Weak password. Must be 15+ characters with upper, lower, number, and special character."
      });
    }
 
    for (let oldPassword of user.passwordHistory) {
 
      const reused =
        await bcrypt.compare(
          newPassword,
          oldPassword
        );
 
      if (reused) {
        return res.status(400).json({
          message:
            "Cannot reuse any of your previous 10 passwords"
        });
      }
    }
 
    const hashedPassword =
      await bcrypt.hash(newPassword, 10);
 
    user.password = hashedPassword;
 
    user.passwordCreatedAt = Date.now();
 
    user.passwordHistory.push(hashedPassword);
 
    if (user.passwordHistory.length > 10) {
      user.passwordHistory.shift();
    }
 
    user.accountLocked = false;
    user.failedAttempts = 0;
 
    user.resetToken = null;
    user.resetTokenExpire = null;
 
    await user.save();
 
    res.json({
      message: "Password reset successful"
    });
 
  } catch (err) {
 
    console.log(err);
 
    res.status(500).json({
      message: "Server error"
    });
  }
});
 
module.exports = router;