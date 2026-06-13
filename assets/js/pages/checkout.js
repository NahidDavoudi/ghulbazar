/**
 * pages/checkout.js
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import { storeConfig } from '../config/bootstrap.js';
import DOM from '../utils/dom.js';

const { show, hide, text, reclone } = DOM;

let _checkoutCart = null;
let _checkoutDiscount = null;

function _shipping(total) {
  return total >= storeConfig.shipping.freeFrom ? 0 : storeConfig.shipping.standardCost;
}

function _renderCheckoutSummary() {
  if (!_checkoutCart) return;

  const shipping = _shipping(_checkoutCart.total);
  const discAmt = _checkoutDiscount
    ? (_checkoutDiscount.type === 'percent'
      ? Math.round(_checkoutCart.total * _checkoutDiscount.value / 100)
      : _checkoutDiscount.value)
    : 0;
  const finalTotal = _checkoutCart.total + shipping - discAmt;

  const itemsEl = document.getElementById('order-items');
  if (itemsEl) {
    itemsEl.innerHTML = _checkoutCart.items.map((item) => `
      <div class="flex items-center gap-3">
        <img src="${item.image || ''}" class="w-14 h-14 rounded-lg object-cover shrink-0"
             onerror="this.src='${storeConfig.placeholder}'">
        <div class="flex-1 text-right min-w-0">
          <p class="text-sm font-medium truncate">${item.name}</p>
          <p class="text-xs text-muted">× ${item.qty}</p>
        </div>
        <p class="text-sm font-bold shrink-0">${api.utils.formatPrice(item.subtotal || item.price * item.qty)}</p>
      </div>`).join('');
  }

  const breakdownEl = document.getElementById('price-breakdown');
  if (breakdownEl) {
    breakdownEl.innerHTML = `
      <div class="flex justify-between text-muted text-sm"><span>${api.utils.formatPrice(_checkoutCart.total)}</span><span>جمع کالاها</span></div>
      ${discAmt > 0 ? `<div class="flex justify-between text-green-600 text-sm"><span>-${api.utils.formatPrice(discAmt)}</span><span>تخفیف</span></div>` : ''}
      <div class="flex justify-between text-muted text-sm"><span>${shipping === 0 ? 'رایگان' : api.utils.formatPrice(shipping)}</span><span>ارسال</span></div>`;
  }

  text('checkout-total', api.utils.formatPrice(finalTotal));
}

async function _submitOrder() {
  const name = document.getElementById('customer-name')?.value.trim();
  const phone = document.getElementById('customer-phone')?.value.trim();
  const address = document.getElementById('shipping-address')?.value.trim();
  const errEl = document.getElementById('form-error');

  if (!name || !phone || !address) {
    if (errEl) { errEl.textContent = 'لطفاً تمام فیلدهای ضروری را پر کنید'; errEl.classList.remove('hidden'); }
    return;
  }
  if (errEl) errEl.classList.add('hidden');

  const btn = document.getElementById('submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'در حال ثبت سفارش...'; }

  try {
    const discountCode = _checkoutDiscount
      ? document.getElementById('checkout-discount-input')?.value.trim()
      : undefined;
    const items = _checkoutCart.items.map((i) => ({ product_id: i.id, qty: i.qty }));

    const result = await api.orders.create({
      customer_name: name,
      customer_phone: phone,
      shipping_address: address,
      payment_method: 'cash',
      items,
      ...(discountCode ? { discount_code: discountCode } : {}),
    });

    await api.cart.clear();
    window.loadCartCount?.();

    sessionStorage.setItem('gb_checkout', JSON.stringify({
      ...result,
      customer_name: name,
      customer_phone: phone,
      shipping_address: address,
    }));

    Router.go('/payment');
  } catch (e) {
    if (errEl) { errEl.textContent = e.message; errEl.classList.remove('hidden'); }
    if (btn) { btn.disabled = false; btn.textContent = 'ثبت سفارش'; }
  }
}

Router.onEnter('checkout', async function () {
  _checkoutDiscount = null;
  show('checkout-loading');
  hide('checkout-empty-msg');
  hide('checkout-form');
  hide('checkout-success');

  const user = api.auth.currentUser();
  if (user) {
    const nameEl = document.getElementById('customer-name');
    const phoneEl = document.getElementById('customer-phone');
    if (nameEl && !nameEl.value) nameEl.value = user.name || '';
    if (phoneEl && !phoneEl.value) phoneEl.value = user.phone || '';
  }

  try {
    const data = _checkoutCart = await api.cart.get();
    hide('checkout-loading');
    if (!data.items?.length) { show('checkout-empty-msg'); return; }
    show('checkout-form');
    _renderCheckoutSummary();
  } catch (e) {
    const el = document.getElementById('checkout-loading');
    if (el) el.innerHTML = `<p class="text-accent text-center">${e.message}</p>`;
  }

  reclone('submit-btn')?.addEventListener('click', _submitOrder);

  const newApply = reclone('checkout-apply-discount');
  if (newApply) {
    newApply.addEventListener('click', async () => {
      const code = document.getElementById('checkout-discount-input')?.value.trim();
      const msg = document.getElementById('checkout-discount-msg');
      if (!code) return;
      try {
        const res = await api.discounts.validate(code, _checkoutCart?.total || 0);
        _checkoutDiscount = res?.discount || res;
        if (msg) {
          msg.textContent = '✓ کد تخفیف اعمال شد';
          msg.className = 'text-xs mt-2 text-right text-green-600';
          msg.classList.remove('hidden');
        }
        _renderCheckoutSummary();
      } catch {
        _checkoutDiscount = null;
        if (msg) {
          msg.textContent = '✕ کد تخفیف نامعتبر است';
          msg.className = 'text-xs mt-2 text-right text-red-500';
          msg.classList.remove('hidden');
        }
      }
    });
  }
});
