/**
 * pages/product.js
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import Breadcrumb from '../components/Breadcrumb.js';
import ProductGallery from '../components/ProductGallery.js';
import ProductInfo from '../components/ProductInfo.js';
import CompleteStyleSection from '../components/CompleteStyleSection.js';
import { storeConfig } from '../config/bootstrap.js';
import { pageTitle } from '../core/theme.js';
import DOM from '../utils/dom.js';

const { show, hide, text, hashHref } = DOM;

function normalizeImages(images = []) {
  return images.map((img) => ({
    ...img,
    url: img.url || img.image_url || '',
  })).filter((img) => img.url);
}

function normalizeProduct(p) {
  const images = normalizeImages(p.images || []);
  if (!images.length && p.main_image) {
    images.push({ url: p.main_image, is_main: true });
  }
  return { ...p, images };
}

function buildRefCode(p) {
  const slug = (p.slug || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  if (slug) return `${slug}-${String(p.id).padStart(4, '0')}`;
  return `CG-${String(p.id).padStart(4, '0')}`;
}

function buildDetailBullets(p) {
  const t = storeConfig.texts.product;
  const bullets = [];
  if (p.material) bullets.push(`ترکیب: ${p.material}`);
  bullets.push(...t.detailItems);
  return bullets;
}

function getSizeData(p) {
  const t = storeConfig.texts.product;
  const sizeOpts = (p.options || [])
    .filter((o) => o.option_type === 'size')
    .map((o) => o.option_value);

  const sizes = t.defaultSizes;
  const availableSizes = sizeOpts.length
    ? sizeOpts
    : (p.stock > 0 ? sizes : []);

  return { sizes, availableSizes };
}

async function fetchRelated(p) {
  try {
    const filters = { limit: 5 };
    if (p.category_id) filters.category_id = p.category_id;
    else if (p.era) filters.era = p.era;
    else return [];

    const data = await api.products.list(filters);
    return (data.data || [])
      .filter((r) => r.id !== p.id)
      .slice(0, 4)
      .map(normalizeProduct);
  } catch {
    return [];
  }
}

async function addToCart(p, { size, qty }) {
  const opts = {};
  if (size) opts.size = size;
  await api.cart.add(p.id, qty, opts);
  window.loadCartCount?.();
}

Router.onEnter('products', async function (params) {
  const { id } = params;
  if (!id) { Router.go('/shop'); return; }

  const t = storeConfig.texts.product;
  text('product-loading-text', t.loading);
  text('added-toast-text', t.addedToCart);
  const toastLink = document.getElementById('added-toast-link');
  if (toastLink) toastLink.textContent = t.viewCart;

  hide('product-detail');
  show('product-loading');
  document.getElementById('added-toast')?.classList.add('hidden');

  try {
    const raw = await api.products.get(id);
    const p = normalizeProduct(raw);
    pageTitle(p.name);

    hide('product-loading');
    show('product-detail');

    const shopT = storeConfig.texts.shop;
    const bcItems = [
      { href: '#/', label: shopT.breadcrumbHome },
      { href: hashHref('shop'), label: shopT.breadcrumbShop },
    ];
    if (p.era) bcItems.push({ href: hashHref('shop', { era: p.era }), label: p.era });
    bcItems.push({ href: hashHref('product', { id: p.id }), label: p.name });

    const bcEl = document.getElementById('product-breadcrumb');
    if (bcEl) bcEl.innerHTML = Breadcrumb.render(bcItems);

    const images = p.images.length ? p.images : [];

    const galleryWrap = document.getElementById('product-gallery-wrap');
    if (galleryWrap) {
      galleryWrap.innerHTML = ProductGallery.render({
        images,
        name: p.name,
        refCode: buildRefCode(p),
      });
      ProductGallery.bind(galleryWrap, { images });
    }

    const { sizes, availableSizes } = getSizeData(p);
    const infoWrap = document.getElementById('product-info-wrap');
    if (infoWrap) {
      infoWrap.innerHTML = ProductInfo.render({
        name: p.name,
        price: p.price,
        description: p.description,
        sizes,
        availableSizes,
        stock: p.stock,
        detailBullets: buildDetailBullets(p),
      });

      ProductInfo.bind(infoWrap, {
        maxQty: Math.max(1, p.stock || 1),
        onAddToCart: async ({ size, qty }) => {
          try {
            await addToCart(p, { size, qty });
            document.getElementById('added-toast')?.classList.remove('hidden');
            api.utils.toast(t.addedToCart, 'success', 2000);
          } catch (e) {
            api.utils.toast(e.message, 'error');
          }
        },
        onQuickBuy: async ({ size, qty }) => {
          try {
            await addToCart(p, { size, qty });
            Router.go('/checkout');
          } catch (e) {
            api.utils.toast(e.message, 'error');
          }
        },
      });
    }

    const related = await fetchRelated(p);
    const styleWrap = document.getElementById('complete-style-wrap');
    if (styleWrap) {
      styleWrap.innerHTML = CompleteStyleSection.render({
        products: related,
        viewAllHref: p.category_id
          ? hashHref('shop', { category: p.category_slug || '' })
          : '#/shop',
      });
    }
  } catch (e) {
    const loadEl = document.getElementById('product-loading');
    if (loadEl) loadEl.innerHTML = `<p class="text-body text-xl text-center">${e.message}</p>`;
  }

  if (window.lucide) lucide.createIcons();
});
