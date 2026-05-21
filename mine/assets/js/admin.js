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
// ========== نمودار درآمد هفتگی با D3 (بدون بک‌گراند و خطوط شبکه) ==========
function renderWeeklyChart(data) {
  const container = document.getElementById('weeklyChart');
  if (!container) return;
  container.innerHTML = '';

  if (!data?.length || data.every(d => +d.amount === 0)) {
      container.innerHTML = `<div class="text-stone-400 text-center w-full py-20">داده‌ای برای نمایش وجود ندارد</div>`;
      return;
  }

  // ابعاد - افزایش margin چپ برای فاصله بیشتر اعداد
  const margin = { top: 20, right: 20, bottom: 50, left: 65 };
  const width = container.clientWidth - margin.left - margin.right;
  const height = 280 - margin.top - margin.bottom;

  const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .style('background', 'transparent')  // بدون بک‌گراند
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
      .domain(data.map(d => d.date))
      .range([0, width])
      .padding(0.35);

  const yMax = d3.max(data, d => +d.amount) || 1;
  const y = d3.scaleLinear()
      .domain([0, yMax])
      .range([height, 0]);

  // فرمت خلاصه اعداد (K, M)
  const formatAbbreviate = (num) => {
      if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
      if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
      return num.toString();
  };

  // محور Y بدون خطوط شبکه، فقط خط محور و تیک‌ها
  const yAxis = d3.axisLeft(y)
      .ticks(4)
      .tickFormat(d => formatAbbreviate(d))
      .tickPadding(12)   // افزایش فاصله اعداد از نمودار
      .tickSize(0)       // بدون خطوط تیک (اختیاری) یا می‌تونید 5 بذارید برای خطوط کوچک
      .tickSizeOuter(0); // بدون خط انتهایی

  const yAxisGroup = svg.append('g')
      .call(yAxis)
      .style('font-size', '11px')
      .style('fill', '#78716c');

  // حذف خطوط شبکه (خطوط دش) – هیچ خطی نباید کشیده بشه
  yAxisGroup.selectAll('.tick line').remove();   // پاک کردن خطوط تیک‌ها
  yAxisGroup.selectAll('.domain').attr('stroke', '#e7e5e4'); // فقط خط اصلی محور

  // محور X با فاصله بیشتر
  const xAxis = d3.axisBottom(x)
      .tickSize(0)
      .tickPadding(10);

  const xAxisGroup = svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .style('font-size', '11px')
      .style('fill', '#78716c');

  xAxisGroup.selectAll('.tick text')
      .attr('transform', 'rotate(-20)')
      .style('text-anchor', 'end')
      .attr('dx', '-0.5em')
      .attr('dy', '0.3em');

  xAxisGroup.select('.domain').attr('stroke', '#e7e5e4');
  xAxisGroup.selectAll('.tick line').remove();

  // گرادیان برای میله‌ها
  const defs = svg.append('defs');
  const gradient = defs.append('linearGradient')
      .attr('id', 'barGradient')
      .attr('gradientTransform', 'rotate(90)');
  gradient.append('stop').attr('offset', '0%').attr('stop-color', '#dc2626');
  gradient.append('stop').attr('offset', '100%').attr('stop-color', '#991b1b');

  // انیمیشن و میله‌ها
  svg.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.date))
      .attr('y', height)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('fill', 'url(#barGradient)')
      .attr('rx', 6)
      .attr('ry', 6)
      .on('mouseenter', function(ev, d) {
          d3.select(this)
              .transition().duration(150)
              .attr('fill', '#f97316')
              .attr('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))');
          showTooltip(ev, d.date, d.amount);
      })
      .on('mouseleave', function() {
          d3.select(this)
              .transition().duration(150)
              .attr('fill', 'url(#barGradient)')
              .attr('filter', '');
          hideTooltip();
      })
      .transition()
      .duration(800)
      .delay((d, i) => i * 100)
      .attr('y', d => y(+d.amount))
      .attr('height', d => height - y(+d.amount));

  // Tooltip
  const tooltip = d3.select('body').append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('background', '#1c1917')
      .style('color', '#fafaf9')
      .style('padding', '8px 14px')
      .style('border-radius', '12px')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('transition', 'opacity 0.2s')
      .style('z-index', 100)
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.2)')
      .style('backdrop-filter', 'blur(4px)')
      .style('white-space', 'nowrap');

  function showTooltip(ev, date, amount) {
      tooltip.html(`${date}<br>💰 ${API.utils.formatPrice(amount)}`)
          .style('left', (ev.pageX + 12) + 'px')
          .style('top', (ev.pageY - 30) + 'px')
          .transition()
          .duration(100)
          .style('opacity', 1);
  }
  function hideTooltip() {
      tooltip.transition().duration(200).style('opacity', 0);
  }
}

