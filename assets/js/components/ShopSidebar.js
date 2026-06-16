import { storeConfig } from '../config/bootstrap.js';
import { formatPrice } from '../utils/priceFormatter.js';
import Button from './Button.js';

const ShopSidebar = {
  render({ activeSize = '', activeColors = [], priceMin = 0, priceMax = 0 } = {}) {
    const t = storeConfig.texts.shop;
    const range = t.priceRange;

    const sizeBtns = t.sizes.map((s) => {
      const active = activeSize === s;
      return `<button type="button" data-size="${s}"
        class="shop-size-btn w-10 h-10 rounded-lg text-sm font-medium border transition-colors
               ${active
                 ? 'bg-accent text-white border-accent'
                 : 'bg-card text-body border-border hover:border-accent/40'}">${s}</button>`;
    }).join('');

    const colorChecks = t.colors.map((c) => {
      const checked = activeColors.includes(c.id);
      return `
        <label class="flex items-center gap-3 flex-row-reverse cursor-pointer group">
          <input type="checkbox" data-color="${c.id}" ${checked ? 'checked' : ''}
                 class="shop-color-check w-4 h-4 rounded border-border text-accent focus:ring-0 focus:ring-offset-0">
          <span class="text-sm text-body/80 group-hover:text-body transition-colors">${c.label}</span>
        </label>`;
    }).join('');

    const minVal = priceMin || range.min;
    const maxVal = priceMax || range.max;

    return `
      <aside id="shop-sidebar" class="shop-sidebar w-full md:w-56 lg:w-64 shrink-0">
        <div class="flex items-center justify-between mb-6 md:mb-8">
          <h2 class="text-lg font-bold text-body">${t.filtersTitle}</h2>
          <button id="sidebar-close" type="button" class="md:hidden text-muted hover:text-body p-1" aria-label="بستن">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="mb-8">
          <h3 class="text-sm font-medium text-body mb-3">${t.sizeLabel}</h3>
          <div class="flex flex-wrap gap-2 justify-end">${sizeBtns}</div>
        </div>

        <div class="mb-8">
          <h3 class="text-sm font-medium text-body mb-3">${t.colorLabel}</h3>
          <div class="space-y-3">${colorChecks}</div>
        </div>

        <div class="mb-8">
          <h3 class="text-sm font-medium text-body mb-4">${t.priceLabel}</h3>
          <div class="space-y-4">
            <input type="range" id="price-range-min" min="${range.min}" max="${range.max}"
                   step="${range.step}" value="${minVal}"
                   class="shop-price-range w-full accent-body">
            <input type="range" id="price-range-max" min="${range.min}" max="${range.max}"
                   step="${range.step}" value="${maxVal}"
                   class="shop-price-range w-full accent-body">
            <div class="flex items-center justify-between gap-2 text-xs text-muted" dir="ltr">
              <span id="price-min-label">${formatPrice(minVal)}</span>
              <span>—</span>
              <span id="price-max-label">${formatPrice(maxVal)}</span>
            </div>
          </div>
        </div>

        ${Button.render({
          variant: 'aluminum',
          label: t.applyFilters,
          className: 'w-full shop-apply-btn',
          attrs: { 'data-action': 'apply-filters' },
        })}

        <button type="button" id="clear-filters"
                class="hidden w-full mt-3 text-sm text-muted hover:text-body transition-colors text-center">
          ${t.clearFilters}
        </button>
      </aside>`;
  },

  bind(container, callbacks = {}) {
    let selectedSize = container.querySelector('.shop-size-btn.bg-accent')?.dataset.size || '';

    container.querySelectorAll('.shop-size-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = btn.dataset.size;
        selectedSize = selectedSize === size ? '' : size;
        container.querySelectorAll('.shop-size-btn').forEach((b) => {
          const active = b.dataset.size === selectedSize;
          b.classList.toggle('bg-accent', active);
          b.classList.toggle('text-white', active);
          b.classList.toggle('border-accent', active);
          b.classList.toggle('bg-card', !active);
          b.classList.toggle('text-body', !active);
          b.classList.toggle('border-border', !active);
        });
      });
    });

    const minRange = container.querySelector('#price-range-min');
    const maxRange = container.querySelector('#price-range-max');
    const minLabel = container.querySelector('#price-min-label');
    const maxLabel = container.querySelector('#price-max-label');

    function syncPriceLabels() {
      if (!minRange || !maxRange) return;
      let min = parseInt(minRange.value, 10);
      let max = parseInt(maxRange.value, 10);
      if (min > max) {
        [min, max] = [max, min];
        minRange.value = min;
        maxRange.value = max;
      }
      if (minLabel) minLabel.textContent = formatPrice(min);
      if (maxLabel) maxLabel.textContent = formatPrice(max);
    }

    minRange?.addEventListener('input', syncPriceLabels);
    maxRange?.addEventListener('input', syncPriceLabels);

    container.querySelector('.shop-apply-btn')?.addEventListener('click', () => {
      const colors = [...container.querySelectorAll('.shop-color-check:checked')]
        .map((el) => el.dataset.color);
      callbacks.onApply?.({
        size: selectedSize,
        colors,
        priceMin: parseInt(minRange?.value || 0, 10),
        priceMax: parseInt(maxRange?.value || 0, 10),
      });
    });

    container.querySelector('#clear-filters')?.addEventListener('click', () => {
      callbacks.onClear?.();
    });

    container.querySelector('#sidebar-close')?.addEventListener('click', () => {
      callbacks.onClose?.();
    });
  },
};

export default ShopSidebar;
