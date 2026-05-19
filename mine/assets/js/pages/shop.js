document.addEventListener('DOMContentLoaded', async () => {
  injectHeader(); injectFooter(); loadCartCount();

  const params = new URLSearchParams(window.location.search);
  const currentEra = params.get('era') || '';
  const currentCat = params.get('category') || '';
  const currentSort = params.get('sort') || '';
  const currentQ = params.get('q') || '';

  if (currentEra || currentCat || currentQ) document.getElementById('clear-filters').classList.remove('hidden');
  if (currentSort) document.getElementById('sort-select').value = currentSort;

  const title = currentEra || currentCat || (currentQ ? `جستجو: ${currentQ}` : 'همه محصولات');
  document.getElementById('desktop-title').textContent = title;
  document.getElementById('page-title').textContent = title;

  // Load categories for sidebar
  try {
    const cats = await apiFetch('categories');
    document.getElementById('cat-filters').innerHTML = cats.map(c => `
      <li><a href="shop.html?category=${encodeURIComponent(c.slug || c.name)}"
             class="block text-right text-sm py-1 ${currentCat === (c.slug || c.name) ? 'text-accent font-bold' : 'text-text-dim hover:text-white'} transition-colors">
        ${c.name}
      </a></li>`).join('');
  } catch {}

  // Load products
  let query = 'products&limit=24';
  if (currentEra) query += `&era=${encodeURIComponent(currentEra)}`;
  if (currentCat) query += `&category=${encodeURIComponent(currentCat)}`;
  if (currentSort) query += `&sort=${currentSort}`;
  if (currentQ) query += `&q=${encodeURIComponent(currentQ)}`;

  try {
    const data = await apiFetch(query);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('product-count').textContent = `${data.total} محصول`;
    if (!data.data.length) {
      document.getElementById('empty').classList.remove('hidden');
    } else {
      document.getElementById('products-grid').innerHTML = data.data.map(productCard).join('');
    }
  } catch(e) {
    document.getElementById('loading').innerHTML = `<p class="text-accent">${e.message}</p>`;
  }

  // Sort change
  document.getElementById('sort-select').addEventListener('change', function() {
    const url = new URL(window.location);
    url.searchParams.set('sort', this.value);
    window.location = url;
  });

  // Mobile filter toggle
  document.getElementById('filter-toggle').addEventListener('click', () => {
    document.getElementById('shop-sidebar').classList.toggle('hidden');
    document.getElementById('shop-sidebar').classList.toggle('block');
  });
});
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
