import { storeConfig } from '../config/bootstrap.js';
import { renderImageWithFallback } from '../utils/imagePlaceholder.js';
import DOM from '../utils/dom.js';

const FeaturedPosterCard = {
  render(p, options = {}) {
    const { ui, carousel } = storeConfig;
    const isMarquee = options.variant === 'marquee';
    const img = p.images?.find((i) => i.is_main)?.url
    || p.images?.[0]?.url
    || p.main_image
    || p.image
    || '';
    const href = DOM.hashHref('product', { id: p.id });
    const radius = isMarquee ? carousel.featured.cardRadius : null;
    const radiusStyle = radius != null ? `border-radius:${radius}px` : '';
    const radiusClass = isMarquee ? '' : ui.cardRadius;

    return `
      <a href="${href}" data-link
         class="featured-poster group block h-full overflow-hidden ${isMarquee ? 'featured-poster--marquee' : ''} ${radiusClass}"
         ${radiusStyle ? `style="${radiusStyle}"` : ''}>
        <div class="featured-poster__media relative h-full bg-[#f5f5f7] overflow-hidden">
          ${renderImageWithFallback({
            src: img,
            alt: p.name,
            imgClass: `w-full h-full object-cover ${isMarquee ? '' : 'transition-transform duration-700 ease-out group-hover:scale-[1.04]'}`,
            iconSize: 'w-12 h-12',
          })}
          <div class="absolute inset-x-0 bottom-0 p-4 sm:p-5 bg-gradient-to-t from-black/75 via-black/35 to-transparent pointer-events-none">
            <h3 class="text-white font-bold text-sm sm:text-base md:text-lg text-right leading-snug drop-shadow-sm line-clamp-2">${p.name}</h3>
          </div>
        </div>
      </a>`;
  },

  bind() { /* router handles links */ },
};

export default FeaturedPosterCard;
