/**
 * Ghul Bazar — SPA Core
 * روتر، رندر ویوها، منطق UI
 * @version 2.0.0
 */

import api from './apiClient.js';

/* ═══════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════ */

export const formatPrice = (n) =>
  Number(n).toLocaleString('fa-IR') + ' تومان';

export const renderStars = (r = 5) => {
  const full = Math.round(r);
  return Array.from({ length: 5 }, (_, i) =>
    `<svg width="14" height="14" viewBox="0 0 24 24" fill="${i < full ? '#cf1736' : 'none'}"
       stroke="#cf1736" stroke-width="1.5">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>`
  ).join('');
};

export function productCard(p) {
  const img = (p.images?.[0]?.url) || p.image || '';
  return `
    <article class="product-card group cursor-pointer rounded-2xl overflow-hidden bg-dark-2 border border-border
                    hover:border-accent/40 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(207,23,54,0.15)]"
             onclick="navigate('product?id=${p.id}')">
      <div class="relative overflow-hidden aspect-square">
        <img src="${img}" alt="${p.name}" loading="lazy"
             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
             onerror="this.src='assets/images/placeholder.png'">
        
        ${p.badge ? `<span class="absolute top-3 right-3 bg-dark/80 text-muted text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm">${p.badge}</span>` : ''}
        ${(p.stock <= 2 && p.stock > 0) ? `<span class="absolute top-3 left-3 bg-accent/90 text-white text-[10px] px-2.5 py-1 rounded-full">آخرین موجودی</span>` : ''}
      </div>
      <div class="p-3 md:p-4">
        <p class="text-text-dim text-[11px] mb-1 truncate">${p.era || ''}</p>
        <h3 class="font-medium text-sm md:text-base truncate mb-2">${p.name}</h3>
        <div class="flex items-center justify-between">
          <button onclick="event.stopPropagation(); addToCart(${p.id}, this)"
                  class="w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center
                         hover:bg-accent hover:border-accent transition-colors group/btn shrink-0"
                  title="افزودن به سبد">
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" class="group-hover/btn:scale-110 transition-transform">
              <path d="M2 1L1 4V12C1 12.6 1.4 13 2 13H10C10.6 13 11 12.6 11 12V4L10 1H2Z" stroke="currentColor" stroke-width="1.2"/>
              <path d="M1 4H11" stroke="currentColor" stroke-width="1.2"/>
              <path d="M8 7C8 8.1 7.1 9 6 9C4.9 9 4 8.1 4 7" stroke="currentColor" stroke-width="1.2"/>
            </svg>
          </button>
          <p class="font-bold text-sm md:text-base">${formatPrice(p.price)}</p>
        </div>
      </div>
    </article>`;
}

