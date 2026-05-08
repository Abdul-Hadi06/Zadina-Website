// ═══════════════════════════════════════════════════════
//  checkout.js  —  Save order to Firestore on "Pay Now"
//  Firestore:  orders/{orderId}
//    { userId, email, name, phone, address, items[],
//      total, paymentMethod, discountCode, status, createdAt }
//  Used by:  pages/checkout.html
// ═══════════════════════════════════════════════════════

import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Pre-fill form fields if user is logged in ─────────
onAuthStateChanged(auth, user => {
  if (!user) return;

  const emailInput = document.querySelector("input[placeholder='Email']");
  if (emailInput && !emailInput.value) emailInput.value = user.email || "";

  if (user.displayName) {
    const parts = user.displayName.split(" ");
    const first = document.querySelector("input[placeholder='First name']");
    const last  = document.querySelector("input[placeholder='Last name']");
    if (first && !first.value) first.value = parts[0] || "";
    if (last  && !last.value)  last.value  = parts.slice(1).join(" ") || "";
  }
});

// ── Payment method toggle ─────────────────────────────
document.querySelectorAll("input[name='payment']").forEach(radio => {
  radio.addEventListener("change", () => {
    const fields = document.getElementById("credit-card-fields");
    if (fields) {
      fields.style.display = document.getElementById("credit-card")?.checked ? "block" : "none";
    }
  });
});

// ── Discount codes ────────────────────────────────────
const DISCOUNT_CODES = { "ZADINA10": 10, "WELCOME15": 15, "GIFT20": 20 };
let appliedDiscount = 0;

document.querySelectorAll(".apply-btn, .apply-discount-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = btn.previousElementSibling;
    const code  = (input?.value || "").trim().toUpperCase();
    if (!code) { showMsg("Enter a discount code first.", "error"); return; }

    if (DISCOUNT_CODES[code]) {
      appliedDiscount = DISCOUNT_CODES[code];
      showMsg(`✓ Code "${code}" applied — ${appliedDiscount}% off!`, "success");
    } else {
      appliedDiscount = 0;
      showMsg("Invalid discount code.", "error");
    }
  });
});

// ── Pay Now ───────────────────────────────────────────
document.querySelector(".pay-now-btn")?.addEventListener("click", async () => {
  const user = auth.currentUser;

  // Collect form values
  const firstName = document.querySelector("input[placeholder='First name']")?.value.trim();
  const lastName  = document.querySelector("input[placeholder='Last name']")?.value.trim();
  const email     = document.querySelector("input[placeholder='Email']")?.value.trim();
  const phone     = document.querySelector("input[placeholder='Phone']")?.value.trim();
  const address   = document.querySelector("input[placeholder='Address']")?.value.trim();
  const city      = document.querySelector("input[placeholder='City']")?.value.trim();
  const payment   = document.querySelector("input[name='payment']:checked")?.id || "credit-card";

  // Validation
  if (!firstName || !lastName) { showMsg("Please enter your first and last name.", "error"); return; }
  if (!email || !isValidEmail(email)) { showMsg("Please enter a valid email address.", "error"); return; }
  if (!address) { showMsg("Please enter your delivery address.", "error"); return; }

  setPayLoading(true);

  try {
    // Collect items from the cart summary panel
    const items = [];
    document.querySelectorAll(".cart-item").forEach(row => {
      const name  = row.querySelector(".item-name")?.textContent?.trim();
      const qty   = parseInt(row.querySelector(".item-quantity")?.textContent) || 1;
      const price = parseFloat(row.querySelector(".item-price")?.textContent?.replace(/[^\d.]/g, "")) || 0;
      if (name) items.push({ name, qty, price });
    });

    // Calculate total
    const rawTotal = items.reduce((s, i) => s + i.price, 0);
    const discount = appliedDiscount > 0 ? (rawTotal * appliedDiscount / 100) : 0;
    const total    = parseFloat((rawTotal - discount).toFixed(2));

    // Build order document
    const order = {
      userId:        user?.uid  || "guest",
      email,
      name:          `${firstName} ${lastName}`,
      phone:         phone   || "",
      address:       `${address}${city ? ", " + city : ""}`,
      items,
      subtotal:      rawTotal,
      discountPct:   appliedDiscount,
      discountAmt:   parseFloat(discount.toFixed(2)),
      total,
      paymentMethod: payment,
      status:        "pending",
      createdAt:     serverTimestamp()
    };

    // Save to Firestore
    const orderRef = await addDoc(collection(db, "orders"), order);

    // Clear Firestore cart if logged in
    if (user) {
      const cartSnap = await getDocs(collection(db, "carts", user.uid, "items"));
      await Promise.all(cartSnap.docs.map(d => deleteDoc(doc(db, "carts", user.uid, "items", d.id))));
    }

    // Redirect to confirmation page with order ID
    window.location.href = `delivery.html?order=${orderRef.id}`;

  } catch (err) {
    console.error("Order error:", err);
    showMsg("Something went wrong placing your order. Please try again.", "error");
    setPayLoading(false);
  }
});

// ── Helpers ───────────────────────────────────────────
function showMsg(text, type) {
  let el = document.getElementById("checkout-msg");
  if (!el) {
    el = document.createElement("p");
    el.id = "checkout-msg";
    el.style.cssText = `
      font-family:sans-serif; font-size:13px; margin:10px 0;
      padding:10px 14px; border-radius:8px;
    `;
    document.querySelector(".pay-now-btn")?.insertAdjacentElement("beforebegin", el);
  }
  el.style.background = type === "error" ? "#fdecea" : "#eafaf1";
  el.style.color      = type === "error" ? "#c0392b" : "#27ae60";
  el.textContent = text;
}

function setPayLoading(loading) {
  const btn = document.querySelector(".pay-now-btn");
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = loading ? "Processing…" : "Pay Now";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
