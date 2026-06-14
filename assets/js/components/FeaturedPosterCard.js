import { storeConfig } from '../config/bootstrap.js';
import { renderImageWithFallback } from '../utils/imagePlaceholder.js';
import DOM from '../utils/dom.js';

const FeaturedPosterCard = {
  render(p) {
    const { ui } = storeConfig;
    const img = p.images?.find((i) => i.is_main)?.url || p.images?.[0]?.url || p.image || '';
    const href = DOM.hashHref('product', { id: p.id });

    return `
      <a href="${href}" data-link
         class="featured-poster group block ${ui.cardRadius} overflow-hidden">
        <div class="featured-poster__media relative bg-[#f5f5f7] overflow-hidden">
          ${renderImageWithFallback({
            src: img,
            alt: p.name,
            imgClass: 'w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]',
            iconSize: 'w-12 h-12',
          })}
          <div class="absolute inset-x-0 bottom-0 p-5 md:p-7 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
            <h3 class="text-white font-bold text-xl md:text-2xl text-right leading-snug drop-shadow-sm">${p.name}</h3>
          </div>
        </div>
      </a>`;
  },

  bind() { /* router handles links */ },
};

export default FeaturedPosterCard;
