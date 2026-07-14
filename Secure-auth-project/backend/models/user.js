const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  username: {
    type: String,
    required: true,
    unique: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  authImage: {
    type: String,
    default: ""
  },

  authKeyword: {
    type: String,
    default: ""
  },

  passwordHistory: {
    type: [String],
    default: []
  },

  securityQuestions: [
    {
      question: String,
      answer: String
    }
  ],

  failedAttempts: {
    type: Number,
    default: 0
  },

  accountLocked: {
    type: Boolean,
    default: false
  },

  lastIP: {
    type: String,
    default: ""
  },

  lastDevice: {
    type: String,
    default: ""
  },

  passwordCreatedAt: {
    type: Date,
    default: Date.now
  },

  otp: String,

  otpExpires: Date,

  resetToken: String,

  resetTokenExpire: Date

});

module.exports =
  mongoose.model("User", userSchema);