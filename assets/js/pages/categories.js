/**
 * pages/categories.js
 * صفحه دسته‌بندی‌ها — #/categories
 *
 * وابستگی‌ها:
 *   api.js → window.API
 *   router.js → window.Router
 *   utils/dom.js → window.DOM
 */

;(function () {
  'use strict';

  const { hashHref } = DOM;

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
    const img  = c.poster_image
      || c.images?.find(i => i.is_main)?.image_url
      || c.images?.[0]?.image_url
      || CAT_IMGS[slug]
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
        </div>
      </a>`;
  }

  Router.onEnter('categories', async function () {
    try {
      const cats   = await API.categories.list();
      const catsEl = document.getElementById('cats-grid');
      if (catsEl) {
        catsEl.innerHTML = cats.length
          ? cats.map(_catCard).join('')
          : '<p class="col-span-full text-center text-[rgba(255,255,255,0.6)] py-8">دسته‌بندی‌ای یافت نشد</p>';
      }
    } catch (e) {
      const catsEl = document.getElementById('cats-grid');
      if (catsEl) catsEl.innerHTML = `<p class="col-span-full text-[#cf1736] text-center py-8">${e.message}</p>`;
    }

    if (window.lucide) lucide.createIcons();
  });

})();