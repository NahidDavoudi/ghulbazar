import { storeConfig } from '../config/bootstrap.js';
import { formatPrice } from '../utils/priceFormatter.js';
import DOM from '../utils/dom.js';

const ShopProductCard = {
  render(p) {
    const img = p.images?.find((i) => i.is_main)?.url
      || p.images?.[0]?.url
      || p.main_image
      || p.image
      || '';
    const price = formatPrice(p.price);
    const href = DOM.hashHref('product', { id: p.id });
    const placeholder = storeConfig.placeholder;

    return `
      <a href="${href}" data-link class="group block text-center">
        <div class="relative aspect-square bg-[#f2f2f2] rounded-xl overflow-hidden mb-4">
          ${img
            ? `<img src="${img}" alt="${p.name}"
                   class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                   onerror="this.onerror=null;this.src='${placeholder}'">`
            : `<div class="w-full h-full flex items-center justify-center text-muted/40">
                 <i data-lucide="image" class="w-10 h-10"></i>
               </div>`}
        </div>
        <h3 class="text-sm font-medium text-body mb-1.5 line-clamp-2 leading-snug">${p.name}</h3>
        <p class="text-sm text-body/80">${price}</p>
      </a>`;
  },

  bind() { /* router handles links */ },
};

export default ShopProductCard;
