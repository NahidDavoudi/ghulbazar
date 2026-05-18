// assets/js/app.js
import apiClient from './apiClient.js';

// --------------------------------------------------------------
//  DOM Elements
// --------------------------------------------------------------
const viewContainer = document.getElementById('view');
const headerContainer = document.getElementById('header');
const footerContainer = document.getElementById('footer');
const toastEl = document.getElementById('toast');

// --------------------------------------------------------------
//  State Management
// --------------------------------------------------------------
let currentUser = null;       // { id, name, phone, role }
let cart = { items: [], total: 0, count: 0 };

// --------------------------------------------------------------
//  Utility Functions
// --------------------------------------------------------------
function showToast(message, type = 'success') {
  toastEl.textContent = message;
  toastEl.style.opacity = '1';
  toastEl.style.transform = 'translateX(-50%) translateY(0)';
  const bgColor = type === 'success' ? 'bg-emerald-700' : (type === 'error' ? 'bg-rose-800' : 'bg-amber-700');
  toastEl.className = `fixed bottom-6 left-1/2 z-[999] px-6 py-3 rounded-xl text-sm font-bold shadow-2xl transition-all duration-300 ${bgColor}`;
  setTimeout(() => {
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateX(-50%) translateY(10px)';
  }, 3000);
}

function formatPrice(price) {
  return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
}