// ========== نمودار دونات (بدون تغییر در بک‌گراند، فقط شفافیت) ==========
function renderOrderStatusChart(data) {
  const container = document.getElementById('orderStatusChart');
  if (!container) return;
  container.innerHTML = '';

  const entries = Object.entries(data).filter(([,v]) => v > 0);
  if (!entries.length) {
      container.innerHTML = '<div class="text-stone-400 text-center py-20">داده‌ای موجود نیست</div>';
      return;
  }

  const total = entries.reduce((s, [,v]) => s + v, 0);
  const width = container.clientWidth;
  const size = Math.min(width - 40, 220);
  const radius = size / 2;
  const innerRadius = radius * 0.65;

  const svg = d3.select(container)
      .append('svg')
      .attr('width', size)
      .attr('height', size)
      .style('background', 'transparent')
      .append('g')
      .attr('transform', `translate(${size/2},${size/2})`);

  const color = d3.scaleOrdinal()
      .domain(entries.map(([l]) => l))
      .range(['#dc2626', '#3b82f6', '#8b5cf6', '#10b981', '#78716c', '#f59e0b']);

  const pie = d3.pie().value(([,v]) => v).sort(null);
  const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius);
  const arcs = pie(entries);

  svg.selectAll('path')
      .data(arcs)
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => color(d.data[0]))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .transition()
      .duration(600)
      .attrTween('d', function(d) {
          const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
          return t => arc(interpolate(t));
      })
      .on('end', function() {
          d3.select(this)
              .on('mouseenter', function(ev, d) {
                  d3.select(this)
                      .transition().duration(150)
                      .attr('transform', 'scale(1.02)')
                      .attr('stroke-width', 3);
                  showDonutTooltip(ev, d.data[0], d.data[1], (d.data[1]/total*100).toFixed(1));
              })
              .on('mouseleave', function() {
                  d3.select(this)
                      .transition().duration(150)
                      .attr('transform', 'scale(1)')
                      .attr('stroke-width', 2);
                  hideDonutTooltip();
              });
      });

  // انیمیشن شمارش وسط
  const centerText = svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .style('font-size', '22px')
      .style('font-weight', 'bold')
      .style('fill', '#1c1917')
      .text('0');

  svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.8em')
      .style('font-size', '11px')
      .style('fill', '#a8a29e')
      .text('سفارش');

  let current = 0;
  const step = Math.ceil(total / 50);
  const counter = setInterval(() => {
      current += step;
      if (current >= total) {
          clearInterval(counter);
          current = total;
      }
      centerText.text(current.toLocaleString('fa-IR'));
  }, 20);

  // Tooltip
  const donutTooltip = d3.select('body').append('div')
      .attr('class', 'donut-tooltip')
      .style('position', 'absolute')
      .style('background', '#292524')
      .style('color', '#fafaf9')
      .style('padding', '6px 12px')
      .style('border-radius', '10px')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('transition', 'opacity 0.2s')
      .style('z-index', 100)
      .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)');

  function showDonutTooltip(ev, label, value, percent) {
      donutTooltip.html(`${label}<br>${value.toLocaleString('fa-IR')} سفارش (${percent}%)`)
          .style('left', (ev.pageX + 10) + 'px')
          .style('top', (ev.pageY - 28) + 'px')
          .transition().duration(100).style('opacity', 1);
  }
  function hideDonutTooltip() {
      donutTooltip.transition().duration(200).style('opacity', 0);
  }

  // Legend (بدون تغییر)
  const legendContainer = d3.select(container)
      .append('div')
      .style('display', 'flex')
      .style('flex-direction', 'column')
      .style('gap', '8px')
      .style('margin-top', '24px')
      .style('width', '100%');

  entries.forEach(([label, val]) => {
      const pct = Math.round((val / total) * 100);
      const row = legendContainer.append('div')
          .style('display', 'flex')
          .style('align-items', 'center')
          .style('justify-content', 'space-between')
          .style('gap', '12px')
          .style('cursor', 'pointer')
          .style('padding', '4px 8px')
          .style('border-radius', '10px')
          .style('transition', 'background 0.2s')
          .on('mouseenter', function() {
              d3.select(this).style('background', '#f5f5f4');
              svg.selectAll('path')
                  .filter(d => d.data[0] === label)
                  .transition().duration(150)
                  .attr('stroke-width', 3)
                  .attr('transform', 'scale(1.02)');
          })
          .on('mouseleave', function() {
              d3.select(this).style('background', 'transparent');
              svg.selectAll('path')
                  .filter(d => d.data[0] === label)
                  .transition().duration(150)
                  .attr('stroke-width', 2)
                  .attr('transform', 'scale(1)');
          });

      row.append('div')
          .style('display', 'flex')
          .style('align-items', 'center')
          .style('gap', '8px')
          .html(`
              <span style="width:12px;height:12px;border-radius:50%;background:${color(label)};display:inline-block;"></span>
              <span style="font-size:13px;color:#44403c;font-weight:500;">${label}</span>
          `);

      row.append('div')
          .style('display', 'flex')
          .style('align-items', 'center')
          .style('gap', '6px')
          .html(`
              <span style="font-size:13px;font-weight:600;color:#1c1917;">${val.toLocaleString('fa-IR')}</span>
              <span style="font-size:11px;color:#a8a29e;background:#f5f5f4;padding:2px 6px;border-radius:20px;">${pct}%</span>
          `);
  });
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

  /* ══ PRICE INPUT FORMATTER ════════════════════════════════ */
  function _initPriceFormat() {
    const priceInput = $('productPrice');
    if (!priceInput) return;

    // نمایش فرمت‌شده هنگام تایپ
    priceInput.addEventListener('input', function() {
      const raw = this.value.replace(/[^0-9]/g, '');
      if (!raw) { this.value = ''; return; }
      // ذخیره موقعیت cursor
      const formatted = Number(raw).toLocaleString('fa-IR');
      this.value = formatted;
    });

    // قبل از submit، مقدار خام رو بذار
    priceInput.addEventListener('focus', function() {
      const raw = this.value.replace(/[^0-9]/g, '');
      this.value = raw;
    });

    priceInput.addEventListener('blur', function() {
      const raw = this.value.replace(/[^0-9]/g, '');
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