/* toast notification */
let _toastTimer;
export function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-xl text-sm font-bold shadow-2xl transition-all duration-300
    ${type === 'success' ? 'bg-green-900/90 text-green-300 border border-green-700' : 'bg-red-900/90 text-red-300 border border-red-700'}`;
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(10px)';
  }, 3000);
}

/* add to cart helper (shared) */
export async function addToCart(productId, btnEl) {
  if (btnEl) { btnEl.disabled = true; btnEl.style.opacity = '.5'; }
  try {
    await api.cart.add(productId, 1);
    await updateCartBadge();
    showToast('به سبد خرید اضافه شد ✓');
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.style.opacity = '1'; }
  }
}

export async function updateCartBadge() {
  try {
    const cart = await api.cart.get();
    const count = (cart.items || []).reduce((s, i) => s + (i.qty || 1), 0);
    document.querySelectorAll('.cart-badge').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  } catch {}
}

/* loading spinner */
const loadingHTML = `
  <div class="flex flex-col items-center justify-center py-32 text-text-dim gap-4">
    <span class="text-4xl animate-pulse">✦</span>
    <p>در حال بارگذاری...</p>
  </div>`;

/* ═══════════════════════════════════════════
   ROUTER
═══════════════════════════════════════════ */

const routes = {
  '':         viewHome,
  'shop':     viewShop,
  'product':  viewProduct,
  'categories': viewCategories,
  'cart':     viewCart,
  'checkout': viewCheckout,
  'payment':  viewPayment,
  'orders':   viewOrders,
  'login':    viewLogin,
};

export function navigate(path, pushState = true) {
  const hash = '#/' + path;
  if (pushState) window.location.hash = hash;
  render(path);
}

function getRoute() {
  const hash = window.location.hash;
  if (!hash || hash === '#' || hash === '#/') return { view: '', params: new URLSearchParams() };
  const raw   = hash.replace(/^#\//, '');
  const [view, qs] = raw.split('?');
  return { view, params: new URLSearchParams(qs || '') };
}

function render(pathStr) {
  const [view, qs] = pathStr.split('?');
  const params = new URLSearchParams(qs || '');
  const fn = routes[view] || view404;

  const main = document.getElementById('view');
  main.innerHTML = loadingHTML;
  main.scrollIntoView({ behavior: 'smooth', block: 'start' });

  Promise.resolve(fn(params)).catch(e => {
    main.innerHTML = `<div class="text-center py-32 text-accent">${e.message}</div>`;
  });

  updateNavActive(view);
}

function updateNavActive(view) {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.classList.toggle('text-accent', el.dataset.nav === view);
    el.classList.toggle('text-text-dim', el.dataset.nav !== view);
  });
}

window.navigate = navigate;
window.addToCart = addToCart;

/* ═══════════════════════════════════════════
   HEADER
═══════════════════════════════════════════ */

function renderHeader() {
  const user = api.getUser();
  return `
    <header class="sticky top-0 z-50 bg-dark/90 backdrop-blur-lg border-b border-border">
      <div class="max-w-[1280px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <!-- Logo -->
        <button onclick="navigate('')" class="flex items-center gap-2.5 shrink-0">
          <img src="assets/logo.png" alt="غول بازار" class="w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(207,23,54,0.5)]"
               onerror="this.style.display='none'">
          <span class="font-display text-xl tracking-wider hidden sm:block">Ghul Bazar</span>
        </button>

        <!-- Search -->
        <form class="flex-1 max-w-xs relative hidden md:block" onsubmit="handleSearch(event)">
          <input type="search" id="header-search" placeholder="جستجو..."
                 class="w-full bg-dark-3 border border-border rounded-xl px-4 py-2 text-sm text-white
                        placeholder:text-muted/40 focus:outline-none focus:border-accent/50 transition-colors pr-10">
          <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </form>

        <!-- Nav -->
        <nav class="hidden md:flex items-center gap-6 text-sm">
          <button data-nav="" onclick="navigate('')" class="text-text-dim hover:text-white transition-colors">خانه</button>
          <button data-nav="shop" onclick="navigate('shop')" class="text-text-dim hover:text-white transition-colors">فروشگاه</button>
          <button data-nav="categories" onclick="navigate('categories')" class="text-text-dim hover:text-white transition-colors">دسته‌بندی</button>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-2 md:gap-3 shrink-0">
          <button onclick="navigate('cart')" class="relative w-9 h-9 rounded-xl bg-dark-3 border border-border hover:border-accent/40 flex items-center justify-center transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>
            </svg>
            <span class="cart-badge hidden absolute -top-1 -left-1 min-w-[18px] h-[18px] bg-accent text-white text-[9px] font-bold rounded-full items-center justify-center px-1"></span>
          </button>
          ${user
            ? `<button onclick="navigate('orders')" class="flex items-center gap-2 px-3 py-1.5 bg-dark-3 border border-border rounded-xl text-sm hover:border-accent/40 transition-colors">
                <span class="w-5 h-5 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-[10px] text-accent font-bold">
                  ${(user.name || 'ک')[0]}
                </span>
                <span class="hidden sm:block text-text-dim text-xs">${user.name || 'حساب'}</span>
               </button>`
            : `<button onclick="navigate('login')" class="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-xl transition-colors shadow-[0_4px_12px_rgba(207,23,54,0.3)]">
                ورود
               </button>`
          }
          <!-- Mobile menu -->
          <button id="mob-menu-btn" class="md:hidden w-9 h-9 rounded-xl bg-dark-3 border border-border flex items-center justify-center"
                  onclick="toggleMobileMenu()">
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M1 1h14M1 6h14M1 11h14"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile Nav -->
      <div id="mob-menu" class="hidden md:hidden border-t border-border bg-dark-2/95 backdrop-blur">
        <div class="flex flex-col p-4 gap-1">
          <button onclick="navigate(''); toggleMobileMenu()" class="text-right px-4 py-3 text-sm rounded-xl hover:bg-dark-3 transition-colors">خانه</button>
          <button onclick="navigate('shop'); toggleMobileMenu()" class="text-right px-4 py-3 text-sm rounded-xl hover:bg-dark-3 transition-colors">فروشگاه</button>
          <button onclick="navigate('categories'); toggleMobileMenu()" class="text-right px-4 py-3 text-sm rounded-xl hover:bg-dark-3 transition-colors">دسته‌بندی‌ها</button>
          <button onclick="navigate('cart'); toggleMobileMenu()" class="text-right px-4 py-3 text-sm rounded-xl hover:bg-dark-3 transition-colors">سبد خرید</button>
          ${user
            ? `<button onclick="navigate('orders'); toggleMobileMenu()" class="text-right px-4 py-3 text-sm rounded-xl hover:bg-dark-3 transition-colors">سفارشات من</button>
               <button onclick="doLogout()" class="text-right px-4 py-3 text-sm text-accent rounded-xl hover:bg-dark-3 transition-colors">خروج</button>`
            : `<button onclick="navigate('login'); toggleMobileMenu()" class="text-right px-4 py-3 text-sm text-accent font-bold rounded-xl hover:bg-dark-3 transition-colors">ورود / ثبت‌نام</button>`
          }
          <!-- mobile search -->
          <form class="flex mt-2" onsubmit="handleSearch(event)">
            <input type="search" id="mob-search" placeholder="جستجو..."
                   class="flex-1 bg-dark-3 border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-muted/40 focus:outline-none focus:border-accent">
            <button type="submit" class="mr-2 px-4 py-2 bg-accent rounded-xl text-white text-sm">جستجو</button>
          </form>
        </div>
      </div>
    </header>`;
}

window.toggleMobileMenu = () => {
  document.getElementById('mob-menu')?.classList.toggle('hidden');
};

window.handleSearch = (e) => {
  e.preventDefault();
  const q = (document.getElementById('header-search') || document.getElementById('mob-search'))?.value?.trim();
  if (q) navigate(`shop?q=${encodeURIComponent(q)}`);
  document.getElementById('mob-menu')?.classList.add('hidden');
};

window.doLogout = async () => {
  await api.auth.logout();
  document.getElementById('header').innerHTML = renderHeader();
  navigate('');
};

/* ═══════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════ */

function renderFooter() {
  return `
    <footer class="border-t border-border bg-dark-2/60 mt-16">
      <div class="max-w-[1280px] mx-auto px-4 md:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-right">
        <div class="col-span-2 md:col-span-1">
          <div class="flex items-center gap-2 mb-4">
            <img src="assets/logo.png" alt="" class="w-8 h-8 object-contain"  onerror="this.style.display='none'">
            <span class="font-display text-lg">Ghul Bazar</span>
          </div>
          <p class="text-text-dim text-sm leading-relaxed">مرجع اصلی خرید و فروش اکسسوری‌های سورئال و قدمت‌دار</p>
        </div>
        <div>
          <h4 class="font-bold mb-4 text-sm">فروشگاه</h4>
          <ul class="space-y-2 text-sm text-text-dim">
            <li><button onclick="navigate('shop')" class="hover:text-white transition-colors">همه محصولات</button></li>
            <li><button onclick="navigate('categories')" class="hover:text-white transition-colors">دسته‌بندی‌ها</button></li>
            <li><button onclick="navigate('shop?featured=1')" class="hover:text-white transition-colors">محصولات ویژه</button></li>
          </ul>
        </div>
        <div>
          <h4 class="font-bold mb-4 text-sm">حساب</h4>
          <ul class="space-y-2 text-sm text-text-dim">
            <li><button onclick="navigate('login')" class="hover:text-white transition-colors">ورود / ثبت‌نام</button></li>
            <li><button onclick="navigate('orders')" class="hover:text-white transition-colors">سفارشات</button></li>
            <li><button onclick="navigate('cart')" class="hover:text-white transition-colors">سبد خرید</button></li>
          </ul>
        </div>
        <div>
          <h4 class="font-bold mb-4 text-sm">پشتیبانی</h4>
          <ul class="space-y-2 text-sm text-text-dim">
            <li><span>۰۹۱۲۳۴۵۶۷۸۹</span></li>
            <li><span>info@ghulbazar.ir</span></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-border text-center py-4 text-text-dim text-xs">
        © ۱۴۰۴ غول بازار — تمامی حقوق محفوظ است
      </div>
    </footer>`;
}

/* ═══════════════════════════════════════════
   VIEW: HOME
═══════════════════════════════════════════ */

async function viewHome() {
  const main = document.getElementById('view');

  // Hero
  main.innerHTML = `
    <!-- Hero -->
    <section class="relative min-h-[500px] md:min-h-[680px] flex items-center justify-center overflow-hidden">
      <div class="absolute inset-0">
        <img src="assets/hero.png" alt="غول بازار" class="w-full h-full object-cover scale-105">
        <div class="absolute inset-0 bg-gradient-to-t from-dark via-dark/60 to-transparent"></div>
        <div class="absolute inset-0 bg-black/30"></div>
      </div>
      <div class="relative z-10 text-center px-5 max-w-3xl mx-auto py-20">
        <img src="assets/logo.png" alt="غول بازار"
             class="w-24 h-24 md:w-36 md:h-36 object-contain mx-auto mb-4 drop-shadow-[0_0_24px_rgba(207,23,54,0.6)]"
             onerror="this.style.display='none'">
        <h1 class="font-display text-5xl md:text-7xl text-white mb-3 leading-tight">Ghul Bazar</h1>
        <p class="text-muted text-base md:text-xl mb-8">مرجع اصلی خرید و فروش اکسسوری‌های سورئال و قدمت‌دار</p>
        <div class="flex gap-3 justify-center flex-wrap">
          <button onclick="navigate('shop')"
                  class="px-6 py-3 md:px-8 md:py-4 rounded-lg bg-accent text-white font-bold hover:bg-accent-hover transition-all shadow-[0_10px_20px_-5px_rgba(207,23,54,0.4)]">
            کاوش مجموعه
          </button>
          <button onclick="navigate('categories')"
                  class="px-6 py-3 md:px-8 md:py-4 rounded-lg backdrop-blur-sm bg-dark-2/50 border border-white/20 text-white hover:bg-dark-3 transition-all">
            دسته‌بندی‌ها
          </button>
        </div>
      </div>
    </section>

    <!-- Eras section placeholder -->
    <section class="py-12 md:py-20 bg-dark" id="home-eras-section">
      ${loadingHTML}
    </section>

    <!-- Featured products placeholder -->
    <section class="py-12 md:py-16" id="home-products-section">
      ${loadingHTML}
    </section>

    <!-- Newsletter -->
    <section class="py-16 border-t border-border relative overflow-hidden">
      <div class="absolute -right-32 top-1/2 -translate-y-1/2 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="max-w-lg mx-auto px-5 text-center relative z-10">
        <div class="text-3xl mb-4">✦</div>
        <h2 class="text-2xl md:text-3xl font-bold mb-3">به حلقه یاران بپیوندید</h2>
        <p class="text-text-dim mb-6 text-sm">برای دریافت اخبار کالکشن‌های جدید عضو شوید.</p>
        <div class="flex flex-col sm:flex-row gap-3" dir="ltr">
          <button class="px-6 py-3 bg-accent text-white font-bold rounded-lg hover:bg-accent-hover transition-all shrink-0 order-2 sm:order-1">عضویت</button>
          <input type="email" placeholder="ایمیل شما..."
                 class="flex-1 bg-dark-2 border border-border rounded-lg px-4 py-3 text-white text-right placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors order-1 sm:order-2" dir="rtl">
        </div>
      </div>
    </section>`;

  /* load eras */
  try {
    const eras = await api.eras.list();
    const eraImgs = {
      'دوران ویکتوریا': 'assets/products/img1.jpg',
      'دوران ادوارد':   'assets/products/img2.jpg',
      'آرت دکو':        'assets/products/img3.jpg',
      'رترو ۱۹۴۰':     'assets/products/img4.jpg',
      'بلا اپوک':       'assets/products/img8.jpg',
    };
    document.getElementById('home-eras-section').innerHTML = `
      <div class="max-w-[1280px] mx-auto px-4 md:px-8">
        <div class="flex items-center justify-between mb-6">
          <button onclick="navigate('categories')" class="text-muted text-sm hover:text-white">مشاهده همه ←</button>
          <div class="text-right">
            <h2 class="text-xl md:text-2xl font-bold">دست‌چین شده بر اساس دوران</h2>
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          ${eras.slice(0, 4).map(e => `
            <button onclick="navigate('shop?era=${encodeURIComponent(e.era)}')"
                    class="relative rounded-2xl overflow-hidden group block text-right" style="height:280px">
              <img src="${eraImgs[e.era] || 'assets/products/img10.jpg'}" alt="${e.era}"
                   class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                   onerror="this.style.background='#3a1f24'">
              <div class="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/20 to-transparent"></div>
              <div class="absolute bottom-0 left-0 right-0 p-4">
                <h3 class="text-lg font-bold mb-1">${e.era}</h3>
                <p class="text-muted text-xs">${e.count} محصول</p>
              </div>
            </button>`).join('')}
        </div>
      </div>`;
  } catch {}

  /* load products */
  try {
    const data = await api.products.list({ limit: 8 });
    document.getElementById('home-products-section').innerHTML = `
      <div class="max-w-[1280px] mx-auto px-4 md:px-8">
        <div class="flex items-center justify-between mb-6">
          <button onclick="navigate('shop')" class="text-muted text-sm hover:text-white">همه ←</button>
          <h2 class="text-xl md:text-3xl font-bold">تازه رسیده‌ها</h2>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          ${(data.data || []).map(productCard).join('')}
        </div>
      </div>`;
  } catch {}
}

/* ═══════════════════════════════════════════
   VIEW: SHOP
═══════════════════════════════════════════ */

async function viewShop(params) {
  const main = document.getElementById('view');
  const currentEra  = params.get('era')      || '';
  const currentCat  = params.get('category') || '';
  const currentSort = params.get('sort')     || '';
  const currentQ    = params.get('q')        || '';

  const title = currentEra || currentCat || (currentQ ? `جستجو: ${currentQ}` : 'همه محصولات');

  main.innerHTML = `
    <div class="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
      <div class="flex items-start gap-6">
        <!-- Sidebar -->
        <aside class="hidden md:block w-52 lg:w-64 shrink-0 sticky top-24">
          <div class="bg-dark-2 rounded-2xl p-5">
            <h2 class="font-bold mb-5 text-right">فیلترها</h2>
            <div id="sidebar-cats" class="mb-6">
              <p class="text-xs text-muted mb-3 text-right">دسته‌بندی</p>
              <div class="animate-pulse text-text-dim text-xs text-right">در حال بارگذاری...</div>
            </div>
            <div id="sidebar-eras" class="mb-6">
              <p class="text-xs text-muted mb-3 text-right">دوران تاریخی</p>
              <div class="animate-pulse text-text-dim text-xs text-right">در حال بارگذاری...</div>
            </div>
            ${(currentEra || currentCat || currentQ)
              ? `<button onclick="navigate('shop')" class="text-muted text-xs hover:text-accent transition-colors block text-right">× پاک کردن فیلترها</button>`
              : ''}
          </div>
        </aside>

        <!-- Main area -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-6">
            <select id="sort-sel" onchange="shopSort(this)"
                    class="bg-dark-2 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent">
              <option value="" ${!currentSort?'selected':''}>پیش‌فرض</option>
              <option value="newest" ${currentSort==='newest'?'selected':''}>جدیدترین</option>
              <option value="price_asc" ${currentSort==='price_asc'?'selected':''}>ارزان‌ترین</option>
              <option value="price_desc" ${currentSort==='price_desc'?'selected':''}>گران‌ترین</option>
            </select>
            <div class="text-right">
              <h1 class="text-xl md:text-2xl font-bold">${title}</h1>
              <p class="text-text-dim text-xs mt-0.5" id="shop-count"></p>
            </div>
          </div>
          <div id="shop-grid" class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
            ${loadingHTML}
          </div>
        </div>
      </div>
    </div>`;

  window.shopSort = (sel) => {
    const url = new URLSearchParams(params);
    url.set('sort', sel.value);
    navigate('shop?' + url.toString());
  };

  /* sidebar */
  try {
    const [cats, eras] = await Promise.all([api.categories.list(), api.eras.list()]);
    document.getElementById('sidebar-cats').innerHTML = `
      <p class="text-xs text-muted mb-3 text-right">دسته‌بندی</p>
      <ul class="space-y-1">
        ${cats.map(c => {
          const slug = c.slug || c.name;
          const active = currentCat === slug;
          return `<li><button onclick="navigate('shop?category=${encodeURIComponent(slug)}')"
                    class="block w-full text-right text-sm py-1.5 px-2 rounded-lg transition-colors ${active ? 'text-accent font-bold bg-accent/10' : 'text-text-dim hover:text-white hover:bg-dark-3'}">
                    ${c.name}
                  </button></li>`;
        }).join('')}
      </ul>`;
    document.getElementById('sidebar-eras').innerHTML = `
      <p class="text-xs text-muted mb-3 text-right">دوران تاریخی</p>
      <ul class="space-y-1">
        ${eras.map(e => {
          const active = currentEra === e.era;
          return `<li><button onclick="navigate('shop?era=${encodeURIComponent(e.era)}')"
                    class="block w-full text-right text-sm py-1.5 px-2 rounded-lg transition-colors ${active ? 'text-accent font-bold bg-accent/10' : 'text-text-dim hover:text-white hover:bg-dark-3'}">
                    ${e.era}
                  </button></li>`;
        }).join('')}
      </ul>`;
  } catch {}

  /* products */
  try {
    const query = {};
    query.limit = 24;
    if (currentEra)  query.era      = currentEra;
    if (currentCat)  query.category = currentCat;
    if (currentSort) query.sort     = currentSort;
    if (currentQ)    query.q        = currentQ;

    const data = await api.products.list(query);
    document.getElementById('shop-count').textContent = `${data.total || (data.data || []).length} محصول`;

    if (!(data.data || []).length) {
      document.getElementById('shop-grid').innerHTML = `
        <div class="col-span-full text-center py-24 text-text-dim">
          <p class="text-4xl mb-4">✦</p><p>محصولی یافت نشد.</p>
          <button onclick="navigate('shop')" class="mt-4 text-accent text-sm hover:underline">بازگشت</button>
        </div>`;
    } else {
      document.getElementById('shop-grid').innerHTML = data.data.map(productCard).join('');
    }
  } catch (e) {
    document.getElementById('shop-grid').innerHTML = `<div class="col-span-full text-accent text-center py-16">${e.message}</div>`;
  }
}

/* ═══════════════════════════════════════════
   VIEW: PRODUCT DETAIL
═══════════════════════════════════════════ */

async function viewProduct(params) {
  const id   = params.get('id');
  const main = document.getElementById('view');
  if (!id) { navigate('shop'); return; }

  try {
    const p = await api.products.show(id);
    const imgs = p.images || [];
    const mainSrc = imgs.find(i => i.is_main)?.url || imgs[0]?.url || p.image || '';

    main.innerHTML = `
      <div class="max-w-[1280px] mx-auto px-4 md:px-8 py-8">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-xs text-text-dim mb-8 justify-end">
          <span class="text-white">${p.name}</span>
          <span>/</span>
          <button onclick="navigate('shop?era=${encodeURIComponent(p.era||'')}')" class="hover:text-white">${p.era || ''}</button>
          <span>/</span>
          <button onclick="navigate('')" class="hover:text-white">خانه</button>
        </nav>

        <!-- Toast -->
        <div id="added-toast" class="hidden bg-green-900/30 border border-green-700 rounded-xl p-4 mb-6 text-center text-green-300 text-sm">
          ✓ محصول به سبد خرید اضافه شد —
          <button onclick="navigate('cart')" class="underline">مشاهده سبد خرید</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 mb-16">
          <!-- Images -->
          <div>
            <div class="rounded-2xl overflow-hidden bg-dark-2 aspect-square mb-3 shadow-2xl max-w-sm mx-auto md:max-w-none">
              <img id="main-img" src="${mainSrc}" alt="${p.name}"
                   class="w-full h-full object-cover"
                   onerror="this.src='https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&h=600&fit=crop'">
            </div>
            ${imgs.length > 1 ? `
              <div class="grid grid-cols-4 gap-2 max-w-sm mx-auto md:max-w-none">
                ${imgs.map((img, i) => `
                  <button onclick="document.getElementById('main-img').src='${img.url}'"
                          class="rounded-xl overflow-hidden aspect-square border-2 ${i===0?'border-accent':'border-transparent'} hover:border-muted transition-colors">
                    <img src="${img.url}" alt="" class="w-full h-full object-cover">
                  </button>`).join('')}
              </div>` : ''}
          </div>

          <!-- Info -->
          <div class="text-right">
            ${p.badge ? `<span class="inline-block bg-dark-3 border border-border text-muted text-xs px-3 py-1 rounded-full mb-4">${p.badge}</span>` : ''}
            ${p.stock <= 2 && p.stock > 0 ? `<span class="inline-block ml-2 bg-accent/20 border border-accent/30 text-accent text-xs px-3 py-1 rounded-full mb-4">آخرین موجودی</span>` : ''}
            <h1 class="text-3xl md:text-4xl font-bold leading-tight mb-4">${p.name}</h1>

            <!-- Rating -->
            <div class="flex items-center gap-3 justify-end mb-6 pb-6 border-b border-border">
              <span class="text-text-dim text-sm">(${p.reviews || 0} نظر)</span>
              <div class="flex gap-0.5">${renderStars(p.rating || 5)}</div>
              <span class="font-bold">${p.rating || 5}</span>
            </div>

            <p class="text-text-dim leading-relaxed mb-8">${p.description || ''}</p>

            <!-- Price & Cart -->
            <div class="flex items-center justify-between mb-4">
              <p class="text-text-dim text-sm">موجودی: ${p.stock} عدد</p>
              <p class="text-2xl font-bold">${formatPrice(p.price)}</p>
            </div>
            <button id="add-btn"
                    class="w-full py-4 bg-accent rounded-xl text-white font-bold text-lg flex items-center justify-center gap-3
                           hover:bg-accent-hover transition-all shadow-[0_10px_20px_-5px_rgba(207,23,54,0.4)] active:scale-[0.99]">
              <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                <path d="M3 1L1 5V17C1 18.1 1.9 19 3 19H13C14.1 19 15 18.1 15 17V5L13 1H3Z" stroke="white" stroke-width="1.5"/>
                <path d="M1 5H15" stroke="white" stroke-width="1.5"/>
                <path d="M11 9C11 10.7 9.7 12 8 12C6.3 12 5 10.7 5 9" stroke="white" stroke-width="1.5"/>
              </svg>
              افزودن به مجموعه
            </button>
            <p class="text-text-dim text-xs text-center mt-3">ارسال رایگان برای سفارش‌های بالای ۱،۵۰۰،۰۰۰ تومان</p>

            <!-- Accordions -->
            <div class="border-t border-border mt-8">
              <button onclick="toggleAcc('hist')" class="w-full flex items-center justify-between py-4">
                <svg id="hist-icon" width="12" height="7" viewBox="0 0 12 7" fill="none" class="transition-transform">
                  <path d="M1 1L6 6L11 1" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
                </svg>
                <span class="font-medium">تاریخچه و اصالت</span>
              </button>
              <div id="hist-content" class="overflow-hidden transition-all duration-300" style="max-height:0">
                <p class="pb-6 text-text-dim text-sm leading-relaxed">${p.description || '—'}</p>
              </div>
            </div>
            <div class="border-t border-border">
              <button onclick="toggleAcc('care')" class="w-full flex items-center justify-between py-4">
                <svg id="care-icon" width="12" height="7" viewBox="0 0 12 7" fill="none" class="transition-transform">
                  <path d="M1 1L6 6L11 1" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
                </svg>
                <span class="font-medium">مواد و نگهداری</span>
              </button>
              <div id="care-content" class="overflow-hidden transition-all duration-300" style="max-height:0">
                <p class="pb-6 text-text-dim text-sm leading-relaxed">با پارچه نرم تمیز کنید. از تماس با مواد شیمیایی، عطر، و آب بپرهیزید.</p>
              </div>
            </div>
          </div>
        </div>

        ${p.related?.length ? `
          <section class="border-t border-border pt-12">
            <div class="flex items-center justify-between mb-6">
              <button onclick="navigate('shop')" class="text-muted text-sm hover:text-white">همه ←</button>
              <h2 class="text-xl md:text-2xl font-bold">شاید بپسندید</h2>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              ${p.related.map(productCard).join('')}
            </div>
          </section>` : ''}
      </div>`;

    /* add to cart */
    document.getElementById('add-btn').addEventListener('click', async function() {
      this.disabled = true;
      try {
        await api.cart.add(p.id, 1);
        await updateCartBadge();
        document.getElementById('added-toast')?.classList.remove('hidden');
        this.textContent = '✓ اضافه شد';
        setTimeout(() => { this.innerHTML = 'افزودن به مجموعه'; this.disabled = false; }, 2500);
      } catch (e) { showToast(e.message, 'error'); this.disabled = false; }
    });

    /* accordion */
    window.toggleAcc = (id) => {
      const c = document.getElementById(id + '-content');
      const ico = document.getElementById(id + '-icon');
      const open = c.style.maxHeight !== '0px' && c.style.maxHeight !== '';
      c.style.maxHeight = open ? '0px' : c.scrollHeight + 'px';
      if (ico) ico.style.transform = open ? '' : 'rotate(180deg)';
    };

  } catch (e) {
    main.innerHTML = `<div class="text-center py-32 text-accent">${e.message}</div>`;
  }
}

/* ═══════════════════════════════════════════
   VIEW: CATEGORIES
═══════════════════════════════════════════ */

async function viewCategories() {
  const main = document.getElementById('view');
  main.innerHTML = loadingHTML;

  try {
    const [cats, eras] = await Promise.all([api.categories.list(), api.eras.list()]);

    const catImgs = {
      'rings':'assets/products/img7.jpg', 'necklaces':'assets/products/img6.jpg',
      'earrings':'assets/products/img5.jpg', 'bracelets':'assets/products/img4.jpg',
      'brooches':'assets/products/img3.jpg',
    };
    const eraImgs = {
      'دوران ویکتوریا':'assets/products/img12.jpg', 'دوران ادوارد':'assets/products/img11.jpg',
      'آرت دکو':'assets/products/img10.jpg', 'رترو ۱۹۴۰':'assets/products/img9.jpg',
      'بلا اپوک':'assets/products/img8.jpg',
    };

    main.innerHTML = `
      <div class="max-w-[1280px] mx-auto px-4 md:px-8 py-12">
        <div class="text-right mb-10">
          <h1 class="text-3xl md:text-4xl font-bold mb-2">دسته‌بندی‌ها</h1>
          <p class="text-text-dim">مجموعه‌های منتخب از دوران‌های تاریخی و نوع جواهر</p>
        </div>

        <section class="mb-16">
          <h2 class="text-xl font-bold text-right mb-6 border-b border-border pb-3">بر اساس دوران تاریخی</h2>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${eras.map(e => `
              <button onclick="navigate('shop?era=${encodeURIComponent(e.era)}')"
                      class="relative rounded-2xl overflow-hidden group text-right" style="height:220px">
                <img src="${eraImgs[e.era]||'assets/products/img1.jpg'}" alt="${e.era}"
                     class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                <div class="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/20 to-transparent"></div>
                <div class="absolute bottom-0 inset-x-0 p-4">
                  <h3 class="text-lg font-bold mb-1">${e.era}</h3>
                  <p class="text-muted text-xs">${e.count} محصول ←</p>
                </div>
              </button>`).join('')}
          </div>
        </section>

        <section>
          <h2 class="text-xl font-bold text-right mb-6 border-b border-border pb-3">بر اساس نوع جواهر</h2>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${cats.map(c => {
              const slug = c.slug || c.name;
              return `<button onclick="navigate('shop?category=${encodeURIComponent(slug)}')"
                        class="relative rounded-2xl overflow-hidden group text-right" style="height:180px">
                        <img src="${catImgs[slug]||'assets/products/img12.jpg'}" alt="${c.name}"
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                        <div class="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/30 to-transparent"></div>
                        <div class="absolute bottom-0 inset-x-0 p-4">
                          <h3 class="text-base font-bold">${c.name}</h3>
                        </div>
                      </button>`;
            }).join('')}
          </div>
        </section>
      </div>`;
  } catch (e) {
    main.innerHTML = `<div class="text-center py-32 text-accent">${e.message}</div>`;
  }
}

/* ═══════════════════════════════════════════
   VIEW: CART
═══════════════════════════════════════════ */

let _cartData = null;
let _discountData = null;

async function viewCart() {
  const main = document.getElementById('view');
  _discountData = null;

  try {
    const data = await api.cart.get();
    _cartData = data;

    if (!(data.items || []).length) {
      main.innerHTML = `
        <div class="max-w-[1200px] mx-auto px-4 md:px-8 py-12">
          <h1 class="text-3xl font-bold text-right mb-10">سبد خرید</h1>
          <div class="text-center py-32 text-text-dim">
            <div class="text-6xl mb-6">🛍</div>
            <p class="text-xl mb-6">سبد خرید شما خالی است</p>
            <button onclick="navigate('shop')" class="px-8 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-hover">ادامه خرید</button>
          </div>
        </div>`;
      return;
    }

    main.innerHTML = `
      <div class="max-w-[1200px] mx-auto px-4 md:px-8 py-12">
        <h1 class="text-3xl font-bold text-right mb-10">سبد خرید</h1>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
          <div class="md:col-span-2 space-y-4" id="cart-items-wrap"></div>
          <div class="bg-dark-2 border border-border rounded-2xl p-6 h-fit sticky top-24">
            <h2 class="text-xl font-bold text-right mb-6">خلاصه سفارش</h2>
            <div class="space-y-3 mb-4 text-right" id="cart-summary-lines"></div>
            <!-- Discount -->
            <div class="border-t border-border pt-4 mb-4">
              <p class="text-sm text-muted mb-2 text-right">کد تخفیف</p>
              <div class="flex gap-2" dir="ltr">
                <button id="apply-disc-btn" class="px-4 py-2 bg-dark-3 border border-border rounded-lg text-sm hover:border-accent transition-colors">اعمال</button>
                <input type="text" id="disc-input" placeholder="کد تخفیف..." dir="rtl"
                       class="flex-1 bg-dark border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted/50 focus:outline-none focus:border-accent">
              </div>
              <p id="disc-msg" class="text-xs mt-2 text-right hidden"></p>
            </div>
            <div class="border-t border-border pt-4 mb-6">
              <div class="flex justify-between font-bold text-lg">
                <span id="cart-final-total"></span><span>مجموع</span>
              </div>
            </div>
            <button onclick="navigate('checkout')" class="block w-full py-4 bg-accent text-white text-center rounded-xl font-bold hover:bg-accent-hover transition-all shadow-[0_10px_20px_-5px_rgba(207,23,54,0.4)]">
              ادامه به پرداخت
            </button>
            <button onclick="navigate('shop')" class="block w-full text-center text-text-dim text-sm mt-4 hover:text-white">← ادامه خرید</button>
          </div>
        </div>
      </div>`;

    renderCartItems(data);

    /* discount */
    document.getElementById('apply-disc-btn').addEventListener('click', async () => {
      const code = document.getElementById('disc-input').value.trim();
      const msg = document.getElementById('disc-msg');
      if (!code) return;
      try {
        _discountData = await api.discounts.validate(code);
        msg.textContent = '✓ کد تخفیف اعمال شد';
        msg.className = 'text-xs mt-2 text-right text-green-400';
        msg.classList.remove('hidden');
        renderCartItems(_cartData);
      } catch {
        _discountData = null;
        msg.textContent = '✕ کد تخفیف نامعتبر است';
        msg.className = 'text-xs mt-2 text-right text-red-400';
        msg.classList.remove('hidden');
      }
    });

  } catch (e) {
    main.innerHTML = `<div class="text-center py-32 text-accent">${e.message}</div>`;
  }
}

function renderCartItems(data) {
  const shipping = data.total >= 1500000 ? 0 : 50000;
  const discount = _discountData
    ? (_discountData.type === 'percent' ? data.total * _discountData.value / 100 : _discountData.value)
    : 0;
  const finalTotal = data.total + shipping - discount;

  document.getElementById('cart-items-wrap').innerHTML = data.items.map(item => `
    <div class="bg-dark-2 border border-border rounded-2xl p-4 flex gap-4 items-center" id="ci-${item.id}">
      <img src="${item.image||''}" alt="${item.name}"
           class="w-20 h-20 rounded-xl object-cover shrink-0"
           onerror="this.src='https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop'">
      <div class="flex-1 text-right min-w-0">
        <h3 class="font-medium mb-1 truncate">
          <button onclick="navigate('product?id=${item.id}')" class="hover:text-muted">${item.name}</button>
        </h3>
        <p class="text-accent font-bold mt-1">${formatPrice(item.price)}</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button onclick="cartRemove(${item.id})"
                class="w-8 h-8 rounded border border-border text-text-dim hover:border-red-500 hover:text-red-400 transition-colors text-sm">✕</button>
        <input type="number" value="${item.qty}" min="1" max="10"
               onchange="cartUpdate(${item.id}, this.value)"
               class="w-14 bg-dark border border-border rounded px-2 py-1 text-center text-sm">
      </div>
    </div>`).join('');

  document.getElementById('cart-summary-lines').innerHTML = `
    <div class="flex justify-between text-text-dim text-sm">
      <span>${formatPrice(data.total)}</span><span>جمع کالاها</span>
    </div>
    ${discount > 0 ? `<div class="flex justify-between text-green-400 text-sm">
      <span>-${formatPrice(discount)}</span><span>تخفیف</span></div>` : ''}
    <div class="flex justify-between text-text-dim text-sm">
      <span>${shipping === 0 ? 'رایگان' : formatPrice(shipping)}</span><span>ارسال</span>
    </div>`;
  document.getElementById('cart-final-total').textContent = formatPrice(finalTotal);
}

window.cartRemove = async (productId) => {
  try {
    await api.cart.remove(productId);
    await updateCartBadge();
    viewCart();
  } catch (e) { showToast(e.message, 'error'); }
};
window.cartUpdate = async (productId, qty) => {
  try {
    await api.cart.update(productId, parseInt(qty));
    const data = await api.cart.get();
    _cartData = data;
    renderCartItems(data);
    updateCartBadge();
  } catch (e) { showToast(e.message, 'error'); }
};

/* ═══════════════════════════════════════════
   VIEW: CHECKOUT
═══════════════════════════════════════════ */

let _checkoutCart = null;
let _checkoutDiscount = null;

async function viewCheckout() {
  const main = document.getElementById('view');
  _checkoutDiscount = null;

  try {
    const data = await api.cart.get();
    if (!(data.items || []).length) { navigate('cart'); return; }
    _checkoutCart = data;

    const user = api.getUser();
    main.innerHTML = `
      <div class="max-w-[1100px] mx-auto px-4 md:px-8 py-12">
        <h1 class="text-3xl font-bold text-right mb-10">تکمیل سفارش</h1>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12">
          <!-- Form -->
          <div class="md:col-span-3 space-y-6">
            <div class="bg-dark-2 border border-border rounded-2xl p-6">
              <h2 class="text-lg font-bold text-right mb-6">اطلاعات تحویل</h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm text-muted text-right mb-1">نام و نام‌خانوادگی *</label>
                  <input type="text" id="co-name" value="${user?.name||''}" required
                         class="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-right placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
                         placeholder="علی احمدی">
                </div>
                <div>
                  <label class="block text-sm text-muted text-right mb-1">شماره موبایل *</label>
                  <input type="tel" id="co-phone" value="${user?.phone||''}" required dir="ltr"
                         class="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-left placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
                         placeholder="09123456789">
                </div>
                <div>
                  <label class="block text-sm text-muted text-right mb-1">آدرس کامل *</label>
                  <textarea id="co-address" required rows="3"
                            class="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-right placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors resize-none"
                            placeholder="استان، شهر، خیابان، کوچه، پلاک، واحد"></textarea>
                </div>
              </div>
            </div>
            <!-- Discount -->
            <div class="bg-dark-2 border border-border rounded-2xl p-6">
              <h2 class="text-lg font-bold text-right mb-4">کد تخفیف</h2>
              <div class="flex gap-2" dir="ltr">
                <button id="co-disc-btn" class="px-4 py-2.5 bg-dark-3 border border-border rounded-xl text-sm hover:border-accent transition-colors shrink-0">اعمال</button>
                <input type="text" id="co-disc-input" placeholder="کد تخفیف..." dir="rtl"
                       class="flex-1 bg-dark border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-muted/50 focus:outline-none focus:border-accent">
              </div>
              <p id="co-disc-msg" class="text-xs mt-2 text-right hidden"></p>
            </div>
            <p id="co-error" class="hidden text-accent text-sm text-right"></p>
            <button id="co-submit"
                    class="w-full py-4 bg-accent text-white font-bold text-lg rounded-2xl hover:bg-accent-hover transition-all shadow-[0_10px_20px_-5px_rgba(207,23,54,0.4)]">
              ثبت سفارش
            </button>
          </div>
          <!-- Summary -->
          <div class="md:col-span-2">
            <div class="bg-dark-2 border border-border rounded-2xl p-6 sticky top-24">
              <h2 class="text-lg font-bold text-right mb-6">سفارش شما</h2>
              <div id="co-items" class="space-y-3 mb-4 max-h-64 overflow-y-auto"></div>
              <div class="border-t border-border pt-4 space-y-2" id="co-breakdown"></div>
              <div class="border-t border-border mt-4 pt-4">
                <div class="flex justify-between font-bold text-lg">
                  <span id="co-total"></span><span>مجموع</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    renderCheckoutSummary();

    /* discount */
    document.getElementById('co-disc-btn').addEventListener('click', async () => {
      const code = document.getElementById('co-disc-input').value.trim();
      const msg  = document.getElementById('co-disc-msg');
      if (!code) return;
      try {
        _checkoutDiscount = await api.discounts.validate(code);
        msg.textContent = '✓ کد تخفیف اعمال شد';
        msg.className = 'text-xs mt-2 text-right text-green-400'; msg.classList.remove('hidden');
        renderCheckoutSummary();
      } catch {
        _checkoutDiscount = null;
        msg.textContent = '✕ کد تخفیف نامعتبر است';
        msg.className = 'text-xs mt-2 text-right text-red-400'; msg.classList.remove('hidden');
      }
    });

    /* submit */
    document.getElementById('co-submit').addEventListener('click', submitCheckout);

  } catch (e) {
    main.innerHTML = `<div class="text-center py-32 text-accent">${e.message}</div>`;
  }
}

