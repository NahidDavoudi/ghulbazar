/**
 * pages/shop.js
 */
import api from '../core/api.js';
import Router from '../core/router.js';
import ShopHero from '../components/ShopHero.js';
import ShopProductCard from '../components/ShopProductCard.js';
import ShopSidebar from '../components/ShopSidebar.js';
import Button from '../components/Button.js';
import { storeConfig } from '../config/bootstrap.js';
import DOM from '../utils/dom.js';

const { show, hide, text, hashHref } = DOM;

function parseColors(raw) {
  if (!raw) return [];
  return String(raw).split(',').filter(Boolean);
}

function hasActiveFilters(params) {
  const { era, category, q, size, color, price_min, price_max } = params;
  const range = storeConfig.texts.shop.priceRange;
  const priceActive = (price_min && +price_min > range.min) || (price_max && +price_max < range.max);
  return !!(era || category || q || size || color || priceActive);
}

function buildFilterParams(base, extra = {}) {
  const next = { ...base, ...extra };
  Object.keys(next).forEach((k) => {
    if (next[k] === '' || next[k] == null) delete next[k];
  });
  delete next.page;
  return next;
}

function applyClientFilters(products, params) {
  const range = storeConfig.texts.shop.priceRange;
  const min = params.price_min ? +params.price_min : range.min;
  const max = params.price_max ? +params.price_max : range.max;
  const colors = parseColors(params.color);

  return products.filter((p) => {
    const price = +p.price || 0;
    if (price < min || price > max) return false;

    if (colors.length) {
      const attrText = (p.attributes || [])
        .map((a) => (a.custom_value || a.value_value || '').toLowerCase())
        .join(' ');
      const name = (p.name || '').toLowerCase();
      const haystack = `${attrText} ${name}`;
      const match = colors.some((c) => {
        if (c === 'black') return haystack.includes('مشک') || haystack.includes('black');
        if (c === 'white') return haystack.includes('سفید') || haystack.includes('white');
        if (c === 'grey') return haystack.includes('خاکست') || haystack.includes('grey');
        return false;
      });
      if (!match) return false;
    }

    return true;
  });
}

function renderBreadcrumb(params, categoryName) {
  const t = storeConfig.texts.shop;
  const crumbs = [
    `<a href="#/" data-link class="hover:text-body transition-colors">${t.breadcrumbHome}</a>`,
    `<a href="${hashHref('shop')}" data-link class="hover:text-body transition-colors">${t.breadcrumbShop}</a>`,
  ];
  if (categoryName) {
    crumbs.push(`<span class="text-body">${categoryName}</span>`);
  } else if (params.q) {
    crumbs.push(`<span class="text-body">${params.q}</span>`);
  }
  return crumbs.join('<span class="text-black/20">/</span>');
}

function normalizeProduct(p) {
  if (p.main_image && !p.images?.length) {
    return { ...p, images: [{ url: p.main_image, is_main: true }] };
  }
  if (p.images?.length && !p.images[0].url) {
    return {
      ...p,
      images: p.images.map((i) => ({ ...i, url: i.image_url || i.url })),
    };
  }
  return p;
}

