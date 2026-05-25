/**
 * admin/pages/discounts.js
 * مدیریت کدهای تخفیف: لیست و ایجاد
 * وابستگی: helpers.js, api.js
 */

;(function () {
  'use strict';

  /* ── Render list ───────────────────────────────────────────── */
  function renderDiscounts(list) {
    const el = $('discountsContainer');
    if (!el) return;

    if (!list?.length) {
      el.innerHTML = '<p class="text-stone-400 col-span-full text-center py-8">کد تخفیفی ثبت نشده</p>';
      return;
    }

    el.innerHTML = list.map(d => {
      const now     = new Date();
      const validTo = d.valid_to ? new Date(d.valid_to) : null;
      const expired = validTo && validTo < now;
      const active  = d.is_active && !expired;

      return `
        <div class="bg-dark border border-stone-700 rounded-xl p-4 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="font-mono font-bold text-white tracking-widest">${d.code}</span>
            <span class="text-xs px-2 py-1 rounded-full font-bold
              ${active ? 'bg-green-900/40 text-green-400 border border-green-700' : 'bg-stone-700 text-stone-400 border border-stone-600'}">
              ${active ? 'فعال' : (expired ? 'منقضی' : 'غیرفعال')}
            </span>
          </div>
          <div class="flex gap-4 text-sm text-stone-400">
            <span>${d.type === 'percent' ? d.value + '٪' : Number(d.value).toLocaleString('fa-IR') + ' تومان'} تخفیف</span>
            ${d.valid_to ? `<span>تا ${new Date(d.valid_to).toLocaleDateString('fa-IR')}</span>` : ''}
          </div>
          <div class="flex gap-2 mt-1">
            ${active ? `
              <button onclick="deactivateDiscount(${d.id})"
                class="flex-1 py-1.5 text-xs bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg transition-colors">
                غیرفعال
              </button>` : ''}
            <button onclick="deleteDiscount(${d.id})"
              class="flex-1 py-1.5 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800 rounded-lg transition-colors">
              حذف
            </button>
          </div>
        </div>`;
    }).join('');
  }

  /* ── Public loader ─────────────────────────────────────────── */
  window.loadDiscounts = async function () {
    const el = $('discountsContainer');
    if (!el) return;

    el.innerHTML = '<p class="text-stone-400 col-span-full text-center py-8 animate-pulse">در حال بارگذاری...</p>';

    try {
      const list = await API.discounts.list();
      renderDiscounts(Array.isArray(list) ? list : (list?.data || []));
    } catch (e) {
      el.innerHTML = `<p class="text-red-400 col-span-full text-center py-8">${e.message}</p>`;
    }
  };

  /* ── Deactivate ─────────────────────────────────────────────── */
  window.deactivateDiscount = async function (id) {
    try {
      await API.discounts.deactivate(id);
      toast('کد تخفیف غیرفعال شد');
      loadDiscounts();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  /* ── Delete ─────────────────────────────────────────────────── */
  window.deleteDiscount = async function (id) {
    if (!confirm('حذف شود؟')) return;
    try {
      await API.discounts.delete(id);
      toast('کد تخفیف حذف شد');
      loadDiscounts();
    } catch (e) {
      toast(e.message, 'error');
    }
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
      loadDiscounts();
    } catch (e) {
      setLoading(false);
      toast(e.message, 'error');
    }
  });

})();