function renderCheckoutSummary() {
  const data = _checkoutCart;
  const shipping = data.total >= 1500000 ? 0 : 50000;
  const discount = _checkoutDiscount
    ? (_checkoutDiscount.type === 'percent' ? data.total * _checkoutDiscount.value / 100 : _checkoutDiscount.value)
    : 0;
  const finalTotal = data.total + shipping - discount;

  document.getElementById('co-items').innerHTML = data.items.map(item => `
    <div class="flex items-center gap-3">
      <img src="${item.image||''}" onerror="this.src='https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=100&h=100&fit=crop'"
           class="w-14 h-14 rounded-xl object-cover shrink-0">
      <div class="flex-1 text-right min-w-0">
        <p class="text-sm font-medium truncate">${item.name}</p>
        <p class="text-xs text-muted">× ${item.qty}</p>
      </div>
      <p class="text-sm font-bold shrink-0">${formatPrice(item.subtotal || item.price * item.qty)}</p>
    </div>`).join('');

  document.getElementById('co-breakdown').innerHTML = `
    <div class="flex justify-between text-text-dim text-sm">
      <span>${formatPrice(data.total)}</span><span>جمع کالاها</span>
    </div>
    ${discount > 0 ? `<div class="flex justify-between text-green-400 text-sm"><span>-${formatPrice(discount)}</span><span>تخفیف</span></div>` : ''}
    <div class="flex justify-between text-text-dim text-sm">
      <span>${shipping===0?'رایگان':formatPrice(shipping)}</span><span>ارسال</span>
    </div>`;
  document.getElementById('co-total').textContent = formatPrice(finalTotal);
}

