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
      const _res = await API.admin.stats();
      const s = _res.data || _res;
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

  /* ══════════════════════════════════════════════════════════
     نمودار میله‌ای هفتگی — D3.js
  ══════════════════════════════════════════════════════════ */
  function renderWeeklyChart(rawData) {
    const container = document.getElementById('weeklyChart');
    if (!container) return;
    container.innerHTML = '';

    // fallback اگه داده خالی بود
    const data = (rawData && rawData.length)
      ? rawData
      : Array.from({length:7}, (_,i) => ({
          date: (() => { const d=new Date(); d.setDate(d.getDate()-6+i); return (d.getMonth()+1)+'/'+d.getDate(); })(),
          amount: 0
        }));

    if (data.every(d => +d.amount === 0)) {
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#a8a29e;font-size:14px;">هنوز فروشی ثبت نشده</div>';
      return;
    }

    if (typeof d3 === 'undefined') {
      console.warn('D3 not loaded, falling back to vanilla');
      _renderWeeklyVanilla(data, container);
      return;
    }

    const margin = {top:16, right:12, bottom:36, left:56};
    const W = container.clientWidth  || 480;
    const H = container.clientHeight || 288;
    const w = W - margin.left - margin.right;
    const h = H - margin.top  - margin.bottom;

    const svg = d3.select(container).append('svg')
      .attr('width', W).attr('height', H)
      .style('overflow','visible');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxVal = d3.max(data, d => +d.amount) || 1;

    const x = d3.scaleBand()
      .domain(data.map(d => d.date))
      .range([0, w]).padding(0.35);

    const y = d3.scaleLinear()
      .domain([0, maxVal * 1.15]).range([h, 0]).nice();

    // gradient
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id','wkBarGrad')
      .attr('x1','0').attr('y1','0').attr('x2','0').attr('y2','1');
    grad.append('stop').attr('offset','0%').attr('stop-color','#dc2626');
    grad.append('stop').attr('offset','100%').attr('stop-color','#7f1d1d');

    // grid
    g.append('g').call(
      d3.axisLeft(y).ticks(4).tickSize(-w).tickFormat('')
    ).call(el => {
      el.select('.domain').remove();
      el.selectAll('line').attr('stroke','#e7e5e4').attr('stroke-dasharray','4,3');
    });

    // axes
    g.append('g').call(
      d3.axisLeft(y).ticks(4).tickFormat(v => {
        if (!v) return '۰';
        if (v >= 1e6) return (v/1e6).toLocaleString('fa-IR')+'M';
        if (v >= 1e3) return (v/1e3).toLocaleString('fa-IR')+'K';
        return v.toLocaleString('fa-IR');
      })
    ).call(el => {
      el.select('.domain').remove(); el.selectAll('line').remove();
      el.selectAll('text').attr('fill','#a8a29e').style('font-size','10px').style('font-family','Vazirmatn,sans-serif');
    });

    g.append('g').attr('transform',`translate(0,${h})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call(el => {
        el.select('.domain').attr('stroke','#e7e5e4');
        el.selectAll('text').attr('fill','#a8a29e').style('font-size','10px')
          .style('font-family','Vazirmatn,sans-serif').attr('dy','1.2em');
      });

    // bars
    const bars = g.selectAll('.bar').data(data).join('rect')
      .attr('x', d => x(d.date)).attr('width', x.bandwidth())
      .attr('rx',5).attr('ry',5).attr('fill','url(#wkBarGrad)')
      .attr('y', h).attr('height', 0);

    bars.transition().duration(600).ease(d3.easeCubicOut)
      .delay((_,i) => i*55)
      .attr('y', d => y(+d.amount))
      .attr('height', d => h - y(+d.amount));

    // tooltip
    container.style.position = 'relative';
    const tip = d3.select(container).append('div')
      .style('position','absolute').style('background','#1c1917').style('color','#fff')
      .style('font-size','12px').style('padding','5px 10px').style('border-radius','8px')
      .style('pointer-events','none').style('opacity','0').style('transition','opacity .15s')
      .style('white-space','nowrap').style('font-family','Vazirmatn,sans-serif');

    bars.on('mouseenter', function(_ev, d) {
      d3.select(this).attr('fill','#ef4444');
      tip.style('opacity','1').html(Number(d.amount).toLocaleString('fa-IR') + ' تومان');
    }).on('mousemove', function(ev) {
      const r = container.getBoundingClientRect();
      tip.style('left',(ev.clientX-r.left+8)+'px').style('top',(ev.clientY-r.top-36)+'px');
    }).on('mouseleave', function() {
      d3.select(this).attr('fill','url(#wkBarGrad)');
      tip.style('opacity','0');
    });
  }

  function _renderWeeklyVanilla(data, el) {
    const max = Math.max(...data.map(d => +d.amount), 1);
    el.style.cssText = 'display:flex;align-items:flex-end;gap:8px;padding:0 8px;height:100%;';
    data.forEach(d => {
      const pct = Math.max(2, Math.round((+d.amount/max)*100));
      const col = document.createElement('div');
      col.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;';
      col.innerHTML = `
        <div style="width:100%;flex:1;display:flex;align-items:flex-end;">
          <div style="width:100%;height:${pct}%;min-height:4px;border-radius:6px 6px 0 0;
               background:linear-gradient(to top,#7f1d1d,#dc2626);"></div>
        </div>
        <div style="font-size:10px;color:#a8a29e;">${d.date}</div>`;
      el.appendChild(col);
    });
  }

  /* ══════════════════════════════════════════════════════════
     نمودار دونات وضعیت سفارش‌ها — D3.js
  ══════════════════════════════════════════════════════════ */
  function renderOrderStatusChart(data) {
    const container = document.getElementById('orderStatusChart');
    if (!container) return;
    container.innerHTML = '';

    const entries = Object.entries(data || {}).filter(([,v]) => v > 0);
    if (!entries.length) {
      container.innerHTML = '<div style="text-align:center;padding:40px 0;color:#a8a29e;font-size:14px;">داده‌ای موجود نیست</div>';
      return;
    }

    const COLORS = ['#b91c1c','#1d4ed8','#7c3aed','#15803d','#78716c','#c2410c'];

    // اگه D3 لود نشده بود، vanilla fallback
    if (typeof d3 === 'undefined') {
      _renderDonutVanilla(entries, COLORS, container);
      return;
    }

    const total = d3.sum(entries, ([,v]) => v) || 1;
    const SIZE  = 170;
    const R     = SIZE / 2;
    const inner = R * 0.58;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;position:relative;';
    container.appendChild(wrap);

    const svg = d3.select(wrap).append('svg').attr('width',SIZE).attr('height',SIZE).style('overflow','visible');
    const g   = svg.append('g').attr('transform',`translate(${R},${R})`);

    const pie    = d3.pie().value(([,v]) => v).sort(null);
    const arcFn  = d3.arc().innerRadius(inner).outerRadius(R-4).cornerRadius(3);
    const arcHov = d3.arc().innerRadius(inner).outerRadius(R+5).cornerRadius(3);

    const tip = d3.select(wrap).append('div')
      .style('position','absolute').style('background','#1c1917').style('color','#fff')
      .style('font-size','12px').style('padding','5px 10px').style('border-radius','8px')
      .style('pointer-events','none').style('opacity','0').style('white-space','nowrap')
      .style('font-family','Vazirmatn,sans-serif').style('transition','opacity .15s');

    const arcs = g.selectAll('path').data(pie(entries)).join('path')
      .attr('fill', (_,i) => COLORS[i%COLORS.length])
      .attr('stroke','#fff').attr('stroke-width',2)
      .each(function(d) { this._current = {startAngle:d.startAngle,endAngle:d.startAngle}; });

    arcs.transition().duration(700).ease(d3.easeCubicOut)
      .attrTween('d', function(d) {
        const i = d3.interpolate(this._current, d);
        this._current = i(1);
        return t => arcFn(i(t));
      });

    g.append('text').attr('text-anchor','middle').attr('dy','-0.15em')
      .style('font-size','20px').style('font-weight','700').style('fill','#1c1917')
      .style('font-family','Vazirmatn,sans-serif').text(total.toLocaleString('fa-IR'));
    g.append('text').attr('text-anchor','middle').attr('dy','1.2em')
      .style('font-size','11px').style('fill','#a8a29e')
      .style('font-family','Vazirmatn,sans-serif').text('سفارش');

    arcs.on('mouseenter', function(_ev, d) {
      d3.select(this).transition().duration(120).attr('d', arcHov);
      tip.style('opacity','1')
         .html(`${d.data[0]}: <b>${d.data[1].toLocaleString('fa-IR')}</b> (${Math.round(d.data[1]/total*100)}٪)`);
    }).on('mousemove', function(ev) {
      const r = wrap.getBoundingClientRect();
      tip.style('left',(ev.clientX-r.left+10)+'px').style('top',(ev.clientY-r.top-36)+'px');
    }).on('mouseleave', function() {
      d3.select(this).transition().duration(120).attr('d', arcFn);
      tip.style('opacity','0');
    });

    // legend
    const legend = document.createElement('div');
    legend.style.cssText = 'width:100%;display:flex;flex-direction:column;gap:7px;';
    entries.forEach(([label,val],i) => {
      const pct   = Math.round((val/total)*100);
      const color = COLORS[i%COLORS.length];
      const row   = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:7px;">
          <span style="width:9px;height:9px;border-radius:50%;background:${color};flex-shrink:0;"></span>
          <span style="font-size:12px;color:#57534e;">${label}</span>
        </div>
        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
          <span style="font-size:12px;font-weight:600;color:#1c1917;">${val.toLocaleString('fa-IR')}</span>
          <span style="font-size:11px;color:#a8a29e;">(${pct}٪)</span>
        </div>`;
      legend.appendChild(row);
    });
    wrap.appendChild(legend);
  }

  function _renderDonutVanilla(entries, COLORS, el) {
    const total = entries.reduce((s,[,v])=>s+v,0) || 1;
    let deg = 0;
    const gradient = entries.map(([,v],i) => {
      const slice = (v/total)*360;
      const part = `${COLORS[i%COLORS.length]} ${deg}deg ${deg+slice}deg`;
      deg += slice; return part;
    }).join(', ');
    el.style.cssText = 'display:flex;flex-direction:column;gap:16px;';
    const donutWrap = document.createElement('div');
    donutWrap.style.cssText = 'display:flex;align-items:center;justify-content:center;';
    const donut = document.createElement('div');
    donut.style.cssText = `width:160px;height:160px;border-radius:50%;background:conic-gradient(${gradient});position:relative;`;
    const hole = document.createElement('div');
    hole.style.cssText = 'position:absolute;inset:28px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;';
    hole.innerHTML = `<span style="font-size:22px;font-weight:700;color:#1c1917;">${total.toLocaleString('fa-IR')}</span><span style="font-size:11px;color:#a8a29e;">سفارش</span>`;
    donut.appendChild(hole); donutWrap.appendChild(donut); el.appendChild(donutWrap);
    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    entries.forEach(([label,val],i) => {
      const pct=Math.round((val/total)*100), color=COLORS[i%COLORS.length];
      const row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;';
      row.innerHTML=`<div style="display:flex;align-items:center;gap:8px;"><span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span><span style="font-size:12px;color:#57534e;">${label}</span></div><div style="display:flex;align-items:center;gap:6px;"><span style="font-size:12px;font-weight:600;color:#1c1917;">${val.toLocaleString('fa-IR')}</span><span style="font-size:11px;color:#a8a29e;">(${pct}٪)</span></div>`;
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
      const [data, catsRes] = await Promise.all([
        API.products.list({ limit: 100 }),
        API.categories.list(),
      ]);
      setLoading(false);
      _products   = data.data?.data || data.data || [];
      _categories = catsRes.data || catsRes || [];
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
      const img = p.main_image || p.images?.find(i=>i.is_main)?.url || p.images?.[0]?.url || p.image || '';
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
          <span class="px-2 py-1 rounded-full text-xs font-medium ${(p.featured||p.is_featured)?'bg-amber-100 text-amber-800':'bg-stone-100 text-stone-500'}">
            ${(p.featured||p.is_featured)?'ویژه':'عادی'}
          </span>
        </td>
        <td class="px-4 py-3 text-sm text-stone-400">${p.views||0}</td>
        <td class="px-4 py-3">
          <div class="flex gap-1">
            <button onclick="editProduct(${p.id})" title="ویرایش"
                    class="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    const _pid = $('productId'); if (_pid) _pid.value = '';
    const _pig = $('productImagesGrid'); if (_pig) _pig.innerHTML = '';
    setText('productModalTitle', 'افزودن محصول');
    setText('productSubmitText', 'ذخیره محصول');
    _fillCatFilter();
    _attachPriceFormatter();
    showModal('productModal');
  };

  /* ویرایش محصول */
  window.editProduct = async function(id) {
    try {
      setLoading(true);
      const pRes = await API.products.get(id);
      const p = pRes.data || pRes;
      if (!_categories.length) {
        const cRes = await API.categories.list();
        _categories = cRes.data || cRes || [];
      }
      setLoading(false);
      _editingProdId = id;

      const _pId = $('productId'); if (_pId) _pId.value = p.id;
      const _pNm = $('productName'); if (_pNm) _pNm.value = p.name;
      const _pPr = $('productPrice'); if (_pPr) _pPr.value = p.price ? Number(p.price).toLocaleString('fa-IR') : '';
      const _pSt = $('productStock'); if (_pSt) _pSt.value = p.stock;
      const _pDs = $('productDesc'); if (_pDs) _pDs.value = p.description||'';
      const _pBd = $('productBadge'); if (_pBd) _pBd.value = p.badge||'';
      const _pEr = $('productEra'); if (_pEr) _pEr.value = p.era||'';
      const _pFt = $('productFeatured'); if (_pFt) _pFt.checked = !!(p.featured || p.is_featured);

      _fillCatFilter();
      const _pCat = $('productCategory');
      if (p.category_id && _pCat) _pCat.value = p.category_id;

      /* نمایش تصاویر موجود */
      const grid = $('productImagesGrid');
      if (grid) {
        grid.innerHTML = (p.images||[]).map((img) => `
          <div class="relative aspect-square rounded-xl overflow-hidden bg-stone-100 group">
            <img src="${img.url}" class="w-full h-full object-cover">
            ${img.is_main?'<span class="absolute top-1 right-1 bg-red-800 text-white text-[10px] px-1.5 py-0.5 rounded-full">اصلی</span>':''}
          </div>`).join('');
      }

      _attachPriceFormatter();
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

  /* ذخیره / بروزرسانی محصول */
  $('productForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const rawPrice = getVal('productPrice').replace(/[^0-9]/g, '');
    const rawStock = getVal('productStock').replace(/[^0-9]/g, '');
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
        const newId = res.data?.id || res.id || res.product_id;
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
      const catsRes = await API.categories.list();
      const cats = catsRes.data || catsRes || [];
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
        <td class="px-5 py-4">
          <div class="flex items-center gap-3">
            ${c.image_url ? `<img src="${c.image_url}" class="w-10 h-10 rounded-xl object-cover bg-stone-100">` : '<div class="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-300"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01"/></svg></div>'}
            <span class="font-medium text-stone-800">${c.name}</span>
          </div>
        </td>
        <td class="px-5 py-4 text-stone-500 text-sm font-mono">${c.slug||'—'}</td>
        <td class="px-5 py-4">
          <div class="flex gap-1">
            <button onclick="editCategory(${c.id},'${c.name.replace(/'/g,"\\'")}','${(c.slug||'').replace(/'/g,"\\'")}','${c.image_url||''}')"
                    class="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="ویرایش">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    const _ci = $('categoryId'); if (_ci) _ci.value = '';
    const _cp = $('catImagePreview'); if (_cp) { _cp.src=''; _cp.classList.add('hidden'); }
    setText('categoryModalTitle','افزودن دسته‌بندی');
    setText('categorySubmitText','ذخیره');
    showModal('categoryModal');
  };

  window.editCategory = function(id, name, slug, imageUrl) {
    _editingCatId = id;
    const _ci = $('categoryId'); if (_ci) _ci.value = id;
    const _cn = $('categoryName'); if (_cn) _cn.value = name;
    const _cs = $('categorySlug'); if (_cs) _cs.value = slug;
    // نمایش پوستر فعلی
    const _cp = $('catImagePreview');
    if (_cp) {
      if (imageUrl) { _cp.src = imageUrl; _cp.classList.remove('hidden'); }
      else { _cp.src=''; _cp.classList.add('hidden'); }
    }
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
      let catId = _editingCatId;
      if (_editingCatId) {
        await API.categories.update(_editingCatId, payload);
        toast('دسته‌بندی بروزرسانی شد');
      } else {
        const res = await API.categories.create(payload);
        catId = res.data?.id || res.id;
        toast('دسته‌بندی ایجاد شد');
      }
      // آپلود پوستر اگه انتخاب شده
      const imgInput = $('catImageInput');
      if (catId && imgInput?.files?.length) {
        try {
          await API.categories.uploadImage(catId, imgInput.files[0]);
          imgInput.value = '';
        } catch(imgErr) {
          toast('دسته‌بندی ذخیره شد ولی آپلود پوستر ناموفق: ' + imgErr.message, 'info');
        }
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
      _orders = Array.isArray(data.data) ? data.data : (data.data?.data || data.data?.orders || []);
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
      const receiptUrl = o.receipt_path || o.receipt_file || '';
      const hasReceipt = !!receiptUrl;
      const receiptHtml = hasReceipt ? `
        <div class="flex flex-wrap gap-1 mt-1.5">
          <a href="${receiptUrl}" target="_blank"
             class="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
            مشاهده رسید
          </a>
          ${o.status === 'pending' ? `
          <button onclick="approveReceipt(${o.id})"
                  class="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors">
            <i data-lucide="check" class="w-3.5 h-3.5"></i>
            تایید
          </button>
          <button onclick="rejectReceipt(${o.id})"
                  class="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
            رد
          </button>` : ''}
        </div>` : '';
   

      return `<tr class="hover:bg-stone-50 transition-colors">
        <td class="px-4 py-3">
          <p class="font-mono text-sm text-stone-700">#${o.order_number}</p>
          ${receiptHtml}
        </td>
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

  window.approveReceipt = async function(id) {
    if (!confirm('رسید تایید و سفارش پرداخت‌شده علامت‌گذاری شود؟')) return;
    try {
      await API.orders.approveReceipt(id);
      toast('رسید تایید شد');
      loadOrders();
    } catch(e) { toast(e.message, 'error'); }
  };

  window.rejectReceipt = async function(id) {
    if (!confirm('رسید رد و از سیستم حذف شود؟')) return;
    try {
      await API.orders.rejectReceipt(id);
      toast('رسید رد شد');
      loadOrders();
    } catch(e) { toast(e.message, 'error'); }
  };

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
      const data = await API.users.list();
      setLoading(false);
      _users = data.data?.data || data.data || [];
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
                    class="p-2 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors text-xs">
              ${isAdmin?'↓':'↑'}
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

  /* ══ PRICE INPUT FORMATTER (idempotent) ═══════════════════ */
  function _attachPriceFormatter() {
    const inp = $('productPrice');
    if (!inp || inp.dataset.priceBound === '1') return;
    inp.dataset.priceBound = '1';

    inp.addEventListener('input', function() {
      const pos  = this.selectionStart;
      const prev = this.value;
      const raw  = prev.replace(/[^0-9]/g, '');
      if (!raw) { this.value = ''; return; }
      const fmt  = Number(raw).toLocaleString('fa-IR');
      this.value = fmt;
      const diff = fmt.length - prev.length;
      try { this.setSelectionRange(pos + diff, pos + diff); } catch(_) {}
    });

    inp.addEventListener('focus', function() {
      const raw = this.value.replace(/[^0-9]/g, '');
      this.value = raw;
      setTimeout(() => this.select(), 0);
    });

    inp.addEventListener('blur', function() {
      const raw = this.value.replace(/[^0-9]/g, '');
      if (raw) this.value = Number(raw).toLocaleString('fa-IR');
    });
  }

  function _initPriceFormat() { _attachPriceFormatter(); }

  /* ══ BOOT ═══════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function() {
    if (window.lucide) lucide.createIcons();
    _initPriceFormat();
    loadDashboard();
  });

})();