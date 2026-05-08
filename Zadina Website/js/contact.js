// ═══════════════════════════════════════════════════════
//  contact.js  —  Save contact form to Firestore
//  Firestore:  contactMessages/{docId}
//    { firstName, lastName, phone, email, message,
//      status: "unread", submittedAt }
//  Used by:  pages/contact.html
// ═══════════════════════════════════════════════════════

import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Pre-fill if logged in ─────────────────────────────
onAuthStateChanged(auth, user => {
  if (!user) return;

  const emailInput = document.getElementById("email");
  if (emailInput && !emailInput.value) emailInput.value = user.email || "";

  if (user.displayName) {
    const parts = user.displayName.split(" ");
    const first = document.getElementById("firstName");
    const last  = document.getElementById("lastName");
    if (first && !first.value) first.value = parts[0] || "";
    if (last  && !last.value)  last.value  = parts.slice(1).join(" ") || "";
  }
});

// ── Form submit — overrides the inline onsubmit ───────
window.submitForm = async function (e) {
  e.preventDefault();

  const firstName = document.getElementById("firstName")?.value.trim();
  const lastName  = document.getElementById("lastName")?.value.trim();
  const phone     = document.getElementById("phone")?.value.trim();
  const email     = document.getElementById("email")?.value.trim();
  const message   = document.getElementById("message")?.value.trim();
  const submitBtn = document.querySelector(".form-submit");
  const successEl = document.getElementById("formSuccess");

  // Validation
  if (!firstName) { showFormMsg("Please enter your first name.", "error"); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFormMsg("Please enter a valid email address.", "error"); return;
  }

  submitBtn.disabled    = true;
  submitBtn.textContent = "Sending…";
  clearFormMsg();

  try {
    await addDoc(collection(db, "contactMessages"), {
      firstName,
      lastName:    lastName || "",
      phone:       phone    || "",
      email,
      message:     message  || "",
      status:      "unread",
      submittedAt: serverTimestamp()
    });

    // Show success
    if (successEl) {
      successEl.style.display = "block";
      successEl.textContent   = "✓ Thank you! Your message has been sent. We'll get back to you shortly.";
    }
    document.getElementById("contactForm")?.reset();

  } catch (err) {
    console.error("Contact form error:", err);
    showFormMsg("Failed to send your message. Please try again.", "error");
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = "Submit";
  }
};

// ── Helpers ───────────────────────────────────────────
function showFormMsg(text, type) {
  let el = document.getElementById("form-msg");
  if (!el) {
    el = document.createElement("p");
    el.id = "form-msg";
    el.style.cssText = `
      font-family:sans-serif; font-size:13px; margin:8px 0;
      padding:10px 14px; border-radius:8px; text-align:center;
    `;
    document.querySelector(".form-submit-wrap")?.prepend(el);
  }
  el.style.background = type === "error" ? "#fdecea" : "#eafaf1";
  el.style.color      = type === "error" ? "#c0392b" : "#27ae60";
  el.textContent = text;
  el.style.display = "block";
}

function clearFormMsg() {
  const el = document.getElementById("form-msg");
  if (el) el.style.display = "none";
}
