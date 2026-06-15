import { storeConfig } from '../config/bootstrap.js';
import FeaturedPosterCard from './FeaturedPosterCard.js';

let _uid = 0;

function nextId() {
  _uid += 1;
  return `fc-${_uid}`;
}

function getCardWidth(containerWidth, gap, cfg) {
  if (containerWidth < cfg.mobileBreakpoint) return containerWidth - gap;
  if (containerWidth < cfg.tabletBreakpoint) return containerWidth / 2 - gap;
  return containerWidth / 3 - gap;
}

const FeaturedCarousel = {
  render(data = {}) {
    const cfg = storeConfig.carousel.featured;
    const { home } = storeConfig.texts;
    const products = data.products || [];
    const id = data.id || nextId();
    const title = data.title || home.featured;
    const viewAllHref = data.viewAllHref || cfg.viewAllHref;
    const viewAllLabel = data.viewAllLabel || home.viewAll;

    const cards = products
      .map(
        (p, i) =>
          `<div class="flow-marquee__card" data-card-index="${i % products.length}">${FeaturedPosterCard.render(p, { variant: 'marquee' })}</div>`
      )
      .join('');

    const duplicateSets = products.length ? 4 : 0;
    const allCards = Array.from({ length: duplicateSets }, () => cards).join('');

    return `
      <section class="py-14 md:py-20 featured-carousel-section overflow-x-clip" data-carousel-id="${id}"
               style="background-color:${cfg.backgroundColor}">
        <div class="max-w-[1280px] mx-auto relative">
          <div class="flex items-center justify-between mb-8 px-4 md:px-6">
            <h2 class="text-2xl md:text-4xl font-bold text-body text-right">${title}</h2>
            <a href="${viewAllHref}" data-link
               class="text-muted text-xs md:text-sm hover:text-body flex flex-row-reverse items-center gap-1 transition-colors shrink-0">
              <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i><span>${viewAllLabel}</span>
            </a>
          </div>
          <div class="flow-marquee px-4 md:px-6" data-marquee-id="${id}"
               style="--marquee-gap:${cfg.gap}px;--marquee-radius:${cfg.cardRadius}px;--marquee-height:${cfg.height}px;--marquee-height-md:${cfg.heightMd}px;">
            <div class="flow-marquee__viewport">
              ${allCards}
            </div>
          </div>
        </div>
      </section>`;
  },

  bind(container, callbacks = {}) {
    const marqueeEl = container.querySelector('.flow-marquee');
    if (!marqueeEl) return null;

    const cfg = storeConfig.carousel.featured;
    const viewport = marqueeEl.querySelector('.flow-marquee__viewport');
    const cards = [...marqueeEl.querySelectorAll('.flow-marquee__card')];
    if (!cards.length) return null;

    const uniqueCount = new Set(cards.map((c) => c.dataset.cardIndex)).size;
    let containerWidth = viewport.offsetWidth || 0;
    let cardWidth = getCardWidth(containerWidth, cfg.gap, cfg);
    let loopWidth = 0;
    let offset = 0;
    let paused = false;
    let rafId = null;
    let lastTime = 0;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const state = {
      ro: null,
      onResize: null,
      onClick: null,
      onMouseEnter: null,
      onMouseLeave: null,
      onVisibility: null,
    };

    function layoutCards() {
      cards.forEach((card, index) => {
        const x = index * (cardWidth + cfg.gap) - offset;
        card.style.width = `${cardWidth}px`;
        card.style.transform = `translateX(${x}px)`;
      });
    }

    function measure() {
      containerWidth = viewport.offsetWidth || 0;
      cardWidth = getCardWidth(containerWidth, cfg.gap, cfg);
      loopWidth = uniqueCount * (cardWidth + cfg.gap);
      if (loopWidth > 0) offset = ((offset % loopWidth) + loopWidth) % loopWidth;
      layoutCards();
    }

    function tick(time) {
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;
      lastTime = time;

      if (!paused && !prefersReducedMotion && loopWidth > 0) {
        if (cfg.direction === 'left') {
          offset += cfg.speed * (delta / 16);
          if (offset >= loopWidth) offset -= loopWidth;
        } else {
          offset -= cfg.speed * (delta / 16);
          if (offset < 0) offset += loopWidth;
        }
        layoutCards();
      }

      rafId = requestAnimationFrame(tick);
    }

    state.onResize = () => {
      measure();
    };

    state.onClick = (event) => {
      const link = event.target.closest('a[data-link].featured-poster');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      const hash = href.startsWith('#') ? href.slice(1) : href;
      if (hash && window.location.hash.slice(1) !== hash) {
        window.location.hash = hash;
      }
    };

    if (cfg.pauseOnHover) {
      state.onMouseEnter = () => {
        paused = true;
      };
      state.onMouseLeave = () => {
        paused = false;
        lastTime = 0;
      };
      marqueeEl.addEventListener('mouseenter', state.onMouseEnter);
      marqueeEl.addEventListener('mouseleave', state.onMouseLeave);
    }

    state.onVisibility = () => {
      paused = document.hidden;
      if (!paused) lastTime = 0;
    };
    document.addEventListener('visibilitychange', state.onVisibility);

    marqueeEl.addEventListener('click', state.onClick);
    window.addEventListener('resize', state.onResize);

    if (typeof ResizeObserver !== 'undefined') {
      state.ro = new ResizeObserver(state.onResize);
      state.ro.observe(viewport);
    }

    measure();
    rafId = requestAnimationFrame(tick);

    marqueeEl._marqueeState = { ...state, rafId };
    return marqueeEl._marqueeState;
  },

  destroy(container) {
    const marqueeEl = container?.querySelector('.flow-marquee');
    const state = marqueeEl?._marqueeState;
    if (!state) return;

    if (state.rafId) cancelAnimationFrame(state.rafId);
    window.removeEventListener('resize', state.onResize);
    state.ro?.disconnect();
    document.removeEventListener('visibilitychange', state.onVisibility);
    marqueeEl.removeEventListener('click', state.onClick);
    if (state.onMouseEnter) {
      marqueeEl.removeEventListener('mouseenter', state.onMouseEnter);
      marqueeEl.removeEventListener('mouseleave', state.onMouseLeave);
    }

    marqueeEl._marqueeState = null;
  },
};

export default FeaturedCarousel;
