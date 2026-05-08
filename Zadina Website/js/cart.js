// ═══════════════════════════════════════════════════════
//  cart.js  —  Cart using localStorage (no login needed)
//              + Firestore sync when logged in
//  localStorage key:  zadina_cart  →  array of items
//  Firestore:  carts/{uid}/items/{productId}
// ═══════════════════════════════════════════════════════

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, doc, getDocs, setDoc, deleteDoc,
  updateDoc, onSnapshot, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── localStorage helpers ──────────────────────────────
function getLocalCart() {
  try { return JSON.parse(localStorage.getItem("zadina_cart") || "[]"); }
  catch { return []; }
}
function saveLocalCart(items) {
  localStorage.setItem("zadina_cart", JSON.stringify(items));
}

// ── Add to cart (called from any product page) ────────
export async function addToCart(product) {
  // product: { id, name, price, image, weight }
  const id = String(product.id);

  // Always save to localStorage first (works without login)
  const cart = getLocalCart();
  const idx  = cart.findIndex(i => String(i.id) === id);
  if (idx >= 0) {
    cart[idx].qty = (cart[idx].qty || 1) + 1;
  } else {
    cart.push({ ...product, id, qty: 1 });
  }
  saveLocalCart(cart);
  updateBadgeFromLocal();
  showToast(product.name);

  // Also sync to Firestore if logged in
  const user = auth.currentUser;
  if (user) {
    try {
      const ref  = doc(db, "carts", user.uid, "items", id);
      const snap = await getDocs(collection(db, "carts", user.uid, "items"));
      const existing = snap.docs.find(d => d.id === id);
      if (existing) {
        await updateDoc(ref, { qty: (existing.data().qty || 1) + 1 });
      } else {
        await setDoc(ref, { ...product, id, qty: 1, addedAt: serverTimestamp() });
      }
    } catch (e) {
      console.warn("Firestore cart sync failed (non-critical):", e.message);
    }
  }
}

// ── Cart badge — runs on every page ──────────────────
export function initCartBadge() {
  // Show badge from localStorage immediately (no flicker)
  updateBadgeFromLocal();

  // Update badge live from Firestore when logged in
  onAuthStateChanged(auth, user => {
    if (!user) { updateBadgeFromLocal(); return; }
    const ref = collection(db, "carts", user.uid, "items");
    onSnapshot(ref, snap => {
      const total = snap.docs.reduce((sum, d) => sum + (d.data().qty || 1), 0);
      renderBadge(total);
    });
  });
}

function updateBadgeFromLocal() {
  const cart  = getLocalCart();
  const total = cart.reduce((sum, i) => sum + (i.qty || 1), 0);
  renderBadge(total);
}

function renderBadge(count) {
  const cartAnchor = document.querySelector(
    '.nav-icons a[href="cart.html"], .nav-icons a[href*="cart"]'
  );
  if (!cartAnchor) return;
  cartAnchor.style.position = "relative";

  let badge = document.getElementById("cart-count-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.id = "cart-count-badge";
    badge.style.cssText = `
      position:absolute; top:-8px; right:-8px;
      background:#c9a84c; color:#fff;
      font-family:sans-serif; font-size:10px; font-weight:700;
      min-width:17px; height:17px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      pointer-events:none; line-height:1;
    `;
    cartAnchor.appendChild(badge);
  }
  badge.textContent   = count > 99 ? "99+" : count;
  badge.style.display = count > 0 ? "flex" : "none";
}

// ── Cart page — render from localStorage ─────────────
export function initCartPage() {
  const tbody = document.querySelector(".cart-table tbody");
  if (!tbody) return;

  renderCartPage();
  bindCartPageActions();
}

