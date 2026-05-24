/**
 * admin/pages/discounts.js
 * مدیریت کدهای تخفیف: لیست و ایجاد
 * وابستگی: helpers.js, api.js
 */

;(function () {
  'use strict';

  /* ── Public loader ─────────────────────────────────────────── */
  window.loadDiscounts = function () {
    const el = $('discountsContainer');
    if (!el) return;
    el.innerHTML = '<p class="text-stone-400 col-span-full text-center py-8">کدهای تخفیف از طریق فرم زیر اضافه می‌شوند</p>';
  };

  /* ── Open modal ────────────────────────────────────────────── */
  window.showDiscountModal = () => showModal('discountModal');

  /* ── Create discount ───────────────────────────────────────── */
  $('discountForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const payload = {
      code:       getVal('discountCode'),
      type:       getVal('discountType'),
      value:      Number(getVal('discountValue')),
      valid_from: getVal('discountValidFrom'),
      valid_to:   getVal('discountValidTo'),
    };
    if (!payload.code || !payload.value) {
      toast('کد و مقدار الزامی‌اند', 'error');
      return;
    }
    try {
      setLoading(true);
      await API.discounts.create(payload);
      setLoading(false);
      toast('کد تخفیف ایجاد شد');
      hideModal('discountModal');
      $('discountForm')?.reset();
    } catch (e) {
      setLoading(false);
      toast(e.message, 'error');
    }
  });

})();
