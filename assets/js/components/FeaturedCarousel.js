import { storeConfig } from '../config/bootstrap.js';
import ProductCard from './ProductCard.js';

let _uid = 0;

function nextId() {
  _uid += 1;
  return `fc-${_uid}`;
}

const FeaturedCarousel = {
  render(data = {}) {
    const { carousel } = storeConfig;
    const { home } = storeConfig.texts;
    const products = data.products || [];
    const id = data.id || nextId();
    const title = data.title || home.featured;
    const viewAllHref = data.viewAllHref || carousel.featured.viewAllHref;
    const viewAllLabel = data.viewAllLabel || home.viewAll;
    const navClass = carousel.featured.navVariant === 'glass' ? 'btn-glass' : 'btn-aluminum';

    const slides = products
      .map((p) => `<div class="swiper-slide">${ProductCard.render(p)}</div>`)
      .join('');

    return `
      <section class="py-14 md:py-20 bg-white featured-carousel-section" data-carousel-id="${id}">
        <div class="max-w-[1280px] mx-auto relative">
          <div class="flex flex-row-reverse items-center justify-between mb-8 px-4 md:px-6">
            <h2 class="text-2xl md:text-4xl font-bold text-body">${title}</h2>
            <a href="${viewAllHref}" data-link
               class="text-muted text-xs md:text-sm hover:text-body flex flex-row-reverse items-center gap-1 transition-colors">
              <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i><span>${viewAllLabel}</span>
            </a>
          </div>
          <div class="swiper featured-carousel px-4 md:px-6 relative" data-swiper-id="${id}">
            <div class="swiper-wrapper">${slides}</div>
            <div class="swiper-button-prev-${id} swiper-nav-btn ${navClass} absolute top-[42%] -translate-y-1/2 right-4 md:right-6 z-10">
              <i data-lucide="chevron-right" class="w-4 h-4 text-body"></i>
            </div>
            <div class="swiper-button-next-${id} swiper-nav-btn ${navClass} absolute top-[42%] -translate-y-1/2 left-4 md:left-6 z-10">
              <i data-lucide="chevron-left" class="w-4 h-4 text-body"></i>
            </div>
          </div>
        </div>
      </section>`;
  },

  bind(container, callbacks = {}) {
    const swiperEl = container.querySelector('.featured-carousel');
    if (!swiperEl || typeof Swiper === 'undefined') return null;

    const id = swiperEl.dataset.swiperId;
    const { carousel } = storeConfig;
    const cfg = carousel.featured;

    container.querySelectorAll('.swiper-slide').forEach((slide) => {
      ProductCard.bind(slide, callbacks);
    });

    const instance = new Swiper(swiperEl, {
      slidesPerView: cfg.slidesPerView,
      spaceBetween: cfg.spaceBetween,
      loop: productsLoopEnabled(container),
      effect: cfg.effect,
      centeredSlides: cfg.centeredSlides,
      grabCursor: cfg.grabCursor,
      coverflowEffect: cfg.coverflowEffect,
      breakpoints: cfg.breakpoints,
      navigation: {
        prevEl: `.swiper-button-prev-${id}`,
        nextEl: `.swiper-button-next-${id}`,
      },
      on: {
        click(swiper, event) {
          if (event._ghul) return;
          const btn = event.target.closest('.add-to-cart-quick');
          if (btn && !btn.disabled) {
            setTimeout(() => {
              const e2 = new MouseEvent('click', { bubbles: true });
              e2._ghul = true;
              btn.dispatchEvent(e2);
            }, 0);
            return;
          }
          const link = event.target.closest('a[data-link]') || event.target.closest('.iris-card[href]');
          if (link) {
            const href = link.getAttribute('href') || '';
            const hash = href.startsWith('#') ? href.slice(1) : href;
            if (hash && window.location.hash.slice(1) !== hash) {
              window.location.hash = hash;
            }
          }
        },
      },
    });

    swiperEl._swiperInstance = instance;
    return instance;
  },

  destroy(container) {
    const swiperEl = container?.querySelector('.featured-carousel');
    if (swiperEl?._swiperInstance) {
      swiperEl._swiperInstance.destroy(true, true);
      swiperEl._swiperInstance = null;
    }
  },
};

function productsLoopEnabled(container) {
  const count = container.querySelectorAll('.swiper-slide').length;
  return count > 2;
}

export default FeaturedCarousel;
