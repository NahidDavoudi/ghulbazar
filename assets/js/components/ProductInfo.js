import { storeConfig } from '../config/bootstrap.js';
import { formatPrice } from '../utils/priceFormatter.js';
import Button from './Button.js';

const ProductInfo = {
  render({
    name = '',
    price = 0,
    description = '',
    sizes = [],
    availableSizes = [],
    stock = 0,
    detailBullets = [],
    shippingText = '',
  } = {}) {
    const t = storeConfig.texts.product;
    const priceStr = formatPrice(price);
    const outOfStock = stock === 0;

    const sizeBtns = sizes.map((s) => {
      const available = availableSizes.includes(s);
      const unavailableClass = available
        ? 'product-size-btn border-black/10 hover:border-black/30 text-body'
        : 'product-size-unavailable border-black/10 text-muted/50 cursor-not-allowed';
      return `<button type="button" data-size="${s}" ${available ? '' : 'disabled'}
        class="product-size-btn relative w-11 h-11 rounded-lg border text-sm font-medium transition-colors ${unavailableClass}">${s}</button>`;
    }).join('');

    const bullets = detailBullets.map((item) =>
      `<li class="text-sm text-muted leading-relaxed">${item}</li>`).join('');

    return `
      <div class="product-info text-right">
        <h1 class="text-2xl md:text-4xl font-bold text-body leading-tight mb-3">${name}</h1>
        <p class="text-lg md:text-xl font-medium text-body mb-6">${priceStr}</p>
        ${description ? `<p class="text-sm md:text-base text-muted leading-relaxed mb-8 max-w-lg">${description}</p>` : ''}

        <div class="mb-8">
          <div class="flex items-center justify-between mb-3">
            <a href="${t.sizeGuideHref}" class="text-xs text-muted hover:text-body transition-colors underline-offset-2 hover:underline">${t.sizeGuide}</a>
            <span class="text-sm font-medium text-body">${t.sizeLabel}</span>
          </div>
          <div class="flex flex-wrap gap-2 justify-end">${sizeBtns}</div>
        </div>

        <div class="flex items-center gap-3 mb-4">
          <div class="flex items-center border border-black/10 rounded-full overflow-hidden shrink-0" dir="ltr">
            <button type="button" id="qty-minus" class="w-10 h-10 flex items-center justify-center text-body hover:bg-black/5 transition-colors">−</button>
            <span id="qty-value" class="w-10 text-center text-sm font-medium text-body">1</span>
            <button type="button" id="qty-plus" class="w-10 h-10 flex items-center justify-center text-body hover:bg-black/5 transition-colors">+</button>
          </div>
          <div class="flex-1">
            ${Button.render({
              variant: 'aluminum',
              label: t.addToCart,
              className: 'w-full product-add-btn',
              disabled: outOfStock,
              icon: '<i data-lucide="shopping-bag" class="w-4 h-4"></i>',
            })}
          </div>
        </div>

        <button type="button" id="quick-buy-btn"
                class="w-full text-center text-sm text-muted hover:text-body transition-colors mb-8 ${outOfStock ? 'opacity-40 pointer-events-none' : ''}"
                ${outOfStock ? 'disabled' : ''}>${t.quickBuy}</button>

        <div class="border-t border-black/10">
          <button type="button" data-accordion="details" aria-expanded="true"
                  class="product-acc-btn w-full flex items-center justify-between py-4 text-body">
            <i data-lucide="chevron-down" class="product-acc-icon w-4 h-4 transition-transform rotate-180"></i>
            <span class="font-medium text-sm">${t.detailsTitle}</span>
          </button>
          <div id="acc-details" class="product-acc-panel overflow-hidden" style="max-height:none">
            <ul class="pb-5 space-y-2 list-disc list-inside marker:text-muted">${bullets}</ul>
          </div>
        </div>

        <div class="border-t border-black/10">
          <button type="button" data-accordion="shipping" aria-expanded="false"
                  class="product-acc-btn w-full flex items-center justify-between py-4 text-body">
            <i data-lucide="chevron-down" class="product-acc-icon w-4 h-4 transition-transform"></i>
            <span class="font-medium text-sm">${t.shippingTitle}</span>
          </button>
          <div id="acc-shipping" class="product-acc-panel overflow-hidden" style="max-height:0">
            <p class="pb-5 text-sm text-muted leading-relaxed">${shippingText || t.shippingText}</p>
          </div>
        </div>
      </div>`;
  },

  bind(container, callbacks = {}) {
    let selectedSize = container.querySelector('.product-size-btn:not(.product-size-unavailable)')?.dataset.size || '';
    let qty = 1;
    const maxQty = callbacks.maxQty || 99;

    container.querySelectorAll('.product-size-btn:not(.product-size-unavailable)').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedSize = btn.dataset.size;
        container.querySelectorAll('.product-size-btn:not(.product-size-unavailable)').forEach((b) => {
          const active = b.dataset.size === selectedSize;
          b.classList.toggle('bg-body', active);
          b.classList.toggle('text-white', active);
          b.classList.toggle('border-body', active);
        });
        callbacks.onSizeChange?.(selectedSize);
      });
    });

    const firstAvailable = container.querySelector('.product-size-btn:not(.product-size-unavailable)');
    if (firstAvailable) {
      selectedSize = firstAvailable.dataset.size;
      firstAvailable.classList.add('bg-body', 'text-white', 'border-body');
    }

    const qtyVal = container.querySelector('#qty-value');
    container.querySelector('#qty-minus')?.addEventListener('click', () => {
      qty = Math.max(1, qty - 1);
      if (qtyVal) qtyVal.textContent = qty;
    });
    container.querySelector('#qty-plus')?.addEventListener('click', () => {
      qty = Math.min(maxQty, qty + 1);
      if (qtyVal) qtyVal.textContent = qty;
    });

    container.querySelector('.product-add-btn')?.addEventListener('click', async () => {
      await callbacks.onAddToCart?.({ size: selectedSize, qty });
    });

    container.querySelector('#quick-buy-btn')?.addEventListener('click', async () => {
      await callbacks.onQuickBuy?.({ size: selectedSize, qty });
    });

    container.querySelectorAll('.product-acc-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.accordion;
        const panel = container.querySelector(`#acc-${key}`);
        const icon = btn.querySelector('.product-acc-icon');
        if (!panel) return;
        const isOpen = panel.style.maxHeight && panel.style.maxHeight !== '0px';
        panel.style.maxHeight = isOpen ? '0px' : `${panel.scrollHeight}px`;
        btn.setAttribute('aria-expanded', String(!isOpen));
        if (icon) icon.classList.toggle('rotate-180', !isOpen);
      });
    });
  },
};

export default ProductInfo;
