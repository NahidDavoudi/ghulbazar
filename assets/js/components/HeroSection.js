import { storeConfig } from '../config/bootstrap.js';
import { pickVariantSet } from '../utils/imageUrl.js';
import Button from './Button.js';

const HeroSection = {
  render() {
    const { hero } = storeConfig;
    const heroImage = pickVariantSet(hero.imageVariants, 'large') || hero.image;

    return `
      <section class="hero-fullbleed relative w-full overflow-hidden bg-body">
        <div class="relative w-full aspect-[4/5] sm:aspect-[16/9] md:aspect-[21/9] min-h-[320px] sm:min-h-[420px] md:min-h-[560px]">
          <img src="${heroImage}" alt="${storeConfig.name}"
               class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none"></div>
        </div>
        <div class="absolute bottom-8 md:bottom-12 left-0 right-0 z-10 px-4 md:px-6">
          <div class="max-w-[1280px] mx-auto flex flex-col md:flex-row items-stretch md:items-end justify-between gap-6">
            <div class="text-right min-w-0">
              <h1 class="font-display text-3xl sm:text-4xl md:text-6xl text-white mb-2 leading-none drop-shadow-lg" dir="ltr">${hero.title}</h1>
              ${hero.subtitle ? `<p class="text-white/75 text-sm md:text-base max-w-sm">${hero.subtitle}</p>` : ''}
            </div>
            <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              ${Button.render({ variant: 'aluminum', label: hero.ctaPrimary, href: '#/shop', size: 'lg', className: 'w-full sm:w-auto justify-center' })}
              ${Button.render({ variant: 'glass', label: hero.ctaSecondary, href: '#/categories', size: 'lg', className: 'w-full sm:w-auto justify-center text-white !border-white/30' })}
            </div>
          </div>
        </div>
      </section>`;
  },

  bind() { /* router handles links */ },
};

export default HeroSection;