async function submitCheckout() {
  const name    = document.getElementById('co-name').value.trim();
  const phone   = document.getElementById('co-phone').value.trim();
  const address = document.getElementById('co-address').value.trim();
  const errEl   = document.getElementById('co-error');

  if (!name || !phone || !address) {
    errEl.textContent = 'لطفاً تمام فیلدهای ضروری را پر کنید';
    errEl.classList.remove('hidden'); return;
  }
  errEl.classList.add('hidden');
  const btn = document.getElementById('co-submit');
  btn.disabled = true; btn.textContent = 'در حال ثبت سفارش...';

  try {
    const items  = _checkoutCart.items.map(i => ({ product_id: i.id, qty: i.qty }));
    const result = await api.orders.place({
      customer_name: name, customer_phone: phone, shipping_address: address, items,
      discount_code: _checkoutDiscount ? document.getElementById('co-disc-input').value.trim() : undefined,
    });
    await api.cart.clear();
    await updateCartBadge();
    sessionStorage.setItem('gb_checkout', JSON.stringify({
      ...result, customer_name: name, customer_phone: phone, shipping_address: address,
    }));
    navigate('payment');
  } catch (e) {
    errEl.textContent = e.message; errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'ثبت سفارش';
  }
}

/* ═══════════════════════════════════════════
   VIEW: PAYMENT
═══════════════════════════════════════════ */

