let cartData = null;
let discountData = null;

async function loadCart() {
  try {
    const data = await apiFetch('cart');
    cartData = data;
    document.getElementById('loading').classList.add('hidden');

    if (!data.items.length) {
      document.getElementById('empty-cart').classList.remove('hidden');
      return;
    }

    document.getElementById('cart-content').classList.remove('hidden');
    renderCart(data);
  } catch(e) {
    document.getElementById('loading').innerHTML = `<p class="text-accent">${e.message}</p>`;
  }
}

function renderCart(data) {
  const shipping = data.total >= 1500000 ? 0 : 50000;
  const discount = discountData ? (discountData.type === 'percent' ? data.total * discountData.value / 100 : discountData.value) : 0;
  const finalTotal = data.total + shipping - discount;

  document.getElementById('cart-items').innerHTML = data.items.map(item => `
    <div class="bg-dark-2 border border-border rounded-xl p-4 flex gap-4 items-center" id="item-${item.id}">
      <img src="${item.image || ''}" alt="${item.name}" class="w-20 h-20 rounded-lg object-cover shrink-0"
           onerror="this.src='https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop'">
      <div class="flex-1 text-right min-w-0">
        <h3 class="font-medium mb-1 truncate">
          <a href="product.html?id=${item.id}" class="hover:text-muted">${item.name}</a>
        </h3>
        <p class="text-accent font-bold mt-1">${formatPrice(item.price)}</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button onclick="removeItem(${item.id})" class="w-8 h-8 rounded border border-border text-text-dim hover:border-red-500 hover:text-red-400 transition-colors text-sm">✕</button>
        <input type="number" value="${item.qty}" min="1" max="10"
               class="w-14 bg-dark border border-border rounded px-2 py-1 text-center text-sm"
               onchange="updateItem(${item.id}, this.value)">
      </div>
    </div>`).join('');

  document.getElementById('summary-lines').innerHTML = `
    <div class="flex justify-between text-text-dim text-sm">
      <span>${formatPrice(data.total)}</span><span>جمع کالاها</span>
    </div>
    ${discount > 0 ? `<div class="flex justify-between text-green-400 text-sm">
      <span>-${formatPrice(discount)}</span><span>تخفیف</span>
    </div>` : ''}
    <div class="flex justify-between text-text-dim text-sm">
      <span>${shipping === 0 ? 'رایگان' : formatPrice(shipping)}</span><span>ارسال</span>
    </div>`;
  document.getElementById('final-total').textContent = formatPrice(finalTotal);
}

async function removeItem(productId) {
  try {
    await apiFetch(`cart&product_id=${productId}`, { method: 'DELETE' });
    loadCart();
  } catch(e) { alert(e.message); }
}

async function updateItem(productId, qty) {
  try {
    await apiFetch('cart', { method: 'PUT', body: JSON.stringify({ product_id: productId, qty: parseInt(qty) }) });
    loadCart();
  } catch(e) { alert(e.message); }
}

document.addEventListener('DOMContentLoaded', () => {
  injectHeader(); injectFooter(); loadCartCount(); loadCart();

  document.getElementById('apply-discount').addEventListener('click', async () => {
    const code = document.getElementById('discount-input').value.trim();
    const msg = document.getElementById('discount-msg');
    if (!code) return;
    try {
      discountData = await apiFetch(`discounts&action=validate&code=${encodeURIComponent(code)}`);
      msg.textContent = `✓ کد تخفیف اعمال شد`;
      msg.className = 'text-xs mt-2 text-right text-green-400';
      msg.classList.remove('hidden');
      if (cartData) renderCart(cartData);
    } catch(e) {
      discountData = null;
      msg.textContent = '✕ کد تخفیف نامعتبر است';
      msg.className = 'text-xs mt-2 text-right text-red-400';
      msg.classList.remove('hidden');
    }
  });
});
