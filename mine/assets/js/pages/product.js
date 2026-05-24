/**
 * pages/product.js
 * صفحه محصول — #/product?id=...
 *
 * وابستگی‌ها:
 *   api.js → window.API
 *   router.js → window.Router
 *   app.js → productCard, loadCartCount
 *   utils/dom.js → window.DOM
 */

;(function () {
  'use strict';

  const { show, hide, text, hashHref, reclone } = DOM;

  let _currentProduct = null;

  /* ── accordion (global چون onclick در HTML داره) ── */
  window.toggleAcc = function (id) {
    const content = document.getElementById(id + '-content');
    const icon    = document.getElementById(id + '-icon');
    const isOpen  = content.style.maxHeight && content.style.maxHeight !== '0px';
    content.style.maxHeight = isOpen ? '0px' : content.scrollHeight + 'px';
    if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
  };

  /* ── helpers ── */
  function _selectOption(btn, group) {
    btn.closest(`[id="${group}"]`).querySelectorAll('button').forEach(b => {
      b.classList.remove('border-[#cf1736]', 'bg-[#cf1736]/10', 'text-white');
      b.classList.add('border-[#47242a]', 'text-[rgba(255,255,255,0.6)]');
    });
    btn.classList.add('border-[#cf1736]', 'bg-[#cf1736]/10', 'text-white');
    btn.classList.remove('border-[#47242a]', 'text-[rgba(255,255,255,0.6)]');
  }

  function _changeImage(btn, src) {
    const mainImg = document.getElementById('main-image');
    if (mainImg) mainImg.src = src;
    document.querySelectorAll('.thumb-btn').forEach(t => t.classList.remove('border-[#cf1736]'));
    btn.classList.add('border-[#cf1736]');
  }

  function _renderStars(rating) {
    if (typeof renderStars === 'function') return renderStars(rating);
    const full = Math.round(rating || 5);
    return Array.from({ length: 5 }, (_, i) =>
      `<svg width="14" height="14" viewBox="0 0 24 24"
            fill="${i < full ? '#cf1736' : 'none'}"
            stroke="#cf1736" stroke-width="2">
         <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
       </svg>`
    ).join('');
  }

  /* ── Router ── */
  Router.onEnter('products', async function (params) {
    const { id } = params;
    if (!id) { Router.go('/shop'); return; }

    hide('product-detail');
    show('product-loading');

    try {
      const p = _currentProduct = await API.products.get(id);

      document.title = `${p.name} | غول بازار`;
      hide('product-loading');
      show('product-detail');

      // Breadcrumb
      const bc = document.getElementById('breadcrumb');
      if (bc) bc.innerHTML = `
        <a href="${hashHref('product', { id: p.id })}" data-link class="text-white">${p.name}</a>
        <span>/</span>
        <a href="${hashHref('shop', { era: p.era })}" data-link class="hover:text-white">${p.era || ''}</a>
        <span>/</span>
        <a href="#/" data-link class="hover:text-white">خانه</a>`;

      // Badges
      let badges = '';
      if (p.badge)    badges += `<span class="bg-[#2d161a] border border-[#47242a] text-[#c8939c] text-xs px-3 py-1 rounded-full">${p.badge}</span>`;
      if (p.stock <= 2) badges += `<span class="bg-[#cf1736]/20 border border-[#cf1736]/30 text-[#cf1736] text-xs px-3 py-1 rounded-full">آخرین موجودی</span>`;
      const badgesEl = document.getElementById('badges');
      if (badgesEl) badgesEl.innerHTML = badges;

      text('product-name',        p.name);
      text('product-description', p.description);
      text('product-price',       API.utils.formatPrice(p.price));
      text('product-stock',       `موجودی: ${p.stock} عدد`);
      text('history-text',        p.description);

      // Rating
      const ratingEl = document.getElementById('rating');
      if (ratingEl) ratingEl.innerHTML = `
        <span class="text-[rgba(255,255,255,0.6)] text-sm">(${p.reviews || 0} نظر)</span>
        <div class="flex gap-1">${_renderStars(p.rating || 5)}</div>
        <span class="text-white font-bold">${p.rating || 5}</span>`;

      // تصاویر
      const imgs    = p.images || [];
      const mainSrc = imgs.find(i => i.is_main)?.url || imgs[0]?.url || '';
      const mainImg = document.getElementById('main-image');
      if (mainImg) { mainImg.src = mainSrc; mainImg.alt = p.name; }

      const thumbsEl = document.getElementById('thumbnails');
      if (thumbsEl) {
        thumbsEl.innerHTML = imgs.map((img, i) => `
          <button class="thumb-btn rounded-xl overflow-hidden aspect-square border-2
                         ${i === 0 ? 'border-[#cf1736]' : 'border-transparent'}
                         hover:border-[#c8939c] transition-colors">
            <img src="${img.url}" alt="" class="w-full h-full object-cover">
          </button>`).join('');
        thumbsEl.querySelectorAll('.thumb-btn').forEach((btn, i) => {
          btn.addEventListener('click', () => _changeImage(btn, imgs[i].url));
        });
      }

      // Options
      const options   = p.options || [];
      const chainOpts = options.filter(o => o.option_type === 'chain_length');
      const sizeOpts  = options.filter(o => o.option_type === 'size');

      const chainSec = document.getElementById('chain-section');
      const chainEl  = document.getElementById('chain-options');
      if (chainOpts.length && chainSec && chainEl) {
        chainSec.classList.remove('hidden');
        chainEl.innerHTML = chainOpts.map((o, i) => `
          <button class="px-4 py-2.5 rounded-lg border text-sm font-medium transition-all
                         ${i === 0 ? 'border-[#cf1736] bg-[#cf1736]/10 text-white' : 'border-[#47242a] text-[rgba(255,255,255,0.6)] hover:border-[#c8939c]'}">
            ${o.option_value}
          </button>`).join('');
        chainEl.querySelectorAll('button').forEach(btn =>
          btn.addEventListener('click', () => _selectOption(btn, 'chain-options'))
        );
      }

      const sizeSec = document.getElementById('size-section');
      const sizeEl  = document.getElementById('size-options');
      if (sizeOpts.length && sizeSec && sizeEl) {
        sizeSec.classList.remove('hidden');
        sizeEl.innerHTML = sizeOpts.map((o, i) => `
          <button class="px-4 py-2.5 rounded-lg border text-sm font-medium transition-all
                         ${i === 0 ? 'border-[#cf1736] bg-[#cf1736]/10 text-white' : 'border-[#47242a] text-[rgba(255,255,255,0.6)] hover:border-[#c8939c]'}">
            ${o.option_value}
          </button>`).join('');
        sizeEl.querySelectorAll('button').forEach(btn =>
          btn.addEventListener('click', () => _selectOption(btn, 'size-options'))
        );
      }

      // Add to cart
      const newAddBtn = reclone('add-to-cart-btn');
      if (newAddBtn) {
        newAddBtn.addEventListener('click', async function () {
          try {
            this.disabled = true;
            const opts = {};
            const selectedChain = chainEl?.querySelector('button.border-\\[\\#cf1736\\]');
            const selectedSize  = sizeEl?.querySelector('button.border-\\[\\#cf1736\\]');
            if (selectedChain) opts.chain_length = selectedChain.textContent.trim();
            if (selectedSize)  opts.size         = selectedSize.textContent.trim();

            await API.cart.add(p.id, 1, opts);
            loadCartCount?.();

            const toast = document.getElementById('added-toast');
            if (toast) toast.classList.remove('hidden');
            this.textContent = '✓ اضافه شد';
            setTimeout(() => {
              this.innerHTML = 'افزودن به مجموعه';
              this.disabled  = false;
            }, 2000);
          } catch (e) {
            API.utils.toast(e.message, 'error');
            this.disabled = false;
          }
        });
      }

      // Related products
      if (p.related?.length) {
        const relSec  = document.getElementById('related-section');
        const relWrap = document.getElementById('related-wrapper');
        if (relSec && relWrap) {
          relSec.classList.remove('hidden');
          relWrap.innerHTML = p.related.map(r =>
            `<div class="swiper-slide">${productCard(r)}</div>`
          ).join('');
          new Swiper('.related-swiper', {
            slidesPerView: 1.8, spaceBetween: 12,
            breakpoints: { 480: { slidesPerView: 2.2 }, 640: { slidesPerView: 3 }, 1024: { slidesPerView: 4, spaceBetween: 20 } },
          });
        }
      }

    } catch (e) {
      const loadEl = document.getElementById('product-loading');
      if (loadEl) loadEl.innerHTML = `<p class="text-[#cf1736] text-xl text-center">${e.message}</p>`;
    }
  });

})();
