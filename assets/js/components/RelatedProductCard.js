import { storeConfig } from '../config/bootstrap.js';
import { formatPrice } from '../utils/priceFormatter.js';
import DOM from '../utils/dom.js';

const RelatedProductCard = {
  render(p) {
    const img = p.images?.find((i) => i.is_main)?.url
      || p.images?.[0]?.url
      || p.main_image
      || p.image
      || '';
    const price = formatPrice(p.price);
    const href = DOM.hashHref('product', { id: p.id });
    const placeholder = storeConfig.placeholder;
    const category = p.category_name || p.era || '';

    return `
      <a href="${href}" data-link class="group block">
        <div class="relative aspect-square bg-[#f2f2f2] rounded-xl overflow-hidden mb-3">
          ${img
            ? `<img src="${img}" alt="${p.name}"
                   class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                   onerror="this.onerror=null;this.src='${placeholder}'">`
            : `<div class="w-full h-full flex items-center justify-center text-muted/40">
                 <i data-lucide="image" class="w-8 h-8"></i>
               </div>`}
          ${category ? `<span class="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-[10px] font-medium px-2 py-0.5 rounded-md text-body">${category}</span>` : ''}
        </div>
        <h3 class="text-sm font-medium text-body mb-1 line-clamp-1">${p.name}</h3>
        <p class="text-xs text-muted">${price}</p>
      </a>`;
  },

  bind() { /* router handles links */ },
};

export default RelatedProductCard;
