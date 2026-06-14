/**
 * pages/checkout.js
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import { storeConfig } from '../config/bootstrap.js';
import { renderImageWithFallback } from '../utils/imagePlaceholder.js';
import { loadIranLocations, fillSelect } from '../utils/iranLocations.js';
import DOM from '../utils/dom.js';

const { show, hide, text, reclone } = DOM;

let _checkoutCart = null;
let _checkoutDiscount = null;
let _locations = null;
let _locationsBound = false;

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
        <div class="w-14 h-14 rounded-lg shrink-0 overflow-hidden bg-[#f5f5f7] relative">
          ${renderImageWithFallback({ src: item.image || '', alt: item.name, iconSize: 'w-6 h-6' })}
        </div>
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

function _resetCitySelect(cityEl) {
  fillSelect(cityEl, [], 'ابتدا استان انتخاب کنید');
  cityEl.disabled = true;
}

function _bindLocationSelects(provinceEl, cityEl) {
  if (_locationsBound) return;
  _locationsBound = true;

  provinceEl.addEventListener('change', () => {
    const provinceId = provinceEl.value;
    if (!provinceId || !_locations) {
      _resetCitySelect(cityEl);
      return;
    }

    const cities = _locations.getCities(provinceId).map((name) => ({ value: name, label: name }));
    fillSelect(cityEl, cities, 'انتخاب شهر...');
    cityEl.disabled = false;
  });
}

async function _initLocationSelects() {
  const provinceEl = document.getElementById('province-select');
  const cityEl = document.getElementById('city-select');
  if (!provinceEl || !cityEl) return;

  _resetCitySelect(cityEl);
  provinceEl.value = '';

  try {
    _locations = await loadIranLocations(storeConfig.data.iranLocations);
  } catch {
    fillSelect(provinceEl, [], 'خطا در بارگذاری استان‌ها');
    provinceEl.disabled = true;
    return;
  }

  provinceEl.disabled = false;
  fillSelect(
    provinceEl,
    _locations.provinces.map((p) => ({ value: p.id, label: p.name })),
    'انتخاب استان...',
  );
  _bindLocationSelects(provinceEl, cityEl);
}

function _buildShippingAddress(provinceName, city, address, postalCode) {
  return `${provinceName}، ${city}، ${address} — کد پستی: ${postalCode}`;
}

async function _submitOrder() {
  const name = document.getElementById('customer-name')?.value.trim();
  const phone = document.getElementById('customer-phone')?.value.trim();
  const provinceEl = document.getElementById('province-select');
  const city = document.getElementById('city-select')?.value.trim();
  const postalCode = document.getElementById('postal-code')?.value.trim();
  const address = document.getElementById('shipping-address')?.value.trim();
  const provinceName = provinceEl?.selectedOptions?.[0]?.textContent?.trim() || '';
  const errEl = document.getElementById('form-error');

  if (!name || !phone || !provinceEl?.value || !city || !postalCode || !address) {
    if (errEl) { errEl.textContent = 'لطفاً تمام فیلدهای ضروری را پر کنید'; errEl.classList.remove('hidden'); }
    return;
  }
  if (errEl) errEl.classList.add('hidden');

  const fullAddress = _buildShippingAddress(provinceName, city, address, postalCode);

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
      shipping_address: fullAddress,
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
      shipping_address: fullAddress,
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
    await _initLocationSelects();
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
