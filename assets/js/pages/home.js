/**
 * pages/home.js
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import ProductCard from '../components/ProductCard.js';
import HeroSection from '../components/HeroSection.js';
import { storeConfig } from '../config/bootstrap.js';

const SWIPER_DEFAULTS = {
  slidesPerView: 1.5,
  spaceBetween: 12,
  loop: true,
  breakpoints: {
    480: { slidesPerView: 2.2 },
    640: { slidesPerView: 2.5 },
    768: { slidesPerView: 3 },
    1024: { slidesPerView: 4 },
  },
};

function bindProductCards(container) {
  container.querySelectorAll('.swiper-slide').forEach((slide) => {
    ProductCard.bind(slide, {
      onAddToCart: async (id) => {
        await api.cart.add(id, 1);
        window.loadCartCount?.();
        api.utils.toast('به سبد اضافه شد', 'success', 2000);
      },
    });
  });
}

Router.onEnter('home', async function () {
  const heroEl = document.getElementById('hero-section');
  if (heroEl) heroEl.innerHTML = HeroSection.render();

  try {
    const featured = await api.products.list({ featured: 1 });
    const wrap = document.getElementById('featured-wrapper');
    const arr = Array.isArray(featured) ? featured : (featured.data || []);

    if (wrap && arr.length) {
      wrap.innerHTML = arr.map((p) => `<div class="swiper-slide">${ProductCard.render(p)}</div>`).join('');
      bindProductCards(wrap.closest('.featured-swiper') || wrap);
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

  try {
    const data = await api.products.list({ limit: 10 });
    const wrap = document.getElementById('products-wrapper');
    const arr = data.data || [];

    if (wrap && arr.length) {
      wrap.innerHTML = arr.map((p) => `<div class="swiper-slide">${ProductCard.render(p)}</div>`).join('');
      bindProductCards(wrap.closest('.products-swiper') || wrap);
      new Swiper('.products-swiper', {
        ...SWIPER_DEFAULTS,
        navigation: { prevEl: '.swiper-button-prev-prods', nextEl: '.swiper-button-next-prods' },
      });
    }
  } catch (e) {
    console.warn('Products error:', e);
  }

  const nl = storeConfig.texts.newsletter;
  const nlTitle = document.getElementById('newsletter-title');
  const nlSub = document.getElementById('newsletter-subtitle');
  if (nlTitle) nlTitle.textContent = nl.title;
  if (nlSub) nlSub.textContent = nl.subtitle;

  if (window.lucide) lucide.createIcons();
});
