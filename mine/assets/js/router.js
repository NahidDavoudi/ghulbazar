/**
 * ╔══════════════════════════════════════════════╗
 *   Ghul Bazar – Hash-based SPA Router
 *   routes:  #/          → home
 *            #/shop      → shop
 *            #/product   → product  (query: ?id=...)
 *            #/categories→ categories
 *            #/cart      → cart
 *            #/checkout  → checkout
 *            #/payment   → payment
 *            #/orders    → orders
 *   login is a separate page (login.html)
 * ╚══════════════════════════════════════════════╝
 */

;(function () {
  'use strict';

  /* ─── Route table ──────────────────────────────────────── */
  const ROUTES = {
    '':           { page: 'home',       title: 'غول بازار',            script: 'home'       },
    '/':          { page: 'home',       title: 'غول بازار',            script: 'home'       },
    '/shop':      { page: 'shop',       title: 'فروشگاه | غول بازار',  script: 'shop'       },
    '/product':   { page: 'product',    title: 'محصول | غول بازار',    script: 'products'   },
    '/categories':{ page: 'categories', title: 'دسته‌بندی‌ها | غول بازار', script: 'categories' },
    '/cart':      { page: 'cart',       title: 'سبد خرید | غول بازار', script: 'cart'       },
    '/checkout':  { page: 'checkout',   title: 'تکمیل سفارش | غول بازار', script: 'checkout'   },
    '/payment':   { page: 'payment',    title: 'پرداخت | غول بازار',   script: 'payment'    },
    '/orders':    { page: 'orders',     title: 'سفارشات | غول بازار',  script: 'orders'     },
  };

  /* ─── State ─────────────────────────────────────────────── */
  const loadedScripts = new Set();
  let   currentPage   = null;

  /* ─── Helpers ───────────────────────────────────────────── */

  /**
   * Parse the current hash into { path, params }
   * e.g.  #/product?id=42  →  { path: '/product', params: { id: '42' } }
   */
  function parseHash() {
    const raw    = location.hash.replace(/^#/, '') || '/';
    const [path, qs = ''] = raw.split('?');
    const params = Object.fromEntries(new URLSearchParams(qs));
    return { path, params };
  }

  /**
   * pages.js is pre-loaded — no lazy loading needed.
   * Trigger the init hook registered via Router.onEnter().
   * Retries if pages.js hasn't finished parsing yet.
   */
  function loadPageScript(name, params) {
    _triggerInit(name, params, 0);
  }

  function _triggerInit(name, params, attempt) {
    const fn = window[`__pageInit_${name}`];
    if (typeof fn === 'function') {
      fn(params);
    } else if (attempt < 20) {
      setTimeout(() => _triggerInit(name, params, attempt + 1), 50);
    } else {
      console.warn(`[Router] No init handler found for: ${name}`);
    }
  }

  /* ─── Show / Hide pages ─────────────────────────────────── */
  function showPage(pageKey) {
    // Hide all pages
    document.querySelectorAll('[data-page]').forEach(el => {
      el.classList.remove('active');
    });

    // Show requested page
    const target = document.querySelector(`[data-page="${pageKey}"]`);
    if (target) {
      target.classList.add('active');
      // Scroll to top on navigation
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      console.warn(`[Router] No [data-page="${pageKey}"] element found.`);
    }
  }

  /* ─── Update <title> ────────────────────────────────────── */
  function setTitle(title) {
    document.title = title;
  }

  /* ─── Main navigate function ────────────────────────────── */
  function navigate() {
    const { path, params } = parseHash();
    const route = ROUTES[path] || ROUTES['/'];  // 404 → home

    if (currentPage === route.page && !Object.keys(params).length) {
      // Same page, no params change – still re-init (e.g. cart refresh)
    }
    currentPage = route.page;

    setTitle(route.title);
    showPage(route.page);
    loadPageScript(route.script, params);

    // Re-run lucide icons in case new SVGs were injected
    if (window.lucide) {
      requestAnimationFrame(() => lucide.createIcons());
    }
  }

  /* ─── Intercept data-link clicks ───────────────────────── */
  /**
   * Instead of full-page reloads, clicks on <a data-link> or
   * <a href="#/..."> are handled by the router.
   */
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[data-link], a[href^="#/"]');
    if (!a) return;

    const href = a.getAttribute('href');
    if (!href || href === '#') return;

    // Let the browser update location.hash, then navigate
    // (hashchange fires automatically – nothing else needed)
    // But if href is an external page (login.html etc.) let it through
    if (href.startsWith('#/')) {
      // Normal hash navigation – browser fires hashchange
      return;
    }
  });

  /* ─── Boot ──────────────────────────────────────────────── */
  window.addEventListener('hashchange', navigate);
  window.addEventListener('DOMContentLoaded', function () {
    // If no hash is present, set default
    if (!location.hash) {
      location.replace('#/');
    } else {
      navigate();
    }
  });

  /* ─── Public API (optional – for page scripts to use) ───── */
  window.Router = {
    /**
     * Programmatic navigation
     * @param {string} path  e.g. '/product'
     * @param {Object} params  e.g. { id: '42' }
     */
    go(path, params = {}) {
      const qs = new URLSearchParams(params).toString();
      location.hash = qs ? `#${path}?${qs}` : `#${path}`;
    },

    /** Current parsed hash */
    current() {
      return parseHash();
    },

    /**
     * Register a page init hook from a page script.
     * @param {string}   name  matches ROUTES[*].script
     * @param {Function} fn    called with params on each navigation to this page
     */
    onEnter(name, fn) {
      window[`__pageInit_${name}`] = fn;
    },
  };

})();