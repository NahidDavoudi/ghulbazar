import VariantTable from '../../../components/VariantTable.js';

const VariantsTab = {
  render({ attributeTypes = [], variants = [], t = {} } = {}) {
    const axes = attributeTypes.filter((at) => Number(at.is_variant_axis) === 1);
    const axisHtml = axes.map((axis) => {
      const chips = (axis.values || []).map((v) => `
        <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-sm cursor-pointer hover:border-accent transition-colors">
          <input type="checkbox" class="variant-axis-value rounded" data-type-id="${axis.id}" value="${v.id}">
          ${axis.input_type === 'swatch' && v.swatch_hex
            ? `<span class="w-4 h-4 rounded-full border border-border" style="background:${v.swatch_hex}"></span>` : ''}
          <span>${v.value}</span>
        </label>`).join('');

      return `
        <div class="mb-4" data-axis-type="${axis.id}">
          <p class="text-sm font-medium text-body mb-2">${axis.name}</p>
          <div class="flex flex-wrap gap-2">${chips || `<span class="text-xs text-dim">${t.noValues || 'مقداری تعریف نشده'}</span>`}</div>
        </div>`;
    }).join('');

    return `
      <div id="productTabVariants" class="space-y-4">
        <p class="text-sm text-muted">${t.variantsHint || 'محورهای واریانت را انتخاب کنید و دکمه تولید را بزنید.'}</p>
        <div id="variantAxesPanel">${axisHtml || `<p class="text-dim text-sm">${t.noAxes || 'محور واریانتی تعریف نشده'}</p>`}</div>
        <button type="button" id="btnGenerateVariants"
                class="bg-surface hover:bg-card border border-border text-body px-4 py-2 rounded-xl text-sm transition-colors">
          ${t.generateVariants || 'تولید واریانت‌ها'}
        </button>
        <div id="variantTableWrap">${VariantTable.render({ variants, t })}</div>
      </div>`;
  },

  bind(container, callbacks = {}) {
    container.querySelector('#btnGenerateVariants')?.addEventListener('click', () => {
      const axes = [];
      const typeIds = new Set();
      container.querySelectorAll('.variant-axis-value:checked').forEach((cb) => {
        const typeId = Number(cb.dataset.typeId);
        if (!typeIds.has(typeId)) {
          typeIds.add(typeId);
          axes.push({ type_id: typeId, value_ids: [] });
        }
        const axis = axes.find((a) => a.type_id === typeId);
        axis.value_ids.push(Number(cb.value));
      });
      callbacks.onGenerate?.(axes);
    });
  },

  collectVariants(container) {
    const wrap = container.querySelector('#variantTableWrap');
    return VariantTable.collectRows(wrap);
  },

  updateTable(container, variants, t) {
    const wrap = container.querySelector('#variantTableWrap');
    if (wrap) {
      wrap.innerHTML = VariantTable.render({ variants, t });
      VariantTable.bindPriceInputs(wrap);
    }
  },

  bindPriceInputs(container) {
    const wrap = container?.querySelector('#variantTableWrap');
    if (wrap) VariantTable.bindPriceInputs(wrap);
  },
};

export default VariantsTab;
