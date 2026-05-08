// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    applyTheme();
    document.getElementById('phone').focus();
});

// ==================== API CLIENT INSTANCE ====================
const api = new ApiClient({
    baseURL: 'http://localhost/nadstore/public/',
    tenant: 'ghulbazar',  // ← این مهمه
    debug: true
});

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
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    
    if (icon) {
        icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    }
    if (label) {
        label.textContent = isDark ? 'حالت روشن' : 'حالت تاریک';
    }
    
    lucide.createIcons();
}

// ==================== LOADING OVERLAY ====================
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

// ==================== ALERT BOX ====================
function showAlert(message, type = 'error') {
    const alertBox = document.getElementById('alertBox');
    if (!alertBox) return;

    const colors = {
        error: 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300',
        success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300',
        info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300',
        warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
    };

    const icons = {
        error: 'alert-circle',
        success: 'check-circle',
        info: 'info',
        warning: 'alert-triangle'
    };

    alertBox.className = `mb-6 px-4 py-3 rounded-xl border ${colors[type] || colors.error}`;
    alertBox.innerHTML = `
        <div class="flex items-center gap-2">
            <i data-lucide="${icons[type] || icons.error}" class="w-5 h-5"></i>
            <span>${message}</span>
        </div>
    `;
    alertBox.classList.remove('hidden');
    
    lucide.createIcons();

    setTimeout(() => {
        alertBox.classList.add('hidden');
    }, 5000);
}

function clearAlert() {
    const alertBox = document.getElementById('alertBox');
    if (alertBox) {
        alertBox.classList.add('hidden');
    }
}

// ==================== PASSWORD TOGGLE ====================
function togglePassword() {
    const passInput = document.getElementById('password');
    const icon = document.getElementById('toggleIcon');
    
    if (!passInput || !icon) return;

    if (passInput.type === 'password') {
        passInput.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        passInput.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    
    lucide.createIcons();
}

// ==================== LOGIN FORM SUBMISSION ====================
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    clearAlert();

    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');

    if (!phoneInput || !passwordInput) return;

    const phone = phoneInput.value.trim();
    const password = passwordInput.value.trim();

    // Validation
    if (!phone || !password) {
        showAlert('لطفاً تمام فیلدها را پر کنید.', 'error');
        return;
    }

    if (!/^\d+$/.test(phone)) {
        showAlert('شماره تلفن باید فقط شامل اعداد باشد.', 'error');
        return;
    }

    if (password.length < 6) {
        showAlert('رمز عبور باید حداقل ۶ کاراکتر باشد.', 'error');
        return;
    }

    showLoading();

    try {
        const result = await api.auth.login(phone, password);
        showAlert('ورود موفقیت‌آمیز! در حال انتقال به پنل مدیریت...', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);

    } catch (error) {
        let errorMessage = 'خطا در برقراری ارتباط با سرور';
        
        if (error.status === 401) {
            errorMessage = 'شماره تلفن یا رمز عبور اشتباه است';
        } else if (error.status === 403) {
            errorMessage = 'حساب کاربری شما غیرفعال شده است';
        } else if (error.message) {
            errorMessage = error.message;
        }

        showAlert(errorMessage, 'error');
    } finally {
        hideLoading();
    }
});

// ==================== KEYBOARD NAVIGATION ====================
document.getElementById('phone').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.focus();
        }
    }
});

document.getElementById('password').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }
});