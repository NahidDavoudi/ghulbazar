/**
 * admin/pages/products.js
 * مدیریت محصولات: لیست، ایجاد، ویرایش، حذف، آپلود تصویر
 * وابستگی: helpers.js, priceFormatter.js, api.js
 */

;(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────────── */
  let _products      = [];
  let _categories    = [];
  let _editingProdId = null;

  /* ── Public loader ─────────────────────────────────────────── */
  window.loadProducts = async function () {
    try {
      setLoading(true);
      const [data, catsRes] = await Promise.all([
        API.products.list({ limit: 100 }),
        API.categories.list(),
      ]);
      setLoading(false);
      _products   = data.data?.data || data.data || [];
      _categories = Array.isArray(catsRes) ? catsRes : (catsRes.data || []);
      _renderProducts(_products);
      _fillCatFilter();
    } catch (e) {
      setLoading(false);
      toast(e.message, 'error');
    }
  };

  /* ── Category dropdowns ────────────────────────────────────── */
  function _fillCatFilter() {
    ['productCategoryFilter', 'productCategory'].forEach(id => {
      const el = $(id);
      if (!el) return;
      const opts = _categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      el.innerHTML = id === 'productCategoryFilter'
        ? '<option value="">همه دسته‌بندی‌ها</option>' + opts
        : '<option value="">انتخاب دسته‌بندی</option>' + opts;
    });
  }

  /* ── Render table ──────────────────────────────────────────── */
  function _renderProducts(list) {
    const tbody = $('productsTableBody');
    if (!tbody) return;
    setText('products-count', `${list.length} محصول`);
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-12 text-stone-400">محصولی یافت نشد</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(p => {
      const img      = p.main_image || p.images?.find(i => i.is_main)?.url || p.images?.[0]?.url || p.image || '';
      const stockCls = p.stock === 0 ? 'text-red-600' : p.stock < 5 ? 'text-yellow-600' : 'text-green-600';
      return `<tr class="hover:bg-stone-50 transition-colors">
        <td class="px-4 py-3">
          <img src="${img}" class="w-12 h-12 rounded-xl object-cover bg-stone-100"
              onerror="this.src='assets/images/placeholder.png'">
        </td>
        <td class="px-4 py-3">
          <p class="font-medium text-stone-800 text-sm">${p.name}</p>
          <p class="text-xs text-stone-400">${p.era || ''}</p>
        </td>
        <td class="px-4 py-3 text-sm">${API.utils.formatPrice(p.price)}</td>
        <td class="px-4 py-3 text-sm font-bold ${stockCls}">${p.stock}</td>
        <td class="px-4 py-3 text-sm text-stone-500">${p.category_name || '—'}</td>
        <td class="px-4 py-3">
          <span class="px-2 py-1 rounded-full text-xs font-medium ${(p.featured || p.is_featured) ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-500'}">
            ${(p.featured || p.is_featured) ? 'ویژه' : 'عادی'}
          </span>
        </td>
        <td class="px-4 py-3">
          <div class="flex gap-1">
            <button onclick="editProduct(${p.id})" title="ویرایش"
                    class="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.914l-3 1 1-3a4 4 0 01.914-1.414z"/>
              </svg>
            </button>
            <button onclick="deleteProduct(${p.id},'${p.name.replace(/'/g, "\\'")}')" title="حذف"
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

  /* ── Search & filter ───────────────────────────────────────── */
  $('productSearch')?.addEventListener('input', function () {
    const q = this.value.toLowerCase();
    _renderProducts(_products.filter(p =>
      p.name.toLowerCase().includes(q) || (p.category_name || '').toLowerCase().includes(q)
    ));
  });

  $('productCategoryFilter')?.addEventListener('change', function () {
    _renderProducts(this.value
      ? _products.filter(p => String(p.category_id) === this.value)
      : _products);
  });

  /* ── Open modal (new) ──────────────────────────────────────── */
  window.showProductModal = function () {
    _editingProdId = null;
    $('productForm')?.reset();
    const pid = $('productId'); if (pid) pid.value = '';
    const pig = $('productImagesGrid'); if (pig) pig.innerHTML = '';
    setText('productModalTitle', 'افزودن محصول');
    setText('productSubmitText', 'ذخیره محصول');
    _fillCatFilter();
    attachPriceFormatter('productPrice');
    showModal('productModal');
  };

  /* ── Edit product ──────────────────────────────────────────── */
  window.editProduct = async function (id) {
    try {
      setLoading(true);
      const pRes = await API.products.get(id);
      const p    = pRes.data || pRes;
      if (!_categories.length) {
        const cRes  = await API.categories.list();
        _categories = cRes.data || cRes || [];
      }
      setLoading(false);
      _editingProdId = id;

      [
        ['productId',       p.id],
        ['productName',     p.name],
        ['productPrice',    p.price ? Number(p.price).toLocaleString('fa-IR') : ''],
        ['productStock',    p.stock],
        ['productDesc',     p.description || ''],
        ['productBadge',    p.badge       || ''],
        ['productEra',      p.era         || ''],
      ].forEach(([elId, val]) => {
        const el = $(elId); if (el) el.value = val;
      });

      const featEl = $('productFeatured');
      if (featEl) featEl.checked = !!(p.featured || p.is_featured);

      _fillCatFilter();
      const catEl = $('productCategory');
      if (p.category_id && catEl) catEl.value = p.category_id;

      const grid = $('productImagesGrid');
      if (grid) {
        grid.innerHTML = (p.images || []).map(img => `
          <div class="relative aspect-square rounded-xl overflow-hidden bg-stone-100 group" id="img-item-${img.id}">
            <img src="${img.image_url}" class="w-full h-full object-cover"
                 onerror="this.src='assets/images/placeholder.png'">
            ${img.is_main
              ? '<span class="absolute top-1 right-1 bg-red-800 text-white text-[10px] px-1.5 py-0.5 rounded-full z-10">اصلی</span>'
              : `<button onclick="setMainProductImage(${id}, ${img.id})"
                         title="تنظیم به عنوان اصلی"
                         class="absolute top-1 right-1 hidden group-hover:flex items-center justify-center
                                w-6 h-6 bg-amber-500 text-white rounded-full text-[10px] z-10 hover:bg-amber-600">★</button>`
            }
            <button onclick="deleteProductImage(${id}, ${img.id})"
                    title="حذف تصویر"
                    class="absolute top-1 left-1 hidden group-hover:flex items-center justify-center
                           w-6 h-6 bg-red-600 text-white rounded-full text-xs z-10 hover:bg-red-700">×</button>
          </div>`).join('');
      }

      attachPriceFormatter('productPrice');
      setText('productModalTitle', 'ویرایش محصول');
      setText('productSubmitText', 'بروزرسانی');
      showModal('productModal');
    } catch (e) {
      setLoading(false);
      toast(e.message, 'error');
    }
  };

  /* ── Delete product ────────────────────────────────────────── */
  window.deleteProduct = async function (id, name) {
    if (!confirm(`آیا از حذف "${name}" مطمئن هستید؟`)) return;
    try {
      setLoading(true);
      await API.products.delete(id);
      setLoading(false);
      toast('محصول حذف شد');
      window.loadProducts();
    } catch (e) {
      setLoading(false);
      toast(e.message, 'error');
    }
  };

  /* ── Save / update form ────────────────────────────────────── */
  $('productForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const rawPrice = toEnDigit(getVal('productPrice')).replace(/[^0-9]/g, '');
    const rawStock = getVal('productStock').replace(/[^0-9]/g, '');
    const payload  = {
      name:        getVal('productName'),
      price:       parseInt(rawPrice, 10) || 0,
      stock:       parseInt(rawStock, 10) ?? 1,
      description: getVal('productDesc'),
      badge:       getVal('productBadge'),
      era:         getVal('productEra'),
      category_id: getVal('productCategory') || null,
      featured: $('productFeatured')?.checked ? 1 : 0,
    };
    if (!payload.name)  { toast('نام محصول الزامی است', 'error');  return; }
    if (!payload.price) { toast('قیمت محصول الزامی است', 'error'); return; }

    try {
      setLoading(true);
      if (_editingProdId) {
        await API.products.update(_editingProdId, payload);
        toast('محصول بروزرسانی شد');
        await _uploadPendingImages(_editingProdId);
      } else {
        const res   = await API.products.create(payload);
        const newId = res.data?.id || res.id || res.product_id;
        toast('محصول ایجاد شد');
        if (newId) await _uploadPendingImages(newId);
      }
      setLoading(false);
      hideModal('productModal');
      window.loadProducts();
    } catch (e) {
      setLoading(false);
      toast(e.message, 'error');
    }
  });

  /* ── Delete single image ───────────────────────────────────── */
  window.deleteProductImage = async function (productId, imageId) {
    if (!confirm('این تصویر حذف شود؟')) return;
    try {
      await API.products.deleteImage(productId, imageId);
      document.getElementById('img-item-' + imageId)?.remove();
      toast('تصویر حذف شد');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  /* ── Set main image ────────────────────────────────────────── */
  window.setMainProductImage = async function (productId, imageId) {
    try {
      await API.products.setMainImage(productId, imageId);
      // بازخوانی مودال برای بروزرسانی گرید
      await window.editProduct(productId);
      toast('تصویر اصلی تنظیم شد');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  /* ── Image preview (instant) ───────────────────────────────── */
  window.uploadProductImage = function (input) {
    const grid  = $('productImagesGrid');
    if (!grid) return;
    const files = Array.from(input.files);
    if (!files.length) return;

    files.forEach((f, idx) => {
      if (!f.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const div = document.createElement('div');
        div.id    = `img-preview-${Date.now()}-${idx}`;
        div.style.cssText = 'position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;background:#f5f5f4;';
        div.innerHTML = `
          <img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">
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

  /* ── Real upload after save ────────────────────────────────── */
  async function _uploadPendingImages(productId) {
    const imgInput = $('productImageInput');
    if (!imgInput?.files?.length) return;
    const files    = Array.from(imgInput.files);
    let firstImage = true;

    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      try {
        await API.products.uploadImage(productId, f, firstImage, 0);
        firstImage = false;
      } catch (e) {
        toast(`خطا در آپلود ${f.name}: ${e.message}`, 'error');
      }
    }

    imgInput.value = '';
    document.querySelectorAll('.upload-overlay').forEach(el => el.remove());
  }

})();