import { storeConfig } from '../config/bootstrap.js';
import { formatPrice } from '../utils/priceFormatter.js';
import DOM from '../utils/dom.js';

const ProductCard = {
  render(p) {
    const ui = storeConfig.ui;
    const img = p.images?.find((i) => i.is_main)?.url || p.images?.[0]?.url || p.image || '';
    const price = formatPrice(p.price);
    const href = DOM.hashHref('product', { id: p.id });
    const placeholder = storeConfig.placeholder;

    const badge = p.badge
      ? `<span class="absolute top-3 right-3 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">${p.badge}</span>`
      : '';
    const lowStock = p.stock <= 2 && p.stock > 0
      ? `<span class="absolute top-3 left-3 bg-black/60 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full z-10">آخرین موجودی</span>`
      : '';
    const outOfStock = p.stock === 0
      ? `<div class="absolute inset-0 bg-black/60 flex items-center justify-center ${ui.cardRadius} z-10"><span class="text-sm text-white/70 font-medium">ناموجود</span></div>`
      : '';

    return `
      <a href="${href}" data-link
         class="group block ${ui.cardBase} ${ui.cardRadius} overflow-hidden ${ui.cardHover} hover:shadow-[0_8px_30px_rgba(75,107,138,0.12)]">
        <div class="relative aspect-square overflow-hidden">
          ${badge}${lowStock}${outOfStock}
          <img src="${img}" alt="${p.name}"
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
               onerror="this.src='${placeholder}'">
        </div>
        <div class="p-3 md:p-4 text-right">
          <p class="text-xs text-accent/70 mb-1 truncate">${p.era || p.category_name || ''}</p>
          <h3 class="text-sm font-medium text-body mb-2 line-clamp-2 leading-snug">${p.name}</h3>
          <div class="flex items-center justify-between">
            <button class="add-to-cart-quick w-7 h-7 ${ui.btnRadius} bg-transparent border border-border flex items-center justify-center text-muted hover:bg-accent hover:border-accent hover:text-white transition-all text-sm"
                    data-product-id="${p.id}" title="افزودن به سبد" ${p.stock === 0 ? 'disabled' : ''}>+</button>
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
        if (btn.disabled) return;
        const id = btn.dataset.productId;
        if (!id) return;
        const orig = btn.textContent;
        btn.disabled = true;
        btn.textContent = '✓';
        btn.classList.add('bg-accent', 'border-accent', 'text-white');
        try {
          await callbacks.onAddToCart?.(id);
        } catch (_) { /* page handles toast */ }
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = orig;
          btn.classList.remove('bg-accent', 'border-accent', 'text-white');
        }, 1800);
      });
    });
  },
};

export default ProductCard;
