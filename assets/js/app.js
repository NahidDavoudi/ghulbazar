/**
 * ╔═══════════════════════════════════════════════════════════╗
 *   Ghul Bazar — app.js  (frontend)
 *   مشترک بین همه صفحات SPA. باید قبل از pages.js لود بشه.
 *
 *   چیزهایی که export می‌کنه (روی window):
 *     injectHeader()      ← هدر را داخل #app-header می‌ریزه
 *     injectFooter()      ← فوتر را داخل #app-footer می‌ریزه
 *     loadCartCount()     ← تعداد سبد رو در هدر بروز می‌کنه
 *     productCard(p)      ← HTML کارت محصول برمی‌گردونه
 *     renderStars(rating) ← HTML ستاره‌ها برمی‌گردونه
 *     addToCart(id)       ← کمک‌تابع افزودن به سبد
 *
 *   وابستگی: api.js و router.js باید قبلاً لود شده باشن.
 * ╚═══════════════════════════════════════════════════════════╝
 */

;(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     هدر
  ══════════════════════════════════════════════════════════ */
  const NAV_LINKS = [
    { href: '#/',           label: 'خانه'        },
    { href: '#/shop',       label: 'فروشگاه'     },
    { href: '#/categories', label: 'دسته‌بندی‌ها' },
    { href: '#/orders',     label: 'سفارشات'     },
  ];

  function _buildHeader() {
    const user      = API.auth.currentUser();
    const loggedIn  = API.auth.isLoggedIn();

    const navItems = NAV_LINKS.map(l => `
      <a href="${l.href}" data-link
         class="text-sm text-[rgba(255,255,255,0.7)] hover:text-white transition-colors
                px-1 py-0.5 rounded hover:bg-white/5 header-nav-link">
        ${l.label}
      </a>`).join('');

    const userArea = loggedIn
      ? `<div class="flex items-center gap-3">
           <span class="text-xs text-[rgba(255,255,255,0.5)] hidden sm:inline">
             ${user?.name || user?.phone || ''}
           </span>
           <button id="header-logout-btn"
                   class="text-xs text-[rgba(255,255,255,0.5)] hover:text-[#cf1736] transition-colors">
             خروج
           </button>
         </div>`
      : `<a href="login.html"
            class="text-xs px-4 py-2 border border-[#47242a] rounded-lg text-[rgba(255,255,255,0.6)]
                   hover:border-[#cf1736] hover:text-white transition-all">
           ورود
         </a>`;

    return `
      <header class="sticky top-0 z-50 bg-[#221114]/90 backdrop-blur-md border-b border-[#47242a]">
        <div class="max-w-[1280px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">

          <!-- لوگو -->
          <a href="#/" data-link class="flex items-center gap-2 shrink-0">
            <img src="assets/images/logo.png" alt="غول بازار"
                 class="w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(207,23,54,0.5)]">
            <span class="font-display text-lg text-white tracking-wider hidden sm:inline">غول بازار</span>
          </a>

          <!-- ناوبری (دسکتاپ) -->
          <nav class="hidden md:flex items-center gap-1">
            ${navItems}
          </nav>

          <!-- سمت راست: سبد + یوزر -->
          <div class="flex items-center gap-3">
            <!-- سبد خرید -->
            <a href="#/cart" data-link
               class="relative w-9 h-9 flex items-center justify-center rounded-lg
                      hover:bg-white/5 transition-colors group">
              <svg width="20" height="20" viewBox="0 0 16 20" fill="none"
                   class="text-[rgba(255,255,255,0.7)] group-hover:text-white transition-colors">
                <path d="M3 1L1 5V17C1 18.1 1.9 19 3 19H13C14.1 19 15 18.1 15 17V5L13 1H3Z"
                      stroke="currentColor" stroke-width="1.5"/>
                <path d="M1 5H15" stroke="currentColor" stroke-width="1.5"/>
                <path d="M11 9C11 10.7 9.7 12 8 12C6.3 12 5 10.7 5 9"
                      stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <span id="cart-badge"
                    class="hidden absolute -top-1 -right-1 w-4 h-4 bg-[#cf1736] text-white
                           text-[10px] font-bold rounded-full flex items-center justify-center">
                0
              </span>
            </a>

            <!-- یوزر / ورود -->
            ${userArea}

            <!-- همبرگر موبایل -->
            <button id="mobile-menu-btn"
                    class="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors">
              <svg width="18" height="14" fill="none" viewBox="0 0 18 14">
                <path d="M1 1h16M1 7h16M1 13h16" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- منوی موبایل -->
        <div id="mobile-menu"
             class="hidden md:hidden bg-[#2d161a] border-t border-[#47242a] px-4 py-3">
          <nav class="flex flex-col gap-1">
            ${NAV_LINKS.map(l => `
              <a href="${l.href}" data-link
                 class="py-2 px-3 rounded-lg text-sm text-[rgba(255,255,255,0.7)]
                        hover:bg-white/5 hover:text-white transition-colors">
                ${l.label}
              </a>`).join('')}
          </nav>
        </div>
      </header>`;
  }

  window.injectHeader = function () {
    const container = document.getElementById('app-header');
    if (!container) return;
    container.innerHTML = _buildHeader();

    // active link highlight
    function _highlightNav() {
      const hash = location.hash.split('?')[0];
      container.querySelectorAll('.header-nav-link').forEach(a => {
        const match = a.getAttribute('href').split('?')[0] === hash ||
                      (hash === '' && a.getAttribute('href') === '#/');
        a.classList.toggle('text-white', match);
        a.classList.toggle('text-[rgba(255,255,255,0.7)]', !match);
      });
    }
    _highlightNav();
    window.addEventListener('hashchange', _highlightNav);

    // logout
    document.getElementById('header-logout-btn')?.addEventListener('click', () => {
      API.auth.logout();
    });

    // همبرگر موبایل
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      document.getElementById('mobile-menu')?.classList.toggle('hidden');
    });

    // بستن منوی موبایل با کلیک روی لینک
    container.querySelectorAll('#mobile-menu a[data-link]').forEach(a => {
      a.addEventListener('click', () => {
        document.getElementById('mobile-menu')?.classList.add('hidden');
      });
    });

    // lucide
    if (window.lucide) lucide.createIcons();
  };

  /* ══════════════════════════════════════════════════════════
     فوتر
  ══════════════════════════════════════════════════════════ */
  window.injectFooter = function () {
    const container = document.getElementById('app-footer');
    if (!container) return;
    container.innerHTML = `
      <footer class="border-t border-[#47242a] bg-[#221114] mt-20">
        <div class="max-w-[1280px] mx-auto px-4 md:px-6 py-12">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

            <!-- برند -->
            <div class="text-right">
              <div class="flex items-center gap-2 justify-end mb-4">
                <span class="font-display text-lg text-white">غول بازار</span>
                <img src="assets/images/logo.png" alt="" class="w-8 h-8 object-contain">
              </div>
              <p class="text-sm text-[rgba(255,255,255,0.5)] leading-relaxed">
                مرجع اصلی خرید و فروش اکسسوری‌های سورئال و قدمت‌دار. هر قطعه یک داستان.
              </p>
            </div>

            <!-- لینک‌ها -->
            <div class="text-right">
              <h3 class="text-sm font-bold text-white mb-4">دسترسی سریع</h3>
              <ul class="space-y-2">
                ${NAV_LINKS.map(l => `
                  <li>
                    <a href="${l.href}" data-link
                       class="text-sm text-[rgba(255,255,255,0.5)] hover:text-white transition-colors">
                      ${l.label}
                    </a>
                  </li>`).join('')}
              </ul>
            </div>

            <!-- تماس -->
            <div class="text-right">
              <h3 class="text-sm font-bold text-white mb-4">تماس با ما</h3>
              <p class="text-sm text-[rgba(255,255,255,0.5)] mb-2">پشتیبانی ۷ روز هفته</p>
              <p class="text-sm text-[rgba(255,255,255,0.7)]" dir="ltr">@ghulbazar</p>
            </div>
          </div>

          <div class="border-t border-[#47242a] pt-6 flex flex-col sm:flex-row
                      items-center justify-between gap-3 text-xs text-[rgba(255,255,255,0.3)]">
            <p>© ۱۴۰۴ غول بازار — تمام حقوق محفوظ است</p>
            <div class="flex gap-4">
              <a href="#" class="hover:text-white transition-colors">قوانین</a>
              <a href="#" class="hover:text-white transition-colors">حریم خصوصی</a>
            </div>
          </div>
        </div>
      </footer>`;
  };

  /* ══════════════════════════════════════════════════════════
     تعداد سبد خرید
  ══════════════════════════════════════════════════════════ */
  window.loadCartCount = async function () {
    try {
      const data  = await API.cart.get();
      const count = data?.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0;
      const badge = document.getElementById('cart-badge');
      if (!badge) return;
      if (count > 0) {
        badge.textContent = count > 99 ? '۹۹+' : count.toLocaleString('fa-IR');
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    } catch {
      // سبد در دسترس نیست (مثلاً لاگین نیست) — badge مخفی
      document.getElementById('cart-badge')?.classList.add('hidden');
    }
  };

  /* ══════════════════════════════════════════════════════════
     کارت محصول (مشترک بین home، shop، related)
  ══════════════════════════════════════════════════════════ */
  window.productCard = function (p) {
    const img     = p.images?.find(i => i.is_main)?.url || p.images?.[0]?.url || p.image || '';
    const price   = API.utils.formatPrice(p.price);
    const href    = `#/product?id=${p.id}`;
    const badge   = p.badge
      ? `<span class="absolute top-3 right-3 bg-[#cf1736] text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
           ${p.badge}
         </span>`
      : '';
    const lowStock = p.stock <= 2 && p.stock > 0
      ? `<span class="absolute top-3 left-3 bg-black/60 text-[#cf1736] text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
           آخرین موجودی
         </span>`
      : '';
    const outOfStock = p.stock === 0
      ? `<div class="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl z-10">
           <span class="text-sm text-[rgba(255,255,255,0.7)] font-medium">ناموجود</span>
         </div>`
      : '';

    return `
      <a href="${href}" data-link
         class="group block bg-[#2d161a] border border-[#47242a] rounded-xl overflow-hidden
                hover:border-[#cf1736]/40 transition-all duration-300
                hover:shadow-[0_8px_30px_rgba(207,23,54,0.12)]">
        <div class="relative aspect-square overflow-hidden">
          ${badge}${lowStock}${outOfStock}
          <img src="${img}" alt="${p.name}"
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
               onerror="this.src='https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop'">
        </div>
        <div class="p-3 md:p-4 text-right">
          <p class="text-xs text-[#c8939c] mb-1 truncate">${p.era || p.category_name || ''}</p>
          <h3 class="text-sm font-medium text-white mb-2 line-clamp-2 leading-snug">${p.name}</h3>
          <div class="flex items-center justify-between">
            <button
              class="add-to-cart-quick w-7 h-7 rounded-lg bg-[#cf1736]/0 border border-[#47242a]
                     flex items-center justify-center text-[rgba(255,255,255,0.4)]
                     hover:bg-[#cf1736] hover:border-[#cf1736] hover:text-white
                     transition-all text-sm"
              data-product-id="${p.id}"
              title="افزودن به سبد"
              ${p.stock === 0 ? 'disabled' : ''}>
              +
            </button>
            <span class="text-sm font-bold text-white">${price}</span>
          </div>
        </div>
      </a>`;
  };

  /* ══════════════════════════════════════════════════════════
     event delegation برای دکمه‌های سریع "افزودن به سبد"
     که روی کارت‌های محصول هستن
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('click', async function (e) {
    const btn = e.target.closest('.add-to-cart-quick');
    if (!btn || btn.disabled) return;
    e.preventDefault();
    e.stopPropagation();

    const id = btn.dataset.productId;
    if (!id) return;

    const orig = btn.textContent;
    btn.disabled    = true;
    btn.textContent = '✓';
    btn.classList.add('bg-[#cf1736]', 'border-[#cf1736]', 'text-white');

    try {
      await API.cart.add(id, 1);
      loadCartCount();
      API.utils.toast('به سبد اضافه شد', 'success', 2000);
    } catch (err) {
      API.utils.toast(err.message, 'error');
    }

    setTimeout(() => {
      btn.disabled    = false;
      btn.textContent = orig;
      btn.classList.remove('bg-[#cf1736]', 'border-[#cf1736]', 'text-white');
    }, 1800);
  });

  /* ══════════════════════════════════════════════════════════
     ستاره‌ها
  ══════════════════════════════════════════════════════════ */
  window.renderStars = function (rating) {
    const full = Math.round(rating || 0);
    return Array.from({ length: 5 }, (_, i) => `
      <svg width="13" height="13" viewBox="0 0 24 24"
           fill="${i < full ? '#cf1736' : 'none'}"
           stroke="#cf1736" stroke-width="2">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
      </svg>`).join('');
  };

  /* ══════════════════════════════════════════════════════════
     کمک‌تابع addToCart (برای استفاده در products.js legacy)
  ══════════════════════════════════════════════════════════ */
  window.addToCart = async function (productId, qty = 1, options = {}) {
    return API.cart.add(productId, qty, options);
  };

  /* ══════════════════════════════════════════════════════════
     راه‌اندازی اولیه: هدر، فوتر، سبد
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    injectHeader();
    injectFooter();
    loadCartCount();
  });

  /* ══════════════════════════════════════════════════════════
     بازسازی هدر بعد از هر navigation
     (برای بروز کردن active link و وضعیت login)
  ══════════════════════════════════════════════════════════ */
  window.addEventListener('hashchange', function () {
    // فقط active highlight؛ rebuild کامل لازم نیست
    // (اگه logout/login بشه، هدر از طریق API.auth.logout rebuild میشه)
  });

})();