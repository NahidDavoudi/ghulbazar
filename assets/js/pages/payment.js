/**
 * pages/payment.js
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import { storeConfig } from '../config/bootstrap.js';
import DOM from '../utils/dom.js';

const { show, hide, text } = DOM;

let _selectedReceiptFile = null;

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
  const orderId = stored.id || stored.order_id;
  const errEl = document.getElementById('upload-error');
  const btn = document.getElementById('submit-receipt-btn');

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
    await api.orders.uploadReceipt(orderId, _selectedReceiptFile);
    sessionStorage.removeItem('gb_checkout');
    api.utils.toast('رسید با موفقیت ثبت شد. سفارش شما در دست بررسی است.', 'success', 4000);
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
    .catch(() => api.utils.toast('متن کپی نشد!', 'error'));
};

Router.onEnter('payment', function () {
  _selectedReceiptFile = null;

  document.getElementById('upload-ph')?.classList.remove('hidden');
  document.getElementById('upload-preview')?.classList.add('hidden');
  hide('upload-error');

  const cardEl = document.getElementById('payment-card-number');
  const ownerEl = document.getElementById('payment-card-owner');
  const cardNumber = storeConfig.payment.cardNumber?.trim();
  const cardOwner = storeConfig.payment.cardOwner?.trim();

  if (cardEl) {
    cardEl.textContent = cardNumber || storeConfig.payment.unavailableMessage || '—';
  }
  if (ownerEl) {
    ownerEl.textContent = cardOwner || '—';
  }

  try {
    const orderData = JSON.parse(sessionStorage.getItem('gb_checkout') || '{}');
    text('payment-order-number', orderData.order_number || '-');
    text('payment-total-amount',
      orderData.total_amount ? api.utils.formatPrice(orderData.total_amount) : '—');
  } catch (e) {
    console.error('خطا در خواندن اطلاعات سفارش:', e);
  }
});