async function viewPayment() {
  const main  = document.getElementById('view');
  let orderData = {};
  try { orderData = JSON.parse(sessionStorage.getItem('gb_checkout') || '{}'); } catch {}

  main.innerHTML = `
    <!-- Breadcrumb -->
    <div class="border-b border-border bg-dark-2/60">
      <div class="max-w-[1280px] mx-auto px-5 py-3 flex items-center gap-2 text-xs text-text-dim overflow-x-auto whitespace-nowrap">
        <button onclick="navigate('cart')" class="hover:text-white">سبد خرید</button>
        <span class="text-border">›</span>
        <button onclick="navigate('checkout')" class="hover:text-white">اطلاعات ارسال</button>
        <span class="text-border">›</span>
        <span class="text-accent font-bold">پرداخت</span>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-5 py-10">
      <!-- Order info -->
      <div class="bg-dark-2 border border-border rounded-2xl p-6 mb-8">
        <h2 class="text-xl font-bold mb-6">جزئیات سفارش</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p class="text-sm text-text-dim">شماره سفارش</p>
            <p id="pay-order-num" class="text-2xl font-bold">${orderData.order_number || '—'}</p>
            <button onclick="copyPayText('pay-order-num')"
                    class="mt-2 text-xs bg-dark-3 px-3 py-1 rounded-lg hover:bg-accent/20 transition-colors">کپی</button>
          </div>
          <div>
            <p class="text-sm text-text-dim">مبلغ قابل پرداخت</p>
            <p class="text-2xl font-bold text-green-400">
              ${orderData.total_amount ? Number(orderData.total_amount).toLocaleString('fa-IR') + ' تومان' : '—'}
            </p>
          </div>
        </div>
        <div class="mt-6 p-4 bg-dark-3 border border-border rounded-xl">
          <p class="text-text-dim text-sm mb-2">لطفاً مبلغ فوق را به شماره کارت زیر واریز کرده و تصویر رسید را بارگذاری نمایید.</p>
          <div class="bg-dark border border-border rounded-xl p-4 flex items-center justify-between">
            <span id="pay-card-num" class="font-bold text-white text-lg ltr">6037-9975-XXXX-XXXX</span>
            <button onclick="copyPayText('pay-card-num')"
                    class="text-xs bg-accent px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors">کپی شماره کارت</button>
          </div>
        </div>
      </div>

      <!-- Upload receipt -->
      <div class="bg-dark-2 border border-border rounded-2xl p-6">
        <h3 class="text-lg font-bold mb-4">آپلود رسید پرداخت</h3>
        <div class="space-y-4">
          <label class="block w-full cursor-pointer bg-dark-3 border border-border rounded-2xl p-6 text-center hover:border-accent transition-colors">
            <span id="pay-ph" class="text-text-dim block">برای انتخاب تصویر کلیک کنید (JPG, PNG, WebP)</span>
            <span id="pay-preview" class="hidden text-green-400">فایل انتخاب شد: <strong id="pay-fname"></strong></span>
            <input type="file" id="pay-file" class="hidden" accept="image/*">
          </label>
          <button id="pay-send-btn"
                  class="w-full py-3 bg-accent text-white font-bold rounded-2xl hover:bg-accent-hover transition-all">
            ارسال رسید
          </button>
        </div>
        <p id="pay-error" class="hidden text-accent text-sm mt-3"></p>
      </div>
    </div>

    <!-- Copy toast -->
    <div id="copy-toast" class="hidden fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-xl shadow-xl z-50">
      کپی شد!
    </div>`;

  let selectedFile = null;
  document.getElementById('pay-file').addEventListener('change', function() {
    const f = this.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      document.getElementById('pay-error').textContent = 'حجم فایل بیش از ۵ مگابایت است';
      document.getElementById('pay-error').classList.remove('hidden');
      this.value = ''; return;
    }
    selectedFile = f;
    document.getElementById('pay-ph').classList.add('hidden');
    document.getElementById('pay-preview').classList.remove('hidden');
    document.getElementById('pay-fname').textContent = f.name;
    document.getElementById('pay-error').classList.add('hidden');
  });

  document.getElementById('pay-send-btn').addEventListener('click', async () => {
    const errEl = document.getElementById('pay-error');
    const btn   = document.getElementById('pay-send-btn');
    const orderNumber = orderData.order_number;
    if (!selectedFile) { errEl.textContent = 'لطفاً تصویر رسید را انتخاب کنید'; errEl.classList.remove('hidden'); return; }
    btn.disabled = true; btn.textContent = 'در حال ارسال...'; errEl.classList.add('hidden');
    try {
      await api.payment.uploadReceipt(orderNumber, selectedFile);
      sessionStorage.removeItem('gb_checkout');
      showToast('رسید با موفقیت ثبت شد ✓');
      setTimeout(() => navigate(''), 1500);
    } catch (e) {
      errEl.textContent = e.message; errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'ارسال رسید';
    }
  });

  window.copyPayText = (id) => {
    navigator.clipboard.writeText(document.getElementById(id).textContent.trim()).then(() => {
      const t = document.getElementById('copy-toast');
      t.classList.remove('hidden');
      setTimeout(() => t.classList.add('hidden'), 2000);
    });
  };
}

