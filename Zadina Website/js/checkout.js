// ═══════════════════════════════════════════════════════
//  checkout.js  —  Reads cart from localStorage,
//                  saves order to Firestore on "Pay Now"
//  Firestore:  orders/{orderId}
//  Used by:  pages/checkout.html
// ═══════════════════════════════════════════════════════

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── State ─────────────────────────────────────────────
let cartSubtotal   = 0;   // raw subtotal from cart items
let appliedDiscount = 0;  // percentage e.g. 10 = 10%

// ── Get cart from localStorage ────────────────────────
function getLocalCart() {
  try { return JSON.parse(localStorage.getItem("zadina_cart") || "[]"); }
  catch { return []; }
}

// ── Recalculate and render all totals ─────────────────
// Called on page load AND every time a discount is applied/removed
function recalcTotals() {
  const fmt = v => `${parseFloat(v).toFixed(0)} <span class="aed">د.إ</span>`;

  const discountAmt = appliedDiscount > 0
    ? parseFloat((cartSubtotal * appliedDiscount / 100).toFixed(2))
    : 0;
  const total = parseFloat((cartSubtotal - discountAmt).toFixed(2));

  // Subtotal
  const subtotalEl = document.getElementById("checkout-subtotal");
  if (subtotalEl) subtotalEl.innerHTML = fmt(cartSubtotal);

  // Discount row — show only when a discount is active
  const discountRow = document.getElementById("checkout-discount-row");
  const discountEl  = document.getElementById("checkout-discount");
  if (discountRow && discountEl) {
    if (discountAmt > 0) {
      discountRow.style.display = "flex";
      discountEl.innerHTML = `−${fmt(discountAmt)}`;
    } else {
      discountRow.style.display = "none";
    }
  }

  // Total (after discount)
  const totalEl = document.getElementById("checkout-total");
  if (totalEl) {
    totalEl.innerHTML = fmt(total);
    // Animate the total change
    totalEl.style.transition = "transform 0.2s ease, color 0.2s ease";
    totalEl.style.transform  = "scale(1.08)";
    totalEl.style.color      = "#c9a84c";
    setTimeout(() => {
      totalEl.style.transform = "scale(1)";
      totalEl.style.color     = "";
    }, 300);
  }
}

