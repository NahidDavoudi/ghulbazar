document.addEventListener('DOMContentLoaded', async () => {
  injectHeader();
  injectFooter();
  loadCartCount();

  // Load featured products
  try {
    const res = await fetch(`${API}?endpoint=products&featured=1`);
    if (!res.ok) throw new Error('خطا در دریافت محصولات ویژه');
    const featuredProducts = await res.json();
    const featuredWrap = document.getElementById('featured-wrapper');
    if (featuredWrap && Array.isArray(featuredProducts) && featuredProducts.length) {
      featuredWrap.innerHTML = featuredProducts.map(p => `<div class="swiper-slide">${productCard(p)}</div>`).join('');
      new Swiper('.featured-swiper', {
        slidesPerView: 1.5, spaceBetween: 12, loop: true,
        navigation: { prevEl: '.swiper-button-prev-feat', nextEl: '.swiper-button-next-feat' },
        breakpoints: { 480: { slidesPerView: 2.2 }, 640: { slidesPerView: 2.5 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } }
      });
    } else {
      document.getElementById('featured-section')?.remove();
    }
  } catch (e) {
    console.warn('Featured products error:', e);
    document.getElementById('featured-section')?.remove();
  }

  // Load latest products
  try {
    const data = await apiFetch('products&limit=10');
    const wrap = document.getElementById('products-wrapper');
    if (wrap && data.data) {
      wrap.innerHTML = data.data.map(p => `<div class="swiper-slide">${productCard(p)}</div>`).join('');
      new Swiper('.products-swiper', {
        slidesPerView: 1.5, spaceBetween: 12, loop: true,
        navigation: { prevEl: '.swiper-button-prev-prods', nextEl: '.swiper-button-next-prods' },
        breakpoints: { 480: { slidesPerView: 2.2 }, 640: { slidesPerView: 2.5 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } }
      });
    }
  } catch (e) {
    console.warn('Products error:', e);
  }

  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});
