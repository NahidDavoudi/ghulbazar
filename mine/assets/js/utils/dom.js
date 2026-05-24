/**
 * utils/dom.js
 * ابزارهای مشترک DOM — وابستگی به هیچ ماژول دیگه‌ای نداره
 */

;(function () {
  'use strict';

  window.DOM = {
    /** نمایش المان با id */
    show(id) { document.getElementById(id)?.classList.remove('hidden'); },

    /** مخفی‌کردن المان با id */
    hide(id) { document.getElementById(id)?.classList.add('hidden'); },

    /** تنظیم textContent المان با id */
    text(id, t) {
      const el = document.getElementById(id);
      if (el) el.textContent = t;
    },

    /** ساخت href هش‌بیس برای لینک‌های داخلی */
    hashHref(page, params = {}) {
      const qs = new URLSearchParams(params).toString();
      return qs ? `#/${page}?${qs}` : `#/${page}`;
    },

    /**
     * کلون‌کردن المان برای حذف همه event listenerها
     * @returns {HTMLElement} المان جدید جایگزین‌شده
     */
    reclone(id) {
      const el = document.getElementById(id);
      if (!el) return null;
      const fresh = el.cloneNode(true);
      el.parentNode.replaceChild(fresh, el);
      return fresh;
    },
  };

})();
