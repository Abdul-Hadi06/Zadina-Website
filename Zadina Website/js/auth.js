// ═══════════════════════════════════════════════════════
//  auth.js  —  Login · Sign-up · Google · Facebook · Apple
//              · Forgot password
//  Firestore collection:  users/{uid}
//  Used by:  pages/login.html
// ═══════════════════════════════════════════════════════

import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Toggle login / signup panels ─────────────────────
window.showAuth = function (panel) {
  clearMsg();
  document.getElementById("login-container").classList.toggle("hidden", panel !== "login");
  document.getElementById("signup-container").classList.toggle("hidden", panel !== "signup");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// ── Save user doc to Firestore (best-effort) ──────────
async function createUserDoc(user, extra = {}) {
  try {
    const ref  = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid:       user.uid,
        email:     user.email || "",
        name:      user.displayName || extra.name || "",
        createdAt: serverTimestamp(),
        ...extra
      });
    }
  } catch (e) {
    console.warn("Firestore user doc save failed (non-critical):", e.message);
  }
}

// ── Shared social sign-in handler ────────────────────
async function socialSignIn(provider, panel) {
  clearMsg();
  try {
    const cred = await signInWithPopup(auth, provider);
    await createUserDoc(cred.user);
    window.location.href = "../../index.html";
  } catch (err) {
    console.error("Social sign-in error:", err.code, err.message);
    if (err.code !== "auth/popup-closed-by-user" &&
        err.code !== "auth/cancelled-popup-request") {
      showMsg(panel, friendlyError(err.code, err.message), "error");
    }
  }
}

// ── LOGIN ─────────────────────────────────────────────
document.getElementById("login-btn")?.addEventListener("click", async () => {
  clearMsg();
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const remember = document.getElementById("rem")?.checked;

  if (!email || !password) {
    showMsg("login", "Please enter your email and password.", "error");
    return;
  }

  setBtnLoading("login-btn", true, "Logging in…");
  try {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "../../index.html";
  } catch (err) {
    console.error("Login error:", err.code, err.message);
    showMsg("login", friendlyError(err.code, err.message), "error");
    setBtnLoading("login-btn", false, "Log In");
  }
});

// ── LOGIN — Google ────────────────────────────────────
document.getElementById("login-google-btn")?.addEventListener("click", () => {
  socialSignIn(new GoogleAuthProvider(), "login");
});

// ── LOGIN — Facebook ──────────────────────────────────
document.getElementById("login-facebook-btn")?.addEventListener("click", () => {
  const provider = new FacebookAuthProvider();
  provider.addScope("email");
  provider.addScope("public_profile");
  socialSignIn(provider, "login");
});

// ── LOGIN — Apple ─────────────────────────────────────
document.getElementById("login-apple-btn")?.addEventListener("click", () => {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  socialSignIn(provider, "login");
});

// ── SIGN UP ───────────────────────────────────────────
document.getElementById("signup-btn")?.addEventListener("click", async () => {
  clearMsg();
  const name     = document.getElementById("signup-name").value.trim();
  const email    = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const terms    = document.getElementById("terms")?.checked;

  if (!name)     { showMsg("signup", "Please enter your full name.", "error"); return; }
  if (!email)    { showMsg("signup", "Please enter your email address.", "error"); return; }
  if (!password) { showMsg("signup", "Please enter a password.", "error"); return; }
  if (!terms)    { showMsg("signup", "Please accept the Terms & Privacy Policy.", "error"); return; }
  if (password.length < 6) {
    showMsg("signup", "Password must be at least 6 characters.", "error"); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMsg("signup", "Please enter a valid email address.", "error"); return;
  }

  setBtnLoading("signup-btn", true, "Creating account…");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await createUserDoc(cred.user, { name });
    await signOut(auth);

    // Reset form
    document.getElementById("signup-name").value     = "";
    document.getElementById("signup-email").value    = "";
    document.getElementById("signup-password").value = "";
    const termsBox = document.getElementById("terms");
    if (termsBox) termsBox.checked = false;

    // Switch to login with success message
    window.showAuth("login");
    showMsg("login", `✓ Account created! Welcome, ${name}. Please log in to continue.`, "success");
    const loginEmail = document.getElementById("login-email");
    if (loginEmail) loginEmail.value = email;

  } catch (err) {
    console.error("Signup error:", err.code, err.message);
    showMsg("signup", friendlyError(err.code, err.message), "error");
  } finally {
    setBtnLoading("signup-btn", false, "Sign Up");
  }
});

// ── SIGN UP — Google (one-step, redirect immediately) ─
document.getElementById("signup-google-btn")?.addEventListener("click", () => {
  socialSignIn(new GoogleAuthProvider(), "signup");
});

// ── FORGOT PASSWORD ───────────────────────────────────
document.getElementById("forgot-password")?.addEventListener("click", async e => {
  e.preventDefault();
  clearMsg();
  const email = document.getElementById("login-email").value.trim();
  if (!email) {
    showMsg("login", "Enter your email above first, then click Forgot Password.", "error");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showMsg("login", "✓ Password reset email sent — check your inbox.", "success");
  } catch (err) {
    console.error("Password reset error:", err.code, err.message);
    showMsg("login", friendlyError(err.code, err.message), "error");
  }
});

// ── Helpers ───────────────────────────────────────────
function showMsg(panel, text, type) {
  const id = `${panel}-msg`;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("p");
    el.id = id;
    el.style.cssText = `
      font-family: sans-serif; font-size: 13px;
      margin: 0 0 14px; padding: 11px 16px;
      border-radius: 8px; text-align: center; line-height: 1.5;
    `;
    const wrapper  = document.getElementById(`${panel}-container`);
    const firstBtn = wrapper?.querySelector("button");
    firstBtn ? wrapper.insertBefore(el, firstBtn) : wrapper?.prepend(el);
  }
  el.style.background = type === "error" ? "#fdecea" : "#eafaf1";
  el.style.color      = type === "error" ? "#c0392b" : "#1e7e34";
  el.style.border     = type === "error" ? "1px solid #f5c6cb" : "1px solid #c3e6cb";
  el.textContent      = text;
  el.style.display    = "block";
}

function clearMsg() {
  ["login-msg", "signup-msg"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

function setBtnLoading(id, loading, label) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = label;
}

function friendlyError(code, rawMessage) {
  const map = {
    "auth/user-not-found":              "No account found with that email.",
    "auth/wrong-password":              "Incorrect password. Try again.",
    "auth/invalid-credential":          "Invalid email or password.",
    "auth/email-already-in-use":        "An account with this email already exists.",
    "auth/weak-password":               "Password must be at least 6 characters.",
    "auth/invalid-email":               "Please enter a valid email address.",
    "auth/too-many-requests":           "Too many attempts. Please try again later.",
    "auth/network-request-failed":      "Network error. Check your connection.",
    "auth/popup-blocked":               "Popup was blocked. Please allow popups for this site.",
    "auth/operation-not-allowed":       "This sign-in method is not enabled. Please contact support.",
    "auth/account-exists-with-different-credential":
                                        "An account already exists with this email using a different sign-in method.",
    "auth/configuration-not-found":     "Firebase is not configured correctly. Please contact support.",
    "auth/internal-error":              "An internal error occurred. Please try again.",
    "auth/admin-restricted-operation":  "Sign-up is currently restricted. Please contact support."
  };
  return map[code] || rawMessage || "Something went wrong. Please try again.";
}
