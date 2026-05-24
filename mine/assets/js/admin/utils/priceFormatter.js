;(function () {
  'use strict';

  window.attachPriceFormatter = function (inputId) {
    const inp = document.getElementById(inputId);
    if (!inp || inp.dataset.priceBound === '1') return;
    inp.dataset.priceBound = '1';

    inp.addEventListener('input', function () {
      const raw = toEnDigit(this.value).replace(/[^0-9]/g, '');
      if (!raw) { this.value = ''; return; }
      this.value = Number(raw).toLocaleString('fa-IR');
    });

    inp.addEventListener('focus', function () {
      const raw = toEnDigit(this.value).replace(/[^0-9]/g, '');
      this.value = raw;
    });   
  };

})();