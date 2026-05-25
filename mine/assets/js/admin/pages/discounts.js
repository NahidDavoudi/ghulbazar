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

      const statusBadge = active
        ? 'bg-green-900/30 text-green-400 border border-green-800'
        : expired
          ? 'bg-[#3a1f24] text-[#c8939c] border border-[#47242a]'
          : 'bg-[#2d161a] text-[rgba(255,255,255,0.4)] border border-[#47242a]';

      const statusLabel = active ? 'فعال' : (expired ? 'منقضی' : 'غیرفعال');

      const valueLabel = d.type === 'percent'
        ? `${d.value}٪ تخفیف`
        : `${Number(d.value).toLocaleString('fa-IR')} تومان تخفیف`;

      return `
        <div class="bg-[#2d161a] border border-[#47242a] rounded-2xl p-5 flex flex-col gap-4
                    hover:border-[#cf1736]/40 transition-colors relative overflow-hidden">

          <!-- گلو اثر پس‌زمینه -->
          <div class="absolute top-0 left-0 w-32 h-32 bg-[#cf1736]/5 rounded-full blur-2xl pointer-events-none"></div>

          <!-- ردیف اول: کد + وضعیت -->
          <div class="flex items-center justify-between gap-3">
            <span class="font-mono font-black text-white tracking-widest text-base bg-[#3a1f24]
                         border border-[#47242a] px-3 py-1.5 rounded-lg select-all">
              ${d.code}
            </span>
            <span class="text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap ${statusBadge}">
              ${statusLabel}
            </span>
          </div>

          <!-- ردیف دوم: مقدار تخفیف -->
          <div class="flex items-center gap-2">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#cf1736" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M7 7h.01M17 17h.01M7 17h.01M17 7h.01
                   M3 12a9 9 0 1118 0 9 9 0 01-18 0z"/>
            </svg>
            <span class="text-white font-bold text-sm">${valueLabel}</span>
          </div>

          <!-- ردیف سوم: تاریخ‌ها -->
          <div class="flex gap-4 text-xs text-[rgba(255,255,255,0.5)]">
            ${d.valid_from ? `<span>از ${new Date(d.valid_from).toLocaleDateString('fa-IR')}</span>` : ''}
            ${d.valid_to   ? `<span>تا ${new Date(d.valid_to).toLocaleDateString('fa-IR')}</span>`   : '<span>بدون تاریخ انقضا</span>'}
          </div>

          <!-- ردیف چهارم: دکمه‌ها -->
          <div class="flex gap-2 pt-1 border-t border-[#47242a]">
            ${active ? `
              <button onclick="deactivateDiscount(${d.id})"
                class="flex-1 py-2 text-xs font-bold bg-[#3a1f24] hover:bg-[#47242a]
                       text-[rgba(255,255,255,0.7)] hover:text-white border border-[#47242a]
                       rounded-lg transition-all">
                غیرفعال کردن
              </button>` : ''}
            <button onclick="deleteDiscount(${d.id})"
              class="flex-1 py-2 text-xs font-bold bg-[#cf1736]/10 hover:bg-[#cf1736]/20
                     text-[#cf1736] border border-[#cf1736]/30 hover:border-[#cf1736]/60
                     rounded-lg transition-all">
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