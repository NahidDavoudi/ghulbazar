/**
 * pages/shop.js
 * صفحه فروشگاه — #/shop
 *
 * وابستگی‌ها:
 *   api.js → window.API
 *   router.js → window.Router
 *   app.js → productCard
 *   utils/dom.js → window.DOM
 */

;(function () {
  'use strict';

  const { show, hide, text, hashHref, reclone } = DOM;

  Router.onEnter('shop', async function (params) {
    const { era = '', category = '', sort = '', q = '', featured = '' } = params;

    // دکمه پاک‌کردن فیلترها
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', !(era || category || q));
    }

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
          const slug   = c.slug || c.name;
          const active = category === slug;
          return `<li>
            <a href="${hashHref('shop', { category: slug })}" data-link
               class="block text-right text-sm py-1 transition-colors
                      ${active ? 'text-[#cf1736] font-bold' : 'text-[rgba(255,255,255,0.6)] hover:text-white'}">
              ${c.name}
            </a>
          </li>`;
        }).join('');
      }
    } catch {}

    // ساخت فیلترها
    const filters = { limit: 24 };
    if (era)      filters.era      = era;
    if (category) filters.category = category;
    if (sort)     filters.sort     = sort;
    if (q)        filters.q        = q;
    if (featured) filters.featured = featured;

    // بارگذاری محصولات
    show('shop-loading');
    try {
      const data = await API.products.list(filters);
      hide('shop-loading');

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
    }

    // Sort select — reclone برای حذف listener قبلی
    const sortEl = document.getElementById('sort-select');
    if (sortEl && sort) sortEl.value = sort;

    const newSort = reclone('sort-select');
    if (newSort) {
      newSort.value = sort;
      newSort.addEventListener('change', function () {
        Router.go('/shop', { ...params, sort: this.value });
      });
    }

    // Mobile filter toggle
    function closeSidebar() {
      const sidebar  = document.getElementById('shop-sidebar');
      const backdrop = document.getElementById('sidebar-backdrop');
      sidebar?.classList.remove('sidebar-open');
      backdrop?.classList.remove('open');
      document.body.style.overflow = '';
    }

    const newToggle = reclone('filter-toggle');
    if (newToggle) {
      newToggle.addEventListener('click', () => {
        const sidebar  = document.getElementById('shop-sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        sidebar?.classList.add('sidebar-open');
        backdrop?.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    }

    // بستن sidebar با backdrop یا دکمه X
    document.getElementById('sidebar-backdrop')?.addEventListener('click', closeSidebar);
    const closeBtn = document.getElementById('sidebar-close');
    if (closeBtn) {
      closeBtn.removeEventListener('click', closeSidebar);
      closeBtn.addEventListener('click', closeSidebar);
    }

    // بستن sidebar بعد از انتخاب فیلتر در موبایل
    document.getElementById('cat-filters')?.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        if (window.innerWidth < 768) closeSidebar();
      });
    });

    if (window.lucide) lucide.createIcons();
  });

})();