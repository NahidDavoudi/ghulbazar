const ERA_IMGS = {
  'دوران ویکتوریا': './assets/products/img12.jpg',
  'دوران ادوارد':   './assets/products/img11.jpg',
  'آرت دکو':        './assets/products/img10.jpg',
  'رترو ۱۹۴۰':     './assets/products/img9.jpg',
  'بلا اپوک':       './assets/products/img8.jpg',
};
const CAT_IMGS = {
  'rings':     './assets/products/img7.jpg',
  'necklaces': './assets/products/img6.jpg',
  'earrings':  './assets/products/img5.jpg',
  'bracelets': './assets/products/img4.jpg',
  'brooches':  './assets/products/img3.jpg',
};

function eraCard(e) {
  const img = ERA_IMGS[e.era] || './assets/products/img1.jpg';
  return `
    <a href="shop.html?era=${encodeURIComponent(e.era)}"
       class="relative rounded-2xl overflow-hidden group block" style="height:220px">
      <img src="${img}" alt="${e.era}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
      <div class="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/20 to-transparent"></div>
      <div class="absolute bottom-0 left-0 right-0 p-4">
        <h3 class="text-lg font-bold text-right mb-1">${e.era}</h3>
        <p class="text-muted text-xs text-right">${e.count} محصول ←</p>
      </div>
    </a>`;
}

function catCard(c) {
  const slug = c.slug || c.name;
  const img = CAT_IMGS[slug] || './assets/products/img12.jpg';
  return `
    <a href="shop.html?category=${encodeURIComponent(slug)}"
       class="relative rounded-2xl overflow-hidden group block" style="height:180px">
      <img src="${img}" alt="${c.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
      <div class="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/30 to-transparent"></div>
      <div class="absolute bottom-0 left-0 right-0 p-4">
        <h3 class="text-base font-bold text-right">${c.name}</h3>
      </div>
    </a>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  injectHeader(); injectFooter(); loadCartCount();

  try {
    const [eras, cats] = await Promise.all([apiFetch('eras'), apiFetch('categories')]);
    document.getElementById('eras-grid').innerHTML = eras.length
      ? eras.map(eraCard).join('')
      : '<p class="col-span-full text-center text-text-dim py-8">دوره‌ای یافت نشد</p>';
    document.getElementById('cats-grid').innerHTML = cats.length
      ? cats.map(catCard).join('')
      : '<p class="col-span-full text-center text-text-dim py-8">دسته‌بندی‌ای یافت نشد</p>';
  } catch(e) {
    document.getElementById('eras-grid').innerHTML = `<p class="col-span-full text-accent text-center py-8">${e.message}</p>`;
  }
});
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
