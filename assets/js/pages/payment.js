/**
 * pages/payment.js
 * صفحه پرداخت / آپلود رسید — #/payment
 *
 * وابستگی‌ها:
 *   api.js → window.API
 *   router.js → window.Router
 *   utils/dom.js → window.DOM
 */

;(function () {
  'use strict';

  const { show, hide, text } = DOM;

  let _selectedReceiptFile = null;

  /* ── global handlers (onclick در HTML) ── */
  window.handleFile = function (input) {
    const f = input.files[0];
    if (!f) return;

    if (f.size > 5 * 1024 * 1024) {
      const err = document.getElementById('upload-error');
      if (err) { err.textContent = 'حجم فایل بیش از ۵ مگابایت است'; err.classList.remove('hidden'); }
      input.value = '';
      return;
    }

    _selectedReceiptFile = f;
    hide('upload-ph');
    show('upload-preview');
    text('file-name', f.name);
    hide('upload-error');
  };

  window.submitReceipt = async function () {
    const stored = JSON.parse(sessionStorage.getItem('gb_checkout') || '{}');
    // uploadReceipt endpoint نیاز به id داره نه order_number
    const orderId = stored.id || stored.order_id;
    const errEl = document.getElementById('upload-error');
    const btn   = document.getElementById('submit-receipt-btn');

    if (!_selectedReceiptFile) {
      if (errEl) { errEl.textContent = 'لطفاً تصویر رسید را انتخاب کنید'; errEl.classList.remove('hidden'); }
      return;
    }
    if (!orderId) {
      if (errEl) { errEl.textContent = 'شماره سفارش نامعتبر است'; errEl.classList.remove('hidden'); }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'در حال ارسال...'; }
    if (errEl) errEl.classList.add('hidden');

    try {
      await API.orders.uploadReceipt(orderId, _selectedReceiptFile);
      sessionStorage.removeItem('gb_checkout');
      API.utils.toast('رسید با موفقیت ثبت شد. سفارش شما در دست بررسی است.', 'success', 4000);
      setTimeout(() => Router.go('/'), 2500);
    } catch (e) {
      if (errEl) { errEl.textContent = e.message || 'خطا در ارسال رسید'; errEl.classList.remove('hidden'); }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'ارسال رسید'; }
    }
  };

  window.copyText = function (elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    navigator.clipboard.writeText(el.textContent.trim())
      .then(() => {
        const toast = document.getElementById('copy-toast');
        if (toast) { toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 2000); }
      })
      .catch(() => API.utils.toast('متن کپی نشد!', 'error'));
  };

  /* ── Router ── */
  Router.onEnter('payment', function () {
    _selectedReceiptFile = null;

    // ریست فرم آپلود
    const ph = document.getElementById('upload-ph');
    const pr = document.getElementById('upload-preview');
    if (ph) ph.classList.remove('hidden');
    if (pr) pr.classList.add('hidden');
    hide('upload-error');

    // بارگذاری اطلاعات سفارش از sessionStorage
    try {
      const orderData = JSON.parse(sessionStorage.getItem('gb_checkout') || '{}');
      text('payment-order-number', orderData.order_number || '-');
      text('payment-total-amount',
        orderData.total_amount ? API.utils.formatPrice(orderData.total_amount) : '—'
      );
    } catch (e) {
      console.error('خطا در خواندن اطلاعات سفارش:', e);
    }
  });

})();