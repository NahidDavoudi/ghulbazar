/**
 * admin/utils/priceFormatter.js
 * فرمت‌کننده ورودی قیمت (فارسی، با جداکننده هزار)
 * وابستگی: هیچ‌چیز
 */

;(function () {
  'use strict';

  /**
   * یک بار به input قیمت attach می‌کنه (idempotent)
   * @param {string} inputId  شناسه المان input
   */
  window.attachPriceFormatter = function (inputId) {
    const inp = document.getElementById(inputId);
    if (!inp || inp.dataset.priceBound === '1') return;
    inp.dataset.priceBound = '1';

    inp.addEventListener('input', function () {
      const pos  = this.selectionStart;
      const prev = this.value;
      const raw  = prev.replace(/[^0-9]/g, '');
      if (!raw) { this.value = ''; return; }
      const fmt  = Number(raw).toLocaleString('fa-IR');
      this.value = fmt;
      const diff = fmt.length - prev.length;
      try { this.setSelectionRange(pos + diff, pos + diff); } catch (_) {}
    });

    inp.addEventListener('focus', function () {
      this.value = this.value.replace(/[^0-9]/g, '');
      setTimeout(() => this.select(), 0);
    });

    inp.addEventListener('blur', function () {
      const raw = this.value.replace(/[^0-9]/g, '');
      if (raw) this.value = Number(raw).toLocaleString('fa-IR');
    });
  };

})();
