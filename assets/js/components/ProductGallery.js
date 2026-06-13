import { storeConfig } from '../config/bootstrap.js';

const ProductGallery = {
  render({ images = [], name = '', refCode = '' }) {
    const t = storeConfig.texts.product;
    const placeholder = storeConfig.placeholder;
    const mainSrc = images[0]?.url || placeholder;

    const thumbs = images.length
      ? images.map((img, i) => `
          <button type="button" data-thumb-index="${i}"
                  class="product-thumb w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-colors
                         ${i === 0 ? 'border-body' : 'border-transparent hover:border-black/20'}">
            <img src="${img.url}" alt="" class="w-full h-full object-cover"
                 onerror="this.onerror=null;this.src='${placeholder}'">
          </button>`).join('')
      : `<div class="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-[#f2f2f2]"></div>`;

    return `
      <div class="product-gallery">
        <p class="text-[10px] text-muted tracking-widest mb-3 text-right" dir="ltr">${t.refPrefix} ${refCode}</p>
        <div class="flex gap-3 md:gap-4 items-start">
          <div class="flex flex-col gap-2 shrink-0">${thumbs}</div>
          <div class="flex-1 min-w-0">
            <div class="relative aspect-square bg-[#f2f2f2] rounded-2xl overflow-hidden">
              <img id="product-main-image" src="${mainSrc}" alt="${name}"
                   class="w-full h-full object-cover"
                   onerror="this.onerror=null;this.src='${placeholder}'">
            </div>
          </div>
        </div>
      </div>`;
  },

  bind(container, callbacks = {}) {
    const mainImg = container.querySelector('#product-main-image');
    const images = callbacks.images || [];

    container.querySelectorAll('.product-thumb').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.thumbIndex, 10);
        const src = images[idx]?.url;
        if (!src || !mainImg) return;
        mainImg.src = src;
        container.querySelectorAll('.product-thumb').forEach((t) => {
          t.classList.toggle('border-body', t === btn);
          t.classList.toggle('border-transparent', t !== btn);
        });
        callbacks.onThumbChange?.(idx);
      });
    });
  },
};

export default ProductGallery;
