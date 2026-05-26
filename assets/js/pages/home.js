/**
 * pages/home.js
 * صفحه اصلی — #/
 *
 * وابستگی‌ها (به ترتیب load):
 *   api.js → window.API
 *   router.js → window.Router
 *   app.js → productCard
 */

;(function () {
  'use strict';

  const SWIPER_DEFAULTS = {
    slidesPerView: 1.5,
    spaceBetween: 12,
    loop: true,
    breakpoints: {
      480:  { slidesPerView: 2.2 },
      640:  { slidesPerView: 2.5 },
      768:  { slidesPerView: 3 },
      1024: { slidesPerView: 4 },
    },
  };

  Router.onEnter('home', async function () {

    // محصولات ویژه
    try {
      const featured = await API.products.list({ featured: 1 });
      const wrap = document.getElementById('featured-wrapper');
      const arr  = Array.isArray(featured) ? featured : (featured.data || []);

      if (wrap && arr.length) {
        wrap.innerHTML = arr.map(p => `<div class="swiper-slide">${productCard(p)}</div>`).join('');
        new Swiper('.featured-swiper', {
          ...SWIPER_DEFAULTS,
          navigation: { prevEl: '.swiper-button-prev-feat', nextEl: '.swiper-button-next-feat' },
        });
      } else {
        document.getElementById('featured-section')?.remove();
      }
    } catch (e) {
      console.warn('Featured products error:', e);
      document.getElementById('featured-section')?.remove();
    }

    // جدیدترین محصولات
    try {
      const data = await API.products.list({ limit: 10 });
      const wrap = document.getElementById('products-wrapper');
      const arr  = data.data || [];

      if (wrap && arr.length) {
        wrap.innerHTML = arr.map(p => `<div class="swiper-slide">${productCard(p)}</div>`).join('');
        new Swiper('.products-swiper', {
          ...SWIPER_DEFAULTS,
          navigation: { prevEl: '.swiper-button-prev-prods', nextEl: '.swiper-button-next-prods' },
        });
      }
    } catch (e) {
      console.warn('Products error:', e);
    }

    if (window.lucide) lucide.createIcons();
  });

})();
