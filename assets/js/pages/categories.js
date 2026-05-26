/**
 * pages/categories.js
 * صفحه دسته‌بندی‌ها — #/categories
 */

;(function () {
  'use strict';

  const { hashHref } = DOM;

  function _catCard(c) {
    const slug = c.slug || c.name;
    const img  = c.poster_image
      || c.images?.find(i => i.is_main)?.image_url
      || c.images?.[0]?.image_url
      || 'assets/images/placeholder.png';

    return `
      <a href="${hashHref('shop', { category: slug })}" data-link
         class="relative rounded-2xl overflow-hidden group block" style="height:180px">
        <img src="${img}" alt="${c.name}"
             onerror="this.onerror=null;this.src='assets/images/placeholder.png'"
             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
        <div class="absolute inset-0 bg-gradient-to-t from-[#221114]/90 via-[#221114]/30 to-transparent"></div>
        <div class="absolute bottom-0 left-0 right-0 p-4">
          <h3 class="text-base font-bold text-right">${c.name}</h3>
          ${c.product_count ? `<p class="text-[#c8939c] text-xs text-right mt-0.5">${c.product_count} محصول</p>` : ''}
        </div>
      </a>`;
  }

  Router.onEnter('categories', async function () {
    const grid = document.getElementById('cats-grid');

    try {
      const cats = await API.categories.list();

      if (grid) {
        grid.innerHTML = cats.length
          ? cats.map(_catCard).join('')
          : '<p class="col-span-full text-center text-[rgba(255,255,255,0.6)] py-8">دسته‌بندی‌ای یافت نشد</p>';
      }
    } catch (e) {
      if (grid) grid.innerHTML = `<p class="col-span-full text-[#cf1736] text-center py-8">${e.message}</p>`;
    }

    if (window.lucide) lucide.createIcons();
  });

})();