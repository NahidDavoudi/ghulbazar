let currentProduct = null;

function toggleAcc(id) {
  const content = document.getElementById(id + '-content');
  const icon = document.getElementById(id + '-icon');
  const isOpen = content.style.maxHeight && content.style.maxHeight !== '0px';
  content.style.maxHeight = isOpen ? '0px' : content.scrollHeight + 'px';
  if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
}

function selectOption(btn, group) {
  btn.closest(`[id="${group}"]`).querySelectorAll('button').forEach(b => {
    b.classList.remove('border-accent', 'bg-accent/10', 'text-white');
    b.classList.add('border-border', 'text-text-dim');
  });
  btn.classList.add('border-accent', 'bg-accent/10', 'text-white');
  btn.classList.remove('border-border', 'text-text-dim');
}

function changeImage(btn, src) {
  document.getElementById('main-image').src = src;
  document.querySelectorAll('.thumb-btn').forEach(t => t.classList.remove('border-accent'));
  btn.classList.add('border-accent');
}

document.addEventListener('DOMContentLoaded', async () => {
  injectHeader(); injectFooter(); loadCartCount();

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location = 'shop.html'; return; }

  try {
    const p = await apiFetch(`products&id=${id}`);
    currentProduct = p;

    document.title = `${p.name} | غول بازار`;
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('product-detail').classList.remove('hidden');

    // Breadcrumb
    document.getElementById('breadcrumb').innerHTML = `
      <a href="product.html?id=${p.id}" class="text-white">${p.name}</a>
      <span>/</span><a href="shop.html?era=${encodeURIComponent(p.era)}" class="hover:text-white">${p.era || ''}</a>
      <span>/</span><a href="index.html" class="hover:text-white">خانه</a>`;

    // Badges
    let badges = '';
    if (p.badge) badges += `<span class="bg-dark-2 border border-border text-muted text-xs px-3 py-1 rounded-full">${p.badge}</span>`;
    if (p.stock <= 2) badges += `<span class="bg-accent/20 border border-accent/30 text-accent text-xs px-3 py-1 rounded-full">آخرین موجودی</span>`;
    document.getElementById('badges').innerHTML = badges;

    document.getElementById('product-name').textContent = p.name;
    document.getElementById('product-description').textContent = p.description;
    document.getElementById('product-price').textContent = formatPrice(p.price);
    document.getElementById('product-stock').textContent = `موجودی: ${p.stock} عدد`;
    document.getElementById('history-text').textContent = p.description;

    // Rating
    document.getElementById('rating').innerHTML = `
      <span class="text-text-dim text-sm">(${p.reviews || 0} نظر)</span>
      <div class="flex gap-1">${renderStars(p.rating || 5)}</div>
      <span class="text-white font-bold">${p.rating || 5}</span>`;

    // Images
    const imgs = p.images || [];
    const mainSrc = imgs.find(i => i.is_main)?.url || imgs[0]?.url || '';
    document.getElementById('main-image').src = mainSrc;
    document.getElementById('main-image').alt = p.name;
    document.getElementById('thumbnails').innerHTML = imgs.map((img, i) => `
      <button onclick="changeImage(this, '${img.url}')" class="thumb-btn rounded-xl overflow-hidden aspect-square border-2 ${i === 0 ? 'border-accent' : 'border-transparent'} hover:border-muted transition-colors">
        <img src="${img.url}" alt="" class="w-full h-full object-cover">
      </button>`).join('');

    // Options
    const options = p.options || [];
    const chainOpts = options.filter(o => o.option_type === 'chain_length');
    const sizeOpts  = options.filter(o => o.option_type === 'size');
    if (chainOpts.length) {
      document.getElementById('chain-section').classList.remove('hidden');
      document.getElementById('chain-options').innerHTML = chainOpts.map((o, i) => `
        <button onclick="selectOption(this, 'chain-options')"
                class="px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${i===0 ? 'border-accent bg-accent/10 text-white' : 'border-border text-text-dim hover:border-muted'}">
          ${o.option_value}
        </button>`).join('');
    }
    if (sizeOpts.length) {
      document.getElementById('size-section').classList.remove('hidden');
      document.getElementById('size-options').innerHTML = sizeOpts.map((o, i) => `
        <button onclick="selectOption(this, 'size-options')"
                class="px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${i===0 ? 'border-accent bg-accent/10 text-white' : 'border-border text-text-dim hover:border-muted'}">
          ${o.option_value}
        </button>`).join('');
    }

    // Add to cart
    document.getElementById('add-to-cart-btn').addEventListener('click', async function() {
      try {
        this.disabled = true;
        await addToCart(p.id);
        document.getElementById('added-toast').classList.remove('hidden');
        this.textContent = ' اضافه شد';
        setTimeout(() => { this.innerHTML = 'افزودن به مجموعه'; this.disabled = false; }, 2000);
      } catch(e) { alert(e.message); this.disabled = false; }
    });

    // Related
    if (p.related && p.related.length) {
      document.getElementById('related-section').classList.remove('hidden');
      document.getElementById('related-wrapper').innerHTML = p.related.map(r => `<div class="swiper-slide">${productCard(r)}</div>`).join('');
      new Swiper('.related-swiper', {
        slidesPerView: 1.8, spaceBetween: 12,
        breakpoints: { 480:{slidesPerView:2.2}, 640:{slidesPerView:3}, 1024:{slidesPerView:4, spaceBetween:20} },
      });
    }

  } catch(e) {
    document.getElementById('loading').innerHTML = `<p class="text-accent text-xl">${e.message}</p>`;
  }
});