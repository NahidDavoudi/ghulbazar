  let selectedFile = null;
  let orderData = {};

  // بازیابی اطلاعات سفارش از sessionStorage
  try {
    orderData = JSON.parse(sessionStorage.getItem('gb_checkout') || '{}');
    document.getElementById('order-number').textContent = orderData.order_number || '-';
    document.getElementById('total-amount').textContent = orderData.total_amount 
      ? Number(orderData.total_amount).toLocaleString('fa-IR') + ' تومان' 
      : '—';
  } catch (e) {
    console.error('خطا در خواندن اطلاعات سفارش:', e);
  }

  // انتخاب فایل
  function handleFile(input) {
    const f = input.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      document.getElementById('upload-error').textContent = 'حجم فایل بیش از ۵ مگابایت است';
      document.getElementById('upload-error').classList.remove('hidden');
      input.value = '';
      return;
    }
    selectedFile = f;
    document.getElementById('upload-ph').classList.add('hidden');
    document.getElementById('upload-preview').classList.remove('hidden');
    document.getElementById('file-name').textContent = f.name;
    document.getElementById('upload-error').classList.add('hidden');
  }

  // ارسال رسید
  async function submitReceipt() {
    const orderNumber = document.getElementById('order-number').textContent.trim();
    const errEl = document.getElementById('upload-error');
    const btn = document.getElementById('submit-receipt-btn');

    if (!selectedFile) {
      errEl.textContent = 'لطفاً تصویر رسید را انتخاب کنید';
      errEl.classList.remove('hidden');
      return;
    }
    if (!orderNumber || orderNumber === '-') {
      errEl.textContent = 'شماره سفارش نامعتبر است';
      errEl.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'در حال ارسال...';
    errEl.classList.add('hidden');

    try {
      const formData = new FormData();
      formData.append('receipt', selectedFile);
      formData.append('order_number', orderNumber);

      // استفاده از fetch با توکن احراز هویت (در صورت وجود)
      const token = localStorage.getItem('gb_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('api.php?endpoint=upload_receipt', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'خطا در اتصال به سرور' }));
        throw new Error(errorData.error || `خطای ${response.status}`);
      }

      const result = await response.json();
      // موفقیت
      alert('رسید با موفقیت ثبت شد. سفارش شما در دست بررسی است.');
      sessionStorage.removeItem('gb_checkout');
      window.location.href = 'index.html';
    } catch (e) {
      errEl.textContent = e.message || 'خطا در ارسال رسید';
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'ارسال رسید';
    }
  }

  // کپی متن
  function copyText(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = el.textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
      const toast = document.getElementById('copy-toast');
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 2000);
    }).catch(() => {
      alert('متن کپی نشد!');
    });
  }

  // راه‌اندازی
  document.addEventListener('DOMContentLoaded', () => {
    injectHeader();
    injectFooter();
    loadCartCount();
  });
