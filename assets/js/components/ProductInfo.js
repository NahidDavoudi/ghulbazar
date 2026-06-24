import { storeConfig } from '../config/bootstrap.js';
import { formatPrice } from '../utils/priceFormatter.js';
import { escapeHtml, escapeAttr } from '../utils/htmlEscape.js';
import Button from './Button.js';

function buildValueMap(variant) {
  const map = {};
  (variant.attribute_values || []).forEach((av) => {
    map[av.type_slug] = Number(av.id);
  });
  return map;
}

function findMatchingVariant(variants, variantAxes, selected) {
  const axisSlugs = variantAxes.map((a) => a.type_slug);
  if (!axisSlugs.length) {
    return variants.find((v) => v.is_default)
      || variants.find((v) => v.is_active)
      || variants[0]
      || null;
  }

  if (!axisSlugs.every((slug) => selected[slug])) return null;

  return variants.find((v) => {
    if (!v.is_active) return false;
    const valueMap = buildValueMap(v);
    return axisSlugs.every((slug) => valueMap[slug] === Number(selected[slug]));
  }) || null;
}

function isValueSelectable(variants, variantAxes, selected, axisSlug, valueId) {
  const axisSlugs = variantAxes.map((a) => a.type_slug);

  return variants.some((v) => {
    if (!v.is_active || (v.inventory?.quantity ?? 0) <= 0) return false;
    const valueMap = buildValueMap(v);
    if (valueMap[axisSlug] !== Number(valueId)) return false;
    return axisSlugs.every((slug) => {
      if (slug === axisSlug) return true;
      if (selected[slug] == null) return true;
      return valueMap[slug] === Number(selected[slug]);
    });
  });
}

function findInitialSelection(variants, variantAxes) {
  const selected = {};
  const axisSlugs = variantAxes.map((a) => a.type_slug);
  const firstInStock = variants.find(
    (v) => v.is_active && (v.inventory?.quantity ?? 0) > 0,
  );

  if (firstInStock) {
    const valueMap = buildValueMap(firstInStock);
    axisSlugs.forEach((slug) => {
      if (valueMap[slug]) selected[slug] = valueMap[slug];
    });
  }

  return selected;
}

function getVariantUi() {
  return storeConfig.ui.variant || {};
}

