// ═══════════════════════════════════════════════════════
//  add-to-cart.js  —  Wires up add-to-cart buttons on
//  ALL product pages. Reads product data from the DOM.
//  Saves to localStorage key "zadina_cart".
// ═══════════════════════════════════════════════════════

import { addToCart } from "./cart.js";

// ── Parse numeric price from any text format ──────────
// Handles: "155 د.إ", "0.5kg/ 155 د.إ", "75/box د.إ",
//          "1190د.إ", "95 د.إ", "38/500g"
function parsePrice(text) {
  if (!text) return 0;
  // Remove Arabic currency symbol and commas
  const cleaned = text.replace(/[،,]/g, "").replace(/د\.إ/g, "").trim();
  // Find all numbers (including decimals)
  const nums = cleaned.match(/\d+(\.\d+)?/g);
  if (!nums) return 0;
  // Return the largest number found (avoids picking "0.5" from "0.5kg/ 155")
  return Math.max(...nums.map(Number));
}

// ── Generate a stable ID from name + image src ────────
function makeId(name, img) {
  const raw = (name + (img || "")).replace(/[^a-z0-9]/gi, "").toLowerCase();
  return raw.slice(0, 28) || ("item-" + Math.random().toString(36).slice(2, 8));
}

// ── Walk up the DOM to find the product card ──────────
function getCard(btn) {
  let el = btn.parentElement;
  for (let i = 0; i < 6; i++) {
    if (!el) break;
    const hasImg   = !!el.querySelector("img");
    const hasPrice = !!el.querySelector(
      ".prod-price, .product-price, .prod-card-price, .feat-card-price, " +
      ".price-tag, .also-price, .price-explore p, .like-price"
    );
    if (hasImg && hasPrice) return el;
    el = el.parentElement;
  }
  // Fallback: go up 3 levels
  el = btn;
  for (let i = 0; i < 3; i++) { if (el.parentElement) el = el.parentElement; }
  return el;
}

// ── Extract product info from a card element ──────────
function extractProduct(card) {
  // Name
  const nameEl = card.querySelector(
    "h3, h5, .prod-title, .product-name, .prod-card-title, " +
    ".feat-card-name, .also-name, .like-name"
  );
  const name = (nameEl?.textContent || "").trim().replace(/\s+/g, " ") || "Product";

  // Price — try all known price selectors
  const priceEl = card.querySelector(
    ".prod-price, .product-price, .prod-card-price, .feat-card-price, " +
    ".price-tag b, .price-tag, .also-price, .like-price, .price-explore p"
  );
  const price = parsePrice(priceEl?.textContent || "0");

  // Image — first img in the card
  const imgEl = card.querySelector("img");
  const image = imgEl?.src || imgEl?.getAttribute("src") || "";

  const id = makeId(name, image);
  return { id, name, price, image, weight: "" };
}

// ── Wire up all add-to-cart buttons on the page ───────
export function initAddToCartButtons() {
  // All button/link selectors used across product pages
  const SELECTORS = [
    ".add-btn",              // chocolate-product.html, gift-options.html
    ".buy-btn",              // everyday-dates.html, gourmet-products.html
    ".explore-btn",          // everyday-gift-boxes.html, our-favorites.html, luxury-gift-boxes.html
    ".feat-explore-btn",     // featured collection sections
    ".price-explore button", // luxury-gift-boxes.html plain buttons
  ].join(", ");

  document.querySelectorAll(SELECTORS).forEach(btn => {
    // Skip buttons already wired by all-products.html inline script
    if (btn.classList.contains("js-add-to-cart")) return;

    // Skip "Explore" buttons inside slider/featured/like sections
    // (those are navigation, not add-to-cart)
    if (btn.closest(".slider-card, .feat-card, .like-card, .also-card, .might-like-grid")) return;

    // Prevent default navigation on <a> tags
    btn.addEventListener("click", async e => {
      e.preventDefault();
      e.stopPropagation();

      const card    = getCard(btn);
      const product = extractProduct(card);

      if (!product.name || product.price <= 0) {
        console.warn("add-to-cart: could not extract product from card:", card);
        return;
      }

      // Visual feedback
      const originalText = btn.textContent;
      const originalBg   = btn.style.background || "";
      btn.disabled        = true;
      btn.textContent     = "✓ Added!";
      btn.style.background = "#27ae60";
      btn.style.color      = "#fff";

      await addToCart(product);

      setTimeout(() => {
        btn.disabled         = false;
        btn.textContent      = originalText;
        btn.style.background = originalBg;
        btn.style.color      = "";
      }, 1500);
    });
  });
}
