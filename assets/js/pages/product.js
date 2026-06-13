/**
 * pages/product.js
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import ProductCard from '../components/ProductCard.js';
import Breadcrumb from '../components/Breadcrumb.js';
import { storeConfig } from '../config/bootstrap.js';
import { pageTitle } from '../core/theme.js';
import DOM from '../utils/dom.js';

const { show, hide, text, hashHref, reclone } = DOM;

let _currentProduct = null;

window.toggleAcc = function (id) {
  const content = document.getElementById(id + '-content');
  const icon = document.getElementById(id + '-icon');
  const isOpen = content.style.maxHeight && content.style.maxHeight !== '0px';
  content.style.maxHeight = isOpen ? '0px' : content.scrollHeight + 'px';
  if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
};

function _selectOption(btn, groupId) {
  const group = btn.closest(`#${groupId}`);
  group.querySelectorAll('button').forEach((b) => {
    b.classList.remove('border-accent', 'bg-accent/10', 'text-body');
    b.classList.add('border-border', 'text-muted');
  });
  btn.classList.add('border-accent', 'bg-accent/10', 'text-body');
  btn.classList.remove('border-border', 'text-muted');
}

function _changeImage(btn, src) {
  const mainImg = document.getElementById('main-image');
  if (mainImg) mainImg.src = src;
  document.querySelectorAll('.thumb-btn').forEach((t) => t.classList.remove('border-accent'));
  btn.classList.add('border-accent');
}

function renderStars(rating) {
  const full = Math.round(rating || 0);
  return Array.from({ length: 5 }, (_, i) => `
    <svg width="13" height="13" viewBox="0 0 24 24"
         fill="${i < full ? 'var(--color-accent)' : 'none'}"
         stroke="var(--color-accent)" stroke-width="2">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>`).join('');
}

Router.onEnter('products', async function (params) {
  const { id } = params;
  if (!id) { Router.go('/shop'); return; }

  hide('product-detail');
  show('product-loading');

  try {
    const p = _currentProduct = await api.products.get(id);
    pageTitle(p.name);
    hide('product-loading');
    show('product-detail');

    const bc = document.getElementById('breadcrumb');
    if (bc) {
      bc.innerHTML = Breadcrumb.render([
        { href: hashHref('product', { id: p.id }), label: p.name },
        { href: hashHref('shop', { era: p.era }), label: p.era || '' },
        { href: '#/', label: 'خانه' },
      ]);
    }

    let badges = '';
    if (p.badge) badges += `<span class="bg-surface border border-border text-muted text-xs px-3 py-1 rounded-full">${p.badge}</span>`;
    if (p.stock <= 2) badges += `<span class="bg-accent/20 border border-accent/30 text-accent text-xs px-3 py-1 rounded-full">آخرین موجودی</span>`;
    const badgesEl = document.getElementById('badges');
    if (badgesEl) badgesEl.innerHTML = badges;

    text('product-name', p.name);
    text('product-description', p.description);
    text('product-price', api.utils.formatPrice(p.price));
    text('product-stock', `موجودی: ${p.stock} عدد`);
    text('history-text', p.description);

    const ratingEl = document.getElementById('rating');
    if (ratingEl) {
      ratingEl.innerHTML = `
        <span class="text-muted text-sm">(${p.reviews || 0} نظر)</span>
        <div class="flex gap-1">${renderStars(p.rating || 5)}</div>
        <span class="text-body font-bold">${p.rating || 5}</span>`;
    }

    const imgs = p.images || [];
    const mainSrc = imgs.find((i) => i.is_main)?.url || imgs[0]?.url || '';
    const mainImg = document.getElementById('main-image');
    if (mainImg) { mainImg.src = mainSrc; mainImg.alt = p.name; }

    const thumbsEl = document.getElementById('thumbnails');
    if (thumbsEl) {
      thumbsEl.innerHTML = imgs.map((img, i) => `
        <button class="thumb-btn rounded-xl overflow-hidden aspect-square border-2
                       ${i === 0 ? 'border-accent' : 'border-transparent'} hover:border-accent/60 transition-colors">
          <img src="${img.url}" alt="" class="w-full h-full object-cover">
        </button>`).join('');
      thumbsEl.querySelectorAll('.thumb-btn').forEach((btn, i) => {
        btn.addEventListener('click', () => _changeImage(btn, imgs[i].url));
      });
    }

    const options = p.options || [];
    const chainOpts = options.filter((o) => o.option_type === 'chain_length');
    const sizeOpts = options.filter((o) => o.option_type === 'size');

    const chainSec = document.getElementById('chain-section');
    const chainEl = document.getElementById('chain-options');
    if (chainOpts.length && chainSec && chainEl) {
      chainSec.classList.remove('hidden');
      chainEl.innerHTML = chainOpts.map((o, i) => `
        <button class="px-4 py-2.5 rounded-lg border text-sm font-medium transition-all
                       ${i === 0 ? 'border-accent bg-accent/10 text-body' : 'border-border text-muted hover:border-accent/60'}">${o.option_value}</button>`).join('');
      chainEl.querySelectorAll('button').forEach((btn) =>
        btn.addEventListener('click', () => _selectOption(btn, 'chain-options')));
    }

    const sizeSec = document.getElementById('size-section');
    const sizeEl = document.getElementById('size-options');
    if (sizeOpts.length && sizeSec && sizeEl) {
      sizeSec.classList.remove('hidden');
      sizeEl.innerHTML = sizeOpts.map((o, i) => `
        <button class="px-4 py-2.5 rounded-lg border text-sm font-medium transition-all
                       ${i === 0 ? 'border-accent bg-accent/10 text-body' : 'border-border text-muted hover:border-accent/60'}">${o.option_value}</button>`).join('');
      sizeEl.querySelectorAll('button').forEach((btn) =>
        btn.addEventListener('click', () => _selectOption(btn, 'size-options')));
    }

    const newAddBtn = reclone('add-to-cart-btn');
    if (newAddBtn) {
      newAddBtn.addEventListener('click', async function () {
        try {
          this.disabled = true;
          const opts = {};
          const selectedChain = chainEl?.querySelector('button.border-accent');
          const selectedSize = sizeEl?.querySelector('button.border-accent');
          if (selectedChain) opts.chain_length = selectedChain.textContent.trim();
          if (selectedSize) opts.size = selectedSize.textContent.trim();

          await api.cart.add(p.id, 1, opts);
          window.loadCartCount?.();

          const toast = document.getElementById('added-toast');
          if (toast) toast.classList.remove('hidden');
          this.textContent = '✓ اضافه شد';
          setTimeout(() => {
            this.innerHTML = 'افزودن به مجموعه';
            this.disabled = false;
          }, 2000);
        } catch (e) {
          api.utils.toast(e.message, 'error');
          this.disabled = false;
        }
      });
    }

    if (p.related?.length) {
      const relSec = document.getElementById('related-section');
      const relWrap = document.getElementById('related-wrapper');
      if (relSec && relWrap) {
        relSec.classList.remove('hidden');
        relWrap.innerHTML = p.related.map((r) =>
          `<div class="swiper-slide">${ProductCard.render(r)}</div>`).join('');
        relWrap.querySelectorAll('.swiper-slide').forEach((slide) => {
          ProductCard.bind(slide, {
            onAddToCart: async (pid) => {
              await api.cart.add(pid, 1);
              window.loadCartCount?.();
              api.utils.toast('به سبد اضافه شد', 'success', 2000);
            },
          });
        });
        new Swiper('.related-swiper', {
          slidesPerView: 1.8, spaceBetween: 12,
          breakpoints: { 480: { slidesPerView: 2.2 }, 640: { slidesPerView: 3 }, 1024: { slidesPerView: 4, spaceBetween: 20 } },
        });
      }
    }
  } catch (e) {
    const loadEl = document.getElementById('product-loading');
    if (loadEl) loadEl.innerHTML = `<p class="text-accent text-xl text-center">${e.message}</p>`;
  }
});

export { renderStars };
