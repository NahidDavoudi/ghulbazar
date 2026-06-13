import { storeConfig } from '../config/bootstrap.js';

const HeroSection = {
  render() {
    const { hero, ui } = storeConfig;
    return `
      <section class="relative min-h-[500px] md:min-h-[700px] flex items-center justify-center overflow-hidden">
        <div class="absolute inset-0">
          <img src="${hero.image}" alt="${storeConfig.name}" class="w-full h-full object-cover scale-105">
          <div class="absolute inset-0 bg-gradient-to-t from-[var(--color-dark)] via-[var(--color-dark)]/60 to-transparent"></div>
          <div class="absolute inset-0 bg-black/20"></div>
        </div>
        <div class="relative z-10 text-center px-5 max-w-3xl mx-auto py-20">
          <h1 class="font-display text-5xl md:text-7xl text-white mb-3 leading-tight drop-shadow-sm">${hero.title}</h1>
          ${hero.subtitle ? `<p class="text-white/80 mb-6 text-sm md:text-base">${hero.subtitle}</p>` : ''}
          <div class="flex gap-3 justify-center flex-wrap">
            <a href="#/shop" data-link class="px-6 py-3 md:px-8 md:py-4 ${ui.btnRadius} ${ui.btnPrimary} text-sm md:text-base font-bold shadow-[0_10px_15px_-3px_rgba(75,107,138,0.3)] transition-all">${hero.ctaPrimary}</a>
            <a href="#/categories" data-link class="px-6 py-3 md:px-8 md:py-4 ${ui.btnRadius} backdrop-blur-sm bg-white/30 border border-white/30 text-white text-sm md:text-base font-medium hover:bg-white/40 transition-all">${hero.ctaSecondary}</a>
          </div>
        </div>
      </section>`;
  },

  bind() { /* router handles links */ },
};

export default HeroSection;