function renderAxis(axis, variants, variantAxes, selectedValues) {
  const ui = getVariantUi();
  const selected = selectedValues[axis.type_slug] || null;
  const isSwatch = axis.input_type === 'swatch';

  return axis.values.map((val) => {
    const selectable = isValueSelectable(variants, variantAxes, selectedValues, axis.type_slug, val.id);
    const active = Number(selected) === Number(val.id);
    const style = val.swatch_hex ? `background:${escapeAttr(val.swatch_hex)}` : '';

    if (isSwatch) {
      const stateClass = !selectable
        ? ui.swatchDisabled
        : active
          ? ui.swatchActive
          : ui.swatchInactive;
      return `<button type="button" data-axis="${escapeAttr(axis.type_slug)}" data-value-id="${val.id}"
        ${selectable ? '' : 'disabled'}
        class="product-variant-btn w-9 h-9 rounded-full border-2 transition-all ${stateClass}"
        title="${escapeAttr(val.value)}" style="${style}"></button>`;
    }

    const stateClass = !selectable
      ? ui.textDisabled
      : active
        ? ui.textActive
        : ui.textInactive;
    return `<button type="button" data-axis="${escapeAttr(axis.type_slug)}" data-value-id="${val.id}"
      ${selectable ? '' : 'disabled'}
      class="product-variant-btn relative min-w-[2.75rem] h-11 px-3 rounded-lg border text-sm font-medium transition-colors ${stateClass}
        ${!selectable ? 'product-size-unavailable' : ''}">${escapeHtml(val.value)}</button>`;
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
    const desc = escapeHtml(shortDescription || description);
    const safeName = escapeHtml(name);
    const safeShipping = escapeHtml(shippingText || t.shippingText);
    const initialSelected = variantAxes.length
      ? findInitialSelection(variants, variantAxes)
      : {};

    const axesHtml = variantAxes.length
      ? variantAxes.map((axis) => `
          <div class="mb-6" data-variant-axis="${escapeAttr(axis.type_slug)}">
            <p class="text-sm font-medium text-body mb-3">${escapeHtml(axis.type_name)}</p>
            <div class="flex flex-wrap gap-2 justify-end">${renderAxis(axis, variants, variantAxes, initialSelected)}</div>
          </div>`).join('')
      : '';

    const bullets = detailBullets.map((item) =>
      `<li class="text-sm text-muted leading-relaxed">${escapeHtml(item)}</li>`).join('');

    return `
      <div class="product-info text-right">
        <h1 class="text-2xl md:text-4xl font-bold text-body leading-tight mb-3">${safeName}</h1>
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
          ${outOfStock ? (t.outOfStock || 'ناموجود') : ''}
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
            <p class="pb-5 text-sm text-muted leading-relaxed">${safeShipping}</p>
          </div>
        </div>
      </div>`;
  },

  bind(container, callbacks = {}) {
    const {
      variants = [],
      variantAxes = [],
      getVariantPrice = () => 0,
    } = callbacks;

    const t = storeConfig.texts.product;
    const ui = getVariantUi();
    const selected = variantAxes.length
      ? findInitialSelection(variants, variantAxes)
      : {};
    let qty = 1;
    let maxQty = callbacks.maxQty || 99;

    function applyButtonState(btn, axis, valueId) {
      const selectable = isValueSelectable(variants, variantAxes, selected, axis, valueId);
      const active = Number(selected[axis]) === Number(valueId);
      const isSwatch = btn.classList.contains('rounded-full');

      btn.disabled = !selectable;

      if (isSwatch) {
        btn.className = `product-variant-btn w-9 h-9 rounded-full border-2 transition-all ${
          !selectable ? ui.swatchDisabled : active ? ui.swatchActive : ui.swatchInactive
        }`;
      } else {
        btn.className = `product-variant-btn relative min-w-[2.75rem] h-11 px-3 rounded-lg border text-sm font-medium transition-colors ${
          !selectable ? ui.textDisabled : active ? ui.textActive : ui.textInactive
        } ${!selectable ? 'product-size-unavailable' : ''}`;
      }

      btn.classList.toggle('is-active', active && selectable);
    }

    function refreshVariantButtons() {
      container.querySelectorAll('.product-variant-btn').forEach((btn) => {
        applyButtonState(btn, btn.dataset.axis, Number(btn.dataset.valueId));
      });
    }

    function updateUI() {
      const variant = findMatchingVariant(variants, variantAxes, selected);
      const axisSlugs = variantAxes.map((a) => a.type_slug);
      const allSelected = !axisSlugs.length || axisSlugs.every((slug) => selected[slug]);
      const stock = variant ? Number(variant.inventory?.quantity ?? 0) : 0;

      maxQty = Math.max(1, stock || 1);
      if (variant && stock > 0 && qty > stock) {
        qty = stock;
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
      const canOrder = variant && stock > 0;
      const out = !canOrder;

      if (addBtn) addBtn.disabled = out;
      if (quickBtn) {
        quickBtn.disabled = out;
        quickBtn.classList.toggle('opacity-40', out);
        quickBtn.classList.toggle('pointer-events-none', out);
      }
      if (stockHint) {
        let hint = '';
        if (variantAxes.length && !allSelected) {
          hint = t.selectOptionsHint || t.selectVariant;
        } else if (out) {
          hint = t.outOfStock || 'ناموجود';
        }
        stockHint.textContent = hint;
        stockHint.classList.toggle('text-accent', !!hint);
      }

      refreshVariantButtons();
      callbacks.onVariantChange?.(variant);
    }

    container.querySelectorAll('.product-variant-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        selected[btn.dataset.axis] = Number(btn.dataset.valueId);
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
      const variant = findMatchingVariant(variants, variantAxes, selected);
      const stock = variant ? Number(variant.inventory?.quantity ?? 0) : maxQty;
      qty = Math.min(Math.max(1, stock), qty + 1);
      if (qtyVal) qtyVal.textContent = qty;
    });

    container.querySelector('.product-add-btn')?.addEventListener('click', async () => {
      const variant = findMatchingVariant(variants, variantAxes, selected);
      await callbacks.onAddToCart?.({ variant, qty });
    });

    container.querySelector('#quick-buy-btn')?.addEventListener('click', async () => {
      const variant = findMatchingVariant(variants, variantAxes, selected);
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
