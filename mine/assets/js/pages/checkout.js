let cartData = null;
let discountData = null;

async function loadCart() {
  try {
    const data = await apiFetch('cart');
    document.getElementById('loading').classList.add('hidden');
    if (!data.items.length) {
      document.getElementById('empty-msg').classList.remove('hidden');
      return;
    }
    cartData = data;
    document.getElementById('checkout-form').classList.remove('hidden');
    renderSummary();
  } catch(e) {
    document.getElementById('loading').innerHTML = `<p class="text-accent">${e.message}</p>`;
  }
}

function renderSummary() {
  if (!cartData) return;
  const shipping = cartData.total >= 1500000 ? 0 : 50000;
  const discount = discountData
    ? (discountData.type === 'percent' ? cartData.total * discountData.value / 100 : discountData.value)
    : 0;
  const finalTotal = cartData.total + shipping - discount;

  document.getElementById('order-items').innerHTML = cartData.items.map(item => `
    <div class="flex items-center gap-3">
      <img src="${item.image || ''}" onerror="this.src='images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=100&h=100&fit=crop'"
           class="w-14 h-14 rounded-lg object-cover shrink-0">
      <div class="flex-1 text-right min-w-0">
        <p class="text-sm font-medium truncate">${item.name}</p>
        <p class="text-xs text-muted">× ${item.qty}</p>
      </div>
      <p class="text-sm font-bold shrink-0">${formatPrice(item.subtotal)}</p>
    </div>`).join('');

  document.getElementById('price-breakdown').innerHTML = `
    <div class="flex justify-between text-text-dim text-sm">
      <span>${formatPrice(cartData.total)}</span><span>جمع کالاها</span>
    </div>
    ${discount > 0 ? `<div class="flex justify-between text-green-400 text-sm">
      <span>-${formatPrice(discount)}</span><span>تخفیف</span>
    </div>` : ''}
    <div class="flex justify-between text-text-dim text-sm">
      <span>${shipping === 0 ? 'رایگان' : formatPrice(shipping)}</span><span>ارسال</span>
    </div>`;
  document.getElementById('checkout-total').textContent = formatPrice(finalTotal);
}

async function submitOrder() {
  const name    = document.getElementById('customer-name').value.trim();
  const phone   = document.getElementById('customer-phone').value.trim();
  const address = document.getElementById('shipping-address').value.trim();
  const errEl   = document.getElementById('form-error');

  if (!name || !phone || !address) {
    errEl.textContent = 'لطفاً تمام فیلدهای ضروری را پر کنید';
    errEl.classList.remove('hidden');
    return;
  }
  errEl.classList.add('hidden');
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'در حال ثبت سفارش...';
  
  try {
    const items = cartData.items.map(i => ({ product_id: i.id, qty: i.qty }));
    const result = await apiFetch('orders', {
      method: 'POST',
      body: JSON.stringify({
        customer_name: name, 
        customer_phone: phone, 
        shipping_address: address, 
        items,
        discount_code: discountData ? document.getElementById('discount-input').value.trim() : undefined,
      }),
    });

    // پاک کردن سبد خرید
    await apiFetch('cart', { method: 'DELETE' });

    // ذخیره اطلاعات سفارش در sessionStorage برای استفاده در صفحه پرداخت
    sessionStorage.setItem('gb_checkout', JSON.stringify({
      ...result,
      customer_name: name,
      customer_phone: phone,
      shipping_address: address,
    }));

    // ریدایرکت به صفحه پرداخت
    window.location.href = 'payment.html';
  } catch(e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'ثبت سفارش';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  injectHeader(); injectFooter(); loadCartCount(); loadCart();

  document.getElementById('submit-btn').addEventListener('click', submitOrder);

  // پیش‌پر کردن اطلاعات کاربر در صورت وجود
  const userData = localStorage.getItem('gb_user');
  if (userData) {
    try {
      const user = JSON.parse(userData);
      document.getElementById('customer-name').value = user.name || '';
      document.getElementById('customer-phone').value = user.phone || '';
    } catch (e) { /* ignore */ }
  }

  document.getElementById('apply-discount').addEventListener('click', async () => {
    const code = document.getElementById('discount-input').value.trim();
    const msg  = document.getElementById('discount-msg');
    if (!code) return;
    try {
      discountData = await apiFetch(`discounts&action=validate&code=${encodeURIComponent(code)}`);
      msg.textContent = `✓ کد تخفیف اعمال شد`;
      msg.className = 'text-xs mt-2 text-right text-green-400';
      msg.classList.remove('hidden');
      renderSummary();
    } catch {
      discountData = null;
      msg.textContent = '✕ کد تخفیف نامعتبر است';
      msg.className = 'text-xs mt-2 text-right text-red-400';
      msg.classList.remove('hidden');
    }
  });
});