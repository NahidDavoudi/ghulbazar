/**
 * Ghul Bazar — admin.js (نسخه کامل)
 * وابستگی: api.js باید قبلاً لود شده باشه
 */
;(function () {
  'use strict';

  /* ══ AUTH ══════════════════════════════════════════════════ */
  if (!API.auth.isLoggedIn() || !API.auth.isAdmin()) {
    location.replace('login.html');
    return;
  }
  const _user = API.auth.currentUser();
  const _el = document.getElementById('sidebarUsername');
  if (_el) _el.textContent = _user?.name || _user?.phone || 'ادمین';

  /* ══ HELPERS ════════════════════════════════════════════════ */
  const $ = id => document.getElementById(id);
  const show = id => $( id)?.classList.remove('hidden');
  const hide = id => $( id)?.classList.add('hidden');
  const setText = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  const getVal  = id => $(id)?.value.trim() ?? '';

  function setLoading(on) { on ? show('loadingOverlay') : hide('loadingOverlay'); }

  function toast(msg, type = 'success') {
    const colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb' };
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      background:${colors[type]||colors.success};color:#fff;
      padding:12px 24px;border-radius:12px;font-size:14px;
      box-shadow:0 4px 20px rgba(0,0,0,.2);z-index:9999;
      transition:opacity .3s;white-space:nowrap;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
  }

  window.showModal = id => $(id)?.classList.remove('hidden');
  window.hideModal = id => $(id)?.classList.add('hidden');

  const STATUS_MAP = {
    pending:   { label:'در انتظار',       cls:'bg-yellow-100 text-yellow-800' },
    paid:      { label:'پرداخت شده',      cls:'bg-blue-100 text-blue-800' },
    shipped:   { label:'ارسال شده',       cls:'bg-purple-100 text-purple-800' },
    delivered: { label:'تحویل داده شده', cls:'bg-green-100 text-green-800' },
    cancelled: { label:'لغو شده',         cls:'bg-stone-100 text-stone-500' },
  };

  function statusBadge(s) {
    const m = STATUS_MAP[s] || { label: s, cls:'bg-stone-100 text-stone-500' };
    return `<span class="px-2.5 py-1 rounded-full text-xs font-medium ${m.cls}">${m.label}</span>`;
  }

  /* ══ SIDEBAR / PAGE SWITCHING ═══════════════════════════════ */
  const PAGE_LOADERS = {
    dashboard:  loadDashboard,
    products:   loadProducts,
    categories: loadCategories,
    orders:     loadOrders,
    users:      loadUsers,
    discounts:  loadDiscounts,
    settings:   () => {},
  };

  window.switchPage = function (name, linkEl) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
    $(`page-${name}`)?.classList.remove('hidden');
    document.querySelectorAll('.nav-link').forEach(a =>
      a.classList.remove('bg-red-50','text-red-800','font-semibold'));
    if (linkEl) linkEl.classList.add('bg-red-50','text-red-800','font-semibold');
    closeSidebar();
    PAGE_LOADERS[name]?.();
  };

  window.toggleSidebar = () => {
    $('sidebar')?.classList.toggle('translate-x-full');
    $('mobileOverlay')?.classList.toggle('hidden');
  };
  window.closeSidebar = () => {
    $('sidebar')?.classList.add('translate-x-full');
    $('mobileOverlay')?.classList.add('hidden');
  };
  window.handleLogout = () => API.auth.logout();

  /* ══ DASHBOARD ══════════════════════════════════════════════ */
  window.loadDashboardStats = loadDashboard;

  async function loadDashboard() {
    try {
      setLoading(true);
      const s = await API.admin.stats();
      setLoading(false);

      setText('stat-products',      (s.total_products  ??0).toLocaleString('fa-IR'));
      setText('stat-orders-today',  (s.today_orders    ??0).toLocaleString('fa-IR'));
      setText('stat-low-stock',     (s.low_stock_items ??0).toLocaleString('fa-IR'));
      setText('stat-pending',       (s.pending_orders  ??0).toLocaleString('fa-IR'));
      setText('stat-total-orders',  (s.total_orders    ??0).toLocaleString('fa-IR'));
      setText('stat-total-revenue', API.utils.formatPrice(s.total_revenue??0));
      setText('stat-total-users',   (s.total_users     ??0).toLocaleString('fa-IR'));

      renderWeeklyChart(s.weekly_revenue || []);
      renderOrderStatusChart(s.order_status || {});
    } catch(e) {
      setLoading(false);
      toast(e.message, 'error');
    }
  }

  /* ══════════════════════════════════════════════════════════
     نمودار میله‌ای — Vanilla CSS
     داده: [{date:'mm/dd', amount:1234567}, ...]
  ══════════════════════════════════════════════════════════ */
  function renderWeeklyChart(data) {
    const el = $('weeklyChart');
    if (!el) return;
    if (!data.length || data.every(d => +d.amount === 0)) {
      el.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;width:100%;color:#a8a29e;font-size:14px;">
          داده‌ای برای نمایش وجود ندارد
        </div>`;
      return;
    }

    const max = Math.max(...data.map(d => +d.amount), 1);

    // wrapper
    el.style.cssText = 'display:flex;align-items:flex-end;gap:8px;padding:0 8px;height:280px;position:relative;overflow:visible;';
    // Y-axis lines (4 خط راهنما)
    const guide = document.createElement('div');
    guide.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none;padding-bottom:28px;';
    [100,75,50,25,0].forEach(pct => {
      const line = document.createElement('div');
      line.style.cssText = 'width:100%;border-top:1px dashed #e7e5e4;position:relative;';
      const label = document.createElement('span');
      label.style.cssText = 'position:absolute;right:-4px;top:-9px;font-size:9px;color:#a8a29e;transform:translateX(100%);';
      label.textContent = pct === 0 ? '۰' : API.utils.formatPrice(Math.round(max * pct / 100)).replace(' تومان','');
      line.appendChild(label);
      guide.appendChild(line);
    });
    el.innerHTML = '';
    el.appendChild(guide);

    data.forEach(d => {
      const pct = Math.max(2, Math.round((+d.amount / max) * 100));
      const amt = Number(d.amount).toLocaleString('fa-IR');
      const col = document.createElement('div');
      col.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;height:100%;';
      // tooltip
      const tip = document.createElement('div');
      tip.style.cssText = `
        position:absolute;bottom:calc(${pct}% + 32px);left:50%;transform:translateX(-50%);
        background:#1c1917;color:#fff;font-size:11px;padding:4px 8px;border-radius:6px;
        white-space:nowrap;opacity:0;transition:opacity .15s;pointer-events:none;z-index:10;`;
      tip.textContent = amt + ' ت';

      // bar wrapper
      const barWrap = document.createElement('div');
      barWrap.style.cssText = 'width:100%;flex:1;display:flex;align-items:flex-end;min-height:0;';
      const bar = document.createElement('div');
      bar.style.cssText = `
        width:100%;height:${pct}%;min-height:4px;border-radius:6px 6px 0 0;
        background:linear-gradient(to top,#7f1d1d,#dc2626);
        transition:height .4s cubic-bezier(.4,0,.2,1), filter .15s;
        cursor:pointer;`;
      bar.addEventListener('mouseenter', () => { tip.style.opacity='1'; bar.style.filter='brightness(1.2)'; });
      bar.addEventListener('mouseleave', () => { tip.style.opacity='0'; bar.style.filter=''; });

      barWrap.appendChild(bar);

      // label
      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:10px;color:#a8a29e;white-space:nowrap;padding-bottom:2px;height:28px;display:flex;align-items:center;';
      lbl.textContent = d.date || '';

      col.appendChild(tip);
      col.appendChild(barWrap);
      col.appendChild(lbl);
      el.appendChild(col);
    });
  }

  /* ══════════════════════════════════════════════════════════
     دونات چارت — Vanilla CSS با conic-gradient
     داده: { 'در انتظار': 10, 'پرداخت شده': 25, ... }
  ══════════════════════════════════════════════════════════ */
  function renderOrderStatusChart(data) {
    const el = $('orderStatusChart');
    if (!el) return;

    const entries = Object.entries(data).filter(([,v]) => v > 0);
    if (!entries.length) {
      el.innerHTML = '<div style="text-align:center;padding:40px 0;color:#a8a29e;font-size:14px;">داده‌ای موجود نیست</div>';
      return;
    }

    const COLORS = ['#b91c1c','#1d4ed8','#7c3aed','#15803d','#78716c','#c2410c'];
    const total  = entries.reduce((s,[,v])=>s+v, 0) || 1;

    // ساخت conic-gradient
    let deg = 0;
    const gradient = entries.map(([,v],i) => {
      const slice = (v / total) * 360;
      const color = COLORS[i % COLORS.length];
      const part  = `${color} ${deg}deg ${deg + slice}deg`;
      deg += slice;
      return part;
    }).join(', ');

    el.innerHTML = '';
    el.style.cssText = 'display:flex;flex-direction:column;gap:16px;';

    // دونات
    const donutWrap = document.createElement('div');
    donutWrap.style.cssText = 'display:flex;align-items:center;justify-content:center;';

    const donut = document.createElement('div');
    donut.style.cssText = `
      width:160px;height:160px;border-radius:50%;
      background:conic-gradient(${gradient});
      position:relative;flex-shrink:0;`;

    // حلقه سفید وسط
    const hole = document.createElement('div');
    hole.style.cssText = `
      position:absolute;inset:28px;background:#fff;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      flex-direction:column;text-align:center;`;
    hole.innerHTML = `
      <span style="font-size:22px;font-weight:700;color:#1c1917;">${total.toLocaleString('fa-IR')}</span>
      <span style="font-size:11px;color:#a8a29e;margin-top:2px;">سفارش</span>`;

    donut.appendChild(hole);
    donutWrap.appendChild(donut);
    el.appendChild(donutWrap);

    // legend
    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    entries.forEach(([label, val], i) => {
      const pct   = Math.round((val / total) * 100);
      const color = COLORS[i % COLORS.length];
      const row   = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
          <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
          <span style="font-size:12px;color:#57534e;white-space:nowrap;">${label}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <span style="font-size:12px;font-weight:600;color:#1c1917;">${val.toLocaleString('fa-IR')}</span>
          <span style="font-size:11px;color:#a8a29e;">(${pct}٪)</span>
        </div>`;
      legend.appendChild(row);
    });
    el.appendChild(legend);
  }

  /* ══ PRODUCTS ═══════════════════════════════════════════════ */
  let _products = [], _categories = [], _editingProdId = null;

  window.loadProducts = loadProducts;
  async function loadProducts() {
    try {
      setLoading(true);
      const [data, cats] = await Promise.all([
        API.products.list({ limit: 100 }),
        API.categories.list(),
      ]);
      setLoading(false);
      _products   = data.data || [];
      _categories = cats || [];
      _renderProducts(_products);
      _fillCatFilter();
    } catch(e) { setLoading(false); toast(e.message,'error'); }
  }

  function _fillCatFilter() {
    ['productCategoryFilter','productCategory'].forEach(id => {
      const el = $(id);
      if (!el) return;
      const opts = _categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
      if (id === 'productCategoryFilter')
        el.innerHTML = '<option value="">همه دسته‌بندی‌ها</option>' + opts;
      else
        el.innerHTML = '<option value="">انتخاب دسته‌بندی</option>' + opts;
    });
  }

  function _renderProducts(list) {
    const tbody = $('productsTableBody');
    if (!tbody) return;
    setText('products-count', `${list.length} محصول`);
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-12 text-stone-400">محصولی یافت نشد</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(p => {
      const img = p.images?.find(i=>i.is_main)?.url || p.images?.[0]?.url || p.image || '';
      const stockCls = p.stock==0?'text-red-600':p.stock<5?'text-yellow-600':'text-green-600';
      return `<tr class="hover:bg-stone-50 transition-colors">
        <td class="px-4 py-3">
          <div class="flex items-center gap-3">
            <img src="${img}" class="w-12 h-12 rounded-xl object-cover bg-stone-100"
                 onerror="this.src='assets/images/placeholder.png'">
            <div>
              <p class="font-medium text-stone-800 text-sm">${p.name}</p>
              <p class="text-xs text-stone-400">${p.era||''}</p>
            </div>
          </div>
        </td>
        <td class="px-4 py-3 text-sm">${API.utils.formatPrice(p.price)}</td>
        <td class="px-4 py-3 text-sm font-bold ${stockCls}">${p.stock}</td>
        <td class="px-4 py-3 text-sm text-stone-500">${p.category_name||'—'}</td>
        <td class="px-4 py-3">
          <span class="px-2 py-1 rounded-full text-xs font-medium ${p.is_featured?'bg-amber-100 text-amber-800':'bg-stone-100 text-stone-500'}">
            ${p.is_featured?'ویژه':'عادی'}
          </span>
        </td>
        <td class="px-4 py-3 text-sm text-stone-400">${p.views||0}</td>
        <td class="px-4 py-3">
          <div class="flex gap-1">
            <button onclick="editProduct(${p.id})" title="ویرایش"
                    class="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.914l-3 1 1-3a4 4 0 01.914-1.414z"/>
              </svg>
            </button>
            <button onclick="deleteProduct(${p.id},'${p.name.replace(/'/g,"\\'")}')" title="حذف"
                    class="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // جستجو و فیلتر محصولات
  $('productSearch')?.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    _renderProducts(_products.filter(p =>
      p.name.toLowerCase().includes(q) || (p.category_name||'').toLowerCase().includes(q)
    ));
  });
  $('productCategoryFilter')?.addEventListener('change', function() {
    _renderProducts(this.value
      ? _products.filter(p => String(p.category_id) === this.value)
      : _products);
  });

  /* باز کردن مودال محصول جدید */
  window.showProductModal = function() {
    _editingProdId = null;
    $('productForm')?.reset();
    $('productId').value = '';
    $('productImagesGrid').innerHTML = '';
    setText('productModalTitle', 'افزودن محصول');
    setText('productSubmitText', 'ذخیره محصول');
    _fillCatFilter();
    showModal('productModal');
  };

  /* ویرایش محصول */
  window.editProduct = async function(id) {
    try {
      setLoading(true);
      const [p] = await Promise.all([API.products.get(id)]);
      if (!_categories.length) _categories = await API.categories.list();
      setLoading(false);
      _editingProdId = id;

      $('productId').value       = p.id;
      $('productName').value     = p.name;
      $('productPrice').value    = p.price;
      $('productStock').value    = p.stock;
      $('productDesc').value     = p.description||'';
      $('productBadge').value    = p.badge||'';
      // $('productEra').value      = p.era||'';
      $('productFeatured').checked = !!p.is_featured;

      _fillCatFilter();
      if (p.category_id) $('productCategory').value = p.category_id;

      /* نمایش تصاویر موجود */
      const grid = $('productImagesGrid');
      if (grid) {
        grid.innerHTML = (p.images||[]).map((img,i) => `
          <div class="relative aspect-square rounded-xl overflow-hidden bg-stone-100 group">
            <img src="${img.url}" class="w-full h-full object-cover">
            ${img.is_main?'<span class="absolute top-1 right-1 bg-red-800 text-white text-[10px] px-1.5 py-0.5 rounded-full">اصلی</span>':''}
          </div>`).join('');
      }

      setText('productModalTitle','ویرایش محصول');
      setText('productSubmitText','بروزرسانی');
      showModal('productModal');
    } catch(e) { setLoading(false); toast(e.message,'error'); }
  };

  /* حذف محصول */
  window.deleteProduct = async function(id, name) {
    if (!confirm(`آیا از حذف "${name}" مطمئن هستید؟`)) return;
    try {
      setLoading(true);
      await API.products.delete(id);
      setLoading(false);
      toast('محصول حذف شد');
      loadProducts();
    } catch(e) { setLoading(false); toast(e.message,'error'); }
  };

  function toEnglishDigits(str) {
    if (!str) return '';
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const arabicDigits  = '٠١٢٣٤٥٦٧٨٩';
    return str.replace(/[۰-۹]/g, d => persianDigits.indexOf(d))
              .replace(/[٠-٩]/g, d => arabicDigits.indexOf(d));
}

$('productForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // گرفتن مقدار قیمت و تبدیل ارقام فارسی/عربی به انگلیسی
    let rawPrice = getVal('productPrice');
    rawPrice = toEnglishDigits(rawPrice);               // تبدیل ارقام
    rawPrice = rawPrice.replace(/[^0-9]/g, '');         // حذف هر کاراکتر غیرعددی
    
    let rawStock = getVal('productStock');
    rawStock = toEnglishDigits(rawStock);
    rawStock = rawStock.replace(/[^0-9]/g, '');
    
    const payload = {
        name:        getVal('productName'),
        price:       parseInt(rawPrice, 10) || 0,
        stock:       parseInt(rawStock, 10) ?? 1,
        description: getVal('productDesc'),
        badge:       getVal('productBadge'),
        era:         getVal('productEra'),
        category_id: getVal('productCategory') || null,
        is_featured: $('productFeatured')?.checked ? 1 : 0,
    };
    
    if (!payload.name) { toast('نام محصول الزامی است','error'); return; }
    if (!payload.price) { toast('قیمت محصول الزامی است','error'); return; }
    try {
      setLoading(true);
      if (_editingProdId) {
        await API.products.update(_editingProdId, payload);
        toast('محصول بروزرسانی شد');
        /* آپلود تصاویر جدید */
        await _uploadPendingImages(_editingProdId);
      } else {
        const res = await API.products.create(payload);
        const newId = res.id || res.product_id;
        toast('محصول ایجاد شد');
        /* آپلود تصاویر برای محصول جدید */
        if (newId) await _uploadPendingImages(newId);
      }
      setLoading(false);
      hideModal('productModal');
      loadProducts();
    } catch(e) { setLoading(false); toast(e.message,'error'); }
  });

  /* آپلود گروهی تصاویر با preview فوری */
  window.uploadProductImage = function(input) {
    const grid = $('productImagesGrid');
    if (!grid) return;
    const files = Array.from(input.files);
    if (!files.length) return;

    // نمایش فوری preview برای هر فایل
    files.forEach((f, idx) => {
      if (!f.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const div = document.createElement('div');
        div.id = `img-preview-${Date.now()}-${idx}`;
        div.style.cssText = 'position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;background:#f5f5f4;';
        div.innerHTML = `
          <img src="${ev.target.result}"
               style="width:100%;height:100%;object-fit:cover;">
          <div class="upload-overlay"
               style="position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;
                      align-items:center;justify-content:center;flex-direction:column;gap:4px;">
            <div style="width:20px;height:20px;border:2px solid #fff;border-top-color:transparent;
                        border-radius:50%;animation:spin 1s linear infinite;"></div>
            <span style="color:#fff;font-size:10px;">در حال آپلود...</span>
          </div>
          <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
        grid.appendChild(div);
      };
      reader.readAsDataURL(f);
    });
  };

  /* آپلود واقعی فایل‌ها به سرور بعد از save محصول */
  async function _uploadPendingImages(productId) {
    const imgInput = $('productImageInput');
    if (!imgInput?.files?.length) return;
    const files = Array.from(imgInput.files);
    let firstImage = true;

    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      try {
        await API.products.uploadImage(productId, f, firstImage, 0);
        firstImage = false;
      } catch(e) {
        toast(`خطا در آپلود ${f.name}: ${e.message}`, 'error');
      }
    }
    imgInput.value = '';

    // بروز کردن preview با تصاویر واقعی
    const previews = document.querySelectorAll('.upload-overlay');
    previews.forEach(el => el.remove());
  }

  /* ══ CATEGORIES ═════════════════════════════════════════════ */
  let _editingCatId = null;

  window.loadCategories = loadCategories;
  async function loadCategories() {
    try {
      setLoading(true);
      const cats = await API.categories.list();
      setLoading(false);
      _renderCategories(cats);
    } catch(e) { setLoading(false); toast(e.message,'error'); }
  }

  function _renderCategories(cats) {
    const tbody = $('categoriesTableBody');
    if (!tbody) return;
    if (!cats.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-12 text-stone-400">دسته‌بندی‌ای یافت نشد</td></tr>`;
      return;
    }
    tbody.innerHTML = cats.map((c,i) => `
      <tr class="hover:bg-stone-50 transition-colors">
        <td class="px-5 py-4 text-stone-400 text-sm">${i+1}</td>
        <td class="px-5 py-4 font-medium text-stone-800">${c.name}</td>
        <td class="px-5 py-4 text-stone-500 text-sm font-mono">${c.slug||'—'}</td>
        <td class="px-5 py-4">
          <div class="flex gap-1">
            <button onclick="editCategory(${c.id},'${c.name.replace(/'/g,"\\'")}','${(c.slug||'').replace(/'/g,"\\'")}')"
                    class="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="ویرایش">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.914l-3 1 1-3a4 4 0 01.914-1.414z"/>
              </svg>
            </button>
            <button onclick="deleteCategory(${c.id},'${c.name.replace(/'/g,"\\'")}')"
                    class="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors" title="حذف">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>`).join('');
  }

  window.showCategoryModal = function() {
    _editingCatId = null;
    $('categoryForm')?.reset();
    $('categoryId').value = '';
    setText('categoryModalTitle','افزودن دسته‌بندی');
    setText('categorySubmitText','ذخیره');
    showModal('categoryModal');
  };

  window.editCategory = function(id, name, slug) {
    _editingCatId = id;
    $('categoryId').value   = id;
    $('categoryName').value = name;
    $('categorySlug').value = slug;
    setText('categoryModalTitle','ویرایش دسته‌بندی');
    setText('categorySubmitText','بروزرسانی');
    showModal('categoryModal');
  };

  window.deleteCategory = async function(id, name) {
    if (!confirm(`حذف دسته‌بندی "${name}"؟`)) return;
    try {
      setLoading(true);
      await API.categories.delete(id);
      setLoading(false);
      toast('دسته‌بندی حذف شد');
      loadCategories();
    } catch(e) { setLoading(false); toast(e.message,'error'); }
  };

  $('categoryForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = {
      name: getVal('categoryName'),
      slug: getVal('categorySlug'),
    };
    if (!payload.name) { toast('نام الزامی است','error'); return; }
    try {
      setLoading(true);
      if (_editingCatId) {
        await API.categories.update(_editingCatId, payload);
        toast('دسته‌بندی بروزرسانی شد');
      } else {
        await API.categories.create(payload);
        toast('دسته‌بندی ایجاد شد');
      }
      setLoading(false);
      hideModal('categoryModal');
      loadCategories();
    } catch(e) { setLoading(false); toast(e.message,'error'); }
  });

  /* ══ ORDERS ═════════════════════════════════════════════════ */
  let _orders = [];

  window.loadOrders = loadOrders;
  async function loadOrders() {
    try {
      setLoading(true);
      const data = await API.orders.list({ limit: 200 });
      setLoading(false);
      _orders = Array.isArray(data) ? data : (data.data||data.orders||[]);
      _renderOrders(_orders);
    } catch(e) { setLoading(false); toast(e.message,'error'); }
  }

  function _renderOrders(list) {
    const tbody = $('ordersTableBody');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-stone-400">سفارشی یافت نشد</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(o => {
      const date = o.created_at ? new Date(o.created_at).toLocaleDateString('fa-IR') : '—';
      return `<tr class="hover:bg-stone-50 transition-colors">
        <td class="px-4 py-3 font-mono text-sm text-stone-700">#${o.order_number}</td>
        <td class="px-4 py-3">
          <p class="text-sm font-medium text-stone-800">${o.customer_name||'—'}</p>
          <p class="text-xs text-stone-400" dir="ltr">${o.customer_phone||''}</p>
        </td>
        <td class="px-4 py-3 text-sm font-medium">${API.utils.formatPrice(o.total_amount||0)}</td>
        <td class="px-4 py-3 text-xs text-stone-400">${date}</td>
        <td class="px-4 py-3">${statusBadge(o.status)}</td>
        <td class="px-4 py-3">
          <select onchange="changeOrderStatus(${o.id},this.value)"
                  class="text-xs bg-stone-100 border border-stone-200 rounded-lg px-2 py-1.5 text-stone-700 focus:outline-none focus:border-red-700">
            ${Object.entries(STATUS_MAP).map(([k,v])=>
              `<option value="${k}" ${o.status===k?'selected':''}>${v.label}</option>`
            ).join('')}
          </select>
        </td>
      </tr>`;
    }).join('');
  }

  window.changeOrderStatus = async function(id, status) {
    try {
      await API.orders.updateStatus(id, status);
      toast('وضعیت سفارش بروزرسانی شد');
      const o = _orders.find(x=>x.id===id);
      if (o) o.status = status;
      _renderOrders(_orders);
    } catch(e) { toast(e.message,'error'); }
  };

  $('orderStatusFilter')?.addEventListener('change', function() {
    _renderOrders(this.value ? _orders.filter(o=>o.status===this.value) : _orders);
  });
  $('orderSearch')?.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    _renderOrders(_orders.filter(o =>
      (o.order_number||'').toLowerCase().includes(q) ||
      (o.customer_name||'').toLowerCase().includes(q) ||
      (o.customer_phone||'').toLowerCase().includes(q)
    ));
  });

  /* ══ USERS ══════════════════════════════════════════════════ */
  let _users = [];

  window.loadUsers = loadUsers;
  async function loadUsers() {
    try {
      setLoading(true);
      const data = await API.users.list({ limit: 100 });
      setLoading(false);
      _users = data.data || [];
      _renderUsers(_users);
    } catch(e) { setLoading(false); toast(e.message,'error'); }
  }

  function _renderUsers(list) {
    const tbody = $('usersTableBody');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-12 text-stone-400">کاربری یافت نشد</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(u => {
      const date = u.created_at ? new Date(u.created_at).toLocaleDateString('fa-IR') : '—';
      const isAdmin = u.role === 'admin';
      return `<tr class="hover:bg-stone-50 transition-colors">
        <td class="px-4 py-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-800 font-bold text-sm">
              ${(u.name||u.phone||'؟')[0]}
            </div>
            <p class="text-sm font-medium text-stone-800">${u.name||'—'}</p>
          </div>
        </td>
        <td class="px-4 py-3 text-sm text-stone-500" dir="ltr">${u.phone||'—'}</td>
        <td class="px-4 py-3">
          <span class="px-2.5 py-1 rounded-full text-xs font-medium ${isAdmin?'bg-red-100 text-red-800':'bg-stone-100 text-stone-600'}">
            ${isAdmin?'ادمین':'کاربر'}
          </span>
        </td>
        <td class="px-4 py-3 text-xs text-stone-400">${date}</td>
        <td class="px-4 py-3">
          <div class="flex gap-1">
            <button onclick="toggleUserRole(${u.id},'${u.role}')" title="${isAdmin?'تبدیل به کاربر':'تبدیل به ادمین'}"
                    class="p-2 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors">
              ${isAdmin
                ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 17l-4 4m0 0l-4-4m4 4V3"/></svg>`
                : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7l4-4m0 0l4 4m-4-4v18"/></svg>`
              }
            </button>
            <button onclick="deleteUser(${u.id},'${(u.name||u.phone||'').replace(/'/g,"\\'")}')"
                    class="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  window.toggleUserRole = async function(id, role) {
    const newRole = role==='admin'?'user':'admin';
    if (!confirm(`تغییر نقش به "${newRole==='admin'?'ادمین':'کاربر'}"؟`)) return;
    try {
      await API.users.updateRole(id, newRole);
      toast('نقش کاربر تغییر کرد');
      loadUsers();
    } catch(e) { toast(e.message,'error'); }
  };

  window.deleteUser = async function(id, name) {
    if (!confirm(`حذف کاربر "${name}"؟`)) return;
    try {
      await API.users.delete(id);
      toast('کاربر حذف شد');
      loadUsers();
    } catch(e) { toast(e.message,'error'); }
  };

  $('usersSearch')?.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    _renderUsers(_users.filter(u=>
      (u.name||'').toLowerCase().includes(q)||(u.phone||'').toLowerCase().includes(q)
    ));
  });

  /* ══ DISCOUNTS ══════════════════════════════════════════════ */
  window.loadDiscounts = loadDiscounts;
  async function loadDiscounts() {
    const el = $('discountsContainer');
    if (!el) return;
    el.innerHTML = '<p class="text-stone-400 col-span-full text-center py-8">در حال بارگذاری...</p>';
    // Discounts endpoint مستقیم list نداره در api.php — placeholder
    el.innerHTML = '<p class="text-stone-400 col-span-full text-center py-8">کدهای تخفیف از طریق فرم زیر اضافه می‌شوند</p>';
  }

  window.showDiscountModal = () => showModal('discountModal');

  $('discountForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = {
      code:        getVal('discountCode'),
      type:        getVal('discountType'),
      value:       Number(getVal('discountValue')),
      valid_from:  getVal('discountValidFrom'),
      valid_to:    getVal('discountValidTo'),
    };
    if (!payload.code || !payload.value) { toast('کد و مقدار الزامی‌اند','error'); return; }
    try {
      setLoading(true);
      await API.discounts.create(payload);
      setLoading(false);
      toast('کد تخفیف ایجاد شد');
      hideModal('discountModal');
      $('discountForm')?.reset();
    } catch(e) { setLoading(false); toast(e.message,'error'); }
  });

  /* ══ PRICE INPUT FORMATTER ════════════════════════════════ */
  function _initPriceFormat() {
    const priceInput = $('productPrice');
    if (!priceInput) return;

    // تابع کمکی برای تبدیل ارقام فارسی به انگلیسی
    function toEnglishDigits(str) {
        const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
        return str.replace(/[۰-۹]/g, function(d) {
            return persianDigits.indexOf(d);
        });
    }

    // هنگام تایپ، ارقام فارسی رو به انگلیسی تبدیل کن، سپس فرمت کن
    priceInput.addEventListener('input', function() {
        let val = this.value;
        // تبدیل ارقام فارسی به انگلیسی
        val = toEnglishDigits(val);
        // حذف هر چیزی غیر از رقم
        const raw = val.replace(/[^0-9]/g, '');
        if (!raw) {
            this.value = '';
            return;
        }
        const formatted = Number(raw).toLocaleString('fa-IR');
        this.value = formatted;
    });

    // هنگام فوکوس، مقدار خام (بدون جداکننده) را نمایش بده
    priceInput.addEventListener('focus', function() {
        let raw = this.value.replace(/[^0-9]/g, '');
        if (raw === '') raw = '';
        this.value = raw;
    });

    // هنگام ترک فیلد، دوباره فرمت کن
    priceInput.addEventListener('blur', function() {
        let raw = this.value.replace(/[^0-9]/g, '');
        if (!raw) return;
        this.value = Number(raw).toLocaleString('fa-IR');
    });
}

  /* ══ BOOT ═══════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function() {
    if (window.lucide) lucide.createIcons();
    _initPriceFormat();
    loadDashboard();
  });

})();