Router.onEnter('shop', async function (params) {
  const t = storeConfig.texts.shop;
  const range = t.priceRange;
  const pageSize = t.pageSize;

  text('shop-loading-text', t.loading);
  text('shop-empty-text', t.empty);
  text('filter-toggle-label', t.filterToggle);
  const emptyLink = document.getElementById('shop-empty-link');
  if (emptyLink) emptyLink.textContent = t.emptyAction;

  let categoryName = '';
  if (params.category) {
    try {
      const cat = await api.categories.bySlug(params.category);
      categoryName = cat?.name || params.category;
    } catch {
      categoryName = params.category;
    }
  }

  const title = categoryName || params.era || (params.q ? params.q : t.allProducts);
  const heroEl = document.getElementById('shop-hero');
  if (heroEl) heroEl.innerHTML = ShopHero.render(title);

  const breadcrumbEl = document.getElementById('shop-breadcrumb');
  if (breadcrumbEl) breadcrumbEl.innerHTML = renderBreadcrumb(params, categoryName);

  const activeColors = parseColors(params.color);
  const sidebarWrap = document.getElementById('shop-sidebar-wrap');

  function closeSidebar() {
    sidebarWrap?.classList.remove('sidebar-open');
    document.getElementById('sidebar-backdrop')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (sidebarWrap) {
    sidebarWrap.innerHTML = ShopSidebar.render({
      activeSize: params.size || '',
      activeColors,
      priceMin: params.price_min ? +params.price_min : range.min,
      priceMax: params.price_max ? +params.price_max : range.max,
    });
    ShopSidebar.bind(sidebarWrap, {
      onApply: (filters) => {
        Router.go('/shop', buildFilterParams(params, {
          size: filters.size,
          color: filters.colors.join(',') || '',
          price_min: filters.priceMin > range.min ? filters.priceMin : '',
          price_max: filters.priceMax < range.max ? filters.priceMax : '',
        }));
        if (window.innerWidth < 768) closeSidebar();
      },
      onClear: () => {
        Router.go('/shop', buildFilterParams(params, {
          era: '', category: '', q: '', size: '', color: '', price_min: '', price_max: '',
        }));
        if (window.innerWidth < 768) closeSidebar();
      },
      onClose: closeSidebar,
    });
  }

  const clearBtn = document.getElementById('clear-filters');
  if (clearBtn) clearBtn.classList.toggle('hidden', !hasActiveFilters(params));

  document.getElementById('sidebar-backdrop')?.addEventListener('click', closeSidebar);

  const newToggle = DOM.reclone('filter-toggle');
  if (newToggle) {
    newToggle.addEventListener('click', () => {
      sidebarWrap?.classList.add('sidebar-open');
      document.getElementById('sidebar-backdrop')?.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  const apiFilters = { limit: 100 };
  if (params.category) apiFilters.category = params.category;
  if (params.sort) apiFilters.sort = params.sort;
  if (params.q) apiFilters.q = params.q;
  if (params.featured) apiFilters.featured = params.featured;

  show('shop-loading');
  hide('shop-load-more');

  try {
    const data = await api.products.list(apiFilters);
    hide('shop-loading');

    const allProducts = (data.data || []).map(normalizeProduct);
    const filtered = applyClientFilters(allProducts, params);
    const total = filtered.length;

    text('product-count', `${total.toLocaleString('fa-IR')} ${t.productsFound}`);

    const grid = document.getElementById('products-grid');
    const loadMoreEl = document.getElementById('shop-load-more');
    let visibleCount = pageSize;

    function renderGrid() {
      const slice = filtered.slice(0, visibleCount);
      if (!slice.length) {
        show('shop-empty');
        if (grid) grid.innerHTML = '';
        if (loadMoreEl) loadMoreEl.classList.add('hidden');
        return;
      }

      hide('shop-empty');
      if (grid) grid.innerHTML = slice.map((p) => ShopProductCard.render(p)).join('');

      if (loadMoreEl) {
        if (visibleCount < total) {
          loadMoreEl.classList.remove('hidden');
          loadMoreEl.innerHTML = Button.render({
            variant: 'glass',
            label: t.showMore,
            className: 'shop-load-more-btn mx-auto min-w-[180px]',
          });
          loadMoreEl.querySelector('.shop-load-more-btn')?.addEventListener('click', () => {
            visibleCount = Math.min(visibleCount + pageSize, total);
            renderGrid();
            if (window.lucide) lucide.createIcons();
          }, { once: true });
        } else {
          loadMoreEl.classList.add('hidden');
        }
      }
    }

    renderGrid();
  } catch (e) {
    const loadEl = document.getElementById('shop-loading');
    if (loadEl) loadEl.innerHTML = `<p class="text-body text-center">${e.message}</p>`;
  }

  if (window.lucide) lucide.createIcons();
});
