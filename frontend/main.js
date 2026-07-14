const API = "http://localhost:5000/api/auth";

let captchaNum1 = 0;
let captchaNum2 = 0;
let resetToken = null;
let formStartTime = 0;

/* ================= CAPTCHA ================= */

function generateCaptcha() {
  captchaNum1 = Math.floor(Math.random() * 10);
  captchaNum2 = Math.floor(Math.random() * 10);

  const el = document.getElementById("captchaQuestion");
  if (el) {
    el.innerText = `What is ${captchaNum1} + ${captchaNum2}?`;
  }
}

generateCaptcha();

/* ================= PASSWORD STRENGTH ================= */

function evaluateStrength(password) {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 15) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*?&]/.test(password)) score++;

  if (score <= 2) return { label: "Weak", color: "#e74c3c", width: "33%" };
  if (score <= 4) return { label: "Moderate", color: "#f39c12", width: "66%" };
  return { label: "Strong", color: "#2ecc71", width: "100%" };
}

function checkStrength() {
  const password = document.getElementById("regPassword").value;
  const strength = evaluateStrength(password);

  const bar = document.getElementById("strengthBar");
  const text = document.getElementById("strengthText");

  bar.style.width = password.length === 0 ? "0%" : strength.width;
  bar.style.background = strength.color;
  text.innerText = password.length === 0 ? "" : `Password strength: ${strength.label}`;
  text.style.color = strength.color;
}

function checkResetStrength() {
  const password = document.getElementById("newPassword").value;
  const strength = evaluateStrength(password);

  const bar = document.getElementById("resetStrengthBar");
  const text = document.getElementById("resetStrengthText");

  bar.style.width = password.length === 0 ? "0%" : strength.width;
  bar.style.background = strength.color;
  text.innerText = password.length === 0 ? "" : `Password strength: ${strength.label}`;
  text.style.color = strength.color;
}

/* ================= IMAGE SELECTION ================= */

let selectedImageEl = null;

function selectImage(imageName, el) {
  document.getElementById("authImage").value = imageName;

  if (selectedImageEl) {
    selectedImageEl.style.borderColor = "transparent";
  }

  el.style.borderColor = "#4a6cf7";
  selectedImageEl = el;
}

/* ================= REGISTER ================= */

async function register() {

  const captchaAnswer =
    parseInt(document.getElementById("captchaAnswer").value);

  if (captchaAnswer !== captchaNum1 + captchaNum2) {
    showMsg("registerMessage", "Captcha wrong", "red");
    generateCaptcha();
    return;
  }

  const password = document.getElementById("regPassword").value;

  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{15,}$/.test(password)) {
    showMsg("registerMessage",
      "Password must be 15+ characters with uppercase, lowercase, number, and special character (@$!%*?&).",
      "red");
    return;
  }

  const authImage = document.getElementById("authImage").value;
  if (!authImage) {
    showMsg("registerMessage", "Please select an authentication image.", "red");
    return;
  }

  const authKeyword = document.getElementById("authKeyword").value.trim();
  if (!authKeyword) {
    showMsg("registerMessage", "Please enter an authentication keyword.", "red");
    return;
  }

  const data = {
    username: document.getElementById("regUsername").value,
    email: document.getElementById("regEmail").value,
    password: password,
    authImage: authImage,
    authKeyword: authKeyword,
    startTime: Date.now() - 2000,
    questions: [
      { question: document.getElementById("q1").value, answer: document.getElementById("a1").value },
      { question: document.getElementById("q2").value, answer: document.getElementById("a2").value },
      { question: document.getElementById("q3").value, answer: document.getElementById("a3").value }
    ]
  };

  try {
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (res.ok) {
      showMsg("registerMessage", result.message, "green");
      setTimeout(() => showLogin(), 1500);
    } else {
      showMsg("registerMessage", result.message, "red");
    }
  } catch (err) {
    showMsg("registerMessage", "Connection error", "red");
  }
}

/* ================= LOGIN ================= */

async function login() {

  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("pendingUser", username);
      localStorage.setItem("authMethod", data.authMethod);

      if (data.additionalAuth) {
        showMsg("authMessage", "Additional authentication required (IP/device change detected).", "orange");
      }

      // always go to auth page - randomly picks image or keyword
      window.location.href = "auth.html";
    } else {
      showMsg("authMessage", data.message, "red");
    }
  } catch (err) {
    showMsg("authMessage", "Connection error", "red");
  }
}

