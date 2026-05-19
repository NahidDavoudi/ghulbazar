/**
 * ╔═══════════════════════════════════════════════════════════╗
 *   Ghul Bazar — pages.js
 *   ادغام تمام page scriptها. هر صفحه با Router.onEnter
 *   ثبت می‌شه و از API.* برای backend استفاده می‌کنه.
 *
 *   وابستگی‌ها (به ترتیب load در app.html):
 *     1. api.js      → window.API
 *     2. router.js   → window.Router
 *     3. app.js      → injectHeader / injectFooter / loadCartCount / productCard / renderStars / addToCart
 *     4. pages.js    ← این فایل
 * ╚═══════════════════════════════════════════════════════════╝
 */

;(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     ابزارهای مشترک بین همه صفحات
  ══════════════════════════════════════════════════════════ */

  /** نمایش/مخفی کردن المان با id */
  function show(id)    { document.getElementById(id)?.classList.remove('hidden'); }
  function hide(id)    { document.getElementById(id)?.classList.add('hidden'); }
  function text(id, t) { const el = document.getElementById(id); if (el) el.textContent = t; }

  /** تبدیل لینک‌های html به hash */
  function hashHref(page, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return qs ? `#/${page}?${qs}` : `#/${page}`;
  }

  /* ══════════════════════════════════════════════════════════
     HOME   #/
  ══════════════════════════════════════════════════════════ */
  Router.onEnter('home', async function () {
    // Featured products
    try {
      const featured = await API.products.list({ featured: 1 });
      const wrap = document.getElementById('featured-wrapper');
      const arr  = Array.isArray(featured) ? featured : (featured.data || []);
      if (wrap && arr.length) {
        wrap.innerHTML = arr.map(p => `<div class="swiper-slide">${productCard(p)}</div>`).join('');
        new Swiper('.featured-swiper', {
          slidesPerView: 1.5, spaceBetween: 12, loop: true,
          navigation: { prevEl: '.swiper-button-prev-feat', nextEl: '.swiper-button-next-feat' },
          breakpoints: { 480:{slidesPerView:2.2}, 640:{slidesPerView:2.5}, 768:{slidesPerView:3}, 1024:{slidesPerView:4} },
        });
      } else {
        document.getElementById('featured-section')?.remove();
      }
    } catch (e) {
      console.warn('Featured products error:', e);
      document.getElementById('featured-section')?.remove();
    }

    // Latest products
    try {
      const data = await API.products.list({ limit: 10 });
      const wrap = document.getElementById('products-wrapper');
      const arr  = data.data || [];
      if (wrap && arr.length) {
        wrap.innerHTML = arr.map(p => `<div class="swiper-slide">${productCard(p)}</div>`).join('');
        new Swiper('.products-swiper', {
          slidesPerView: 1.5, spaceBetween: 12, loop: true,
          navigation: { prevEl: '.swiper-button-prev-prods', nextEl: '.swiper-button-next-prods' },
          breakpoints: { 480:{slidesPerView:2.2}, 640:{slidesPerView:2.5}, 768:{slidesPerView:3}, 1024:{slidesPerView:4} },
        });
      }
    } catch (e) {
      console.warn('Products error:', e);
    }

    if (window.lucide) lucide.createIcons();
  });

  /* ══════════════════════════════════════════════════════════
     SHOP   #/shop
  ══════════════════════════════════════════════════════════ */
  Router.onEnter('shop', async function (params) {
    const { era = '', category = '', sort = '', q = '', featured = '' } = params;

    // نشان دادن / مخفی کردن دکمه پاک کردن فیلتر
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
      if (era || category || q) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }

    // مقدار sort select
    const sortEl = document.getElementById('sort-select');
    if (sortEl && sort) sortEl.value = sort;

    // عنوان صفحه
    const title = era || category || (q ? `جستجو: ${q}` : 'همه محصولات');
    text('desktop-title', title);
    text('page-title', title);

    // sidebar دسته‌بندی‌ها
    try {
      const cats = await API.categories.list();
      const catFilters = document.getElementById('cat-filters');
      if (catFilters) {
        catFilters.innerHTML = cats.map(c => {
          const slug = c.slug || c.name;
          const active = category === slug;
          return `<li>
            <a href="${hashHref('shop', { category: slug })}" data-link
               class="block text-right text-sm py-1 transition-colors ${active ? 'text-[#cf1736] font-bold' : 'text-[rgba(255,255,255,0.6)] hover:text-white'}">
              ${c.name}
            </a>
          </li>`;
        }).join('');
      }
    } catch {}

    // محصولات
    const filters = { limit: 24 };
    if (era)      filters.era      = era;
    if (category) filters.category = category;
    if (sort)     filters.sort     = sort;
    if (q)        filters.q        = q;
    if (featured) filters.featured = featured;

    hide('shop-loading');

    try {
      const data = await API.products.list(filters);
      show('shop-loading');   // نشون بده تا نتیجه بیاد
      hide('shop-loading');   // بعد مخفی کن

      text('product-count', `${data.total || 0} محصول`);

      const grid = document.getElementById('products-grid');
      if (!data.data?.length) {
        show('shop-empty');
        if (grid) grid.innerHTML = '';
      } else {
        hide('shop-empty');
        if (grid) grid.innerHTML = data.data.map(p => productCard(p)).join('');
      }
    } catch (e) {
      const loadEl = document.getElementById('shop-loading');
      if (loadEl) loadEl.innerHTML = `<p class="text-[#cf1736] text-center">${e.message}</p>`;
      show('shop-loading');
    }

    // Sort change
    if (sortEl) {
      // removeEventListener نمی‌تونه anonymous function رو حذف کنه، پس clone می‌کنیم
      const newSort = sortEl.cloneNode(true);
      sortEl.parentNode.replaceChild(newSort, sortEl);
      newSort.value = sort;
      newSort.addEventListener('change', function () {
        Router.go('/shop', { ...params, sort: this.value });
      });
    }

    // Mobile filter toggle
    const filterToggle = document.getElementById('filter-toggle');
    if (filterToggle) {
      const newToggle = filterToggle.cloneNode(true);
      filterToggle.parentNode.replaceChild(newToggle, filterToggle);
      newToggle.addEventListener('click', () => {
        const sidebar = document.getElementById('shop-sidebar');
        sidebar?.classList.toggle('hidden');
        sidebar?.classList.toggle('block');
      });
    }

    if (window.lucide) lucide.createIcons();
  });

  /* ══════════════════════════════════════════════════════════
     PRODUCT   #/product?id=...
  ══════════════════════════════════════════════════════════ */
  let _currentProduct = null;

  // accordion (global چون onclick در HTML داره)
  window.toggleAcc = function (id) {
    const content = document.getElementById(id + '-content');
    const icon    = document.getElementById(id + '-icon');
    const isOpen  = content.style.maxHeight && content.style.maxHeight !== '0px';
    content.style.maxHeight = isOpen ? '0px' : content.scrollHeight + 'px';
    if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
  };

  function _selectOption(btn, group) {
    btn.closest(`[id="${group}"]`).querySelectorAll('button').forEach(b => {
      b.classList.remove('border-[#cf1736]', 'bg-[#cf1736]/10', 'text-white');
      b.classList.add('border-[#47242a]', 'text-[rgba(255,255,255,0.6)]');
    });
    btn.classList.add('border-[#cf1736]', 'bg-[#cf1736]/10', 'text-white');
    btn.classList.remove('border-[#47242a]', 'text-[rgba(255,255,255,0.6)]');
  }

  function _changeImage(btn, src) {
    const mainImg = document.getElementById('main-image');
    if (mainImg) mainImg.src = src;
    document.querySelectorAll('.thumb-btn').forEach(t =>
      t.classList.remove('border-[#cf1736]')
    );
    btn.classList.add('border-[#cf1736]');
  }

  function _renderStars(rating) {
    if (typeof renderStars === 'function') return renderStars(rating);
    const full = Math.round(rating || 5);
    return Array.from({ length: 5 }, (_, i) =>
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="${i < full ? '#cf1736' : 'none'}" stroke="#cf1736" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>`
    ).join('');
  }

  Router.onEnter('products', async function (params) {
    const { id } = params;
    if (!id) { Router.go('/shop'); return; }

    // reset
    hide('product-detail');
    show('product-loading');

    try {
      const p = _currentProduct = await API.products.get(id);

      document.title = `${p.name} | غول بازار`;
      hide('product-loading');
      show('product-detail');

      // Breadcrumb
      const bc = document.getElementById('breadcrumb');
      if (bc) bc.innerHTML = `
        <a href="${hashHref('product', {id: p.id})}" data-link class="text-white">${p.name}</a>
        <span>/</span>
        <a href="${hashHref('shop', {era: p.era})}" data-link class="hover:text-white">${p.era || ''}</a>
        <span>/</span>
        <a href="#/" data-link class="hover:text-white">خانه</a>`;

      // Badges
      let badges = '';
      if (p.badge)     badges += `<span class="bg-[#2d161a] border border-[#47242a] text-[#c8939c] text-xs px-3 py-1 rounded-full">${p.badge}</span>`;
      if (p.stock <= 2) badges += `<span class="bg-[#cf1736]/20 border border-[#cf1736]/30 text-[#cf1736] text-xs px-3 py-1 rounded-full">آخرین موجودی</span>`;
      const badgesEl = document.getElementById('badges');
      if (badgesEl) badgesEl.innerHTML = badges;

      text('product-name', p.name);
      text('product-description', p.description);
      text('product-price', API.utils.formatPrice(p.price));
      text('product-stock', `موجودی: ${p.stock} عدد`);
      text('history-text', p.description);

      const ratingEl = document.getElementById('rating');
      if (ratingEl) ratingEl.innerHTML = `
        <span class="text-[rgba(255,255,255,0.6)] text-sm">(${p.reviews || 0} نظر)</span>
        <div class="flex gap-1">${_renderStars(p.rating || 5)}</div>
        <span class="text-white font-bold">${p.rating || 5}</span>`;

      // تصاویر
      const imgs    = p.images || [];
      const mainSrc = imgs.find(i => i.is_main)?.url || imgs[0]?.url || '';
      const mainImg = document.getElementById('main-image');
      if (mainImg) { mainImg.src = mainSrc; mainImg.alt = p.name; }

      const thumbsEl = document.getElementById('thumbnails');
      if (thumbsEl) {
        thumbsEl.innerHTML = imgs.map((img, i) => `
          <button class="thumb-btn rounded-xl overflow-hidden aspect-square border-2
                         ${i === 0 ? 'border-[#cf1736]' : 'border-transparent'}
                         hover:border-[#c8939c] transition-colors">
            <img src="${img.url}" alt="" class="w-full h-full object-cover">
          </button>`).join('');
        thumbsEl.querySelectorAll('.thumb-btn').forEach((btn, i) => {
          btn.addEventListener('click', () => _changeImage(btn, imgs[i].url));
        });
      }

      // Options
      const options   = p.options || [];
      const chainOpts = options.filter(o => o.option_type === 'chain_length');
      const sizeOpts  = options.filter(o => o.option_type === 'size');

      const chainSec = document.getElementById('chain-section');
      const chainEl  = document.getElementById('chain-options');
      if (chainOpts.length && chainSec && chainEl) {
        chainSec.classList.remove('hidden');
        chainEl.innerHTML = chainOpts.map((o, i) => `
          <button class="px-4 py-2.5 rounded-lg border text-sm font-medium transition-all
                         ${i === 0 ? 'border-[#cf1736] bg-[#cf1736]/10 text-white' : 'border-[#47242a] text-[rgba(255,255,255,0.6)] hover:border-[#c8939c]'}">
            ${o.option_value}
          </button>`).join('');
        chainEl.querySelectorAll('button').forEach(btn =>
          btn.addEventListener('click', () => _selectOption(btn, 'chain-options'))
        );
      }

      const sizeSec = document.getElementById('size-section');
      const sizeEl  = document.getElementById('size-options');
      if (sizeOpts.length && sizeSec && sizeEl) {
        sizeSec.classList.remove('hidden');
        sizeEl.innerHTML = sizeOpts.map((o, i) => `
          <button class="px-4 py-2.5 rounded-lg border text-sm font-medium transition-all
                         ${i === 0 ? 'border-[#cf1736] bg-[#cf1736]/10 text-white' : 'border-[#47242a] text-[rgba(255,255,255,0.6)] hover:border-[#c8939c]'}">
            ${o.option_value}
          </button>`).join('');
        sizeEl.querySelectorAll('button').forEach(btn =>
          btn.addEventListener('click', () => _selectOption(btn, 'size-options'))
        );
      }

      // Add to cart
      const addBtn = document.getElementById('add-to-cart-btn');
      if (addBtn) {
        const newBtn = addBtn.cloneNode(true);
        addBtn.parentNode.replaceChild(newBtn, addBtn);
        newBtn.addEventListener('click', async function () {
          try {
            this.disabled = true;
            // گزینه‌های انتخاب‌شده
            const options = {};
            chainEl?.querySelector('button.border-\\[\\#cf1736\\]')
              && (options.chain_length = chainEl.querySelector('button.border-\\[\\#cf1736\\]').textContent.trim());
            sizeEl?.querySelector('button.border-\\[\\#cf1736\\]')
              && (options.size = sizeEl.querySelector('button.border-\\[\\#cf1736\\]').textContent.trim());

            await API.cart.add(p.id, 1, options);
            loadCartCount?.();

            const toast = document.getElementById('added-toast');
            if (toast) toast.classList.remove('hidden');
            this.textContent = '✓ اضافه شد';
            setTimeout(() => {
              this.innerHTML = 'افزودن به مجموعه';
              this.disabled = false;
            }, 2000);
          } catch (e) {
            API.utils.toast(e.message, 'error');
            this.disabled = false;
          }
        });
      }

      // Related products
      if (p.related?.length) {
        const relSec = document.getElementById('related-section');
        const relWrap = document.getElementById('related-wrapper');
        if (relSec && relWrap) {
          relSec.classList.remove('hidden');
          relWrap.innerHTML = p.related.map(r =>
            `<div class="swiper-slide">${productCard(r)}</div>`
          ).join('');
          new Swiper('.related-swiper', {
            slidesPerView: 1.8, spaceBetween: 12,
            breakpoints: { 480:{slidesPerView:2.2}, 640:{slidesPerView:3}, 1024:{slidesPerView:4, spaceBetween:20} },
          });
        }
      }

    } catch (e) {
      const loadEl = document.getElementById('product-loading');
      if (loadEl) loadEl.innerHTML = `<p class="text-[#cf1736] text-xl text-center">${e.message}</p>`;
    }
  });

  /* ══════════════════════════════════════════════════════════
     CATEGORIES   #/categories
  ══════════════════════════════════════════════════════════ */
  const ERA_IMGS = {
    'دوران ویکتوریا': './assets/products/img12.jpg',
    'دوران ادوارد':   './assets/products/img11.jpg',
    'آرت دکو':        './assets/products/img10.jpg',
    'رترو ۱۹۴۰':     './assets/products/img9.jpg',
    'بلا اپوک':       './assets/products/img8.jpg',
  };
  const CAT_IMGS = {
    'rings':     './assets/products/img7.jpg',
    'necklaces': './assets/products/img6.jpg',
    'earrings':  './assets/products/img5.jpg',
    'bracelets': './assets/products/img4.jpg',
    'brooches':  './assets/products/img3.jpg',
  };

  function _eraCard(e) {
    const img = ERA_IMGS[e.era] || './assets/products/img1.jpg';
    return `
      <a href="${hashHref('shop', { era: e.era })}" data-link
         class="relative rounded-2xl overflow-hidden group block" style="height:220px">
        <img src="${img}" alt="${e.era}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
        <div class="absolute inset-0 bg-gradient-to-t from-[#221114]/90 via-[#221114]/20 to-transparent"></div>
        <div class="absolute bottom-0 left-0 right-0 p-4">
          <h3 class="text-lg font-bold text-right mb-1">${e.era}</h3>
          <p class="text-[#c8939c] text-xs text-right">${e.count} محصول ←</p>
        </div>
      </a>`;
  }

  function _catCard(c) {
    const slug = c.slug || c.name;
    const img  = CAT_IMGS[slug] || './assets/products/img12.jpg';
    return `
      <a href="${hashHref('shop', { category: slug })}" data-link
         class="relative rounded-2xl overflow-hidden group block" style="height:180px">
        <img src="${img}" alt="${c.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
        <div class="absolute inset-0 bg-gradient-to-t from-[#221114]/90 via-[#221114]/30 to-transparent"></div>
        <div class="absolute bottom-0 left-0 right-0 p-4">
          <h3 class="text-base font-bold text-right">${c.name}</h3>
        </div>
      </a>`;
  }

  Router.onEnter('categories', async function () {
    try {
      const [eras, cats] = await Promise.all([API.eras.list(), API.categories.list()]);

      const erasEl = document.getElementById('eras-grid');
      if (erasEl) {
        erasEl.innerHTML = eras.length
          ? eras.map(_eraCard).join('')
          : '<p class="col-span-full text-center text-[rgba(255,255,255,0.6)] py-8">دوره‌ای یافت نشد</p>';
      }

      const catsEl = document.getElementById('cats-grid');
      if (catsEl) {
        catsEl.innerHTML = cats.length
          ? cats.map(_catCard).join('')
          : '<p class="col-span-full text-center text-[rgba(255,255,255,0.6)] py-8">دسته‌بندی‌ای یافت نشد</p>';
      }
    } catch (e) {
      const erasEl = document.getElementById('eras-grid');
      if (erasEl) erasEl.innerHTML = `<p class="col-span-full text-[#cf1736] text-center py-8">${e.message}</p>`;
    }

    if (window.lucide) lucide.createIcons();
  });

  /* ══════════════════════════════════════════════════════════
     CART   #/cart
  ══════════════════════════════════════════════════════════ */
  let _cartData     = null;
  let _cartDiscount = null;

  function _renderCart(data) {
    const shipping = data.total >= 1500000 ? 0 : 50000;
    const { discountAmount, total: finalTotal } = API.utils.applyDiscount(
      data.total + shipping,
      _cartDiscount ? { type: _cartDiscount.type, value: _cartDiscount.value } : null
    );
    // تصحیح: تخفیف روی subtotal، نه subtotal+shipping
    const discAmt   = _cartDiscount
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
               onerror="this.src='https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop'">
          <div class="flex-1 text-right min-w-0">
            <h3 class="font-medium mb-1 truncate">
              <a href="${hashHref('product', {id: item.id})}" data-link class="hover:text-[#c8939c]">${item.name}</a>
            </h3>
            <p class="text-[#cf1736] font-bold mt-1">${API.utils.formatPrice(item.price)}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button data-remove="${item.id}"
                    class="w-8 h-8 rounded border border-[#47242a] text-[rgba(255,255,255,0.6)] hover:border-red-500 hover:text-red-400 transition-colors text-sm">✕</button>
            <input type="number" value="${item.qty}" min="1" max="10"
                   data-update="${item.id}"
                   class="w-14 bg-[#221114] border border-[#47242a] rounded px-2 py-1 text-center text-sm">
          </div>
        </div>`).join('');

      // event delegation
      cartItemsEl.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', () => _cartRemove(btn.dataset.remove));
      });
      cartItemsEl.querySelectorAll('[data-update]').forEach(inp => {
        inp.addEventListener('change', () => _cartUpdate(inp.dataset.update, inp.value));
      });
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

  Router.onEnter('cart', async function () {
    _cartDiscount = null;
    show('cart-loading');
    hide('empty-cart');
    hide('cart-content');
    await _loadCart();

    // کد تخفیف — clone برای حذف listener قبلی
    const applyBtn = document.getElementById('apply-discount');
    if (applyBtn) {
      const newBtn = applyBtn.cloneNode(true);
      applyBtn.parentNode.replaceChild(newBtn, applyBtn);
      newBtn.addEventListener('click', async () => {
        const code = document.getElementById('discount-input')?.value.trim();
        const msg  = document.getElementById('discount-msg');
        if (!code) return;
        try {
          _cartDiscount = await API.discounts.validate(code);
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

  /* ══════════════════════════════════════════════════════════
     CHECKOUT   #/checkout
  ══════════════════════════════════════════════════════════ */
  let _checkoutCart     = null;
  let _checkoutDiscount = null;

  function _renderCheckoutSummary() {
    if (!_checkoutCart) return;
    const shipping = _checkoutCart.total >= 1500000 ? 0 : 50000;
    const discAmt  = _checkoutDiscount
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

      const items = _checkoutCart.items.map(i => ({
        product_id: i.id,
        qty:        i.qty,
      }));

      const result = await API.orders.create({
        customer_name:    name,
        customer_phone:   phone,
        shipping_address: address,
        items,
        ...(discountCode ? { discount_code: discountCode } : {}),
      });

      await API.cart.clear();
      loadCartCount?.();

      // ذخیره برای صفحه پرداخت
      sessionStorage.setItem('gb_checkout', JSON.stringify({
        ...result,
        customer_name: name, customer_phone: phone, shipping_address: address,
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

    // Submit
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      const newBtn = submitBtn.cloneNode(true);
      submitBtn.parentNode.replaceChild(newBtn, submitBtn);
      newBtn.addEventListener('click', _submitOrder);
    }

    // کد تخفیف
    const applyBtn = document.getElementById('checkout-apply-discount');
    if (applyBtn) {
      const newBtn = applyBtn.cloneNode(true);
      applyBtn.parentNode.replaceChild(newBtn, applyBtn);
      newBtn.addEventListener('click', async () => {
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

  /* ══════════════════════════════════════════════════════════
     PAYMENT   #/payment
  ══════════════════════════════════════════════════════════ */
  let _selectedReceiptFile = null;

  // global برای onclick در HTML
  window.handleFile = function (input) {
    const f = input.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      const err = document.getElementById('upload-error');
      if (err) { err.textContent = 'حجم فایل بیش از ۵ مگابایت است'; err.classList.remove('hidden'); }
      input.value = '';
      return;
    }
    _selectedReceiptFile = f;
    hide('upload-ph');
    show('upload-preview');
    text('file-name', f.name);
    hide('upload-error');
  };

  window.submitReceipt = async function () {
    const orderNumber = document.getElementById('payment-order-number')?.textContent.trim();
    const errEl = document.getElementById('upload-error');
    const btn   = document.getElementById('submit-receipt-btn');

    if (!_selectedReceiptFile) {
      if (errEl) { errEl.textContent = 'لطفاً تصویر رسید را انتخاب کنید'; errEl.classList.remove('hidden'); }
      return;
    }
    if (!orderNumber || orderNumber === '-') {
      if (errEl) { errEl.textContent = 'شماره سفارش نامعتبر است'; errEl.classList.remove('hidden'); }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'در حال ارسال...'; }
    if (errEl) errEl.classList.add('hidden');

    try {
      await API.payment.uploadReceipt(orderNumber, _selectedReceiptFile);
      sessionStorage.removeItem('gb_checkout');
      API.utils.toast('رسید با موفقیت ثبت شد. سفارش شما در دست بررسی است.', 'success', 4000);
      setTimeout(() => Router.go('/'), 2500);
    } catch (e) {
      if (errEl) { errEl.textContent = e.message || 'خطا در ارسال رسید'; errEl.classList.remove('hidden'); }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'ارسال رسید'; }
    }
  };

  window.copyText = function (elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    navigator.clipboard.writeText(el.textContent.trim()).then(() => {
      const toast = document.getElementById('copy-toast');
      if (toast) { toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 2000); }
    }).catch(() => API.utils.toast('متن کپی نشد!', 'error'));
  };

  Router.onEnter('payment', function () {
    _selectedReceiptFile = null;

    // reset فرم
    const ph = document.getElementById('upload-ph');
    const pr = document.getElementById('upload-preview');
    if (ph) ph.classList.remove('hidden');
    if (pr) pr.classList.add('hidden');
    hide('upload-error');

    // بارگذاری اطلاعات سفارش از sessionStorage
    try {
      const orderData = JSON.parse(sessionStorage.getItem('gb_checkout') || '{}');
      text('payment-order-number', orderData.order_number || '-');
      text('payment-total-amount',
        orderData.total_amount
          ? API.utils.formatPrice(orderData.total_amount)
          : '—'
      );
    } catch (e) {
      console.error('خطا در خواندن اطلاعات سفارش:', e);
    }
  });

  /* ══════════════════════════════════════════════════════════
     ORDERS   #/orders
  ══════════════════════════════════════════════════════════ */
  const ORDERS_PER_PAGE = 8;
  let _allOrders    = [];
  let _ordersPage   = 1;

  const ORDER_STATUS = {
    pending:   { label:'در انتظار تأیید',   cls:'border-yellow-700/50 text-yellow-300 bg-yellow-900/20' },
    paid:      { label:'تأیید پرداخت',      cls:'border-blue-700/50 text-blue-300 bg-blue-900/20' },
    shipped:   { label:'ارسال شده',          cls:'border-[#cf1736]/50 text-[#cf1736] bg-[#cf1736]/10' },
    delivered: { label:'تحویل داده شده',    cls:'border-green-700/50 text-green-300 bg-green-900/20' },
    cancelled: { label:'لغو شده',           cls:'border-[#47242a] text-[rgba(255,255,255,0.6)] bg-[#3a1f24]/50' },
  };

  function _orderBadge(status) {
    const s = ORDER_STATUS[status] || { label: status, cls:'border-[#47242a] text-[rgba(255,255,255,0.6)] bg-[#3a1f24]/50' };
    return `<span class="badge border ${s.cls}">${s.label}</span>`;
  }

  function _renderOrdersTable() {
    const start = (_ordersPage - 1) * ORDERS_PER_PAGE;
    const page  = _allOrders.slice(start, start + ORDERS_PER_PAGE);

    const tbody = document.getElementById('orders-table');
    if (!tbody) return;

    tbody.innerHTML = page.map(o => {
      const dim  = ['delivered', 'cancelled'].includes(o.status) ? 'opacity-60' : '';
      const imgs = (o.items || []).slice(0, 3).map(i =>
        `<img src="${i.image || ''}" alt="${i.name || ''}"
              class="inline-block w-8 h-8 rounded-lg object-cover ring-2 ring-[#221114] ${dim}"
              onerror="this.src=''">`
      ).join('');
      const date = o.created_at
        ? new Date(o.created_at).toLocaleDateString('fa-IR')
        : '—';
      return `
        <tr class="hover:bg-[#3a1f24]/30 transition-colors">
          <td class="py-4 px-5 font-mono text-sm ${dim || 'text-white'} whitespace-nowrap">#${o.order_number}</td>
          <td class="py-4 px-5 text-sm text-[rgba(255,255,255,0.6)] whitespace-nowrap">${date}</td>
          <td class="py-4 px-5 hidden sm:table-cell"><div class="flex -space-x-2 space-x-reverse">${imgs || '—'}</div></td>
          <td class="py-4 px-5 font-bold text-sm ${dim || 'text-white'} whitespace-nowrap">${Number(o.total_amount || 0).toLocaleString('fa-IR')} تومان</td>
          <td class="py-4 px-5 whitespace-nowrap">${_orderBadge(o.status)}</td>
          <td class="py-4 px-5">
            <a href="${hashHref('product', {id: o.id})}" data-link
               class="text-xs text-[#c8939c] hover:text-[#cf1736] transition-colors font-medium">
              جزئیات ←
            </a>
          </td>
        </tr>`;
    }).join('');

    const total = _allOrders.length;
    const pages = Math.ceil(total / ORDERS_PER_PAGE);
    const infoEl = document.getElementById('pagination-info');
    if (infoEl) {
      infoEl.textContent = `نمایش ${(start + 1).toLocaleString('fa-IR')} تا ${Math.min(start + ORDERS_PER_PAGE, total).toLocaleString('fa-IR')} از ${total.toLocaleString('fa-IR')}`;
    }

    const navEl = document.getElementById('pagination-nav');
    if (navEl) {
      let nav = '';
      nav += `<button data-page="${_ordersPage - 1}" ${_ordersPage === 1 ? 'disabled' : ''} class="w-7 h-7 rounded-lg border border-[#47242a] text-[rgba(255,255,255,0.6)] hover:border-[#cf1736]/40 disabled:opacity-30 text-xs transition-colors">‹</button>`;
      for (let p = 1; p <= pages; p++) {
        nav += `<button data-page="${p}" class="w-7 h-7 rounded-lg border text-xs transition-colors ${p === _ordersPage ? 'border-[#cf1736] bg-[#cf1736]/20 text-white' : 'border-[#47242a] text-[rgba(255,255,255,0.6)] hover:border-[#cf1736]/40'}">${p.toLocaleString('fa-IR')}</button>`;
      }
      nav += `<button data-page="${_ordersPage + 1}" ${_ordersPage === pages ? 'disabled' : ''} class="w-7 h-7 rounded-lg border border-[#47242a] text-[rgba(255,255,255,0.6)] hover:border-[#cf1736]/40 disabled:opacity-30 text-xs transition-colors">›</button>`;
      navEl.innerHTML = nav;

      // event delegation برای pagination
      navEl.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p   = parseInt(btn.dataset.page);
          const max = Math.ceil(_allOrders.length / ORDERS_PER_PAGE);
          _ordersPage = Math.max(1, Math.min(p, max));
          _renderOrdersTable();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    }
  }

  Router.onEnter('orders', async function () {
    _ordersPage = 1;

    // reset
    show('orders-loading');
    hide('need-login');
    hide('empty-orders');
    hide('orders-content');

    if (!API.auth.isLoggedIn()) {
      hide('orders-loading');
      show('need-login');
      return;
    }

    try {
      const data = await API.orders.list();
      hide('orders-loading');
      const orders = Array.isArray(data) ? data : (data.data || data.orders || []);

      if (!orders.length) { show('empty-orders'); return; }

      _allOrders = orders;
      show('orders-content');

      const active   = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
      const totalAmt = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
      text('stat-active', active.toLocaleString('fa-IR'));
      text('stat-total',  orders.length.toLocaleString('fa-IR'));
      text('stat-amount', totalAmt.toLocaleString('fa-IR') + ' تومان');

      _renderOrdersTable();
    } catch (e) {
      const el = document.getElementById('orders-loading');
      if (el) el.innerHTML = `<p class="text-red-400 text-center">${e.message}</p>`;
    }
  });

})();