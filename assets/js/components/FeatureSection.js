import { storeConfig } from '../config/bootstrap.js';
import Button from './Button.js';

const FeatureSection = {
  render() {
    const { feature } = storeConfig;

    const features = feature.items.map((item) => `
      <li class="flex items-center gap-3 flex-row-reverse">
        <span class="w-8 h-8 rounded-full bg-black/5 border border-black/10 flex items-center justify-center shrink-0">
          <i data-lucide="${item.icon}" class="w-3.5 h-3.5 text-body"></i>
        </span>
        <span class="text-xs md:text-sm font-medium tracking-widest text-body/80">${item.label}</span>
      </li>`).join('');

    return `
      <section class="py-16 md:py-24 bg-white">
        <div class="max-w-[1280px] mx-auto px-4 md:px-6">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div class="text-right order-2 lg:order-1">
              <h2 class="font-display text-3xl md:text-5xl font-bold text-body mb-6 tracking-tight leading-tight" dir="ltr">
                ${feature.title}
              </h2>
              <p class="text-muted text-sm md:text-base leading-relaxed mb-8 max-w-md mr-0 ml-auto">
                ${feature.description}
              </p>
              <ul class="space-y-4 mb-10">${features}</ul>
              ${Button.render({ variant: 'aluminum', label: feature.cta, href: feature.ctaHref, size: 'lg' })}
            </div>
            <div class="relative order-1 lg:order-2">
              <div class="relative rounded-[32px] overflow-hidden aspect-[3/4] max-h-[580px] shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
                <img src="${feature.image}" alt="${feature.title}" class="w-full h-full object-cover">
              </div>
              <div class="absolute bottom-6 left-6 right-6 md:left-8 md:right-auto md:max-w-[220px] bg-white/90 backdrop-blur-xl border border-white/60 rounded-[24px] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                <p class="text-[10px] font-bold tracking-[0.2em] text-muted mb-1" dir="ltr">${feature.card.tag}</p>
                <p class="text-sm font-bold text-body mb-1">${feature.card.title}</p>
                <p class="text-xs text-muted">${feature.card.subtitle}</p>
              </div>
            </div>
          </div>
        </div>
      </section>`;
  },

  bind() { /* static section */ },
};

export default FeatureSection;