/* ================= FORGOT USERNAME ================= */

async function forgotUsername() {

  const email = document.getElementById("forgotUsernameEmail").value;

  try {
    const res = await fetch(`${API}/forgot-username`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    showMsg("forgotUsernameMessage", data.message, res.ok ? "green" : "red");
  } catch (err) {
    showMsg("forgotUsernameMessage", "Connection error", "red");
  }
}

/* ================= RESET FLOW ================= */

async function loadQuestions() {

  const email = document.getElementById("resetEmail").value;

  if (!email) {
    showMsg("resetMessage", "Enter your email first", "red");
    return;
  }

  try {
    const res = await fetch(`${API}/get-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (res.ok) {
      document.getElementById("qDisplay1").innerText = data.questions[0];
      document.getElementById("qDisplay2").innerText = data.questions[1];
      document.getElementById("qDisplay3").innerText = data.questions[2];
      showMsg("resetMessage", "Questions loaded. Answer them below.", "green");
    } else {
      showMsg("resetMessage", data.message, "red");
    }
  } catch (err) {
    showMsg("resetMessage", "Connection error", "red");
  }
}

async function verifySecurity() {

  const email = document.getElementById("resetEmail").value;

  try {
    const res = await fetch(`${API}/verify-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        answers: [
          document.getElementById("ans1").value,
          document.getElementById("ans2").value,
          document.getElementById("ans3").value
        ]
      })
    });

    const data = await res.json();

    if (res.ok) {
      resetToken = data.token;
      document.getElementById("resetPasswordFields").style.display = "block";
      showMsg("resetMessage", "Answers correct! Enter your new password below.", "green");
    } else {
      showMsg("resetMessage", data.message, "red");
    }
  } catch (err) {
    showMsg("resetMessage", "Connection error", "red");
  }
}

async function resetPassword() {

  const newPassword = document.getElementById("newPassword").value;

  if (!resetToken) {
    showMsg("resetMessage", "Verify security questions first", "red");
    return;
  }

  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{15,}$/.test(newPassword)) {
    showMsg("resetMessage",
      "Password must be 15+ characters with uppercase, lowercase, number, and special character.",
      "red");
    return;
  }

  try {
    const res = await fetch(`${API}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken, newPassword })
    });

    const data = await res.json();

    if (res.ok) {
      showMsg("resetMessage", data.message, "green");
      resetToken = null;
      setTimeout(() => showLogin(), 2000);
    } else {
      showMsg("resetMessage", data.message, "red");
    }
  } catch (err) {
    showMsg("resetMessage", "Connection error", "red");
  }
}

async function sendResetLink() {

  const email = document.getElementById("resetEmail").value;

  if (!email) {
    showMsg("resetMessage", "Enter your email first", "red");
    return;
  }

  try {
    const res = await fetch(`${API}/send-reset-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    showMsg("resetMessage", data.message, res.ok ? "green" : "red");
  } catch (err) {
    showMsg("resetMessage", "Connection error", "red");
  }
}

/* ================= UI NAVIGATION ================= */

function hideAll() {
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("registerSection").style.display = "none";
  document.getElementById("forgotSection").style.display = "none";
  document.getElementById("forgotUsernameSection").style.display = "none";
  document.getElementById("resetSection").style.display = "none";
}

function showLogin() {
  hideAll();
  document.getElementById("loginSection").style.display = "block";
}

function showRegister() {
  hideAll();
  document.getElementById("registerSection").style.display = "block";
  formStartTime = Date.now();
  generateCaptcha();
}

function showForgot() {
  hideAll();
  document.getElementById("forgotSection").style.display = "block";
}

function showForgotUsername() {
  hideAll();
  document.getElementById("forgotUsernameSection").style.display = "block";
}

function showReset() {
  hideAll();
  document.getElementById("resetSection").style.display = "block";
}

/* ================= HELPER ================= */

function showMsg(elementId, message, color) {
  const el = document.getElementById(elementId);
  if (el) {
    el.innerText = message;
    el.style.color = color;
  }
}