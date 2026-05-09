// ==================== API CLIENT INSTANCE ====================
const api = new ApiClient({
    baseURL: 'http://localhost/nadstore/public/',
    tenant: 'ghulbazar',  // ← این مهمه
    debug: false
});

// ==================== GLOBAL STATE ====================
const TENANT_HEADER = 'ghulbazar';
let currentPage = 1;
let currentProductPage = 1;
let currentOrderPage = 1;
let currentUserPage = 1;
let uploadedImages = [];

// ==================== THEME MANAGEMENT ====================
function applyTheme() {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    updateThemeUI(isDark);
}

function toggleTheme() {
    const isDark = !document.documentElement.classList.contains('dark');
    
    if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
    
    updateThemeUI(isDark);
}

function updateThemeUI(isDark) {
    const themeIcons = document.querySelectorAll('#mobileThemeIcon, #sidebarThemeIcon');
    themeIcons.forEach(icon => {
        if (icon) {
            icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
        }
    });
    
    const themeLabel = document.getElementById('sidebarThemeLabel');
    if (themeLabel) {
        themeLabel.textContent = isDark ? 'حالت روشن' : 'حالت تاریک';
    }
    
    lucide.createIcons();
}

// Apply theme immediately
applyTheme();

// ==================== LOADING & ALERTS ====================
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function showAlert(message, type = 'info') {
    const alertBox = document.getElementById('alertBox');
    if (!alertBox) return;

    const colors = {
        success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300',
        error: 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300',
        info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300',
        warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
    };

    const icons = {
        success: 'check-circle',
        error: 'alert-circle',
        info: 'info',
        warning: 'alert-triangle'
    };

    alertBox.className = `mb-6 px-4 py-3 rounded-xl border ${colors[type] || colors.info}`;
    alertBox.innerHTML = `
        <div class="flex items-center gap-2">
            <i data-lucide="${icons[type] || icons.info}" class="w-5 h-5"></i>
            <span>${message}</span>
        </div>
    `;
    alertBox.classList.remove('hidden');
    
    lucide.createIcons();

    setTimeout(() => {
        alertBox.classList.add('hidden');
    }, 5000);
}

// ==================== NAVIGATION ====================
function switchPage(pageName, element) {
    // Hide all pages
    document.querySelectorAll('.page-section').forEach(p => {
        p.classList.add('hidden');
    });
    
    // Show target page
    const target = document.getElementById(`page-${pageName}`);
    if (target) {
        target.classList.remove('hidden');
    }

    // Update navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active-link', 'bg-red-50', 'dark:bg-red-900/20', 'text-red-700', 'dark:text-red-400');
        link.classList.add('text-stone-500', 'dark:text-stone-400');
    });
    
    if (element) {
        element.classList.add('active-link', 'bg-red-50', 'dark:bg-red-900/20', 'text-red-700', 'dark:text-red-400');
        element.classList.remove('text-stone-500', 'dark:text-stone-400');
    }

    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
        closeSidebar();
    }

    // Load page data
    switch(pageName) {
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'products':
            loadProducts();
            loadCategoriesForFilter();
            break;
        case 'categories':
            loadCategories();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'users':
            loadUsers();
            break;
        case 'discounts':
            loadDiscounts();
            break;
        case 'settings':
            // Settings page - no data to load
            break;
    }
    
    // Reinitialize icons
    setTimeout(() => lucide.createIcons(), 100);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    
    if (sidebar) {
        sidebar.classList.toggle('translate-x-full');
    }
    if (overlay) {
        overlay.classList.toggle('hidden');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    
    if (sidebar) {
        sidebar.classList.add('translate-x-full');
    }
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// ==================== MODALS ====================
function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        setTimeout(() => lucide.createIcons(), 100);
    }
}

function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        uploadedImages = [];
    }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('fixed') && 
        e.target.classList.contains('inset-0') && 
        e.target.classList.contains('z-50') &&
        !e.target.closest('.animate-scaleIn')) {
        e.target.classList.add('hidden');
        document.body.style.overflow = '';
        uploadedImages = [];
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.fixed.inset-0.z-50').forEach(m => {
            if (!m.id.includes('mobile') && !m.id.includes('sidebar')) {
                m.classList.add('hidden');
            }
        });
        document.body.style.overflow = '';
        closeSidebar();
    }
});

// Close sidebar on window resize
window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
        closeSidebar();
    }
});

