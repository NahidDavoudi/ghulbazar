import { storeConfig } from '../config/bootstrap.js';
import { formatPrice } from '../utils/priceFormatter.js';
import { renderImageWithFallback } from '../utils/imagePlaceholder.js';
import { escapeHtml } from '../utils/htmlEscape.js';
import DOM from '../utils/dom.js';

const ShopProductCard = {
  render(p) {
    const ui = storeConfig.ui;
    const img = p.images?.find((i) => i.is_main)?.url
      || p.images?.[0]?.url
      || p.main_image
      || p.image
      || '';
    const price = formatPrice(p.price);
    const href = DOM.hashHref('product', { id: p.id });
    const name = escapeHtml(p.name);

    return `
      <a href="${href}" data-link class="group block iris-card ${ui.cardBase} ${ui.cardRadius} ${ui.cardHover}">
        <div class="relative aspect-square bg-surface overflow-hidden">
          ${renderImageWithFallback({
            src: img,
            alt: p.name,
            imgClass: 'w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500',
          })}
        </div>
        <div class="p-3 md:p-4 text-right bg-card">
          <h3 class="text-sm font-medium text-body mb-1.5 line-clamp-2 leading-snug">${name}</h3>
          <p class="text-sm font-bold text-accent">${price}</p>
        </div>
      </a>`;
  },

  bind() { /* router handles links */ },
};

export default ShopProductCard;