/* ═══════════════════════════════════════════
   VIEW: ORDERS
═══════════════════════════════════════════ */

const ORDER_STATUS = {
  pending:   { label:'در انتظار تأیید',  cls:'border-yellow-700/50 text-yellow-300 bg-yellow-900/20' },
  paid:      { label:'تأیید پرداخت',     cls:'border-blue-700/50 text-blue-300 bg-blue-900/20' },
  shipped:   { label:'ارسال شده',         cls:'border-accent/50 text-accent bg-accent/10' },
  delivered: { label:'تحویل داده شده',   cls:'border-green-700/50 text-green-300 bg-green-900/20' },
  cancelled: { label:'لغو شده',           cls:'border-border text-text-dim bg-dark-3/50' },
};

async function viewOrders() {
  const main = document.getElementById('view');

  if (!api.isAuth()) {
    main.innerHTML = `
      <div class="text-center py-32">
        <div class="text-6xl mb-6">🔒</div>
        <p class="text-xl text-text-dim mb-6">برای مشاهده سفارشات وارد شوید</p>
        <button onclick="navigate('login')" class="px-8 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-hover">ورود به حساب</button>
      </div>`; return;
  }

  try {
    const rawData = await api.orders.list();
    const orders  = Array.isArray(rawData) ? rawData : (rawData.data || rawData.orders || []);

    if (!orders.length) {
      main.innerHTML = `
        <div class="text-center py-32 text-text-dim">
          <p class="text-xl mb-6">هنوز سفارشی ثبت نشده</p>
          <button onclick="navigate('shop')" class="px-8 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-hover">رفتن به فروشگاه</button>
        </div>`; return;
    }

    const active   = orders.filter(o => !['delivered','cancelled'].includes(o.status)).length;
    const totalAmt = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);

    main.innerHTML = `
      <div class="max-w-[1280px] mx-auto px-4 md:px-8 py-10">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4 border-b border-border pb-8">
          <div>
            <h1 class="text-2xl md:text-3xl font-black mb-1">سفارشات من</h1>
            <p class="text-text-dim text-sm">سوابق خرید و پیگیری وضعیت ارسال</p>
          </div>
          <button onclick="navigate('shop')"
                  class="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-xl transition-colors">
            + خرید جدید
          </button>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-3 gap-4 mb-10">
          <div class="bg-dark-2 border border-border rounded-2xl p-5 text-right">
            <p class="text-xs text-muted mb-1">سفارشات جاری</p>
            <h3 class="text-3xl font-black">${active.toLocaleString('fa-IR')}</h3>
            <p class="text-xs text-accent mt-1 font-medium">در حال پردازش</p>
          </div>
          <div class="bg-dark-2 border border-border rounded-2xl p-5 text-right">
            <p class="text-xs text-muted mb-1">کل خریدها</p>
            <h3 class="text-3xl font-black">${orders.length.toLocaleString('fa-IR')}</h3>
            <p class="text-xs text-muted mt-1">سفارش ثبت‌شده</p>
          </div>
          <div class="bg-dark-2 border border-border rounded-2xl p-5 text-right">
            <p class="text-xs text-muted mb-1">مجموع هزینه</p>
            <h3 class="text-xl font-black">${totalAmt.toLocaleString('fa-IR')} تومان</h3>
            <p class="text-xs text-muted mt-1">در کل دوره</p>
          </div>
        </div>

        <!-- Table -->
        <div class="bg-dark-2 border border-border rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-right min-w-[600px]">
              <thead>
                <tr class="border-b border-border bg-dark-3/60">
                  <th class="py-3.5 px-5 text-xs font-bold text-muted">شماره سفارش</th>
                  <th class="py-3.5 px-5 text-xs font-bold text-muted">تاریخ</th>
                  <th class="py-3.5 px-5 text-xs font-bold text-muted hidden sm:table-cell">مبلغ</th>
                  <th class="py-3.5 px-5 text-xs font-bold text-muted">وضعیت</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                ${orders.map(o => {
                  const s   = ORDER_STATUS[o.status] || { label: o.status, cls: 'border-border text-text-dim' };
                  const dim = ['delivered','cancelled'].includes(o.status) ? 'opacity-60' : '';
                  const date = o.created_at ? new Date(o.created_at).toLocaleDateString('fa-IR') : '—';
                  return `
                    <tr class="hover:bg-dark-3/30 transition-colors ${dim}">
                      <td class="py-4 px-5 font-mono text-sm whitespace-nowrap">#${o.order_number}</td>
                      <td class="py-4 px-5 text-sm text-text-dim whitespace-nowrap">${date}</td>
                      <td class="py-4 px-5 font-bold text-sm hidden sm:table-cell whitespace-nowrap">${Number(o.total_amount||0).toLocaleString('fa-IR')} تومان</td>
                      <td class="py-4 px-5 whitespace-nowrap">
                        <span class="text-[11px] px-2.5 py-1 rounded-full font-bold border ${s.cls}">${s.label}</span>
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  } catch (e) {
    main.innerHTML = `<div class="text-center py-32 text-accent">${e.message}</div>`;
  }
}