// ==================== IMAGE UPLOAD ====================
async function uploadProductImage(input) {
    const files = input.files;
    if (!files || files.length === 0) return;

    const productId = document.getElementById('productId')?.value;
    const isNewProduct = !productId;
    if (!isNewProduct) {
        for (let file of files) {
            try {
                showLoading();
                const result = await api.products.uploadImage(productId, file);
                if (result.url) {
                    uploadedImages.push({ url: result.url, id: Date.now() });
                    renderProductImages();
                    showAlert('تصویر با موفقیت آپلود شد', 'success');
                }
            } catch (error) {
                showAlert('خطا در آپلود تصویر: ' + error.message, 'error');
            } finally {
                hideLoading();
            }
        }
    } else {
        for (let file of files) {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedImages.push({
                    file: file,
                    dataUrl: e.target.result,
                    id: Date.now() + Math.random()
                });
                renderProductImages();
            };
            reader.readAsDataURL(file);
        }
    }
    input.value = '';
}

function renderProductImages() {
    const grid = document.getElementById('productImagesGrid');
    if (!grid) return;

    if (uploadedImages.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-stone-400 dark:text-stone-500 text-sm py-4 text-center">تصویری آپلود نشده است</div>';
        return;
    }
    
    grid.innerHTML = uploadedImages.map((img, index) => `
        <div class="relative group">
            <img src="${img.dataUrl || img.url}" class="w-full h-24 object-cover rounded-lg border border-stone-200 dark:border-stone-700">
            <button type="button" onclick="removeUploadedImage(${index})" 
                    class="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        </div>
    `).join('');
    
    setTimeout(() => lucide.createIcons(), 100);
}

async function removeUploadedImage(index) {
    const image = uploadedImages[index];
    const productId = document.getElementById('productId')?.value;
    
    if (productId && image.url && !image.file) {
        // This is a server image - you might want to delete it
        // Note: Your API doesn't have a delete image endpoint yet
        console.warn('Image deletion from server not implemented');
    }
    
    uploadedImages.splice(index, 1);
    renderProductImages();
}

// ==================== DASHBOARD ====================
async function loadDashboardStats() {
    try {
        showLoading();
        const response = await api._request('GET', 'dashboard');
        const stats = response.data;

        document.getElementById('stat-products').textContent = (stats.total_products || 0).toLocaleString('fa-IR');
        document.getElementById('stat-orders-today').textContent = (stats.today_orders || 0).toLocaleString('fa-IR');
        document.getElementById('stat-low-stock').textContent = (stats.low_stock || 0).toLocaleString('fa-IR');
        document.getElementById('stat-pending').textContent = (stats.pending_orders || 0).toLocaleString('fa-IR');
        document.getElementById('stat-total-orders').textContent = (stats.total_orders || 0).toLocaleString('fa-IR');
        document.getElementById('stat-total-revenue').textContent = (stats.total_revenue || 0).toLocaleString('fa-IR') + ' تومان';
        document.getElementById('stat-total-users').textContent = (stats.total_users || 0).toLocaleString('fa-IR');

        // نمودارها
        renderWeeklyChartFromData(stats.weekly_sales || {});
        renderOrderStatusChartFromData(stats.order_status_counts || {});
    } catch (e) {
        console.error('Dashboard error:', e);
    } finally {
        hideLoading();
    }
}

function renderWeeklyChart(orders) {
    const container = document.getElementById('weeklyChart');
    if (!container) return;

    // Group orders by day for last 7 days
    const days = [];
    const persianDays = { 'Sat': 'ش', 'Sun': 'ی', 'Mon': 'د', 'Tue': 'س', 'Wed': 'چ', 'Thu': 'پ', 'Fri': 'ج' };
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        days.push({
            date: dateStr,
            dayName: persianDays[dayName] || dayName,
            amount: 0
        });
    }

    // Sum orders per day
    orders.forEach(order => {
        if (order.created_at && (order.payment_status === 'paid' || order.status === 'delivered')) {
            const orderDate = new Date(order.created_at).toDateString();
            const dayData = days.find(d => d.date === orderDate);
            if (dayData) {
                dayData.amount += parseFloat(order.total) || 0;
            }
        }
    });

    const maxAmount = Math.max(...days.map(d => d.amount), 1);

    container.innerHTML = days.map(d => {
        const height = (d.amount / maxAmount) * 200;
        return `
            <div class="flex-1 flex flex-col items-center gap-2">
                <div class="w-full bg-gradient-to-t from-red-800 to-red-600 rounded-t-xl hover:from-red-700 transition-all cursor-pointer relative group" style="height:${Math.max(height, 4)}px">
                    <div class="absolute -top-8 right-1/2 translate-x-1/2 bg-stone-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        ${d.amount.toLocaleString('fa-IR')} تومان
                    </div>
                </div>
                <span class="text-stone-500 dark:text-stone-400 text-xs">${d.dayName}</span>
            </div>
        `;
    }).join('');
}

