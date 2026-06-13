import { storeConfig } from '../config/bootstrap.js';
import Button from './Button.js';

const HeroSection = {
  render() {
    const { hero } = storeConfig;

    return `
      <section class="hero-fullbleed relative w-full overflow-hidden bg-white">
        <div class="relative w-full aspect-[16/9] md:aspect-[21/9] min-h-[420px] md:min-h-[560px]">
          <img src="${hero.image}" alt="${storeConfig.name}"
               class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none"></div>
        </div>
        <div class="absolute bottom-8 md:bottom-12 left-0 right-0 z-10 px-4 md:px-6">
          <div class="max-w-[1280px] mx-auto flex flex-col md:flex-row items-end justify-between gap-6">
            <div class="text-right">
              <h1 class="font-display text-4xl md:text-6xl text-white mb-2 leading-none drop-shadow-lg" dir="ltr">${hero.title}</h1>
              ${hero.subtitle ? `<p class="text-white/75 text-sm md:text-base max-w-sm">${hero.subtitle}</p>` : ''}
            </div>
            <div class="flex gap-3 flex-wrap">
              ${Button.render({ variant: 'aluminum', label: hero.ctaPrimary, href: '#/shop', size: 'lg' })}
              ${Button.render({ variant: 'glass', label: hero.ctaSecondary, href: '#/categories', size: 'lg', className: 'text-white !border-white/30' })}
            </div>
          </div>
        </div>
      </section>`;
  },

  bind() { /* router handles links */ },
};

export default HeroSection;