/* ═══════════════════════════════════════════
   VIEW: LOGIN
═══════════════════════════════════════════ */

function viewLogin() {
  if (api.isAuth()) { navigate(''); return; }

  const main = document.getElementById('view');
  main.innerHTML = `
    <!-- Ambient glows -->
    <div class="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/8 rounded-full blur-[140px] -translate-y-1/3 translate-x-1/4"></div>
      <div class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#47242a]/20 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4"></div>
    </div>
    <div class="relative z-10 flex items-center justify-center min-h-[80vh] py-10 px-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <img src="assets/logo.png" alt="" class="w-16 h-16 object-contain mx-auto mb-4 drop-shadow-[0_0_20px_rgba(207,23,54,0.4)]"
               onerror="this.style.display='none'">
          <h1 class="font-display text-3xl text-white mb-1">Ghul Bazar</h1>
          <p class="text-muted text-sm">ورود یا ساخت حساب کاربری</p>
        </div>

        <div class="bg-dark-2 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <!-- Tabs -->
          <div class="flex border-b border-border">
            <button id="tab-login" onclick="loginTab('login')"
                    class="flex-1 py-4 text-sm font-bold transition-colors border-b-2 border-accent text-white">ورود</button>
            <button id="tab-reg"   onclick="loginTab('register')"
                    class="flex-1 py-4 text-sm font-bold transition-colors border-b-2 border-transparent text-text-dim">ثبت‌نام</button>
          </div>

          <!-- Login -->
          <div id="form-login" class="p-6 md:p-8">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-text-dim mb-1.5">شماره همراه</label>
                <input type="text" id="l-phone" dir="rtl" placeholder="09123456789"
                       class="w-full bg-dark-3 rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted/35 focus:outline-none focus:border-accent transition-colors">
              </div>
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <a href="#" class="text-xs text-muted hover:text-accent">فراموشی رمز</a>
                  <label class="text-sm font-medium text-text-dim">رمز عبور</label>
                </div>
                <div class="relative">
                  <input type="password" id="l-pass" dir="rtl" placeholder="••••••••"
                         class="w-full bg-dark-3 rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted/35 focus:outline-none focus:border-accent transition-colors">
                  <button type="button" onclick="togglePass('l-pass',this)"
                          class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted/50 hover:text-muted">نمایش</button>
                </div>
              </div>
              <p id="l-error" class="hidden text-xs text-red-300 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2 text-right"></p>
              <button id="l-btn" onclick="doLogin()"
                      class="w-full py-3.5 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-xl transition-all shadow-[0_6px_20px_rgba(207,23,54,0.3)]">
                ورود به حساب
              </button>
            </div>
            <button onclick="loginTab('register')"
                    class="w-full mt-4 py-3 border border-border rounded-xl text-sm text-text-dim hover:border-accent/40 hover:text-white transition-all">
              حساب ندارید؟ <span class="text-accent font-bold">ثبت‌نام کنید</span>
            </button>
          </div>

          <!-- Register -->
          <div id="form-reg" class="hidden p-6 md:p-8">
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-text-dim mb-1.5">نام</label>
                  <input type="text" id="r-fname" placeholder="نام"
                         class="w-full bg-dark-3 rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted/35 focus:outline-none focus:border-accent transition-colors">
                </div>
                <div>
                  <label class="block text-sm font-medium text-text-dim mb-1.5">نام خانوادگی</label>
                  <input type="text" id="r-lname" placeholder="نام خانوادگی"
                         class="w-full bg-dark-3 rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted/35 focus:outline-none focus:border-accent transition-colors">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-text-dim mb-1.5">شماره همراه</label>
                <input type="text" id="r-phone" dir="rtl" placeholder="09123456789"
                       class="w-full bg-dark-3 rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted/35 focus:outline-none focus:border-accent transition-colors">
              </div>
              <div>
                <label class="block text-sm font-medium text-text-dim mb-1.5">رمز عبور</label>
                <div class="relative">
                  <input type="password" id="r-pass" dir="rtl" placeholder="حداقل ۸ کاراکتر"
                         class="w-full bg-dark-3 rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted/35 focus:outline-none focus:border-accent transition-colors">
                  <button type="button" onclick="togglePass('r-pass',this)"
                          class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted/50 hover:text-muted">نمایش</button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-text-dim mb-1.5">تکرار رمز عبور</label>
                <input type="password" id="r-confirm" dir="rtl" placeholder="••••••••"
                       class="w-full bg-dark-3 rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted/35 focus:outline-none focus:border-accent transition-colors">
              </div>
              <div class="flex items-start gap-2">
                <input type="checkbox" id="r-terms" class="mt-1 w-4 h-4 accent-accent shrink-0">
                <label for="r-terms" class="text-xs text-text-dim leading-relaxed cursor-pointer">
                  با <a href="#" class="text-accent hover:underline">قوانین و مقررات</a> موافقم
                </label>
              </div>
              <p id="r-error" class="hidden text-xs text-red-300 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2 text-right"></p>
              <button id="r-btn" onclick="doRegister()"
                      class="w-full py-3.5 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-xl transition-all shadow-[0_6px_20px_rgba(207,23,54,0.3)]">
                ساخت حساب
              </button>
            </div>
            <button onclick="loginTab('login')"
                    class="w-full mt-4 py-3 text-sm text-text-dim hover:text-white transition-colors">
              حساب دارید؟ <span class="text-accent font-bold">وارد شوید</span>
            </button>
          </div>
        </div>
        <p class="text-center text-xs text-text-dim/40 mt-5">© ۱۴۰۴ غول بازار</p>
      </div>
    </div>`;

  window.loginTab = (t) => {
    const isLogin = t === 'login';
    document.getElementById('tab-login').className = `flex-1 py-4 text-sm font-bold transition-colors border-b-2 ${isLogin ? 'border-accent text-white' : 'border-transparent text-text-dim'}`;
    document.getElementById('tab-reg').className   = `flex-1 py-4 text-sm font-bold transition-colors border-b-2 ${!isLogin ? 'border-accent text-white' : 'border-transparent text-text-dim'}`;
    document.getElementById('form-login').classList.toggle('hidden', !isLogin);
    document.getElementById('form-reg').classList.toggle('hidden', isLogin);
  };

  window.togglePass = (id, btn) => {
    const inp = document.getElementById(id);
    inp.type  = inp.type === 'password' ? 'text' : 'password';
    btn.textContent = inp.type === 'password' ? 'نمایش' : 'پنهان';
  };

  window.doLogin = async () => {
    const errEl = document.getElementById('l-error');
    errEl.classList.add('hidden');
    const phone = document.getElementById('l-phone').value.trim();
    const pass  = document.getElementById('l-pass').value;
    if (!phone || !pass) { errEl.textContent = 'شماره همراه و رمز عبور را وارد کنید'; errEl.classList.remove('hidden'); return; }
    const btn = document.getElementById('l-btn');
    btn.disabled = true; btn.textContent = 'در حال ورود...';
    try {
      await api.auth.login(phone, pass);
      document.getElementById('header').innerHTML = renderHeader();
      await updateCartBadge();
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      navigate(redirect || '');
    } catch (e) {
      errEl.textContent = e.message; errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'ورود به حساب';
    }
  };

  window.doRegister = async () => {
    const errEl = document.getElementById('r-error');
    errEl.classList.add('hidden');
    const fname = document.getElementById('r-fname').value.trim();
    const lname = document.getElementById('r-lname').value.trim();
    const phone = document.getElementById('r-phone').value.trim();
    const pass  = document.getElementById('r-pass').value;
    const conf  = document.getElementById('r-confirm').value;
    if (!fname) { errEl.textContent = 'نام را وارد کنید'; errEl.classList.remove('hidden'); return; }
    if (!phone) { errEl.textContent = 'شماره همراه را وارد کنید'; errEl.classList.remove('hidden'); return; }
    if (pass.length < 8) { errEl.textContent = 'رمز عبور حداقل ۸ کاراکتر باشد'; errEl.classList.remove('hidden'); return; }
    if (pass !== conf)  { errEl.textContent = 'رمز عبور و تکرار آن یکسان نیستند'; errEl.classList.remove('hidden'); return; }
    if (!document.getElementById('r-terms').checked) { errEl.textContent = 'قوانین را تأیید کنید'; errEl.classList.remove('hidden'); return; }
    const btn = document.getElementById('r-btn');
    btn.disabled = true; btn.textContent = 'در حال ثبت...';
    try {
      await api.auth.register({ name: `${fname} ${lname}`.trim(), phone, password: pass });
      document.getElementById('header').innerHTML = renderHeader();
      navigate('');
    } catch (e) {
      errEl.textContent = e.message; errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'ساخت حساب';
    }
  };

  /* enter key support */
  ['l-phone','l-pass'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') window.doLogin(); });
  });
}

/* ═══════════════════════════════════════════
   404
═══════════════════════════════════════════ */

function view404() {
  document.getElementById('view').innerHTML = `
    <div class="text-center py-32 text-text-dim">
      <p class="text-7xl font-black text-accent/20 mb-4">404</p>
      <p class="text-xl mb-6">صفحه پیدا نشد</p>
      <button onclick="navigate('')" class="px-8 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-hover">بازگشت به خانه</button>
    </div>`;
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
  /* inject shell */
  document.getElementById('header').innerHTML = renderHeader();
  document.getElementById('footer').innerHTML = renderFooter();

  /* initial cart badge */
  updateCartBadge();

  /* handle hash changes */
  window.addEventListener('hashchange', () => {
    const { view, params } = getRoute();
    render(view + (params.toString() ? '?' + params.toString() : ''));
  });

  /* initial render */
  const { view, params } = getRoute();
  render(view + (params.toString() ? '?' + params.toString() : ''));
});
