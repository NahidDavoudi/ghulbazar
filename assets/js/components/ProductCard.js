import { storeConfig } from '../config/bootstrap.js';
import { formatPrice } from '../utils/priceFormatter.js';
import { renderImageWithFallback } from '../utils/imagePlaceholder.js';
import DOM from '../utils/dom.js';
import Button from './Button.js';

const ProductCard = {
  render(p) {
    const ui = storeConfig.ui;
    const img = p.images?.find((i) => i.is_main)?.url || p.images?.[0]?.url || p.image || '';
    const price = formatPrice(p.price);
    const href = DOM.hashHref('product', { id: p.id });

    const badge = p.badge
      ? `<span class="absolute top-4 right-4 bg-black text-white text-[10px] font-bold px-2.5 py-1 rounded-full z-10">${p.badge}</span>`
      : '';
    const lowStock = p.stock <= 2 && p.stock > 0
      ? `<span class="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full z-10">آخرین موجودی</span>`
      : '';
    const outOfStock = p.stock === 0
      ? `<div class="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-10"><span class="text-sm text-white/80 font-medium">ناموجود</span></div>`
      : '';

    const addBtn = Button.render({
      variant: 'glass',
      size: 'icon',
      label: '+',
      className: 'add-to-cart-quick shrink-0',
      attrs: { 'data-product-id': p.id, title: 'افزودن به سبد' },
      disabled: p.stock === 0,
    });

    return `
      <a href="${href}" data-link
         class="group block iris-card ${ui.cardRadius} ${ui.cardHover}">
        <div class="relative aspect-square overflow-hidden bg-[#f5f5f7]">
          ${badge}${lowStock}${outOfStock}
          ${renderImageWithFallback({
            src: img,
            alt: p.name,
            imgClass: 'w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out',
          })}
        </div>
        <div class="p-4 md:p-5 text-right">
          <p class="text-[10px] text-muted mb-1.5 tracking-wide uppercase">${p.era || p.category_name || ''}</p>
          <h3 class="text-sm font-semibold text-body mb-3 line-clamp-2 leading-snug">${p.name}</h3>
          <div class="flex items-center justify-between gap-2">
            ${addBtn}
            <span class="text-sm font-bold text-body">${price}</span>
          </div>
        </div>
      </a>`;
  },

  bind(container, callbacks = {}) {
    container.querySelectorAll('.add-to-cart-quick').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
        const id = btn.dataset.productId;
        if (!id) return;
        const orig = btn.querySelector('.btn-inner')?.textContent || btn.textContent;
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
        const inner = btn.querySelector('.btn-inner');
        if (inner) inner.textContent = '✓';
        else btn.textContent = '✓';
        btn.classList.add('is-success');
        try {
          await callbacks.onAddToCart?.(id);
        } catch (_) { /* page handles toast */ }
        setTimeout(() => {
          btn.disabled = false;
          btn.removeAttribute('aria-disabled');
          if (inner) inner.textContent = orig;
          else btn.textContent = orig;
          btn.classList.remove('is-success');
        }, 1800);
      });
    });
  },
};

export default ProductCard;
