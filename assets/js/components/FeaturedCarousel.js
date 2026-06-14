import { storeConfig } from '../config/bootstrap.js';
import FeaturedPosterCard from './FeaturedPosterCard.js';

let _uid = 0;

function nextId() {
  _uid += 1;
  return `fc-${_uid}`;
}

function isRtl() {
  return document.documentElement.dir === 'rtl';
}

function getActiveOffset(cfg) {
  return window.innerWidth < 992 ? cfg.mobileStackOffset : cfg.stackOffset;
}

function getCardTransform(index, currentIndex, cardWidth, cfg) {
  const activeOffset = getActiveOffset(cfg);
  const step = cardWidth + cfg.cardGap - activeOffset;
  const slideMove = step * (index < currentIndex ? index : currentIndex);
  const sign = isRtl() ? 1 : -1;
  return sign * slideMove;
}

function getButtonAlign(position, bp = '') {
  const prefix = bp ? `${bp}:` : '';
  if (position === 'center') return `${prefix}justify-center`;
  if (position === 'end') return `${prefix}justify-end`;
  return `${prefix}justify-start`;
}

const FeaturedCarousel = {
  render(data = {}) {
    const { carousel } = storeConfig;
    const { home } = storeConfig.texts;
    const cfg = carousel.featured;
    const products = data.products || [];
    const id = data.id || nextId();
    const title = data.title || home.featured;
    const viewAllHref = data.viewAllHref || cfg.viewAllHref;
    const viewAllLabel = data.viewAllLabel || home.viewAll;
    const navClass = cfg.navVariant === 'glass' ? 'btn-glass' : 'btn-aluminum';

    const cards = products
      .map(
        (p, i) =>
          `<div class="stacking-slider__card" data-card-index="${i}" style="z-index:${i + 1}">${FeaturedPosterCard.render(p)}</div>`
      )
      .join('');

    return `
      <section class="py-14 md:py-20 bg-white featured-carousel-section overflow-x-clip" data-carousel-id="${id}">
        <div class="max-w-[1280px] mx-auto relative">
          <div class="flex items-center justify-between mb-8 px-4 md:px-6">
            <h2 class="text-2xl md:text-4xl font-bold text-body text-right">${title}</h2>
            <a href="${viewAllHref}" data-link
               class="text-muted text-xs md:text-sm hover:text-body flex flex-row-reverse items-center gap-1 transition-colors shrink-0">
              <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i><span>${viewAllLabel}</span>
            </a>
          </div>
          <div class="stacking-slider px-4 md:px-6" data-slider-id="${id}"
               style="--stack-card-gap:${cfg.cardGap}px;--stack-transition:${cfg.transitionDuration}ms;--stack-poster-width:${cfg.posterWidth}px;--stack-poster-width-mobile:${cfg.mobilePosterWidth || cfg.posterWidth}px;--stack-poster-ratio:${cfg.posterAspect};">
            <div class="stacking-slider__viewport">
              <div class="stacking-slider__track">${cards}</div>
            </div>
            <div class="carousel-nav-row stacking-slider__nav flex items-center gap-3 mt-6 justify-center ${getButtonAlign(cfg.buttonPosition, 'md')}">
              <button type="button" class="stacking-slider__btn swiper-nav-btn ${navClass}"
                      data-action="prev" aria-label="قبلی" disabled
                      style="--nav-size:${cfg.arrowSize}px;opacity:${cfg.disabledArrowOpacity};">
                <i data-lucide="chevron-right" class="w-4 h-4 text-body"></i>
              </button>
              <button type="button" class="stacking-slider__btn swiper-nav-btn ${navClass}"
                      data-action="next" aria-label="بعدی"
                      style="--nav-size:${cfg.arrowSize}px;">
                <i data-lucide="chevron-left" class="w-4 h-4 text-body"></i>
              </button>
            </div>
          </div>
        </div>
      </section>`;
  },

  bind(container, callbacks = {}) {
    const sliderEl = container.querySelector('.stacking-slider');
    if (!sliderEl) return null;

    const cfg = storeConfig.carousel.featured;
    const cards = [...sliderEl.querySelectorAll('.stacking-slider__card')];
    if (!cards.length) return null;

    const prevBtn = sliderEl.querySelector('[data-action="prev"]');
    const nextBtn = sliderEl.querySelector('[data-action="next"]');
    let currentIndex = 0;
    let cardWidth = 0;
    let touchStartX = 0;

    const state = { currentIndex, ro: null, onResize: null, onPrev: null, onNext: null, onTouchStart: null, onTouchEnd: null };

    function measureCardWidth() {
      const track = sliderEl.querySelector('.stacking-slider__track');
      cardWidth = track?.offsetWidth || cards[0]?.offsetWidth || 0;
    }

    function updateButtons() {
      const atStart = currentIndex === 0;
      const atEnd = currentIndex >= cards.length - 1;
      if (prevBtn) {
        prevBtn.disabled = atStart;
        prevBtn.style.opacity = atStart ? cfg.disabledArrowOpacity : '1';
        prevBtn.style.cursor = atStart ? 'not-allowed' : 'pointer';
      }
      if (nextBtn) {
        nextBtn.disabled = atEnd;
        nextBtn.style.opacity = atEnd ? cfg.disabledArrowOpacity : '1';
        nextBtn.style.cursor = atEnd ? 'not-allowed' : 'pointer';
      }
    }

    function applyTransforms() {
      cards.forEach((card, index) => {
        const x = getCardTransform(index, currentIndex, cardWidth, cfg);
        card.style.transform = `translateX(${x}px)`;
      });
      updateButtons();
    }

    function goTo(index) {
      const next = Math.max(0, Math.min(index, cards.length - 1));
      if (next === currentIndex) return;
      currentIndex = next;
      state.currentIndex = currentIndex;
      applyTransforms();
    }

    state.onResize = () => {
      measureCardWidth();
      applyTransforms();
    };

    state.onPrev = () => goTo(currentIndex - 1);
    state.onNext = () => goTo(currentIndex + 1);

    state.onTouchStart = (e) => {
      touchStartX = e.changedTouches?.[0]?.clientX ?? 0;
    };

    state.onTouchEnd = (e) => {
      const touchEndX = e.changedTouches?.[0]?.clientX ?? 0;
      const delta = touchEndX - touchStartX;
      const threshold = 40;
      if (Math.abs(delta) < threshold) return;
      if (isRtl()) {
        if (delta > 0) goTo(currentIndex + 1);
        else goTo(currentIndex - 1);
      } else {
        if (delta < 0) goTo(currentIndex + 1);
        else goTo(currentIndex - 1);
      }
    };

    sliderEl.addEventListener('click', (event) => {
      const link = event.target.closest('a[data-link].featured-poster');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      const hash = href.startsWith('#') ? href.slice(1) : href;
      if (hash && window.location.hash.slice(1) !== hash) {
        window.location.hash = hash;
      }
    });

    prevBtn?.addEventListener('click', state.onPrev);
    nextBtn?.addEventListener('click', state.onNext);
    sliderEl.addEventListener('touchstart', state.onTouchStart, { passive: true });
    sliderEl.addEventListener('touchend', state.onTouchEnd, { passive: true });
    window.addEventListener('resize', state.onResize);

    if (typeof ResizeObserver !== 'undefined') {
      state.ro = new ResizeObserver(state.onResize);
      const track = sliderEl.querySelector('.stacking-slider__track');
      state.ro.observe(track || cards[0]);
    }

    measureCardWidth();
    setTimeout(() => {
      measureCardWidth();
      applyTransforms();
    }, 100);
    applyTransforms();

    sliderEl._stackingState = state;
    return state;
  },

  destroy(container) {
    const sliderEl = container?.querySelector('.stacking-slider');
    const state = sliderEl?._stackingState;
    if (!state) return;

    window.removeEventListener('resize', state.onResize);
    state.ro?.disconnect();

    const prevBtn = sliderEl.querySelector('[data-action="prev"]');
    const nextBtn = sliderEl.querySelector('[data-action="next"]');
    prevBtn?.removeEventListener('click', state.onPrev);
    nextBtn?.removeEventListener('click', state.onNext);
    sliderEl.removeEventListener('touchstart', state.onTouchStart);
    sliderEl.removeEventListener('touchend', state.onTouchEnd);

    sliderEl._stackingState = null;
  },
};

export default FeaturedCarousel;
