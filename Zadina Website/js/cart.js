// ═══════════════════════════════════════════════════════
//  cart.js  —  Cart CRUD with Firestore + live nav badge
//  Firestore:  carts/{uid}/items/{productId}
//    { id, name, price, image, weight, qty, addedAt }
//  Used by:  ALL pages (badge) · pages/cart.html (full)
// ═══════════════════════════════════════════════════════

import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, doc, getDocs, setDoc, deleteDoc,
  updateDoc, onSnapshot, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Cart badge (runs on every page) ──────────────────
export function initCartBadge() {
  onAuthStateChanged(auth, user => {
    if (!user) { renderBadge(0); return; }
    const ref = collection(db, "carts", user.uid, "items");
    onSnapshot(ref, snap => {
      const total = snap.docs.reduce((sum, d) => sum + (d.data().qty || 1), 0);
      renderBadge(total);
    });
  });
}

function renderBadge(count) {
  // Target the cart icon anchor in the nav
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
  badge.textContent  = count > 99 ? "99+" : count;
  badge.style.display = count > 0 ? "flex" : "none";
}

// ── Cart page ─────────────────────────────────────────
export async function initCartPage() {
  const tbody = document.querySelector(".cart-table tbody");
  if (!tbody) return;

  onAuthStateChanged(auth, async user => {
    if (!user) {
      showGuestBanner();
      return;
    }
    await renderCart(user.uid);
    bindActions(user.uid);
  });
}

async function renderCart(uid) {
  const tbody  = document.querySelector(".cart-table tbody");
  const snap   = await getDocs(collection(db, "carts", uid, "items"));

  if (snap.empty) {
    tbody.innerHTML = `
      <tr><td colspan="4" style="text-align:center;padding:48px 20px;font-family:sans-serif;color:#888;font-size:15px;">
        Your cart is empty.&nbsp;
        <a href="all-products.html" style="color:#c9a84c;font-weight:700;text-decoration:underline;">Shop now →</a>
      </td></tr>`;
    recalc();
    return;
  }

  tbody.innerHTML = "";
  snap.forEach(d => tbody.insertAdjacentHTML("beforeend", rowHTML(d.data())));
  recalc();
}

function rowHTML(item) {
  const sub = (item.price * (item.qty || 1)).toFixed(0);
  return `
    <tr class="cart-row" data-id="${item.id}" data-price="${item.price}">
      <td class="cart-product-cell">
        <button class="remove-btn js-remove" aria-label="Remove"><i class="fas fa-trash-alt"></i></button>
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-info">
          <p class="cart-item-name">${item.name}</p>
          <p class="cart-item-sub">${item.weight || ""}</p>
          <span class="cart-item-link">In stock</span>
        </div>
      </td>
      <td class="cart-price">${item.price} <span class="aed">د.إ</span></td>
      <td class="cart-qty-cell">
        <div class="qty-control">
          <button class="qty-btn qty-minus js-minus">−</button>
          <input type="number" class="qty-input" value="${item.qty || 1}" min="1">
          <button class="qty-btn qty-plus js-plus">+</button>
        </div>
      </td>
      <td class="cart-subtotal">${sub} <span class="aed">د.إ</span></td>
    </tr>`;
}

