// ==================== INIT API CLIENT ====================
const api = new ApiClient({
  baseURL: '/nadstore/index.php?url=',
  debug: false
  });
  
  // ==================== GLOBALS ====================
  let cartData = null;
  let discountData = null;
  
  // ==================== UI HELPERS ====================
  function formatPrice(price) {
    return Number(price).toLocaleString('fa-IR') + ' تومان';
  }
  
  function productCard(p) {
    const img = p.images?.[0]?.url || p.image || '';
    return `
      <div class="bg-dark rounded-xl overflow-hidden group relative border border-border hover:border-accent/30 transition-all duration-300">
        <a href="#product/${p.id}" class="block">
          <div class="aspect-square overflow-hidden">
            <img src="${img}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop'">
          </div>
          <div class="p-3 text-right">
            <h3 class="font-medium text-sm mb-1 truncate">${p.name}</h3>
            <p class="text-accent text-sm font-bold">${formatPrice(p.price)}</p>
          </div>
        </a>
        <button onclick="event.preventDefault(); quickAddToCart(${p.id})" 
                class="absolute top-2 left-2 w-8 h-8 bg-dark-2/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-accent transition-all opacity-0 group-hover:opacity-100">
          <svg width="14" height="16" viewBox="0 0 16 20" fill="none"><path d="M3 1L1 5V17C1 18.1 1.9 19 3 19H13C14.1 19 15 18.1 15 17V5L13 1H3Z" stroke="white" stroke-width="1.5"/><path d="M1 5H15" stroke="white" stroke-width="1.5"/><path d="M11 9C11 10.7 9.7 12 8 12C6.3 12 5 10.7 5 9" stroke="white" stroke-width="1.5"/></svg>
        </button>
      </div>`;
  }
  
  function renderStars(rating) {
    return Array.from({ length: 5 }, (_, i) => `
      <svg class="w-5 h-5 ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-600'}" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
      </svg>`).join('');
  }
  
  // ==================== CART HELPERS ====================
  async function quickAddToCart(productId) {
    try {
      await api.cart.addItem(productId, 1);
      await loadCartCount();
      alert('به سبد خرید اضافه شد');
    } catch (e) {
      alert(e.message);
    }
  }
  
  async function loadCartCount() {
    try {
      const data = await api.cart.get();
      const count = data.items ? data.items.reduce((s, i) => s + (i.quantity || 0), 0) : 0;
      const el = document.getElementById('cart-count');
      if (el) {
        el.textContent = count;
        el.classList.toggle('hidden', count === 0);
      }
    } catch (e) {
      // کاربر لاگین نکرده - نادیده بگیر
    }
  }
  
  // ==================== HEADER & FOOTER ====================
  function injectHeader() {
    const isLoggedIn = !!api.accessToken;
    document.getElementById('app-header').innerHTML = `
      <header class="bg-dark/95 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div class="max-w-[1280px] mx-auto px-4 h-16 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <a href="#cart" class="relative p-2 text-text-dim hover:text-white transition-colors">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/></svg>
              <span id="cart-count" class="hidden absolute -top-0.5 -right-0.5 w-5 h-5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">0</span>
            </a>
            ${isLoggedIn ? `
            <a href="#orders" class="p-2 text-text-dim hover:text-white transition-colors" title="سفارشات">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
            </a>
            <button onclick="handleLogout()" class="p-2 text-text-dim hover:text-red-400 transition-colors" title="خروج">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
            ` : `
            <a href="login.html" class="text-sm text-text-dim hover:text-white transition-colors px-3 py-1.5 border border-border rounded-lg">ورود</a>
            `}
          </div>
          <nav class="hidden md:flex items-center gap-6">
            <a href="#shop" class="text-sm text-text-dim hover:text-white transition-colors">فروشگاه</a>
            <a href="#categories" class="text-sm text-text-dim hover:text-white transition-colors">دسته‌بندی‌ها</a>
            <a href="#home" class="text-sm text-text-dim hover:text-white transition-colors">خانه</a>
          </nav>
          <a href="#home" class="flex items-center gap-2">
            <span class="font-display text-lg text-white hidden sm:block">غول بازار</span>
            <img src="assets/logo.png" alt="" class="w-8 h-8 object-contain">
          </a>
          <button id="menu-toggle" class="md:hidden p-2 text-text-dim hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
      </header>`;
  }
  
  function injectFooter() {
    document.getElementById('app-footer').innerHTML = `
      <footer class="bg-dark-2 border-t border-border py-10 px-4 mt-auto">
        <div class="max-w-[1280px] mx-auto text-center">
          <p class="text-text-dim text-sm">© ۱۴۰۴ غول بازار. تمامی حقوق محفوظ است.</p>
          <div class="flex gap-4 justify-center mt-3">
            <a href="#home" class="text-muted text-xs hover:text-white">خانه</a>
            <a href="#shop" class="text-muted text-xs hover:text-white">فروشگاه</a>
            <a href="#categories" class="text-muted text-xs hover:text-white">دسته‌بندی‌ها</a>
          </div>
        </div>
      </footer>`;
  }
  
  async function handleLogout() {
    try {
      await api.auth.logout();
    } catch (e) {
      // حتی اگر API خطا داد، لوکال رو پاک کن
    }
    api.logout();
    window.location.reload();
  }
  
  function copyText(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    navigator.clipboard.writeText(el.textContent.trim()).then(() => {
      const toast = document.getElementById('copy-toast');
      if (toast) { toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 2000); }
    });
  }
  
  // ==================== ROUTER ====================
  const routes = {
    home: async () => { await renderHome(); },
    shop: async () => { await renderShop(); },
    categories: async () => { await renderCategories(); },
    product: async (id) => { await renderProduct(id); },
    cart: async () => { await renderCart(); },
    checkout: async () => { await renderCheckout(); },
    orders: async () => { await renderOrders(); },
    payment: async () => { await renderPayment(); },
  };
  
  async function navigate() {
    const hash = window.location.hash.slice(1) || 'home';
    const [route, ...params] = hash.split('/');
    const main = document.getElementById('app-main');
    
    if (!document.getElementById('app-header').innerHTML) injectHeader();
    if (!document.getElementById('app-footer').innerHTML) injectFooter();
    loadCartCount();
  
    main.innerHTML = '<div id="loading-screen" class="text-center py-32 text-text-dim"><p class="text-4xl animate-pulse mb-4">✦</p><p>در حال بارگذاری...</p></div>';
  
    if (routes[route]) {
      await routes[route](...params);
    } else {
      main.innerHTML = `<div class="text-center py-32"><p class="text-2xl">صفحه مورد نظر یافت نشد</p><a href="#home" class="text-accent hover:underline mt-4 block">بازگشت به خانه</a></div>`;
    }
  
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  window.addEventListener('hashchange', navigate);
  window.addEventListener('DOMContentLoaded', () => {
    injectHeader();
    injectFooter();
    loadCartCount();
    navigate();
  });
  
  // ==================== PAGE RENDERERS ====================
  
  // --- HOME ---
  async function renderHome() {
    const tmpl = document.getElementById('tmpl-home');
    document.getElementById('app-main').innerHTML = tmpl.innerHTML;
  
    const erasImgs = {
      'دوران ویکتوریا': 'http://nadcoteam.ir/assets/products/img1.jpg',
      'دوران ادوارد': 'http://nadcoteam.ir/assets/products/img2.jpg',
      'آرت دکو': 'http://nadcoteam.ir/assets/products/img3.jpg',
      'رترو ۱۹۴۰': 'http://nadcoteam.ir/assets/products/img4.jpg',
    };
  
    try {
      const eras = await api.categories.listMain();
      document.getElementById('eras-wrapper').innerHTML = eras.data.map(e => `
        <div class="swiper-slide">
          <a href="#shop?era=${encodeURIComponent(e.name)}" class="relative rounded-2xl overflow-hidden group block" style="height:360px">
            <img src="${erasImgs[e.name] || 'http://nadcoteam.ir/assets/products/img10.jpg'}" alt="${e.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
            <div class="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/20 to-transparent"></div>
            <div class="absolute bottom-0 left-0 right-0 p-5">
              <h3 class="text-xl font-bold text-right mb-1">${e.name}</h3>
              <span class="text-muted text-xs block text-right">مشاهده ←</span>
            </div>
          </a>
        </div>`).join('');
    } catch (e) { console.error('Eras failed:', e); }
  
    try {
      const data = await api.products.list({ limit: 10 });
      const products = data.data || [];
      document.getElementById('products-wrapper').innerHTML = products.map(p => `<div class="swiper-slide">${productCard(p)}</div>`).join('');
    } catch (e) { console.error('Products failed:', e); }
  
    if (typeof Swiper !== 'undefined') {
      new Swiper('.categories-swiper', {
        slidesPerView: 1.3, spaceBetween: 12, loop: true,
        navigation: { prevEl: '.swiper-button-prev-cats', nextEl: '.swiper-button-next-cats' },
        breakpoints: { 480: { slidesPerView: 1.8 }, 640: { slidesPerView: 2.2 }, 768: { slidesPerView: 2.6 }, 1024: { slidesPerView: 3.2 }, 1280: { slidesPerView: 3.5 } },
      });
      new Swiper('.products-swiper', {
        slidesPerView: 1.5, spaceBetween: 12, loop: true,
        navigation: { prevEl: '.swiper-button-prev-prods', nextEl: '.swiper-button-next-prods' },
        breakpoints: { 480: { slidesPerView: 2.2 }, 640: { slidesPerView: 2.5 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } },
      });
    }
  }
  
  // --- SHOP ---
  async function renderShop() {
    const tmpl = document.getElementById('tmpl-shop');
    document.getElementById('app-main').innerHTML = tmpl.innerHTML;
  
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const currentCat = params.get('category') || '';
    const currentSort = params.get('sort') || '';
  
    if (currentCat) document.getElementById('clear-filters').classList.remove('hidden');
    if (currentSort) document.getElementById('sort-select').value = currentSort;
  
    const title = currentCat || 'همه محصولات';
    document.getElementById('desktop-title').textContent = title;
    document.getElementById('page-title').textContent = title;
  
    // Load categories for sidebar
    try {
      const cats = await api.categories.listMain();
      document.getElementById('cat-filters').innerHTML = cats.data.map(c => `
        <li><a href="#shop?category=${encodeURIComponent(c.slug || c.name)}" class="block text-right text-sm py-1 ${currentCat === (c.slug || c.name) ? 'text-accent font-bold' : 'text-text-dim hover:text-white'} transition-colors">${c.name}</a></li>`).join('');
    } catch (e) {}
  
    // Load products
    const queryParams = { per_page: 24 };
    if (currentSort === 'newest') queryParams.sort = 'newest';
    if (currentSort === 'price_asc') queryParams.sort = 'price_asc';
    if (currentSort === 'price_desc') queryParams.sort = 'price_desc';
  
    try {
      let data;
      if (currentCat) {
        // پیدا کردن category_id از slug
        const cats = await api.categories.listMain();
        const cat = cats.data.find(c => (c.slug || c.name) === currentCat);
        if (cat) {
          data = await api.products.byCategory(cat.id);
        } else {
          data = await api.products.list(queryParams);
        }
      } else {
        data = await api.products.list(queryParams);
      }
  
      document.getElementById('loading').classList.add('hidden');
      const products = data.data || [];
      document.getElementById('product-count').textContent = `${products.length} محصول`;
      if (!products.length) {
        document.getElementById('empty').classList.remove('hidden');
      } else {
        document.getElementById('products-grid').innerHTML = products.map(productCard).join('');
      }
    } catch (e) {
      document.getElementById('loading').innerHTML = `<p class="text-accent">${e.message}</p>`;
    }
  
    document.getElementById('sort-select').addEventListener('change', function () {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      hashParams.set('sort', this.value);
      window.location.hash = `shop?${hashParams.toString()}`;
      navigate();
    });
  
    document.getElementById('filter-toggle').addEventListener('click', () => {
      document.getElementById('shop-sidebar').classList.toggle('hidden');
      document.getElementById('shop-sidebar').classList.toggle('block');
    });
  }
  
  // --- CATEGORIES ---
  async function renderCategories() {
    const tmpl = document.getElementById('tmpl-categories');
    document.getElementById('app-main').innerHTML = tmpl.innerHTML;
  
    const ERA_IMGS = {
      'دوران ویکتوریا': './assets/products/img12.jpg',
      'دوران ادوارد': './assets/products/img11.jpg',
      'آرت دکو': './assets/products/img10.jpg',
      'رترو ۱۹۴۰': './assets/products/img9.jpg',
      'بلا اپوک': './assets/products/img8.jpg',
    };
    const CAT_IMGS = {
      'rings': './assets/products/img7.jpg',
      'necklaces': './assets/products/img6.jpg',
      'earrings': './assets/products/img5.jpg',
      'bracelets': './assets/products/img4.jpg',
      'brooches': './assets/products/img3.jpg',
    };
  
    try {
      const categories = await api.categories.listMain();
      const cats = categories.data || [];
      
      // Separate into eras and regular categories (based on naming or logic)
      const eras = cats.filter(c => ERA_IMGS[c.name]);
      const regular = cats.filter(c => !ERA_IMGS[c.name]);
  
      document.getElementById('eras-grid').innerHTML = eras.length
        ? eras.map(e => `
          <a href="#shop?category=${encodeURIComponent(e.slug || e.name)}" class="relative rounded-2xl overflow-hidden group block" style="height:220px">
            <img src="${ERA_IMGS[e.name] || './assets/products/img1.jpg'}" alt="${e.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
            <div class="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/20 to-transparent"></div>
            <div class="absolute bottom-0 left-0 right-0 p-4">
              <h3 class="text-lg font-bold text-right mb-1">${e.name}</h3>
              <p class="text-muted text-xs text-right">مشاهده ←</p>
            </div>
          </a>`).join('')
        : '<p class="col-span-full text-center text-text-dim py-8">دوره‌ای یافت نشد</p>';
      
      document.getElementById('cats-grid').innerHTML = regular.length
        ? regular.map(c => `
          <a href="#shop?category=${encodeURIComponent(c.slug || c.name)}" class="relative rounded-2xl overflow-hidden group block" style="height:180px">
            <img src="${CAT_IMGS[c.slug] || './assets/products/img12.jpg'}" alt="${c.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
            <div class="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/30 to-transparent"></div>
            <div class="absolute bottom-0 left-0 right-0 p-4"><h3 class="text-base font-bold text-right">${c.name}</h3></div>
          </a>`).join('')
        : '<p class="col-span-full text-center text-text-dim py-8">دسته‌بندی‌ای یافت نشد</p>';
    } catch (e) {
      document.getElementById('eras-grid').innerHTML = `<p class="col-span-full text-accent text-center py-8">${e.message}</p>`;
    }
  }
  
  // --- PRODUCT ---
  async function renderProduct(id) {
    const tmpl = document.getElementById('tmpl-product');
    document.getElementById('app-main').innerHTML = tmpl.innerHTML;
  
    try {
      const p = await api.products.show(id);
      const product = p.data || p;
      
      document.title = `${product.name} | غول بازار`;
      document.getElementById('product-detail').classList.remove('hidden');
  
      document.getElementById('breadcrumb').innerHTML = `
        <a href="#product/${product.id}" class="text-white">${product.name}</a>
        <span>/</span><a href="#shop?category=${encodeURIComponent(product.category_id || '')}" class="hover:text-white">${product.category || ''}</a>
        <span>/</span><a href="#home" class="hover:text-white">خانه</a>`;
  
      let badges = '';
      if (product.stock_quantity <= 2 && product.stock_quantity > 0) badges += `<span class="bg-accent/20 border border-accent/30 text-accent text-xs px-3 py-1 rounded-full">آخرین موجودی</span>`;
      if (product.is_featured) badges += `<span class="bg-dark-2 border border-border text-muted text-xs px-3 py-1 rounded-full">ویژه</span>`;
      document.getElementById('badges').innerHTML = badges;
  
      document.getElementById('product-name').textContent = product.name;
      document.getElementById('product-description').textContent = product.description || '';
      document.getElementById('product-price').textContent = formatPrice(product.price);
      document.getElementById('product-stock').textContent = `موجودی: ${product.stock_quantity || 0} عدد`;
  
      document.getElementById('rating').innerHTML = `
        <span class="text-text-dim text-sm">(۰ نظر)</span>
        <div class="flex gap-1">${renderStars(5)}</div>
        <span class="text-white font-bold">۵.۰</span>`;
  
      const imgs = product.images || [];
      const mainSrc = imgs.length > 0 ? imgs[0].url : '';
      document.getElementById('main-image').src = mainSrc;
      document.getElementById('main-image').alt = product.name;
      document.getElementById('thumbnails').innerHTML = imgs.map((img, i) => `
        <button onclick="document.getElementById('main-image').src='${img.url}'" class="rounded-xl overflow-hidden aspect-square border-2 ${i === 0 ? 'border-accent' : 'border-transparent'} hover:border-muted transition-colors">
          <img src="${img.url}" alt="" class="w-full h-full object-cover">
        </button>`).join('');
  
      // Add to cart
      document.getElementById('add-to-cart-btn').addEventListener('click', async function () {
        try {
          this.disabled = true;
          await api.cart.addItem(product.id, 1);
          const toast = document.getElementById('added-toast');
          if (toast) toast.classList.remove('hidden');
          this.textContent = '✓ اضافه شد';
          loadCartCount();
          setTimeout(() => { this.innerHTML = '<svg width="16" height="20" viewBox="0 0 16 20" fill="none"><path d="M3 1L1 5V17C1 18.1 1.9 19 3 19H13C14.1 19 15 18.1 15 17V5L13 1H3Z" stroke="white" stroke-width="1.5"/><path d="M1 5H15" stroke="white" stroke-width="1.5"/><path d="M11 9C11 10.7 9.7 12 8 12C6.3 12 5 10.7 5 9" stroke="white" stroke-width="1.5"/></svg> افزودن به مجموعه'; this.disabled = false; }, 2000);
        } catch (e) { alert(e.message); this.disabled = false; }
      });
  
    } catch (e) {
      document.getElementById('app-main').innerHTML = `<p class="text-accent text-center py-20 text-xl">${e.message}</p>`;
    }
  }
  
  // --- CART ---
  async function renderCart() {
    const tmpl = document.getElementById('tmpl-cart');
    document.getElementById('app-main').innerHTML = tmpl.innerHTML;
  
    try {
      const data = await api.cart.get();
      cartData = data;
      document.getElementById('loading').classList.add('hidden');
  
      if (!data.items || !data.items.length) {
        document.getElementById('empty-cart').classList.remove('hidden');
        return;
      }
  
      document.getElementById('cart-content').classList.remove('hidden');
      renderCartSummary();
    } catch (e) {
      document.getElementById('loading').innerHTML = `<p class="text-accent">${e.message}</p>`;
    }
  
    document.getElementById('apply-discount').addEventListener('click', async () => {
      const code = document.getElementById('discount-input').value.trim();
      const msg = document.getElementById('discount-msg');
      if (!code) return;
      try {
        const cartTotal = cartData.items.reduce((s, i) => s + (i.price_at_add * i.quantity), 0);
        discountData = await api.coupons.validate(code, cartTotal);
        msg.textContent = `✓ کد تخفیف اعمال شد`;
        msg.className = 'text-xs mt-2 text-right text-green-400';
        msg.classList.remove('hidden');
        renderCartSummary();
      } catch (e) {
        discountData = null;
        msg.textContent = '✕ کد تخفیف نامعتبر است';
        msg.className = 'text-xs mt-2 text-right text-red-400';
        msg.classList.remove('hidden');
      }
    });
  }
  
  function renderCartSummary() {
    if (!cartData || !cartData.items) return;
    
    const cartTotal = cartData.items.reduce((s, i) => s + (i.price_at_add * i.quantity), 0);
    const shipping = cartTotal >= 1500000 ? 0 : 50000;
    const discount = discountData ? discountData.discount : 0;
    const finalTotal = cartTotal + shipping - discount;
  
    document.getElementById('cart-items').innerHTML = cartData.items.map(item => `
      <div class="bg-dark-2 border border-border rounded-xl p-4 flex gap-4 items-center" id="item-${item.id}">
        <div class="w-20 h-20 rounded-lg bg-dark-3 shrink-0 flex items-center justify-center text-muted text-xs">محصول ${item.product_id}</div>
        <div class="flex-1 text-right min-w-0">
          <h3 class="font-medium mb-1 truncate">
            <a href="#product/${item.product_id}" class="hover:text-muted">محصول #${item.product_id}</a>
          </h3>
          <p class="text-accent font-bold mt-1">${formatPrice(item.price_at_add)}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button onclick="removeCartItem(${item.id})" class="w-8 h-8 rounded border border-border text-text-dim hover:border-red-500 hover:text-red-400 transition-colors text-sm">✕</button>
          <input type="number" value="${item.quantity}" min="1" max="10" class="w-14 bg-dark border border-border rounded px-2 py-1 text-center text-sm" onchange="updateCartItem(${item.id}, this.value)">
        </div>
      </div>`).join('');
  
    document.getElementById('summary-lines').innerHTML = `
      <div class="flex justify-between text-text-dim text-sm"><span>${formatPrice(cartTotal)}</span><span>جمع کالاها</span></div>
      ${discount > 0 ? `<div class="flex justify-between text-green-400 text-sm"><span>-${formatPrice(discount)}</span><span>تخفیف</span></div>` : ''}
      <div class="flex justify-between text-text-dim text-sm"><span>${shipping === 0 ? 'رایگان' : formatPrice(shipping)}</span><span>ارسال</span></div>`;
    document.getElementById('final-total').textContent = formatPrice(finalTotal);
  }
  
  async function removeCartItem(itemId) {
    try {
      await api.cart.removeItem(itemId);
      navigate();
    } catch (e) { alert(e.message); }
  }
  
  async function updateCartItem(itemId, qty) {
    try {
      await api.cart.updateItem(itemId, parseInt(qty));
      navigate();
    } catch (e) { alert(e.message); }
  }
  
  // --- CHECKOUT ---
  async function renderCheckout() {
    const tmpl = document.getElementById('tmpl-checkout');
    document.getElementById('app-main').innerHTML = tmpl.innerHTML;
  
    try {
      const data = await api.cart.get();
      document.getElementById('loading').classList.add('hidden');
      
      if (!data.items || !data.items.length) {
        document.getElementById('empty-msg').classList.remove('hidden');
        return;
      }
      
      cartData = data;
      document.getElementById('checkout-form').classList.remove('hidden');
      renderCheckoutSummary();
  
      // Pre-fill user data
      try {
        const userData = await api.auth.me();
        if (userData.user) {
          document.getElementById('customer-name').value = userData.user.full_name || '';
          document.getElementById('customer-phone').value = userData.user.phone || '';
        }
      } catch (e) {}
      
    } catch (e) {
      document.getElementById('loading').innerHTML = `<p class="text-accent">${e.message}</p>`;
    }
  
    document.getElementById('submit-btn').addEventListener('click', submitOrder);
    
    document.getElementById('apply-discount').addEventListener('click', async () => {
      const code = document.getElementById('discount-input').value.trim();
      const msg = document.getElementById('discount-msg');
      if (!code) return;
      try {
        const cartTotal = cartData.items.reduce((s, i) => s + (i.price_at_add * i.quantity), 0);
        discountData = await api.coupons.validate(code, cartTotal);
        msg.textContent = `✓ کد تخفیف اعمال شد`;
        msg.className = 'text-xs mt-2 text-right text-green-400';
        msg.classList.remove('hidden');
        renderCheckoutSummary();
      } catch (e) {
        discountData = null;
        msg.textContent = '✕ کد تخفیف نامعتبر است';
        msg.className = 'text-xs mt-2 text-right text-red-400';
        msg.classList.remove('hidden');
      }
    });
  }
  
  function renderCheckoutSummary() {
    if (!cartData || !cartData.items) return;
    
    const cartTotal = cartData.items.reduce((s, i) => s + (i.price_at_add * i.quantity), 0);
    const shipping = cartTotal >= 1500000 ? 0 : 50000;
    const discount = discountData ? discountData.discount : 0;
    const finalTotal = cartTotal + shipping - discount;
  
    document.getElementById('order-items').innerHTML = cartData.items.map(item => `
      <div class="flex items-center gap-3">
        <div class="w-14 h-14 rounded-lg bg-dark-3 shrink-0 flex items-center justify-center text-muted text-[10px]">#${item.product_id}</div>
        <div class="flex-1 text-right min-w-0">
          <p class="text-sm font-medium truncate">محصول #${item.product_id}</p>
          <p class="text-xs text-muted">× ${item.quantity}</p>
        </div>
        <p class="text-sm font-bold shrink-0">${formatPrice(item.price_at_add * item.quantity)}</p>
      </div>`).join('');
  
    document.getElementById('price-breakdown').innerHTML = `
      <div class="flex justify-between text-text-dim text-sm"><span>${formatPrice(cartTotal)}</span><span>جمع کالاها</span></div>
      ${discount > 0 ? `<div class="flex justify-between text-green-400 text-sm"><span>-${formatPrice(discount)}</span><span>تخفیف</span></div>` : ''}
      <div class="flex justify-between text-text-dim text-sm"><span>${shipping === 0 ? 'رایگان' : formatPrice(shipping)}</span><span>ارسال</span></div>`;
    document.getElementById('checkout-total').textContent = formatPrice(finalTotal);
  }
  
  async function submitOrder() {
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const address = document.getElementById('shipping-address').value.trim();
    const errEl = document.getElementById('form-error');
  
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
      // First add address
      const addrResult = await api.user.addAddress({
        label: 'آدرس اصلی',
        city: address.split('،')[0] || '',
        full_address: address
      });
      
      const addressId = addrResult.id;
      const couponCode = discountData ? document.getElementById('discount-input').value.trim() : null;
      
      const result = await api.orders.place(addressId, couponCode);
      const order = result.data || result;
  
      // Clear cart
      await api.cart.clear();
      cartData = null;
      discountData = null;
  
      sessionStorage.setItem('gb_checkout', JSON.stringify({
        ...order,
        customer_name: name,
        customer_phone: phone,
        shipping_address: address,
      }));
  
      window.location.hash = 'payment';
      navigate();
    } catch (e) {
      errEl.textContent = e.message;
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'ثبت سفارش';
    }
  }
  
  // --- ORDERS ---
  async function renderOrders() {
    const tmpl = document.getElementById('tmpl-orders');
    document.getElementById('app-main').innerHTML = tmpl.innerHTML;
  
    if (!api.accessToken) {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('need-login').classList.remove('hidden');
      return;
    }
  
    try {
      const data = await api.orders.list();
      document.getElementById('loading').classList.add('hidden');
      
      const orders = Array.isArray(data) ? data : (data.data || data.orders || []);
      if (!orders.length) {
        document.getElementById('empty-orders').classList.remove('hidden');
        return;
      }
  
      document.getElementById('orders-content').classList.remove('hidden');
      
      const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
      const totalAmt = orders.reduce((s, o) => s + Number(o.total || 0), 0);
      
      document.getElementById('stat-active').textContent = active.toLocaleString('fa-IR');
      document.getElementById('stat-total').textContent = orders.length.toLocaleString('fa-IR');
      document.getElementById('stat-amount').textContent = totalAmt.toLocaleString('fa-IR') + ' تومان';
  
      const STATUS = {
        pending: { label: 'در انتظار تأیید', cls: 'border-yellow-700/50 text-yellow-300 bg-yellow-900/20' },
        confirmed: { label: 'تأیید شده', cls: 'border-blue-700/50 text-blue-300 bg-blue-900/20' },
        processing: { label: 'در حال پردازش', cls: 'border-purple-700/50 text-purple-300 bg-purple-900/20' },
        shipped: { label: 'ارسال شده', cls: 'border-accent/50 text-accent bg-accent/10' },
        delivered: { label: 'تحویل داده شده', cls: 'border-green-700/50 text-green-300 bg-green-900/20' },
        cancelled: { label: 'لغو شده', cls: 'border-border text-text-dim bg-dark-3/50' },
      };
  
      document.getElementById('orders-table').innerHTML = orders.map(o => {
        const s = STATUS[o.status] || { label: o.status, cls: 'border-border text-text-dim bg-dark-3/50' };
        const date = o.created_at ? new Date(o.created_at).toLocaleDateString('fa-IR') : '—';
        return `
          <tr class="hover:bg-dark-3/30 transition-colors">
            <td class="py-4 px-5 font-mono text-sm text-white whitespace-nowrap">#${o.id}</td>
            <td class="py-4 px-5 text-sm text-text-dim whitespace-nowrap">${date}</td>
            <td class="py-4 px-5 hidden sm:table-cell text-sm text-text-dim">${o.items_count || 0} قلم</td>
            <td class="py-4 px-5 font-bold text-sm text-white whitespace-nowrap">${Number(o.total || 0).toLocaleString('fa-IR')} تومان</td>
            <td class="py-4 px-5 whitespace-nowrap"><span class="inline-block text-[0.7rem] px-2 py-0.5 rounded-full font-bold border ${s.cls}">${s.label}</span></td>
            <td class="py-4 px-5"><a href="#orders" class="text-xs text-muted hover:text-accent transition-colors font-medium">جزئیات ←</a></td>
          </tr>`;
      }).join('');
      
    } catch (e) {
      document.getElementById('loading').innerHTML = `<p class="text-red-400 text-center">${e.message}</p>`;
    }
  }
  
  // --- PAYMENT ---
  function renderPayment() {
    const tmpl = document.getElementById('tmpl-payment');
    document.getElementById('app-main').innerHTML = tmpl.innerHTML;
  
    try {
      const orderData = JSON.parse(sessionStorage.getItem('gb_checkout') || '{}');
      document.getElementById('order-number').textContent = orderData.id || orderData.order_number || '-';
      document.getElementById('total-amount').textContent = orderData.total
        ? Number(orderData.total).toLocaleString('fa-IR') + ' تومان'
        : '—';
    } catch (e) {
      console.error('Payment data error:', e);
    }
  
    // File handler
    document.getElementById('receipt-input').addEventListener('change', function () {
      const f = this.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) {
        document.getElementById('upload-error').textContent = 'حجم فایل بیش از ۵ مگابایت است';
        document.getElementById('upload-error').classList.remove('hidden');
        this.value = '';
        return;
      }
      document.getElementById('upload-ph').classList.add('hidden');
      document.getElementById('upload-preview').classList.remove('hidden');
      document.getElementById('file-name').textContent = f.name;
      document.getElementById('upload-error').classList.add('hidden');
    });
  
    // Submit receipt
    document.getElementById('submit-receipt-btn').addEventListener('click', async function () {
      const orderNumber = document.getElementById('order-number').textContent.trim();
      const errEl = document.getElementById('upload-error');
      const btn = this;
      const fileInput = document.getElementById('receipt-input');
      const file = fileInput.files[0];
  
      if (!file) { errEl.textContent = 'لطفاً تصویر رسید را انتخاب کنید'; errEl.classList.remove('hidden'); return; }
      if (!orderNumber || orderNumber === '-') { errEl.textContent = 'شماره سفارش نامعتبر است'; errEl.classList.remove('hidden'); return; }
  
      btn.disabled = true;
      btn.textContent = 'در حال ارسال...';
      errEl.classList.add('hidden');
  
      try {
        const formData = new FormData();
        formData.append('receipt', file);
        formData.append('order_number', orderNumber);
  
        const response = await fetch('index.php?url=payment/verify', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${api.accessToken}` },
          body: formData
        });
  
        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: 'خطا در اتصال به سرور' }));
          throw new Error(errData.error || `خطای ${response.status}`);
        }
  
        alert('رسید با موفقیت ثبت شد. سفارش شما در دست بررسی است.');
        sessionStorage.removeItem('gb_checkout');
        window.location.hash = 'orders';
        navigate();
      } catch (e) {
        errEl.textContent = e.message || 'خطا در ارسال رسید';
        errEl.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = 'ارسال رسید';
      }
    });
  }
  
  // Make functions globally accessible
  window.removeCartItem = removeCartItem;
  window.updateCartItem = updateCartItem;
  window.copyText = copyText;