import { storeConfig } from '../config/bootstrap.js';
import { formatPrice } from '../utils/priceFormatter.js';
import Button from './Button.js';

function renderAxis(axis, variants, selectedValues) {
  const selected = selectedValues[axis.type_slug] || null;

  if (axis.input_type === 'swatch') {
    return axis.values.map((val) => {
      const hasStock = variants.some((v) =>
        v.is_active &&
        (v.inventory?.quantity ?? 0) > 0 &&
        (v.attribute_values || []).some((av) => Number(av.id) === Number(val.id)),
      );
      const active = Number(selected) === Number(val.id);
      const style = val.swatch_hex ? `background:${val.swatch_hex}` : '';
      return `<button type="button" data-axis="${axis.type_slug}" data-value-id="${val.id}"
        ${hasStock ? '' : 'disabled'}
        class="product-variant-btn w-9 h-9 rounded-full border-2 transition-all ${active ? 'border-body ring-2 ring-body/30' : 'border-black/10'} ${hasStock ? '' : 'opacity-30 cursor-not-allowed'}"
        title="${val.value}" style="${style}"></button>`;
    }).join('');
  }

  return axis.values.map((val) => {
    const hasStock = variants.some((v) =>
      v.is_active &&
      (v.inventory?.quantity ?? 0) > 0 &&
      (v.attribute_values || []).some((av) => Number(av.id) === Number(val.id)),
    );
    const active = Number(selected) === Number(val.id);
    return `<button type="button" data-axis="${axis.type_slug}" data-value-id="${val.id}"
      ${hasStock ? '' : 'disabled'}
      class="product-variant-btn min-w-[2.75rem] h-11 px-3 rounded-lg border text-sm font-medium transition-colors
        ${active ? 'bg-body text-white border-body' : hasStock ? 'border-black/10 hover:border-black/30 text-body' : 'border-black/10 text-muted/50 cursor-not-allowed'}">${val.value}</button>`;
  }).join('');
}

const ProductInfo = {
  render({
    name = '',
    price = 0,
    description = '',
    shortDescription = '',
    variantAxes = [],
    variants = [],
    stock = 0,
    detailBullets = [],
    shippingText = '',
  } = {}) {
    const t = storeConfig.texts.product;
    const priceStr = formatPrice(price);
    const outOfStock = stock === 0;
    const desc = shortDescription || description;

    const axesHtml = variantAxes.length
      ? variantAxes.map((axis) => `
          <div class="mb-6" data-variant-axis="${axis.type_slug}">
            <p class="text-sm font-medium text-body mb-3">${axis.type_name}</p>
            <div class="flex flex-wrap gap-2 justify-end">${renderAxis(axis, variants, {})}</div>
          </div>`).join('')
      : '';

    const bullets = detailBullets.map((item) =>
      `<li class="text-sm text-muted leading-relaxed">${item}</li>`).join('');

    return `
      <div class="product-info text-right">
        <h1 class="text-2xl md:text-4xl font-bold text-body leading-tight mb-3">${name}</h1>
        <p id="product-live-price" class="text-lg md:text-xl font-medium text-body mb-6">${priceStr}</p>
        ${desc ? `<p class="text-sm md:text-base text-muted leading-relaxed mb-8 max-w-lg">${desc}</p>` : ''}

        <div id="product-variant-selectors">${axesHtml}</div>

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

        <p id="product-stock-hint" class="text-xs text-muted mb-4 ${outOfStock ? 'text-accent' : ''}">
          ${outOfStock ? t.outOfStock || 'ناموجود' : ''}
        </p>

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
    const {
      variants = [],
      variantAxes = [],
      resolveVariant = () => null,
      getVariantPrice = () => 0,
    } = callbacks;

    const selected = {};
    let qty = 1;
    let maxQty = callbacks.maxQty || 99;

    function findMatchingVariant() {
      const axisSlugs = variantAxes.map((a) => a.type_slug);
      if (!axisSlugs.length) return resolveVariant(selected);

      const allSelected = axisSlugs.every((slug) => selected[slug]);
      if (!allSelected) return null;

      return variants.find((v) => {
        if (!v.is_active) return false;
        const valueMap = {};
        (v.attribute_values || []).forEach((av) => {
          valueMap[av.type_slug] = Number(av.id);
        });
        return axisSlugs.every((slug) => valueMap[slug] === Number(selected[slug]));
      }) || null;
    }

    function updateUI() {
      const variant = findMatchingVariant();
      const stock = variant ? Number(variant.inventory?.quantity ?? 0) : maxQty;
      maxQty = Math.max(1, stock);
      if (qty > maxQty) {
        qty = maxQty;
        const qtyVal = container.querySelector('#qty-value');
        if (qtyVal) qtyVal.textContent = qty;
      }

      const priceEl = container.querySelector('#product-live-price');
      if (priceEl && variant) {
        priceEl.textContent = formatPrice(getVariantPrice(variant));
      }

      const addBtn = container.querySelector('.product-add-btn');
      const quickBtn = container.querySelector('#quick-buy-btn');
      const stockHint = container.querySelector('#product-stock-hint');
      const out = !variant || stock === 0;

      if (addBtn) addBtn.disabled = out;
      if (quickBtn) {
        quickBtn.disabled = out;
        quickBtn.classList.toggle('opacity-40', out);
        quickBtn.classList.toggle('pointer-events-none', out);
      }
      if (stockHint) {
        stockHint.textContent = out
          ? (storeConfig.texts.product.outOfStock || 'ناموجود')
          : '';
        stockHint.classList.toggle('text-accent', out);
      }

      callbacks.onVariantChange?.(variant);
    }

    variantAxes.forEach((axis) => {
      const firstAvailable = axis.values.find((val) =>
        variants.some((v) =>
          v.is_active &&
          (v.inventory?.quantity ?? 0) > 0 &&
          (v.attribute_values || []).some((av) => Number(av.id) === Number(val.id)),
        ),
      );
      if (firstAvailable) selected[axis.type_slug] = firstAvailable.id;
    });

    container.querySelectorAll('.product-variant-btn:not([disabled])').forEach((btn) => {
      const axis = btn.dataset.axis;
      const valueId = Number(btn.dataset.valueId);
      if (Number(selected[axis]) === valueId) {
        if (btn.classList.contains('rounded-full')) {
          btn.classList.add('border-body', 'ring-2', 'ring-body/30');
        } else {
          btn.classList.add('bg-body', 'text-white', 'border-body');
        }
      }

      btn.addEventListener('click', () => {
        selected[axis] = valueId;
        container.querySelectorAll(`.product-variant-btn[data-axis="${axis}"]`).forEach((b) => {
          if (b.classList.contains('rounded-full')) {
            b.classList.toggle('border-body', Number(b.dataset.valueId) === valueId);
            b.classList.toggle('ring-2', Number(b.dataset.valueId) === valueId);
            b.classList.toggle('ring-body/30', Number(b.dataset.valueId) === valueId);
          } else {
            const active = Number(b.dataset.valueId) === valueId;
            b.classList.toggle('bg-body', active);
            b.classList.toggle('text-white', active);
            b.classList.toggle('border-body', active);
          }
        });
        updateUI();
      });
    });

    updateUI();

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
      const variant = findMatchingVariant();
      await callbacks.onAddToCart?.({ variant, qty });
    });

    container.querySelector('#quick-buy-btn')?.addEventListener('click', async () => {
      const variant = findMatchingVariant();
      await callbacks.onQuickBuy?.({ variant, qty });
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