function bindActions(uid) {
  const tbody = document.querySelector(".cart-table tbody");

  // Click delegation for +/−/remove
  tbody.addEventListener("click", async e => {
    const row   = e.target.closest(".cart-row");
    if (!row) return;
    const id    = row.dataset.id;
    const price = parseFloat(row.dataset.price);
    const input = row.querySelector(".qty-input");

    if (e.target.closest(".js-remove")) {
      await deleteDoc(doc(db, "carts", uid, "items", id));
      row.remove();
      recalc();
      return;
    }
    if (e.target.closest(".js-minus")) input.value = Math.max(1, parseInt(input.value) - 1);
    if (e.target.closest(".js-plus"))  input.value = parseInt(input.value) + 1;

    if (e.target.closest(".js-minus") || e.target.closest(".js-plus")) {
      const qty = parseInt(input.value);
      row.querySelector(".cart-subtotal").innerHTML = `${(price * qty).toFixed(0)} <span class="aed">د.إ</span>`;
      await updateDoc(doc(db, "carts", uid, "items", id), { qty });
      recalc();
    }
  });

  // Direct input change
  tbody.addEventListener("change", async e => {
    if (!e.target.classList.contains("qty-input")) return;
    const row   = e.target.closest(".cart-row");
    const id    = row.dataset.id;
    const price = parseFloat(row.dataset.price);
    const qty   = Math.max(1, parseInt(e.target.value) || 1);
    e.target.value = qty;
    row.querySelector(".cart-subtotal").innerHTML = `${(price * qty).toFixed(0)} <span class="aed">د.إ</span>`;
    await updateDoc(doc(db, "carts", uid, "items", id), { qty });
    recalc();
  });

  // Clear cart
  document.querySelector(".clear-cart-link")?.addEventListener("click", async e => {
    e.preventDefault();
    if (!confirm("Clear your entire cart?")) return;
    const batch = writeBatch(db);
    const snap  = await getDocs(collection(db, "carts", uid, "items"));
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();
    await renderCart(uid);
  });
}

function recalc() {
  let subtotal = 0, count = 0;
  document.querySelectorAll(".cart-row").forEach(row => {
    const price = parseFloat(row.dataset.price) || 0;
    const qty   = parseInt(row.querySelector(".qty-input")?.value) || 1;
    subtotal += price * qty;
    count    += qty;
  });

  const fmt = v => `${v.toFixed(0)} <span class="aed">د.إ</span>`;

  // Update summary rows
  document.querySelectorAll(".summary-row").forEach(row => {
    const label = row.querySelector("span:first-child")?.textContent?.toLowerCase() || "";
    const val   = row.querySelector("span:last-child");
    if (!val) return;
    if (label.includes("item"))                          val.textContent = count;
    if (label.includes("subtotal"))                      val.innerHTML   = fmt(subtotal);
    if (label.includes("total") && !label.includes("sub")) val.innerHTML = fmt(subtotal);
  });

  // Also update the bold total line
  document.querySelectorAll(".summary-total span:last-child").forEach(el => {
    el.innerHTML = fmt(subtotal);
  });
}

function showGuestBanner() {
  const target = document.querySelector(".cart-section .cart-container");
  if (!target || document.getElementById("guest-cart-banner")) return;
  const banner = document.createElement("div");
  banner.id = "guest-cart-banner";
  banner.style.cssText = `
    background:#fff8e8; border:1.5px solid #c9a84c; border-radius:12px;
    padding:16px 22px; margin-bottom:24px;
    font-family:sans-serif; font-size:14px; color:#2c1a0e;
  `;
  banner.innerHTML = `<strong>Sign in to save your cart</strong> — 
    <a href="login.html" style="color:#c9a84c;font-weight:700;text-decoration:underline;">
      Log in or create an account
    </a> to keep your cart across devices.`;
  target.prepend(banner);
}

// ── Add to cart (called from product pages) ───────────
export async function addToCart(product) {
  // product: { id, name, price, image, weight }
  const user = auth.currentUser;
  if (!user) { window.location.href = "login.html"; return; }

  const itemRef  = doc(db, "carts", user.uid, "items", String(product.id));
  const allSnap  = await getDocs(collection(db, "carts", user.uid, "items"));
  const existing = allSnap.docs.find(d => d.id === String(product.id));

  if (existing) {
    await updateDoc(itemRef, { qty: (existing.data().qty || 1) + 1 });
  } else {
    await setDoc(itemRef, { ...product, qty: 1, addedAt: serverTimestamp() });
  }
  showToast(product.name);
}

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
