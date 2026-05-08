/* =============================================================
   ZADINA WEBSITE — main.js
   All JavaScript consolidated from every page.
   Safely guards every feature so it only runs when the
   relevant DOM elements exist on the current page.
   ============================================================= */

// ── Firebase: load the right module per page ─────────
// nav-auth.js runs on every page (auth state + cart badge)
// Skip on login page — auth.js handles everything there
const _page = window.location.pathname.split('/').pop();
if (_page !== 'login.html') {
  import('./nav-auth.js').catch(console.error);
}

// Page-specific modules
if (_page === 'login.html')    import('./auth.js').catch(console.error);
if (_page === 'cart.html')     import('./cart.js').then(m => m.initCartPage()).catch(console.error);
if (_page === 'checkout.html') import('./checkout.js').catch(console.error);
if (_page === 'contact.html')  import('./contact.js').catch(console.error);

document.addEventListener('DOMContentLoaded', () => {

  /* ─────────────────────────────────────────────
     1. NAVBAR — active link highlight
  ───────────────────────────────────────────── */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href === currentPage) {
      link.classList.add('active');
    }
  });

  /* ─────────────────────────────────────────────
     2. NAVBAR DROPDOWN — hover with delay bridge
        (used on pages that need JS-assisted hover)
  ───────────────────────────────────────────── */
  document.querySelectorAll('.nav-dropdown').forEach(function (dropdown) {
    var timer;
    var menu = dropdown.querySelector('.dropdown-menu');
    if (!menu) return;
    dropdown.addEventListener('mouseenter', function () {
      clearTimeout(timer);
      menu.style.display = 'block';
    });
    dropdown.addEventListener('mouseleave', function () {
      timer = setTimeout(function () { menu.style.display = ''; }, 200);
    });
    menu.addEventListener('mouseenter', function () { clearTimeout(timer); });
    menu.addEventListener('mouseleave', function () {
      timer = setTimeout(function () { menu.style.display = ''; }, 200);
    });
  });

  /* ─────────────────────────────────────────────
     3. MOBILE NAV TOGGLE
  ───────────────────────────────────────────── */
  const navToggle = document.querySelector('.nav-toggle');
  const navMobileMenu = document.querySelector('.nav-mobile-menu');
  if (navToggle && navMobileMenu) {
    navToggle.addEventListener('click', () => {
      navMobileMenu.classList.toggle('open');
      navToggle.classList.toggle('open');
    });
  }

  /* ─────────────────────────────────────────────
     4. ACCORDION (product detail + personalised)
  ───────────────────────────────────────────── */
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('open');
    });
  });

  // Named function for inline onclick="toggleAccordion(btn)"
  window.toggleAccordion = function (btn) {
    btn.parentElement.classList.toggle('active');
  };

  /* ─────────────────────────────────────────────
     5. QUANTITY COUNTER — product detail page
  ───────────────────────────────────────────── */
  const minusBtn = document.querySelector('.qty-minus');
  const plusBtn  = document.querySelector('.qty-plus');
  const qtyInput = document.querySelector('.qty-input');

  if (minusBtn && plusBtn && qtyInput) {
    minusBtn.addEventListener('click', () => {
      let val = parseInt(qtyInput.value);
      if (val > 1) qtyInput.value = val - 1;
    });
    plusBtn.addEventListener('click', () => {
      let val = parseInt(qtyInput.value);
      qtyInput.value = val + 1;
    });
  }

  /* ─────────────────────────────────────────────
     6. QUANTITY COUNTER — cart page inline buttons
        changeQty(btn, delta) called from HTML onclick
  ───────────────────────────────────────────── */
  window.changeQty = function (btn, delta) {
    const input = btn.parentElement.querySelector('.qty-input');
    if (!input) return;
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    input.value = val;
  };

  /* ─────────────────────────────────────────────
     7. PRODUCT THUMBNAIL GALLERY
  ───────────────────────────────────────────── */
  document.querySelectorAll('.thumb-img').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const mainImg = document.querySelector('.main-product-img');
      if (mainImg) mainImg.src = thumb.src;
      document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  /* ─────────────────────────────────────────────
     8. ADD TO CART BUTTON (product detail)
  ───────────────────────────────────────────── */
  const addToCartBtn = document.querySelector('.add-to-cart-btn');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      window.location.href = 'cart.html';
    });
  }

  /* ─────────────────────────────────────────────
     9. WISHLIST TOGGLE (product detail)
  ───────────────────────────────────────────── */
  const wishlistBtn = document.querySelector('.wishlist-btn');
  if (wishlistBtn) {
    wishlistBtn.addEventListener('click', () => {
      wishlistBtn.classList.toggle('active');
      const icon = wishlistBtn.querySelector('i');
      if (icon) {
        icon.classList.toggle('far');
        icon.classList.toggle('fas');
      }
    });
  }

  /* ─────────────────────────────────────────────
     10. GIFT FILTER TABS (home page collections)
  ───────────────────────────────────────────── */
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  /* ─────────────────────────────────────────────
     11. CONTACT FORM (contact.html)
         NOTE: Firebase contact.js handles the real submission.
         This fallback only runs on gift-options.html (no #firstName).
  ───────────────────────────────────────────── */
  const contactForm = document.querySelector('#contactForm');
  if (contactForm && !document.getElementById('firstName')) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('Thank you! Your message has been submitted.');
      this.reset();
    });
  }

  /* ─────────────────────────────────────────────
     12. FAQ ACCORDION (faq.html)
  ───────────────────────────────────────────── */
  const faqContainer = document.getElementById('faq');
  if (faqContainer) {
    const faqs = [
      { q: "What is the difference between Medjool, Khalas, and other date varieties?", a: "Medjool dates are larger, softer, and richer in sweetness, while Khalas dates are slightly firmer with a caramel-like flavor. Other varieties differ in texture and taste depending on their origin." },
      { q: "What makes Zadina dates and chocolates different?", a: "Zadina focuses on premium sourcing and handcrafted quality, combining tradition with modern luxury to deliver a refined gifting experience." },
      { q: "What is the Zadina Pistachio Kunafa Chocolate Bar?", a: "It is a signature chocolate bar filled with creamy pistachio and layered with crispy kunafa, blending Middle Eastern flavors with luxury chocolate." },
      { q: "Do your products contain refined sugar?", a: "No, our products are naturally sweetened with dates and do not contain refined sugar." },
      { q: "Do your products contain preservatives or artificial ingredients?", a: "No, all products are made without preservatives or artificial ingredients to maintain natural quality." },
      { q: "Are your products suitable for gifting?", a: "Yes, our collections are designed as premium gift experiences, perfect for special occasions and corporate gifting." },
      { q: "How should I store Zadina's dates?", a: "Store your dates in a cool, dry place. For longer freshness, refrigeration is recommended." },
      { q: "Do dates expire? How long do they last?", a: "Dates have a long shelf life and can last several months if stored properly in a cool environment." },
      { q: "Are dates gluten-free and vegan?", a: "Yes, dates are naturally gluten-free and vegan. They are a plant-based fruit with no added ingredients that would contain gluten or animal products." },
      { q: "Where do Zadina dates come from?", a: "Our dates are sourced from carefully selected farms across the Middle East, known for producing premium-quality dates." },
      { q: "Are dates safe for children or toddlers?", a: "Yes, dates are safe, but they should be cut into small pieces for younger children to prevent choking." },
      { q: "Can I use Zadina's dates in cooking or baking?", a: "Absolutely, our dates are perfect for desserts, smoothies, baking, and savory dishes." },
      { q: "How can I place an order on Zadina?", a: "You can place an order directly through our website by selecting your products and proceeding to checkout." },
      { q: "Can I change or cancel my order?", a: "Orders can be changed or cancelled shortly after placement. Please contact customer support as soon as possible." },
      { q: "Do I need an account to place an order?", a: "No, you can checkout as a guest without creating an account." },
      { q: "Can I include a gift message with my order?", a: "Yes, you can include a personalized gift message during checkout." },
      { q: "Are your gift boxes customizable?", a: "Yes, we offer customization options to create a tailored gifting experience." },
      { q: "Can I set up corporate or bulk gifting with Zadina?", a: "Yes, we provide corporate and bulk gifting solutions. Please contact us for more details." },
      { q: "How long does delivery take?", a: "Delivery times vary depending on your location, but orders are typically delivered within a few business days." },
      { q: "Where does Zadina deliver?", a: "We currently deliver across selected regions. Please check availability during checkout." },
      { q: "Do you offer same-day delivery?", a: "Same-day delivery is available in select areas depending on product availability." },
      { q: "Can I place an international order?", a: "Yes, we offer international shipping to selected countries." },
      { q: "How can I track my order?", a: "Once your order is dispatched, you will receive a tracking link via email." },
      { q: "Can I schedule my delivery for a specific date?", a: "Yes, you can select a preferred delivery date at checkout if available." },
      { q: "What should I do if my delivery is delayed?", a: "If your delivery is delayed, please contact our support team for assistance." },
      { q: "What payment methods are accepted?", a: "We accept major credit cards, debit cards, and secure online payment options." },
      { q: "Is my payment information secure?", a: "Yes, all transactions are protected with secure encryption technology." },
      { q: "Can I return or exchange a product?", a: "Returns and exchanges are subject to our policy. Please review our terms for details." },
      { q: "How are refunds processed?", a: "Refunds are processed to the original payment method within a few business days." }
    ];

    faqs.forEach(item => {
      const div = document.createElement('div');
      div.className = 'faq-item';
      div.innerHTML = `
        <div class="faq-question">${item.q}<div class="icon">+</div></div>
        <div class="faq-answer">${item.a}</div>`;
      faqContainer.appendChild(div);
    });

    document.addEventListener('click', e => {
      const q = e.target.closest('.faq-question');
      if (!q) return;
      const item = q.parentElement;
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('active');
        i.querySelector('.icon').textContent = '+';
      });
      item.classList.add('active');
      item.querySelector('.icon').textContent = '−';
    });
  }

  /* ─────────────────────────────────────────────
     13. LOGIN / SIGNUP TOGGLE (login.html)
         NOTE: Firebase auth.js handles real auth.
         showAuth() is defined in auth.js.
         No dummy handlers needed here.
  ───────────────────────────────────────────── */

  /* ─────────────────────────────────────────────
     14. CHECKOUT — payment toggle + discount
         NOTE: Firebase checkout.js handles Pay Now + Firestore.
         Only the payment field toggle stays here as a fallback.
  ───────────────────────────────────────────── */
  const creditCardFields = document.getElementById('credit-card-fields');
  document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener('change', function () {
      if (creditCardFields) {
        creditCardFields.style.display =
          document.getElementById('credit-card')?.checked ? 'block' : 'none';
      }
    });
  });

  /* ─────────────────────────────────────────────
     15. PERSONALISED GIFT BOXES (personalised-gift-boxes.html)
  ───────────────────────────────────────────── */
  const qtyEl       = document.getElementById('qty-count');
  const totalEl     = document.getElementById('total-price');
  const summaryTable = document.querySelector('.summary-list tbody');
  const checkoutBtn  = document.querySelector('.btn-checkout');

  if (qtyEl) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    function getQty() { return parseInt(qtyEl.innerText) || 1; }

    function updateVisualiser() {
      let total = 0;
      let html  = '';
      cart.forEach(item => {
        total += item.price * item.qty;
        html  += `<tr><td>• ${item.name}</td><td align="right"><b>${item.price * item.qty} د.إ</b></td></tr>`;
      });
      if (summaryTable) {
        summaryTable.innerHTML = cart.length === 0
          ? '<tr><td>Your custom box is empty.</td></tr>'
          : html;
      }
      if (totalEl) totalEl.innerText = total + ' د.إ';
      localStorage.setItem('cart', JSON.stringify(cart));
    }

    function updatePreview(name) {
      const previewBox    = document.getElementById('preview-box');
      const previewRibbon = document.getElementById('preview-ribbon');
      const previewCard   = document.getElementById('preview-card');
      if (previewBox) {
        if (name === 'Heritage Wood Box')      previewBox.src = 'Personalised Gift Boxes Assets/6.png';
        if (name === 'Classic Green Box')      previewBox.src = 'Personalised Gift Boxes Assets/7.png';
        if (name === 'Black Leather Box')      previewBox.src = 'Personalised Gift Boxes Assets/8.png';
        if (name === 'Three Layer Drawer Box') previewBox.src = 'Personalised Gift Boxes Assets/9.png';
      }
      if (previewRibbon && name === 'Custom Ribbon') previewRibbon.style.display = 'block';
      if (previewCard   && name === 'Gift Card')     previewCard.style.display   = 'block';
    }

    document.querySelectorAll('.btn-add').forEach(btn => {
      btn.addEventListener('click', () => {
        const name  = btn.dataset.name;
        const price = parseFloat(btn.dataset.price);
        const qty   = getQty();
        const existing = cart.find(i => i.name === name);
        if (existing) { existing.qty += qty; } else { cart.push({ name, price, qty }); }
        updateVisualiser();
        updatePreview(name);
        qtyEl.innerText = 1;
      });
    });

    window.updateQty = function (change) {
      let currentQty = getQty();
      currentQty = Math.max(1, currentQty + change);
      qtyEl.innerText = currentQty;
    };

    updateVisualiser();

    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) { alert('Your cart is empty!'); return; }
        localStorage.setItem('cart', JSON.stringify(cart));
        window.location.href = 'cart.html';
      });
    }
  }

  /* ─────────────────────────────────────────────
     16. SEARCH FUNCTIONALITY (search.html)
  ───────────────────────────────────────────── */
  window.performSearch = function () {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    const query = searchInput.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.product-card');
    let hasVisible = false;
    cards.forEach(card => {
      const title = (card.getAttribute('data-title') || '').toLowerCase();
      const show  = title.includes(query);
      card.style.display = show ? 'flex' : 'none';
      if (show) hasVisible = true;
    });
    const noResults = document.getElementById('noResults');
    if (noResults) noResults.style.display = hasVisible ? 'none' : 'block';
  };

  const searchInputEl = document.getElementById('searchInput');
  if (searchInputEl) {
    searchInputEl.addEventListener('input', window.performSearch);
    searchInputEl.addEventListener('keydown', e => { if (e.key === 'Enter') window.performSearch(); });
  }

  /* ─────────────────────────────────────────────
     17. INTERSECTION OBSERVER — scroll animations
         (.animate-on-scroll elements)
  ───────────────────────────────────────────── */
  const animObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
        animObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-on-scroll').forEach(el => animObserver.observe(el));

  // Scroll-based fallback for pages that add classes dynamically
  function animateOnScroll() {
    document.querySelectorAll('.animate-on-scroll').forEach(element => {
      const top    = element.getBoundingClientRect().top;
      const bottom = element.getBoundingClientRect().bottom;
      if (top < window.innerHeight && bottom > 0) element.classList.add('animated');
    });
  }
  window.addEventListener('scroll', animateOnScroll, { passive: true });

  /* ─────────────────────────────────────────────
     18. PAGE-SPECIFIC SCROLL ANIMATION SETUP
  ───────────────────────────────────────────── */

  // contact.html
  document.querySelectorAll('.contact-title, .contact-sub, .divider, .contact-info, .contact-form, .map-section, .info-cards').forEach((el, i) => {
    el.classList.add('animate-on-scroll');
    el.style.animationDelay = (i * 0.1) + 's';
    animObserver.observe(el);
  });
  document.querySelectorAll('.fg input, .fg textarea').forEach(field => {
    field.addEventListener('focus', function () { this.parentElement.classList.add('hover-glow'); });
    field.addEventListener('blur',  function () { this.parentElement.classList.remove('hover-glow'); });
  });
  document.querySelectorAll('.boutique').forEach(boutique => {
    const dot = boutique.querySelector('.boutique-dot');
    if (!dot) return;
    boutique.addEventListener('mouseenter', () => { dot.style.transform = 'scale(1.5)'; dot.style.boxShadow = '0 0 15px rgba(139,58,26,0.8)'; });
    boutique.addEventListener('mouseleave', () => { dot.style.transform = 'scale(1)';   dot.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)'; });
  });

  // learn-about-dates.html
  document.querySelectorAll('.variety-row').forEach((row, i) => {
    row.classList.add('animate-on-scroll');
    row.style.animationDelay = (i * 0.2) + 's';
    animObserver.observe(row);
  });
  document.querySelectorAll('.image-wrapper img').forEach(img => {
    img.addEventListener('mouseenter', function () { this.style.transform = 'scale(1.15) rotate(-2deg)'; this.style.filter = 'brightness(1.1) contrast(1.1)'; });
    img.addEventListener('mouseleave', function () { this.style.transform = 'translate(15px, 25px)';     this.style.filter = 'brightness(1) contrast(1)'; });
  });
  document.querySelectorAll('.dot').forEach(dot => {
    dot.addEventListener('mouseenter', function () { this.style.transform = 'scale(1.2)'; this.style.boxShadow = '0 0 10px rgba(211,174,74,0.8)'; });
    dot.addEventListener('mouseleave', function () { this.style.transform = 'scale(1)';   this.style.boxShadow = 'none'; });
  });

  // our-story.html
  document.querySelectorAll('.story-card').forEach((card, i) => {
    card.classList.add('animate-on-scroll');
    card.style.animationDelay = (i * 0.2) + 's';
    animObserver.observe(card);
    card.addEventListener('mouseenter', function () { this.style.zIndex = '10'; });
    card.addEventListener('mouseleave', function () { this.style.zIndex = '1'; });
  });
  document.querySelectorAll('.feature-img').forEach(img => {
    img.classList.add('animate-on-scroll');
    animObserver.observe(img);
    img.addEventListener('mouseenter', function () { this.style.transform = 'scale(1.05) rotate(1deg)'; this.style.filter = 'brightness(1.1) contrast(1.1)'; });
    img.addEventListener('mouseleave', function () { this.style.transform = 'scale(1) rotate(0deg)';    this.style.filter = 'brightness(1) contrast(1)'; });
  });

  // search.html
  const searchBanner = document.querySelector('.search-banner');
  if (searchBanner) {
    searchBanner.classList.add('animate-on-scroll');
    animObserver.observe(searchBanner);
  }
  document.querySelectorAll('.product-card').forEach((card, i) => {
    card.classList.add('animate-on-scroll');
    card.style.animationDelay = (i * 0.1) + 's';
    animObserver.observe(card);
  });

  // about.html / chocolate-product.html / everyday-gift-boxes.html / our-favorites.html / all-products.html
  document.querySelectorAll('.animate-on-scroll').forEach(el => animObserver.observe(el));

  /* ─────────────────────────────────────────────
     19. INFO CARD HOVER (contact + learn-about-dates)
  ───────────────────────────────────────────── */
  document.querySelectorAll('.info-card').forEach(card => {
    card.addEventListener('mouseenter', function () { this.style.transform = 'translateY(-8px) scale(1.02)'; });
    card.addEventListener('mouseleave', function () { this.style.transform = ''; });
  });

}); // end DOMContentLoaded