function renderCartPage() {
  const tbody = document.querySelector(".cart-table tbody");
  const cart  = getLocalCart();

  if (cart.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="4" style="text-align:center;padding:48px 20px;
        font-family:sans-serif;color:#888;font-size:15px;">
        Your cart is empty.&nbsp;
        <a href="all-products.html" style="color:#c9a84c;font-weight:700;
          text-decoration:underline;">Shop now →</a>
      </td></tr>`;
    recalcSummary([]);
    return;
  }

  tbody.innerHTML = cart.map(item => rowHTML(item)).join("");
  recalcSummary(cart);
}

function rowHTML(item) {
  const price = parseFloat(item.price) || 0;
  const qty   = parseInt(item.qty)    || 1;
  const sub   = (price * qty).toFixed(0);
  // Use a relative path for images — items added via addToCart pass src paths
  const imgSrc = item.image || "";
  return `
    <tr class="cart-row" data-id="${item.id}" data-price="${price}">
      <td class="cart-product-cell">
        <button class="remove-btn js-remove" aria-label="Remove">
          <i class="fas fa-trash-alt"></i>
        </button>
        <img src="${imgSrc}" alt="${item.name}" class="cart-item-img"
             onerror="this.style.display='none'">
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-sub">${item.weight || ""}</p>
          <span class="cart-item-link" style="color:#c9a84c;font-size:12px;">In stock</span>
        </div>
      </td>
      <td class="cart-price">${price} <span class="aed">د.إ</span></td>
      <td class="cart-qty-cell">
        <div class="qty-control">
          <button class="qty-btn qty-minus js-minus">−</button>
          <input type="number" class="qty-input" value="${qty}" min="1">
          <button class="qty-btn qty-plus js-plus">+</button>
        </div>
      </td>
      <td class="cart-subtotal">${sub} <span class="aed">د.إ</span></td>
    </tr>`;
}

function bindCartPageActions() {
  const tbody = document.querySelector(".cart-table tbody");
  if (!tbody) return;

  tbody.addEventListener("click", e => {
    const row   = e.target.closest(".cart-row");
    if (!row) return;
    const id    = row.dataset.id;
    const price = parseFloat(row.dataset.price);
    const input = row.querySelector(".qty-input");

    if (e.target.closest(".js-remove")) {
      removeFromLocalCart(id);
      row.remove();
      recalcSummary(getLocalCart());
      updateBadgeFromLocal();
      return;
    }

    if (e.target.closest(".js-minus")) input.value = Math.max(1, parseInt(input.value) - 1);
    if (e.target.closest(".js-plus"))  input.value = parseInt(input.value) + 1;

    if (e.target.closest(".js-minus") || e.target.closest(".js-plus")) {
      const qty = parseInt(input.value);
      row.querySelector(".cart-subtotal").innerHTML =
        `${(price * qty).toFixed(0)} <span class="aed">د.إ</span>`;
      updateLocalCartQty(id, qty);
      recalcSummary(getLocalCart());
      updateBadgeFromLocal();
    }
  });

  tbody.addEventListener("change", e => {
    if (!e.target.classList.contains("qty-input")) return;
    const row   = e.target.closest(".cart-row");
    const id    = row.dataset.id;
    const price = parseFloat(row.dataset.price);
    const qty   = Math.max(1, parseInt(e.target.value) || 1);
    e.target.value = qty;
    row.querySelector(".cart-subtotal").innerHTML =
      `${(price * qty).toFixed(0)} <span class="aed">د.إ</span>`;
    updateLocalCartQty(id, qty);
    recalcSummary(getLocalCart());
    updateBadgeFromLocal();
  });

  document.querySelector(".clear-cart-link")?.addEventListener("click", e => {
    e.preventDefault();
    if (!confirm("Clear your entire cart?")) return;
    saveLocalCart([]);
    renderCartPage();
    updateBadgeFromLocal();
  });
}

function removeFromLocalCart(id) {
  const cart = getLocalCart().filter(i => String(i.id) !== String(id));
  saveLocalCart(cart);
}

function updateLocalCartQty(id, qty) {
  const cart = getLocalCart();
  const item = cart.find(i => String(i.id) === String(id));
  if (item) item.qty = qty;
  saveLocalCart(cart);
}

function recalcSummary(cart) {
  const subtotal = cart.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.qty) || 1), 0);
  const count    = cart.reduce((s, i) => s + (parseInt(i.qty) || 1), 0);
  const fmt      = v => `${v.toFixed(0)} <span class="aed">د.إ</span>`;

  document.querySelectorAll(".summary-row").forEach(row => {
    const label = row.querySelector("span:first-child")?.textContent?.toLowerCase() || "";
    const val   = row.querySelector("span:last-child");
    if (!val) return;
    if (label.includes("item"))                              val.textContent = count;
    if (label.includes("subtotal"))                          val.innerHTML   = fmt(subtotal);
    if (label.includes("total") && !label.includes("sub"))   val.innerHTML   = fmt(subtotal);
  });
  document.querySelectorAll(".summary-total span:last-child").forEach(el => {
    el.innerHTML = fmt(subtotal);
  });
}

// ── Toast notification ────────────────────────────────
function showToast(name) {
  let toast = document.getElementById("cart-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "cart-toast";
    toast.style.cssText = `
      position:fixed; bottom:24px; right:24px; z-index:9999;
      background:#2c1a0e; color:#fff;
      font-family:sans-serif; font-size:14px; font-weight:600;
      padding:14px 22px; border-radius:10px;
      box-shadow:0 6px 24px rgba(0,0,0,.25);
      transform:translateY(80px); opacity:0;
      transition:all .35s cubic-bezier(.4,0,.2,1);
      pointer-events:none;
    `;
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span style="color:#c9a84c;margin-right:8px;">✓</span>"${name}" added to cart`;
  requestAnimationFrame(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity   = "1";
  });
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.transform = "translateY(80px)";
    toast.style.opacity   = "0";
  }, 3000);
}
