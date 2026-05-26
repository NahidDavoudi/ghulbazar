/**
 * pages/cart.js
 * صفحه سبد خرید — #/cart
 *
 * وابستگی‌ها:
 *   api.js → window.API
 *   router.js → window.Router
 *   app.js → loadCartCount
 *   utils/dom.js → window.DOM
 */

;(function () {
  'use strict';

  const { show, hide, text, hashHref, reclone } = DOM;

  let _cartData     = null;
  let _cartDiscount = null;

  /* ── render ── */
  function _renderCart(data) {
    const shipping = data.total >= 1500000 ? 0 : 50000;
    const discAmt  = _cartDiscount
      ? (_cartDiscount.type === 'percent'
        ? Math.round(data.total * _cartDiscount.value / 100)
        : _cartDiscount.value)
      : 0;
    const realTotal = data.total + shipping - discAmt;

    const cartItemsEl = document.getElementById('cart-items');
    if (cartItemsEl) {
      cartItemsEl.innerHTML = data.items.map(item => `
        <div class="bg-[#2d161a] border border-[#47242a] rounded-xl p-4 flex gap-4 items-center" id="ci-${item.id}">
          <img src="${item.image || ''}" alt="${item.name}"
               class="w-20 h-20 rounded-lg object-cover shrink-0"
               onerror="this.src='assets/images/placeholder.png?w=200&h=200&fit=crop'">
          <div class="flex-1 text-right min-w-0">
            <h3 class="font-medium mb-1 truncate">
              <a href="${hashHref('product', { id: item.id })}" data-link class="hover:text-[#c8939c]">${item.name}</a>
            </h3>
            <p class="text-[#cf1736] font-bold mt-1">${API.utils.formatPrice(item.price)}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button data-remove="${item.id}"
                    class="w-8 h-8 rounded border border-[#47242a] text-[rgba(255,255,255,0.6)]
                           hover:border-red-500 hover:text-red-400 transition-colors text-sm">✕</button>
            <input type="number" value="${item.qty}" min="1" max="10"
                   data-update="${item.id}"
                   class="w-14 bg-[#221114] border border-[#47242a] rounded px-2 py-1 text-center text-sm">
          </div>
        </div>`).join('');

      cartItemsEl.querySelectorAll('[data-remove]').forEach(btn =>
        btn.addEventListener('click', () => _cartRemove(btn.dataset.remove))
      );
      cartItemsEl.querySelectorAll('[data-update]').forEach(inp =>
        inp.addEventListener('change', () => _cartUpdate(inp.dataset.update, inp.value))
      );
    }

    const summaryEl = document.getElementById('summary-lines');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="flex justify-between text-[rgba(255,255,255,0.6)] text-sm">
          <span>${API.utils.formatPrice(data.total)}</span><span>جمع کالاها</span>
        </div>
        ${discAmt > 0 ? `<div class="flex justify-between text-green-400 text-sm">
          <span>-${API.utils.formatPrice(discAmt)}</span><span>تخفیف</span>
        </div>` : ''}
        <div class="flex justify-between text-[rgba(255,255,255,0.6)] text-sm">
          <span>${shipping === 0 ? 'رایگان' : API.utils.formatPrice(shipping)}</span><span>ارسال</span>
        </div>`;
    }

    text('final-total', API.utils.formatPrice(realTotal));
  }

  /* ── actions ── */
  async function _cartRemove(productId) {
    try {
      await API.cart.remove(productId);
      await _loadCart();
      loadCartCount?.();
    } catch (e) { API.utils.toast(e.message, 'error'); }
  }

  async function _cartUpdate(productId, qty) {
    try {
      await API.cart.update(productId, parseInt(qty));
      await _loadCart();
      loadCartCount?.();
    } catch (e) { API.utils.toast(e.message, 'error'); }
  }

  async function _loadCart() {
    try {
      const data = _cartData = await API.cart.get();
      hide('cart-loading');

      if (!data.items?.length) {
        show('empty-cart');
        hide('cart-content');
        return;
      }

      hide('empty-cart');
      show('cart-content');
      _renderCart(data);
    } catch (e) {
      const el = document.getElementById('cart-loading');
      if (el) el.innerHTML = `<p class="text-[#cf1736] text-center">${e.message}</p>`;
    }
  }

  /* ── Router ── */
  Router.onEnter('cart', async function () {
    _cartDiscount = null;
    show('cart-loading');
    hide('empty-cart');
    hide('cart-content');
    await _loadCart();

    // کد تخفیف
    const newApplyBtn = reclone('apply-discount');
    if (newApplyBtn) {
      newApplyBtn.addEventListener('click', async () => {
        const code = document.getElementById('discount-input')?.value.trim();
        const msg  = document.getElementById('discount-msg');
        if (!code) return;
        try {
          const res = await API.discounts.validate(code, _cartData?.total || 0);
          // بک‌اند { discount, discount_amount, final_total } برمیگردونه
          _cartDiscount = res?.discount || res;
          if (msg) {
            msg.textContent = '✓ کد تخفیف اعمال شد';
            msg.className   = 'text-xs mt-2 text-right text-green-400';
            msg.classList.remove('hidden');
          }
          if (_cartData) _renderCart(_cartData);
        } catch {
          _cartDiscount = null;
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