// ── Render cart items from localStorage ───────────────
function renderCheckoutSummary() {
  const cart      = getLocalCart();
  const container = document.querySelector(".cart-items");
  const titleEl   = document.querySelector(".summary-title");
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <p style="font-family:sans-serif;font-size:14px;color:#888;
        text-align:center;padding:20px 0;">
        Your cart is empty.
        <a href="all-products.html" style="color:#c9a84c;font-weight:700;">Shop now →</a>
      </p>`;
    cartSubtotal = 0;
    recalcTotals();
    return;
  }

  const totalItems = cart.reduce((s, i) => s + (parseInt(i.qty) || 1), 0);
  if (titleEl) titleEl.textContent = `Your Cart (${totalItems})`;

  container.innerHTML = cart.map(item => {
    const price    = parseFloat(item.price) || 0;
    const qty      = parseInt(item.qty)    || 1;
    const lineTotal = (price * qty).toFixed(0);
    return `
      <div class="cart-item">
        <div class="item-product">
          <span class="item-qty-badge">×${qty}</span>
          <img src="${item.image || ""}" alt="${item.name}" class="item-img"
               onerror="this.style.display='none'">
          <div class="item-info">
            <p class="item-name">${item.name}</p>
            <p class="item-weight">${item.weight || ""}</p>
            <p class="item-stock in-stock">In stock</p>
          </div>
        </div>
        <div class="item-quantity">${qty}</div>
        <div class="item-price">${lineTotal} <span class="aed">د.إ</span></div>
      </div>`;
  }).join("");

  // Calculate subtotal and render totals
  cartSubtotal = cart.reduce((s, i) =>
    s + (parseFloat(i.price) || 0) * (parseInt(i.qty) || 1), 0);
  recalcTotals();
}

// ── Pre-fill form if logged in ────────────────────────
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
    const ccFields = document.getElementById("credit-card-fields");
    if (ccFields) {
      ccFields.style.display =
        document.getElementById("credit-card")?.checked ? "block" : "none";
    }
  });
});

// ── Discount codes ────────────────────────────────────
const DISCOUNT_CODES = { "ZADINA10": 10, "WELCOME15": 15, "GIFT20": 20 };

// Wire up BOTH discount inputs (left form + right summary panel)
document.querySelectorAll(".apply-btn, .apply-discount-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    // Get the input that's directly before this button
    const input = btn.previousElementSibling;
    const code  = (input?.value || "").trim().toUpperCase();

    if (!code) {
      showMsg("Enter a discount code first.", "error");
      return;
    }

    if (DISCOUNT_CODES[code]) {
      appliedDiscount = DISCOUNT_CODES[code];
      // Recalculate totals immediately
      recalcTotals();
      showMsg(
        `✓ Code "${code}" applied — ${appliedDiscount}% off! You save ${
          parseFloat((cartSubtotal * appliedDiscount / 100).toFixed(0))
        } د.إ`,
        "success"
      );
    } else {
      // Invalid code — remove any existing discount
      appliedDiscount = 0;
      recalcTotals();
      showMsg("Invalid discount code. Try ZADINA10, WELCOME15, or GIFT20.", "error");
    }
  });
});

// ── Pay Now ───────────────────────────────────────────
document.querySelector(".pay-now-btn")?.addEventListener("click", async () => {

  // Collect form values
  const firstName = document.querySelector("input[placeholder='First name']")?.value.trim();
  const lastName  = document.querySelector("input[placeholder='Last name']")?.value.trim();
  const email     = document.querySelector("input[placeholder='Email']")?.value.trim();
  const phone     = document.querySelector("input[placeholder='Phone']")?.value.trim();
  const address   = document.querySelector("input[placeholder='Address']")?.value.trim();
  const city      = document.querySelector("input[placeholder='City']")?.value.trim();
  const payment   = document.querySelector("input[name='payment']:checked")?.id || "cash-on-delivery";

  // Validation
  if (!firstName || !lastName) {
    showMsg("Please enter your first and last name.", "error"); return;
  }
  if (!email || !isValidEmail(email)) {
    showMsg("Please enter a valid email address.", "error"); return;
  }
  if (!address) {
    showMsg("Please enter your delivery address.", "error"); return;
  }

  const cart = getLocalCart();
  if (cart.length === 0) {
    showMsg("Your cart is empty. Add items before checking out.", "error"); return;
  }

  setPayLoading(true);

  try {
    const items = cart.map(item => ({
      id:     String(item.id),
      name:   item.name,
      price:  parseFloat(item.price) || 0,
      qty:    parseInt(item.qty) || 1,
      image:  item.image || "",
      weight: item.weight || ""
    }));

    const subtotal    = items.reduce((s, i) => s + i.price * i.qty, 0);
    const discountAmt = appliedDiscount > 0
      ? parseFloat((subtotal * appliedDiscount / 100).toFixed(2))
      : 0;
    const total = parseFloat((subtotal - discountAmt).toFixed(2));

    const user = auth.currentUser;

    const order = {
      userId:        user?.uid || "guest",
      email,
      name:          `${firstName} ${lastName}`,
      phone:         phone   || "",
      address:       `${address}${city ? ", " + city : ""}`,
      items,
      subtotal:      parseFloat(subtotal.toFixed(2)),
      discountPct:   appliedDiscount,
      discountAmt,
      total,
      paymentMethod: payment,
      status:        "pending",
      createdAt:     serverTimestamp()
    };

    // Save to Firestore
    const orderRef = await addDoc(collection(db, "orders"), order);

    // Save to localStorage for delivery page (works without Firestore read rules)
    localStorage.setItem("zadina_last_order", JSON.stringify({
      ...order,
      orderId:   orderRef.id,
      createdAt: new Date().toISOString()
    }));

    // Clear cart
    localStorage.removeItem("zadina_cart");

    // Redirect to confirmation
    window.location.href = `delivery.html?order=${orderRef.id}`;

  } catch (err) {
    console.error("Order error:", err.code, err.message);
    showMsg(`Order failed: ${err.message || "Please try again."}`, "error");
    setPayLoading(false);
  }
});

// ── Init on page load ─────────────────────────────────
renderCheckoutSummary();

// ── Helpers ───────────────────────────────────────────
function showMsg(text, type) {
  let el = document.getElementById("checkout-msg");
  if (!el) {
    el = document.createElement("p");
    el.id = "checkout-msg";
    el.style.cssText = `
      font-family:sans-serif; font-size:13px; margin:10px 0;
      padding:10px 14px; border-radius:8px; line-height:1.5;
    `;
    document.querySelector(".pay-now-btn")?.insertAdjacentElement("beforebegin", el);
  }
  el.style.background = type === "error" ? "#fdecea" : "#eafaf1";
  el.style.color      = type === "error" ? "#c0392b" : "#27ae60";
  el.style.border     = type === "error" ? "1px solid #f5c6cb" : "1px solid #c3e6cb";
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