function setLoading(container, isLoading) {
  if (!container) return;
  if (isLoading) {
    container.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div></div>`;
  }
}

// Load header and footer once
async function loadLayout() {
  try {
    const headerRes = await fetch('/assets/header.html');
    const footerRes = await fetch('/assets/footer.html');
    if (headerRes.ok) headerContainer.innerHTML = await headerRes.text();
    if (footerRes.ok) footerContainer.innerHTML = await footerRes.text();
    // attach header event listeners after injection
    attachHeaderEvents();
  } catch (err) {
    console.warn('Layout partials not found, using default.');
    // fallback simple header
    headerContainer.innerHTML = `<header class="bg-dark-soft border-b border-gold/20 py-4 px-6 flex justify-between items-center sticky top-0 z-50">
      <a href="#home" class="text-2xl font-display tracking-wider text-gold">غول بازار</a>
      <div class="flex gap-6 text-sm">
        <a href="#home" class="hover:text-gold">خانه</a>
        <a href="#products" class="hover:text-gold">محصولات</a>
        <a href="#cart" class="hover:text-gold relative">سبد خرید <span id="cartCountBadge" class="absolute -top-2 -right-4 bg-gold text-black text-xs rounded-full px-1.5">0</span></a>
        <a href="#login" class="hover:text-gold" id="authLink">ورود</a>
      </div>
    </header>`;
    attachHeaderEvents();
  }
}

function attachHeaderEvents() {
  const cartCountSpan = document.getElementById('cartCountBadge');
  if (cartCountSpan) cartCountSpan.textContent = cart.count || 0;
  const authLink = document.getElementById('authLink');
  if (authLink && currentUser) {
    authLink.textContent = currentUser.name;
    authLink.href = '#profile';
  } else if (authLink) {
    authLink.textContent = 'ورود';
    authLink.href = '#login';
  }
}

async function updateCartBadge() {
  try {
    const cartData = await apiClient.getCart();
    cart = cartData;
    const badge = document.getElementById('cartCountBadge');
    if (badge) badge.textContent = cart.count || 0;
  } catch (err) {
    console.error('Failed to fetch cart', err);
  }
}

// --------------------------------------------------------------
//  Routing
// --------------------------------------------------------------
const routes = {
  home: renderHome,
  products: renderProductsList,
  product: renderProductDetail,
  cart: renderCart,
  checkout: renderCheckout,
  orders: renderOrders,
  order: renderOrderDetail,
  login: renderLogin,
  register: renderRegister,
  profile: renderProfile,
  admin: renderAdminDashboard,
  notFound: renderNotFound,
};

async function router() {
  const hash = window.location.hash.slice(1) || 'home';
  const [route, param] = hash.split('/');
  const renderFn = routes[route] || routes.notFound;
  viewContainer.classList.add('fading');
  setTimeout(async () => {
    await renderFn(param);
    viewContainer.classList.remove('fading');
    window.scrollTo(0, 0);
    await updateCartBadge();
    attachHeaderEvents(); // refresh auth link
  }, 100);
}

window.addEventListener('hashchange', router);
window.addEventListener('load', async () => {
  await loadLayout();
  // Try to restore session via token
  if (apiClient.getToken()) {
    try {
      const user = await apiClient.getMe();
      currentUser = user;
    } catch (e) {
      apiClient.clearToken();
    }
  }
  await router();
});

// --------------------------------------------------------------
//  Page Rendering Functions
// --------------------------------------------------------------

async function renderHome() {
  viewContainer.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 py-8">
      <section class="text-center py-20 bg-gradient-to-b from-dark to-dark-soft rounded-3xl mb-12">
        <h1 class="text-5xl md:text-7xl font-display text-gold mb-4">غول بازار</h1>
        <p class="text-text-dim text-lg">مرجع اصلی جواهرات سورئال و آنتیک</p>
        <a href="#products" class="inline-block mt-8 bg-gold text-dark px-8 py-3 rounded-full font-bold hover:bg-gold-light transition">خرید شگفت‌انگیز</a>
      </section>
      <section>
        <h2 class="text-2xl font-bold mb-6">محصولات ویژه</h2>
        <div id="featuredProductsGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"></div>
      </section>
    </div>
  `;
  try {
    const featured = await apiClient.getFeaturedProducts();
    const grid = document.getElementById('featuredProductsGrid');
    grid.innerHTML = featured.map(p => productCard(p)).join('');
    attachProductCardEvents();
  } catch (err) {
    showToast('خطا در بارگذاری محصولات', 'error');
  }
}

function productCard(product) {
  const image = product.image ? product.image : '/assets/placeholder.jpg';
  return `
    <div class="product-card bg-dark-soft rounded-2xl overflow-hidden shadow-lg hover:shadow-gold/20 transition" data-product-id="${product.id}">
      <img src="${image}" alt="${product.name}" class="w-full h-56 object-cover">
      <div class="p-4">
        <h3 class="font-bold text-lg">${product.name}</h3>
        <div class="flex justify-between items-center mt-2">
          <span class="text-gold font-bold">${formatPrice(product.price)}</span>
          <button class="add-to-cart-btn bg-gold text-dark px-3 py-1 rounded-full text-sm font-bold hover:bg-gold-light transition" data-id="${product.id}">➕ افزودن</button>
        </div>
      </div>
    </div>
  `;
}

async function renderProductsList() {
  viewContainer.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 py-8">
      <div class="flex flex-wrap gap-4 justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">همه محصولات</h1>
        <div class="flex gap-2">
          <select id="sortSelect" class="bg-dark-soft border border-gold/30 rounded-lg px-3 py-2 text-sm">
            <option value="id_desc">جدیدترین</option>
            <option value="price_asc">ارزان‌ترین</option>
            <option value="price_desc">گران‌ترین</option>
          </select>
          <input type="text" id="searchInput" placeholder="جستجو..." class="bg-dark-soft border border-gold/30 rounded-lg px-3 py-2 text-sm">
        </div>
      </div>
      <div id="productsGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"></div>
      <div id="pagination" class="flex justify-center gap-2 mt-8"></div>
    </div>
  `;
  let currentPage = 1;
  const limit = 12;
  const loadProducts = async () => {
    const sort = document.getElementById('sortSelect').value;
    const q = document.getElementById('searchInput').value;
    try {
      const result = await apiClient.getProducts({ page: currentPage, limit, sort, q });
      const grid = document.getElementById('productsGrid');
      grid.innerHTML = result.data.map(p => productCard(p)).join('');
      attachProductCardEvents();
      const paginationDiv = document.getElementById('pagination');
      const totalPages = Math.ceil(result.total / limit);
      paginationDiv.innerHTML = '';
      for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = `px-3 py-1 rounded ${i === currentPage ? 'bg-gold text-dark' : 'bg-dark-soft'}`;
        btn.addEventListener('click', () => { currentPage = i; loadProducts(); });
        paginationDiv.appendChild(btn);
      }
    } catch (err) {
      showToast('خطا در بارگذاری محصولات', 'error');
    }
  };
  document.getElementById('sortSelect').addEventListener('change', () => { currentPage = 1; loadProducts(); });
  document.getElementById('searchInput').addEventListener('input', () => { currentPage = 1; loadProducts(); });
  await loadProducts();
}

async function renderProductDetail(productId) {
  if (!productId) return renderNotFound();
  viewContainer.innerHTML = `<div class="max-w-5xl mx-auto px-4 py-8" id="productDetailContainer">${loadingSpinner()}</div>`;
  try {
    const product = await apiClient.getProduct(productId);
    const mainImage = product.images?.find(i => i.is_main)?.url || product.images?.[0]?.url || '/assets/placeholder.jpg';
    const html = `
      <div class="grid md:grid-cols-2 gap-8">
        <div><img src="${mainImage}" class="w-full rounded-2xl shadow-lg"></div>
        <div>
          <h1 class="text-3xl font-bold mb-2">${product.name}</h1>
          <p class="text-gold text-2xl font-bold mb-4">${formatPrice(product.price)}</p>
          <p class="text-text-dim mb-4">${product.description || ''}</p>
          <div class="flex gap-4 items-center mb-6">
            <input type="number" id="productQty" value="1" min="1" max="${product.stock}" class="w-20 bg-dark-soft border border-gold/30 rounded-lg px-2 py-1 text-center">
            <button id="addToCartBtn" data-id="${product.id}" class="bg-gold text-dark px-6 py-2 rounded-full font-bold hover:bg-gold-light">افزودن به سبد خرید</button>
          </div>
          <div class="text-sm text-text-dim">موجودی: ${product.stock} عدد</div>
        </div>
      </div>
    `;
    document.getElementById('productDetailContainer').innerHTML = html;
    document.getElementById('addToCartBtn')?.addEventListener('click', async (e) => {
      const qty = parseInt(document.getElementById('productQty').value);
      await apiClient.addToCart(product.id, qty);
      showToast('به سبد خرید اضافه شد');
      await updateCartBadge();
    });
  } catch (err) {
    viewContainer.innerHTML = `<div class="text-center py-20">محصول یافت نشد</div>`;
  }
}

async function renderCart() {
  viewContainer.innerHTML = `<div class="max-w-4xl mx-auto px-4 py-8"><h1 class="text-2xl font-bold mb-6">سبد خرید</h1><div id="cartItemsContainer"></div></div>`;
  const container = document.getElementById('cartItemsContainer');
  try {
    const cartData = await apiClient.getCart();
    cart = cartData;
    if (!cart.items.length) {
      container.innerHTML = `<div class="text-center py-20">سبد خرید خالی است</div>`;
      return;
    }
    let itemsHtml = `<div class="space-y-4">`;
    for (const item of cart.items) {
      itemsHtml += `
        <div class="flex flex-wrap gap-4 justify-between items-center bg-dark-soft p-4 rounded-xl">
          <div class="flex gap-4 items-center">
            <img src="${item.image || '/assets/placeholder.jpg'}" class="w-16 h-16 object-cover rounded">
            <div><h3 class="font-bold">${item.name}</h3><div class="text-gold">${formatPrice(item.price)}</div></div>
          </div>
          <div class="flex items-center gap-2">
            <button class="cart-qty-minus bg-gray-700 px-2 py-1 rounded" data-id="${item.id}">-</button>
            <span class="w-8 text-center">${item.qty}</span>
            <button class="cart-qty-plus bg-gray-700 px-2 py-1 rounded" data-id="${item.id}">+</button>
            <button class="cart-remove text-rose-400 mr-4" data-id="${item.id}">🗑️</button>
          </div>
          <div class="font-bold">${formatPrice(item.subtotal)}</div>
        </div>
      `;
    }
    itemsHtml += `</div><div class="mt-8 text-left"><div class="text-xl">مجموع: ${formatPrice(cart.total)}</div><a href="#checkout" class="inline-block mt-4 bg-gold text-dark px-6 py-2 rounded-full font-bold">پرداخت</a></div>`;
    container.innerHTML = itemsHtml;
    attachCartEvents();
  } catch (err) {
    showToast('خطا در دریافت سبد خرید', 'error');
  }
}

function attachCartEvents() {
  document.querySelectorAll('.cart-qty-plus').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.dataset.id;
      const item = cart.items.find(i => i.id == id);
      if (item) await apiClient.updateCartItem(id, item.qty + 1);
      await renderCart();
    });
  });
  document.querySelectorAll('.cart-qty-minus').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.dataset.id;
      const item = cart.items.find(i => i.id == id);
      if (item && item.qty > 1) await apiClient.updateCartItem(id, item.qty - 1);
      else await apiClient.removeCartItem(id);
      await renderCart();
    });
  });
  document.querySelectorAll('.cart-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.dataset.id;
      await apiClient.removeCartItem(id);
      await renderCart();
    });
  });
}

async function renderCheckout() {
  if (!currentUser) {
    showToast('لطفا ابتدا وارد شوید', 'error');
    window.location.hash = '#login';
    return;
  }
  const cartData = await apiClient.getCart();
  if (!cartData.items.length) {
    showToast('سبد خرید خالی است', 'error');
    window.location.hash = '#cart';
    return;
  }
  viewContainer.innerHTML = `
    <div class="max-w-3xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold mb-6">تسویه حساب</h1>
      <form id="checkoutForm" class="space-y-4">
        <input type="text" name="customer_name" placeholder="نام کامل" value="${currentUser.name}" required class="w-full bg-dark-soft border border-gold/30 rounded-lg p-3">
        <input type="tel" name="customer_phone" placeholder="شماره موبایل" value="${currentUser.phone}" required class="w-full bg-dark-soft border border-gold/30 rounded-lg p-3">
        <textarea name="shipping_address" placeholder="آدرس کامل" required class="w-full bg-dark-soft border border-gold/30 rounded-lg p-3"></textarea>
        <div class="flex gap-2"><input type="text" id="discountCode" placeholder="کد تخفیف" class="flex-1 bg-dark-soft border border-gold/30 rounded-lg p-3"><button type="button" id="applyDiscountBtn" class="bg-gold text-dark px-4 rounded-lg">اعمال</button></div>
        <div id="discountInfo" class="text-sm text-emerald-400"></div>
        <div class="text-left text-xl">مبلغ قابل پرداخت: <span id="finalTotal">${formatPrice(cartData.total)}</span></div>
        <div class="border border-dashed border-gold/30 p-4 rounded-lg">
          <label class="block mb-2">آپلود رسید پرداخت (اختیاری)</label>
          <input type="file" id="receiptFile" accept="image/jpeg,image/png,image/webp,application/pdf">
        </div>
        <button type="submit" class="w-full bg-gold text-dark py-3 rounded-full font-bold">ثبت سفارش</button>
      </form>
    </div>
  `;
  let discountData = null;
  document.getElementById('applyDiscountBtn').addEventListener('click', async () => {
    const code = document.getElementById('discountCode').value;
    try {
      discountData = await apiClient.validateDiscountCode(code);
      document.getElementById('discountInfo').innerHTML = `کد ${code} اعمال شد. تخفیف: ${discountData.type === 'percent' ? discountData.value+'%' : formatPrice(discountData.value)}`;
      // recalc total (frontend only, backend recalc on order creation)
    } catch (err) {
      showToast('کد نامعتبر', 'error');
    }
  });
  document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const items = cartData.items.map(i => ({ product_id: i.id, qty: i.qty }));
    const orderData = {
      customer_name: form.customer_name.value,
      customer_phone: form.customer_phone.value,
      shipping_address: form.shipping_address.value,
      items,
      discount_code: discountData?.code || undefined
    };
    try {
      const order = await apiClient.createOrder(orderData);
      const receiptFile = document.getElementById('receiptFile').files[0];
      if (receiptFile) {
        await apiClient.uploadReceipt(order.order_number, receiptFile);
      }
      showToast('سفارش با موفقیت ثبت شد');
      window.location.hash = `order/${order.id}`;
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function renderOrders() {
  if (!currentUser) {
    window.location.hash = '#login';
    return;
  }
  viewContainer.innerHTML = `<div class="max-w-5xl mx-auto px-4 py-8"><h1 class="text-2xl font-bold mb-6">سفارشات من</h1><div id="ordersList"></div></div>`;
  try {
    let orders;
    if (currentUser.role === 'admin') {
      orders = await apiClient.getOrders({ page: 1, limit: 50 });
      orders = orders.data;
    } else {
      orders = await apiClient.getOrders();
    }
    const container = document.getElementById('ordersList');
    if (!orders.length) container.innerHTML = '<div class="text-center py-20">سفارشی وجود ندارد</div>';
    else {
      container.innerHTML = orders.map(order => `
        <div class="bg-dark-soft p-4 rounded-xl mb-4">
          <div class="flex justify-between"><span class="font-bold">شماره: ${order.order_number}</span><span class="text-gold">${order.status}</span></div>
          <div>مبلغ: ${formatPrice(order.total_amount)}</div>
          <a href="#order/${order.id}" class="text-sm text-gold">جزئیات</a>
        </div>
      `).join('');
    }
  } catch (err) {
    showToast('خطا در بارگذاری سفارشات', 'error');
  }
}

async function renderOrderDetail(orderId) {
  if (!orderId) return renderNotFound();
  viewContainer.innerHTML = `<div class="max-w-3xl mx-auto px-4 py-8">${loadingSpinner()}</div>`;
  try {
    const order = await apiClient.getOrderById(orderId);
    const html = `
      <h1 class="text-2xl font-bold mb-4">سفارش شماره ${order.order_number}</h1>
      <div class="bg-dark-soft p-4 rounded-xl space-y-2">
        <div>وضعیت: ${order.status}</div>
        <div>مبلغ کل: ${formatPrice(order.total_amount)}</div>
        <div>آدرس: ${order.shipping_address}</div>
        <div>تاریخ: ${new Date(order.created_at).toLocaleDateString('fa-IR')}</div>
        <h2 class="font-bold mt-4">محصولات</h2>
        ${order.items.map(item => `<div class="flex justify-between border-b border-gray-700 py-2"><span>${item.name}</span><span>${item.quantity} عدد × ${formatPrice(item.price)}</span></div>`).join('')}
        ${order.receipt_url ? `<div><a href="${order.receipt_url}" target="_blank" class="text-gold">مشاهده رسید</a></div>` : ''}
      </div>
    `;
    viewContainer.innerHTML = html;
  } catch (err) {
    viewContainer.innerHTML = '<div class="text-center py-20">سفارش یافت نشد</div>';
  }
}

function renderLogin() {
  viewContainer.innerHTML = `
    <div class="flex justify-center items-center py-20">
      <form id="loginForm" class="bg-dark-soft p-8 rounded-2xl w-96 space-y-4">
        <h2 class="text-2xl font-bold text-center">ورود</h2>
        <input type="tel" name="phone" placeholder="شماره موبایل" required class="w-full bg-dark border border-gold/30 rounded-lg p-3">
        <input type="password" name="password" placeholder="رمز عبور" required class="w-full bg-dark border border-gold/30 rounded-lg p-3">
        <button type="submit" class="w-full bg-gold text-dark py-2 rounded-full font-bold">ورود</button>
        <p class="text-center text-sm">حساب ندارید؟ <a href="#register" class="text-gold">ثبت نام</a></p>
      </form>
    </div>
  `;
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = e.target.phone.value;
    const password = e.target.password.value;
    try {
      const data = await apiClient.login(phone, password);
      currentUser = data.user;
      showToast(`خوش آمدید ${currentUser.name}`);
      window.location.hash = '#home';
    } catch (err) {
      showToast('اطلاعات نادرست', 'error');
    }
  });
}

function renderRegister() {
  viewContainer.innerHTML = `
    <div class="flex justify-center items-center py-20">
      <form id="registerForm" class="bg-dark-soft p-8 rounded-2xl w-96 space-y-4">
        <h2 class="text-2xl font-bold text-center">ثبت نام</h2>
        <input type="text" name="name" placeholder="نام کامل" required class="w-full bg-dark border border-gold/30 rounded-lg p-3">
        <input type="tel" name="phone" placeholder="شماره موبایل" required class="w-full bg-dark border border-gold/30 rounded-lg p-3">
        <input type="password" name="password" placeholder="رمز عبور" required class="w-full bg-dark border border-gold/30 rounded-lg p-3">
        <button type="submit" class="w-full bg-gold text-dark py-2 rounded-full font-bold">ثبت نام</button>
        <p class="text-center text-sm">قبلاً ثبت نام کرده‌اید؟ <a href="#login" class="text-gold">ورود</a></p>
      </form>
    </div>
  `;
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { name, phone, password } = e.target;
    try {
      const data = await apiClient.register(name.value, phone.value, password.value);
      currentUser = data.user;
      showToast('ثبت نام موفق');
      window.location.hash = '#home';
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function renderProfile() {
  if (!currentUser) {
    window.location.hash = '#login';
    return;
  }
  viewContainer.innerHTML = `
    <div class="max-w-md mx-auto py-20 text-center space-y-4">
      <div class="bg-dark-soft p-6 rounded-2xl">
        <h2 class="text-2xl font-bold mb-2">${currentUser.name}</h2>
        <p>${currentUser.phone}</p>
        <p class="text-sm text-text-dim">نقش: ${currentUser.role === 'admin' ? 'مدیر' : 'کاربر'}</p>
        <button id="logoutBtn" class="mt-6 bg-rose-700 px-4 py-2 rounded-full">خروج</button>
        ${currentUser.role === 'admin' ? '<a href="#admin" class="block mt-2 text-gold">پنل مدیریت</a>' : ''}
      </div>
    </div>
  `;
  document.getElementById('logoutBtn').addEventListener('click', () => {
    apiClient.logout();
    currentUser = null;
    window.location.hash = '#home';
    showToast('خارج شدید');
  });
}

async function renderAdminDashboard() {
  if (!currentUser || currentUser.role !== 'admin') {
    window.location.hash = '#home';
    return;
  }
  viewContainer.innerHTML = `<div class="max-w-7xl mx-auto px-4 py-8">${loadingSpinner()}</div>`;
  try {
    const stats = await apiClient.getAdminStats();
    const html = `
      <h1 class="text-3xl font-bold mb-6">داشبورد مدیریت</h1>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-dark-soft p-4 rounded-xl text-center"><div class="text-gold text-2xl">${stats.total_products}</div><div>محصولات</div></div>
        <div class="bg-dark-soft p-4 rounded-xl text-center"><div class="text-gold text-2xl">${stats.total_orders}</div><div>سفارشات</div></div>
        <div class="bg-dark-soft p-4 rounded-xl text-center"><div class="text-gold text-2xl">${stats.total_users}</div><div>کاربران</div></div>
        <div class="bg-dark-soft p-4 rounded-xl text-center"><div class="text-gold text-2xl">${formatPrice(stats.total_revenue)}</div><div>درآمد</div></div>
      </div>
      <div class="flex gap-4"><a href="#orders" class="bg-gold text-dark px-4 py-2 rounded-full">مدیریت سفارشات</a><a href="#products" class="bg-gold text-dark px-4 py-2 rounded-full">مدیریت محصولات</a></div>
    `;
    viewContainer.innerHTML = html;
  } catch (err) {
    showToast('خطا در دریافت آمار', 'error');
  }
}

function renderNotFound() {
  viewContainer.innerHTML = `<div class="text-center py-40"><h1 class="text-6xl font-bold">۴۰۴</h1><p>صفحه یافت نشد</p></div>`;
}

function loadingSpinner() {
  return `<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div></div>`;
}

function attachProductCardEvents() {
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      await apiClient.addToCart(id, 1);
      showToast('افزوده شد');
      await updateCartBadge();
    });
  });
  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('add-to-cart-btn')) return;
      const id = card.dataset.productId;
      if (id) window.location.hash = `product/${id}`;
    });
  });
}