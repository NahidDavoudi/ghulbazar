/**
 * pages/checkout.js
 * صفحه تسویه حساب — #/checkout
 *
 * وابستگی‌ها:
 *   api.js → window.API
 *   router.js → window.Router
 *   app.js → loadCartCount
 *   utils/dom.js → window.DOM
 */

;(function () {
  'use strict';

  const { show, hide, text, reclone } = DOM;

  let _checkoutCart     = null;
  let _checkoutDiscount = null;

  /* ── render summary ── */
  function _renderCheckoutSummary() {
    if (!_checkoutCart) return;

    const shipping  = _checkoutCart.total >= 1500000 ? 0 : 50000;
    const discAmt   = _checkoutDiscount
      ? (_checkoutDiscount.type === 'percent'
        ? Math.round(_checkoutCart.total * _checkoutDiscount.value / 100)
        : _checkoutDiscount.value)
      : 0;
    const finalTotal = _checkoutCart.total + shipping - discAmt;

    const itemsEl = document.getElementById('order-items');
    if (itemsEl) {
      itemsEl.innerHTML = _checkoutCart.items.map(item => `
        <div class="flex items-center gap-3">
          <img src="${item.image || ''}"
               class="w-14 h-14 rounded-lg object-cover shrink-0"
               onerror="this.src='https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=100&h=100&fit=crop'">
          <div class="flex-1 text-right min-w-0">
            <p class="text-sm font-medium truncate">${item.name}</p>
            <p class="text-xs text-[#c8939c]">× ${item.qty}</p>
          </div>
          <p class="text-sm font-bold shrink-0">${API.utils.formatPrice(item.subtotal || item.price * item.qty)}</p>
        </div>`).join('');
    }

    const breakdownEl = document.getElementById('price-breakdown');
    if (breakdownEl) {
      breakdownEl.innerHTML = `
        <div class="flex justify-between text-[rgba(255,255,255,0.6)] text-sm">
          <span>${API.utils.formatPrice(_checkoutCart.total)}</span><span>جمع کالاها</span>
        </div>
        ${discAmt > 0 ? `<div class="flex justify-between text-green-400 text-sm">
          <span>-${API.utils.formatPrice(discAmt)}</span><span>تخفیف</span>
        </div>` : ''}
        <div class="flex justify-between text-[rgba(255,255,255,0.6)] text-sm">
          <span>${shipping === 0 ? 'رایگان' : API.utils.formatPrice(shipping)}</span><span>ارسال</span>
        </div>`;
    }

    text('checkout-total', API.utils.formatPrice(finalTotal));
  }

  /* ── submit ── */
  async function _submitOrder() {
    const name    = document.getElementById('customer-name')?.value.trim();
    const phone   = document.getElementById('customer-phone')?.value.trim();
    const address = document.getElementById('shipping-address')?.value.trim();
    const errEl   = document.getElementById('form-error');

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

      const items = _checkoutCart.items.map(i => ({ product_id: i.id, qty: i.qty }));

      const result = await API.orders.create({
        customer_name: name,
        customer_phone: phone,
        shipping_address: address,
        payment_method: 'cash', // 👈 اینو اضافه کن
        items,
        ...(discountCode ? { discount_code: discountCode } : {}),
      });

      await API.cart.clear();
      loadCartCount?.();

      sessionStorage.setItem('gb_checkout', JSON.stringify({
        ...result,
        customer_name: name, customer_phone: phone, shipping_address: address,
      }));

      Router.go('/payment');
    } catch (e) {
      if (errEl) { errEl.textContent = e.message; errEl.classList.remove('hidden'); }
      if (btn)   { btn.disabled = false; btn.textContent = 'ثبت سفارش'; }
    }
  }

  /* ── Router ── */
  Router.onEnter('checkout', async function () {
    _checkoutDiscount = null;
    show('checkout-loading');
    hide('checkout-empty-msg');
    hide('checkout-form');
    hide('checkout-success');

    // پر کردن اطلاعات کاربر لاگین‌شده
    const user = API.auth.currentUser();
    if (user) {
      const nameEl  = document.getElementById('customer-name');
      const phoneEl = document.getElementById('customer-phone');
      if (nameEl  && !nameEl.value)  nameEl.value  = user.name  || '';
      if (phoneEl && !phoneEl.value) phoneEl.value = user.phone || '';
    }

    try {
      const data = _checkoutCart = await API.cart.get();
      hide('checkout-loading');

      if (!data.items?.length) { show('checkout-empty-msg'); return; }
      show('checkout-form');
      _renderCheckoutSummary();
    } catch (e) {
      const el = document.getElementById('checkout-loading');
      if (el) el.innerHTML = `<p class="text-[#cf1736] text-center">${e.message}</p>`;
    }

    // Submit button
    const newSubmit = reclone('submit-btn');
    if (newSubmit) newSubmit.addEventListener('click', _submitOrder);

    // کد تخفیف
    const newApply = reclone('checkout-apply-discount');
    if (newApply) {
      newApply.addEventListener('click', async () => {
        const code = document.getElementById('checkout-discount-input')?.value.trim();
        const msg  = document.getElementById('checkout-discount-msg');
        if (!code) return;
        try {
          _checkoutDiscount = await API.discounts.validate(code);
          if (msg) {
            msg.textContent = '✓ کد تخفیف اعمال شد';
            msg.className   = 'text-xs mt-2 text-right text-green-400';
            msg.classList.remove('hidden');
          }
          _renderCheckoutSummary();
        } catch {
          _checkoutDiscount = null;
          if (msg) {
            msg.textContent = '✕ کد تخفیف نامعتبر است';
            msg.className   = 'text-xs mt-2 text-right text-red-400';
            msg.classList.remove('hidden');
          }
        }
      });
    }
  });

})();