function renderOrderStatusChart(orders) {
    const container = document.getElementById('orderStatusChart');
    if (!container) return;

    const statusNames = {
        'pending': 'در انتظار',
        'confirmed': 'تأیید شده',
        'processing': 'در حال پردازش',
        'shipped': 'ارسال شده',
        'delivered': 'تحویل داده',
        'cancelled': 'لغو شده',
        'refunded': 'مرجوعی'
    };

    const statusColors = {
        'pending': 'bg-amber-500',
        'confirmed': 'bg-blue-500',
        'processing': 'bg-indigo-500',
        'shipped': 'bg-purple-500',
        'delivered': 'bg-emerald-500',
        'cancelled': 'bg-red-500',
        'refunded': 'bg-orange-500'
    };

    const statusCounts = {};
    orders.forEach(order => {
        const status = order.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;

    if (Object.keys(statusCounts).length === 0) {
        container.innerHTML = '<div class="text-stone-400 dark:text-stone-500 text-center py-20">داده‌ای موجود نیست</div>';
        return;
    }

    container.innerHTML = Object.entries(statusCounts).map(([key, count]) => `
        <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full ${statusColors[key] || 'bg-stone-500'}"></div>
            <span class="text-stone-700 dark:text-stone-300 flex-1 text-sm">${statusNames[key] || key}</span>
            <span class="text-stone-900 dark:text-white font-medium text-sm">${count.toLocaleString('fa-IR')}</span>
            <span class="text-stone-500 dark:text-stone-400 text-xs">${Math.round((count / total) * 100)}%</span>
        </div>
    `).join('');
}

// ==================== PRODUCTS ====================
async function loadCategoriesForFilter() {
    try {
        const result = await api.categories.listMain();
        const categories = result.data || [];
        
        const filterSelect = document.getElementById('productCategoryFilter');
        const modalSelect = document.getElementById('productCategory');
        
        const options = '<option value="">همه دسته‌بندی‌ها</option>' + 
            categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        if (filterSelect) {
            filterSelect.innerHTML = options;
        }
        if (modalSelect) {
            modalSelect.innerHTML = '<option value="">بدون دسته‌بندی</option>' + 
                categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    } catch (e) {
        console.error('Error loading categories for filter:', e);
    }
}

async function loadProducts(page = 1) {
    currentProductPage = page;
    
    const search = document.getElementById('productSearch')?.value || '';
    const category = document.getElementById('productCategoryFilter')?.value || '';
    const sort = document.getElementById('productSort')?.value || 'newest';
    
    try {
        showLoading();
        
        let result;
        
        if (category) {
            // Filter by category
            result = await api.products.byCategory(category);
            // Manual pagination for category filter
            const allProducts = result.data || [];
            const total = allProducts.length;
            const perPage = 12;
            const totalPages = Math.ceil(total / perPage);
            const start = (page - 1) * perPage;
            const paginatedProducts = allProducts.slice(start, start + perPage);
            
            renderProductsTable(paginatedProducts, total, page, perPage);
        } else {
            // Normal listing
            result = await api.products.list(page, 12);
            const products = result.data || [];
            const total = result.pagination?.total || products.length;
            const perPage = result.pagination?.per_page || 12;
            
            renderProductsTable(products, total, page, perPage);
        }
        
    } catch (e) {
        console.error('Error loading products:', e);
    } finally {
        hideLoading();
    }
}

function renderProductsTable(products, total, page, perPage) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-stone-500 dark:text-stone-400">محصولی یافت نشد</td></tr>';
        document.getElementById('productsPagination').innerHTML = '';
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr class="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
            <td class="px-5 py-4">
                ${p.image_url 
                    ? `<img src="${p.image_url}" class="w-12 h-12 rounded-lg object-cover" alt="${p.image_alt || ''}">` 
                    : '<div class="w-12 h-12 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center"><i data-lucide="package" class="text-stone-400 w-5 h-5"></i></div>'
                }
            </td>
            <td class="px-5 py-4 text-stone-800 dark:text-white font-medium">${p.name || '-'}</td>
            <td class="px-5 py-4 text-stone-800 dark:text-white">${parseInt(p.price || 0).toLocaleString('fa-IR')} تومان</td>
            <td class="px-5 py-4">
                <span class="${p.stock_quantity > 10 ? 'text-emerald-600 dark:text-emerald-400' : p.stock_quantity > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}">
                    ${p.stock_quantity || 0} عدد
                </span>
            </td>
            <td class="px-5 py-4 text-stone-500 dark:text-stone-400">${p.category_name || p.category_id || '-'}</td>
            <td class="px-5 py-4">
                <span class="${p.is_active == 1 ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'} px-3 py-1 rounded-lg text-xs font-medium">
                    ${p.is_active == 1 ? 'فعال' : 'غیرفعال'}
                </span>
            </td>
            <td class="px-5 py-4">
                <div class="flex gap-2">
                    <button onclick="editProduct(${p.id})" class="text-stone-400 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteProduct(${p.id})" class="text-stone-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Render pagination
    renderPagination('productsPagination', total, page, perPage || 12, loadProducts);
    
    setTimeout(() => lucide.createIcons(), 100);
}

function showProductModal(product = null) {
    document.getElementById('productId').value = product?.id || '';
    document.getElementById('productName').value = product?.name || '';
    document.getElementById('productDesc').value = product?.description || '';
    document.getElementById('productPrice').value = product?.price || '';
    document.getElementById('productStock').value = product?.stock_quantity || 1;
    document.getElementById('productCategory').value = product?.category_id || '';
    document.getElementById('productFeatured').checked = product?.is_featured == 1;
    
    document.getElementById('productModalTitle').textContent = product ? 'ویرایش محصول' : 'افزودن محصول';
    document.getElementById('productSubmitText').textContent = product ? 'بروزرسانی' : 'ذخیره محصول';
    
    // Load existing images if any
    uploadedImages = [];
    if (product?.image_url) {
        uploadedImages.push({ url: product.image_url, id: Date.now() });
    }
    
    renderProductImages();
    loadCategoriesForFilter();
    showModal('productModal');
}

async function editProduct(id) {
    try {
        showLoading();
        const result = await api.products.show(id);
        if (result.data) {
            showProductModal(result.data);
        } else {
            showAlert('محصول یافت نشد', 'error');
        }
    } catch (error) {
        showAlert('خطا در دریافت اطلاعات محصول', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteProduct(id) {
    if (!confirm('آیا از حذف این محصول اطمینان دارید؟')) return;
    
    try {
        showLoading();
        await api.products.delete(id);
        showAlert('محصول با موفقیت حذف شد', 'success');
        loadProducts(currentProductPage);
    } catch (error) {
        showAlert('خطا در حذف محصول: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

document.getElementById('productForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value.trim();
    const price = document.getElementById('productPrice').value;

    if (!name || !price) {
        showAlert('نام و قیمت محصول الزامی است', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('description', document.getElementById('productDesc').value.trim() || '');
    formData.append('stock_quantity', parseInt(document.getElementById('productStock').value) || 0);
    formData.append('category_id', document.getElementById('productCategory').value || '');
    formData.append('is_featured', document.getElementById('productFeatured').checked ? '1' : '0');
    formData.append('is_active', '1');

    // اضافه کردن تصاویر
    for (let img of uploadedImages) {
        if (img.file) {
            formData.append('images[]', img.file);
        }
    }

    try {
        showLoading();
        if (id) {
            await api._request('PUT', `products/update/${id}`, formData, true);
            showAlert('محصول با موفقیت بروزرسانی شد', 'success');
        } else {
            await api._request('POST', 'products', formData, true);
            showAlert('محصول با موفقیت ایجاد شد', 'success');
        }
        hideModal('productModal');
        loadProducts(currentProductPage);
    } catch (error) {
        showAlert('خطا در ذخیره محصول: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
});
// ==================== CATEGORIES ====================
async function loadCategories() {
    try {
        showLoading();
        const result = await api.categories.listMain();
        const categories = result.data || [];
        
        const tbody = document.getElementById('categoriesTableBody');
        if (!tbody) return;

        if (!categories.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-10 text-stone-500 dark:text-stone-400">دسته‌بندی یافت نشد</td></tr>';
            return;
        }

        tbody.innerHTML = categories.map((c, i) => `
            <tr class="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
                <td class="px-5 py-4 text-stone-800 dark:text-white">${i + 1}</td>
                <td class="px-5 py-4 text-stone-800 dark:text-white font-medium">${c.name}</td>
                <td class="px-5 py-4 text-stone-500 dark:text-stone-400">${c.slug}</td>
                <td class="px-5 py-4">
                    <div class="flex gap-2">
                        <button onclick="editCategory(${c.id})" class="text-stone-400 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <i data-lucide="edit" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteCategory(${c.id})" class="text-stone-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        setTimeout(() => lucide.createIcons(), 100);
    } catch (e) {
        console.error('Error loading categories:', e);
    } finally {
        hideLoading();
    }
}

function showCategoryModal(cat = null) {
    document.getElementById('categoryId').value = cat?.id || '';
    document.getElementById('categoryName').value = cat?.name || '';
    document.getElementById('categorySlug').value = cat?.slug || '';
    document.getElementById('categoryModalTitle').textContent = cat ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی';
    document.getElementById('categorySubmitText').textContent = cat ? 'بروزرسانی' : 'ذخیره';
    showModal('categoryModal');
}

async function editCategory(id) {
    try {
        showLoading();
        const result = await api.categories.show(id);
        if (result.data) {
            showCategoryModal(result.data);
        }
    } catch (error) {
        showAlert('خطا در دریافت دسته‌بندی', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteCategory(id) {
    if (!confirm('آیا از حذف این دسته‌بندی اطمینان دارید؟')) return;
    
    try {
        showLoading();
        await api.categories.delete(id);
        showAlert('دسته‌بندی با موفقیت حذف شد', 'success');
        loadCategories();
    } catch (error) {
        showAlert('خطا در حذف دسته‌بندی: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Category Form Submission
document.getElementById('categoryForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value.trim();
    const slug = document.getElementById('categorySlug').value.trim();
    
    if (!name) {
        showAlert('نام دسته‌بندی الزامی است', 'error');
        return;
    }
    
    const body = {
        name: name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        is_active: 1,
        sort_order: 0
    };

    try {
        showLoading();
        
        if (id) {
            await api.categories.update(id, body);
            showAlert('دسته‌بندی بروزرسانی شد', 'success');
        } else {
            await api.categories.create(body);
            showAlert('دسته‌بندی ایجاد شد', 'success');
        }
        
        hideModal('categoryModal');
        loadCategories();
        
    } catch (error) {
        showAlert('خطا در ذخیره دسته‌بندی: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
});

// ==================== ORDERS ====================
async function loadOrders(page = 1) {
    currentOrderPage = page;
    
    const search = document.getElementById('orderSearch')?.value || '';
    const status = document.getElementById('orderStatusFilter')?.value || '';
    
    try {
        showLoading();
        const result = await api.orders.list();
        let orders = result.data || [];
        
        // Manual filtering (since API might not support all filters)
        if (search) {
            orders = orders.filter(o => 
                (o.id && o.id.toString().includes(search)) ||
                (o.user_id && o.user_id.toString().includes(search))
            );
        }
        
        if (status) {
            orders = orders.filter(o => o.status === status || o.payment_status === status);
        }
        
        renderOrdersTable(orders, orders.length, page);
    } catch (e) {
        console.error('Error loading orders:', e);
    } finally {
        hideLoading();
    }
}

function renderOrdersTable(orders, total, page) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-stone-500 dark:text-stone-400">سفارشی یافت نشد</td></tr>';
        document.getElementById('ordersPagination').innerHTML = '';
        return;
    }

    // Paginate manually
    const perPage = 15;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const paginatedOrders = orders.slice(start, start + perPage);

    const statusNames = {
        'pending': 'در انتظار',
        'confirmed': 'تأیید شده',
        'processing': 'در حال پردازش',
        'shipped': 'ارسال شده',
        'delivered': 'تحویل داده',
        'cancelled': 'لغو شده',
        'refunded': 'مرجوعی'
    };

    const statusColors = {
        'pending': 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
        'confirmed': 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        'processing': 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
        'shipped': 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
        'delivered': 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
        'cancelled': 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        'refunded': 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
    };

    const paymentStatusNames = {
        'paid': 'پرداخت شده',
        'unpaid': 'پرداخت نشده',
        'failed': 'ناموفق'
    };

    tbody.innerHTML = paginatedOrders.map(o => `
        <tr class="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
            <td class="px-5 py-4 text-stone-800 dark:text-white font-medium">#${o.id}</td>
            <td class="px-5 py-4 text-stone-800 dark:text-white">${o.user_id || '-'}</td>
            <td class="px-5 py-4 text-stone-800 dark:text-white">${parseInt(o.total || 0).toLocaleString('fa-IR')} تومان</td>
            <td class="px-5 py-4 text-stone-500 dark:text-stone-400">${o.created_at ? new Date(o.created_at).toLocaleDateString('fa-IR') : '-'}</td>
            <td class="px-5 py-4">
                <span class="px-3 py-1 rounded-lg text-xs font-medium ${statusColors[o.status] || 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-400'}">
                    ${statusNames[o.status] || o.status}
                </span>
                ${o.payment_status ? `<span class="mr-1 px-2 py-1 rounded-lg text-xs ${o.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-50 text-stone-600'}">${paymentStatusNames[o.payment_status] || o.payment_status}</span>` : ''}
            </td>
            <td class="px-5 py-4">
                <select onchange="updateOrderStatus(${o.id}, this.value)" class="bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-800 dark:text-white focus:border-red-700 outline-none">
                    <option value="">تغییر وضعیت</option>
                    <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>در انتظار</option>
                    <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>تأیید شده</option>
                    <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>در حال پردازش</option>
                    <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>ارسال شده</option>
                    <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>تحویل داده</option>
                    <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>لغو شده</option>
                    <option value="refunded" ${o.status === 'refunded' ? 'selected' : ''}>مرجوعی</option>
                </select>
            </td>
        </tr>
    `).join('');

    // Pagination
    const paginationContainer = document.getElementById('ordersPagination');
    if (paginationContainer) {
        if (totalPages <= 1) {
            paginationContainer.innerHTML = `<span class="text-stone-500 dark:text-stone-400 text-sm">${total} سفارش</span>`;
        } else {
            let html = `<div class="flex items-center gap-2"><span class="text-stone-500 dark:text-stone-400 text-sm ml-4">${total} سفارش</span>`;
            for (let i = 1; i <= totalPages; i++) {
                html += `<button onclick="loadOrders(${i})" class="px-3 py-2 rounded-lg text-sm ${i === page ? 'bg-red-800 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'}">${i}</button>`;
            }
            html += '</div>';
            paginationContainer.innerHTML = html;
        }
    }

    setTimeout(() => lucide.createIcons(), 100);
}

async function updateOrderStatus(orderId, newStatus) {
    if (!newStatus) return;
    
    if (!confirm(`آیا از تغییر وضعیت سفارش به "${newStatus}" اطمینان دارید؟`)) {
        loadOrders(currentOrderPage); // Reset select
        return;
    }
    
    try {
        showLoading();
        await api.orders.updateStatus(orderId, newStatus);
        showAlert('وضعیت سفارش بروزرسانی شد', 'success');
        loadOrders(currentOrderPage);
    } catch (error) {
        showAlert('خطا در بروزرسانی وضعیت: ' + error.message, 'error');
        loadOrders(currentOrderPage); // Reset select
    } finally {
        hideLoading();
    }
}

// ==================== USERS ====================
async function loadUsers(page = 1) {
    currentUserPage = page;
    
    try {
        showLoading();
        const result = await api.users.list({ page, per_page: 15 });
        const users = result.data || [];
        const total = result.pagination?.total || users.length;
        
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-stone-500 dark:text-stone-400">کاربری یافت نشد</td></tr>';
            document.getElementById('usersPagination').innerHTML = '';
            return;
        }

        const roleNames = {
            'superadmin': 'سوپر ادمین',
            'tenant_admin': 'مدیر فروشگاه',
            'admin': 'ادمین',
            'customer': 'مشتری'
        };

        const roleColors = {
            'superadmin': 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
            'tenant_admin': 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
            'admin': 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
            'customer': 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-400'
        };

        tbody.innerHTML = users.map(u => `
            <tr class="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
                <td class="px-5 py-4 text-stone-800 dark:text-white font-medium">${u.full_name || u.phone || '-'}</td>
                <td class="px-5 py-4 text-stone-500 dark:text-stone-400">${u.phone || '-'}</td>
                <td class="px-5 py-4">
                    <span class="px-3 py-1 rounded-lg text-xs font-medium ${roleColors[u.role] || 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-400'}">
                        ${roleNames[u.role] || u.role}
                    </span>
                </td>
                <td class="px-5 py-4 text-stone-500 dark:text-stone-400">${u.created_at ? new Date(u.created_at).toLocaleDateString('fa-IR') : '-'}</td>
                <td class="px-5 py-4">
                    <div class="flex gap-2">
                        ${u.role !== 'superadmin' ? `
                            <button onclick="toggleUserStatus(${u.id}, ${u.is_active})" class="text-stone-400 hover:text-amber-600 p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="${u.is_active == 1 ? 'غیرفعال کردن' : 'فعال کردن'}">
                                <i data-lucide="${u.is_active == 1 ? 'user-x' : 'user-check'}" class="w-4 h-4"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

        renderPagination('usersPagination', total, page, 15, loadUsers);
        setTimeout(() => lucide.createIcons(), 100);
    } catch (e) {
        console.error('Error loading users:', e);
    } finally {
        hideLoading();
    }
}

async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus == 1 ? 0 : 1;
    const action = newStatus ? 'فعال' : 'غیرفعال';
    
    if (!confirm(`آیا از ${action} کردن این کاربر اطمینان دارید؟`)) return;
    
    try {
        showLoading();
        await api.user.toggleStatus(userId, newStatus);
        showAlert(`کاربر ${action} شد`, 'success');
        loadUsers(currentUserPage);
    } catch (error) {
        showAlert('خطا در تغییر وضعیت کاربر: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== DISCOUNTS (COUPONS) ====================
async function loadDiscounts() {
    try {
        showLoading();
        const result = await api.coupons.list();
        const coupons = result.data || [];
        
        const container = document.getElementById('discountsContainer');
        if (!container) return;

        if (!coupons.length) {
            container.innerHTML = '<div class="col-span-full text-center py-10 text-stone-500 dark:text-stone-400">کد تخفیفی یافت نشد</div>';
            return;
        }

        container.innerHTML = coupons.map(c => {
            const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
            const isNotStarted = c.starts_at && new Date(c.starts_at) > new Date();
            const isActive = c.is_active == 1 && !isExpired && !isNotStarted;
            
            return `
                <div class="bg-white dark:bg-stone-900 border ${isActive ? 'border-stone-200 dark:border-stone-800' : 'border-red-200 dark:border-red-800'} rounded-2xl p-5 hover:border-red-700/30 transition-all">
                    <div class="flex justify-between items-start mb-3">
                        <span class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 rounded-lg text-sm font-bold font-mono">${c.code}</span>
                        <span class="text-stone-400 text-sm">${c.type === 'percent' ? c.value + '%' : c.value + ' تومان'}</span>
                    </div>
                    <div class="text-stone-500 dark:text-stone-400 text-sm space-y-1">
                        <div>نوع: ${c.type === 'percent' ? 'درصدی' : 'مبلغ ثابت'}</div>
                        ${c.min_order_amount ? `<div>حداقل سفارش: ${parseInt(c.min_order_amount).toLocaleString('fa-IR')} تومان</div>` : ''}
                        <div>شروع: ${c.starts_at ? new Date(c.starts_at).toLocaleDateString('fa-IR') : 'نامحدود'}</div>
                        <div>پایان: ${c.expires_at ? new Date(c.expires_at).toLocaleDateString('fa-IR') : 'نامحدود'}</div>
                        ${c.max_usage ? `<div>حداکثر استفاده: ${c.max_usage} / استفاده شده: ${c.used_count || 0}</div>` : ''}
                    </div>
                    <div class="flex gap-2 mt-4 pt-4 border-t border-stone-200 dark:border-stone-800">
                        <button onclick="editDiscount(${c.id})" class="text-stone-400 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <i data-lucide="edit" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteDiscount(${c.id})" class="text-stone-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        setTimeout(() => lucide.createIcons(), 100);
    } catch (e) {
        console.error('Error loading discounts:', e);
    } finally {
        hideLoading();
    }
}

function showDiscountModal(coupon = null) {
    if (coupon) {
        document.getElementById('discountCode').value = coupon.code || '';
        document.getElementById('discountType').value = coupon.type || 'percent';
        document.getElementById('discountValue').value = coupon.value || '';
        document.getElementById('discountValidFrom').value = coupon.starts_at ? coupon.starts_at.split(' ')[0] : '';
        document.getElementById('discountValidTo').value = coupon.expires_at ? coupon.expires_at.split(' ')[0] : '';
        document.querySelector('#discountModal h3').textContent = 'ویرایش کد تخفیف';
        document.querySelector('#discountModal button[type="submit"] span').textContent = 'بروزرسانی';
        document.getElementById('discountModal').dataset.couponId = coupon.id;
    } else {
        document.getElementById('discountCode').value = '';
        document.getElementById('discountType').value = 'percent';
        document.getElementById('discountValue').value = '';
        document.getElementById('discountValidFrom').value = '';
        document.getElementById('discountValidTo').value = '';
        document.querySelector('#discountModal h3').textContent = 'کد تخفیف جدید';
        document.querySelector('#discountModal button[type="submit"] span').textContent = 'ایجاد کد تخفیف';
        document.getElementById('discountModal').dataset.couponId = '';
    }
    showModal('discountModal');
}

async function editDiscount(id) {
    try {
        showLoading();
        const result = await api.coupons.list();
        const coupon = (result.data || []).find(c => c.id == id);
        if (coupon) {
            showDiscountModal(coupon);
        }
    } catch (error) {
        showAlert('خطا در دریافت اطلاعات کد تخفیف', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteDiscount(id) {
    if (!confirm('آیا از حذف این کد تخفیف اطمینان دارید؟')) return;
    
    try {
        showLoading();
        await api.coupons.delete(id);
        showAlert('کد تخفیف حذف شد', 'success');
        loadDiscounts();
    } catch (error) {
        showAlert('خطا در حذف کد تخفیف: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Discount Form Submission
document.getElementById('discountForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const couponId = document.getElementById('discountModal').dataset.couponId;
    const code = document.getElementById('discountCode').value.trim();
    const type = document.getElementById('discountType').value;
    const value = document.getElementById('discountValue').value;
    const validFrom = document.getElementById('discountValidFrom').value;
    const validTo = document.getElementById('discountValidTo').value;
    
    if (!code || !value) {
        showAlert('کد و مقدار تخفیف الزامی است', 'error');
        return;
    }
    
    const body = {
        code: code,
        type: type,
        value: parseFloat(value),
        starts_at: validFrom || null,
        expires_at: validTo || null,
        is_active: 1
    };

    try {
        showLoading();
        
        if (couponId) {
            await api.coupons.update(couponId, body);
            showAlert('کد تخفیف بروزرسانی شد', 'success');
        } else {
            await api.coupons.create(body);
            showAlert('کد تخفیف ایجاد شد', 'success');
        }
        
        hideModal('discountModal');
        loadDiscounts();
        
    } catch (error) {
        showAlert('خطا در ذخیره کد تخفیف: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
});

// ==================== PAGINATION HELPER ====================
function renderPagination(containerId, total, page, limit, loadFn) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const totalPages = Math.ceil(total / limit);
    
    if (totalPages <= 1) {
        container.innerHTML = `<span class="text-stone-500 dark:text-stone-400 text-sm">${total} مورد</span>`;
        return;
    }
    
    let html = `<div class="flex items-center gap-2"><span class="text-stone-500 dark:text-stone-400 text-sm ml-4">${total} مورد</span>`;
    
    for (let i = 1; i <= totalPages; i++) {
        html += `<button onclick="${loadFn.name}(${i})" class="px-3 py-2 rounded-lg text-sm transition-colors ${i === page ? 'bg-red-800 text-white shadow-lg shadow-red-900/20' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'}">${i}</button>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// ==================== LOGOUT ====================
async function handleLogout() {
    if (!confirm('آیا از خروج اطمینان دارید؟')) return;
    
    try {
        await api.auth.logout();
    } catch (e) {
        // Ignore errors
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('admin_user');
    window.location.href = 'login.html';
}

// ==================== AUTH CHECK & INIT ====================
async function checkAuth() {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const result = await api.auth.me();
        const user = result.user;
        
        if (!user) {
            handleLogout();
            return;
        }
        
        // Update sidebar username
        document.getElementById('sidebarUsername').textContent = user.full_name || user.phone || 'ادمین';
        
        // Check role - only tenant_admin, admin, or superadmin can access
        const allowedRoles = ['tenant_admin', 'admin', 'superadmin'];
        if (!allowedRoles.includes(user.role)) {
            showAlert('شما دسترسی به این بخش را ندارید', 'error');
            setTimeout(() => handleLogout(), 2000);
            return;
        }
        
        // Load dashboard on init
        loadDashboardStats();
        
    } catch (error) {
        console.error('Auth check failed:', error);
        handleLogout();
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Set active navigation link
    const dashboardLink = document.querySelector('[data-page="dashboard"]');
    if (dashboardLink) {
        dashboardLink.classList.add('active-link', 'bg-red-50', 'dark:bg-red-900/20', 'text-red-700', 'dark:text-red-400');
        dashboardLink.classList.remove('text-stone-500', 'dark:text-stone-400');
    }
    
    // Apply theme
    applyTheme();
    
    // Initialize Lucide icons
    lucide.createIcons();
    
    // Check authentication
    checkAuth();
});