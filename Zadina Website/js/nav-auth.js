// ═══════════════════════════════════════════════════════
//  nav-auth.js  —  Auth state on every page
//  · Shows user name + Sign Out in nav when logged in
//  · Initialises live cart badge
//  Loaded by:  ALL pages via main.js
// ═══════════════════════════════════════════════════════

import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initCartBadge } from "./cart.js";

// Start cart badge on every page
initCartBadge();

// ── On the login page, do nothing with auth state ────
// auth.js handles all login-page logic directly.
// We must NOT redirect here — that caused the "flash" bug
// where the page briefly appeared then vanished.
const isLoginPage = window.location.pathname.endsWith("login.html");
if (isLoginPage) {
  // Still update the nav if it exists, but never redirect
  onAuthStateChanged(auth, user => {
    updateNav(user);
  });
} else {
  // On all other pages: update nav normally
  onAuthStateChanged(auth, user => {
    updateNav(user);
  });
}

function updateNav(user) {
  const accountLink = document.querySelector(
    '.nav-icons a[href="login.html"], .nav-icons a[href*="login"]'
  );
  if (!accountLink) return;

  // Clean up previous elements to prevent duplicates
  document.getElementById("nav-signout-btn")?.remove();
  document.getElementById("nav-user-name")?.remove();

  if (!user) return;

  const firstName = (user.displayName || "Account").split(" ")[0];

  // Name label next to account icon
  const nameEl = document.createElement("span");
  nameEl.id = "nav-user-name";
  nameEl.title = user.email;
  nameEl.style.cssText = `
    font-family: sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: #c9a84c;
    white-space: nowrap;
    cursor: default;
  `;
  nameEl.textContent = firstName;
  accountLink.insertAdjacentElement("afterend", nameEl);

  // Sign-out button
  const signOutBtn = document.createElement("button");
  signOutBtn.id = "nav-signout-btn";
  signOutBtn.title = "Sign out";
  signOutBtn.style.cssText = `
    background: none;
    border: none;
    cursor: pointer;
    font-family: sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: #888;
    padding: 0;
    margin-left: 4px;
    transition: color .2s;
  `;
  signOutBtn.textContent = "Sign out";
  signOutBtn.addEventListener("mouseenter", () => signOutBtn.style.color = "#c0392b");
  signOutBtn.addEventListener("mouseleave", () => signOutBtn.style.color = "#888");
  signOutBtn.addEventListener("click", async () => {
    await signOut(auth);
    // On login page stay put, elsewhere reload
    if (isLoginPage) {
      window.location.reload();
    } else {
      window.location.reload();
    }
  });
  nameEl.insertAdjacentElement("afterend", signOutBtn);
}
