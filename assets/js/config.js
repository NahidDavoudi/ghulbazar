/**
 * config.js — تنظیمات سراسری فرانت (قابل override برای هر پروژه/tenant)
 * قبل از api.js لود شود.
 */
window.AppConfig = {
  app: {
    name: 'Ghulbazar',
    locale: 'fa-IR',
  },

  api: {
    /** پایه API — برای پروژه‌های دیگر فقط این را عوض کن */
    baseUrl: '/api/v1',
    timeout: 30000,
    /** تعداد retry برای خطاهای شبکه یا 5xx */
    retries: 1,
    retryDelay: 600,
    /** در 401 یک بار refresh و تکرار درخواست */
    autoRefresh: true,
  },

  storage: {
    token: 'gb_token',
    refreshToken: 'gb_refresh',
    role: 'gb_role',
  },

  /** پیام‌های پیش‌فرض وقتی بک‌اند پاسخ ندهد */
  messages: {
    network: 'خطا در اتصال به سرور. اتصال اینترنت را بررسی کنید.',
    timeout: 'زمان درخواست به پایان رسید. دوباره تلاش کنید.',
    parse: 'پاسخ سرور قابل پردازش نیست.',
    unknown: 'خطای ناشناخته رخ داد.',
    unauthorized: 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.',
    forbidden: 'شما اجازه انجام این عملیات را ندارید.',
    notFound: 'مورد درخواستی یافت نشد.',
    validation: 'لطفاً اطلاعات وارد شده را بررسی کنید.',
    rateLimit: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی صبر کنید.',
    server: 'خطای داخلی سرور. بعداً تلاش کنید.',
  },

  /** مقادیر fallback وقتی درخواست عمومی fail شود (اختیاری) */
  fallback: {
    products: [],
    categories: [],
    settings: null,
    cart: { items: [], total: 0 },
  },

  /** callbackهای سراسری — توسط فرانت ست می‌شوند */
  hooks: {
    onUnauthorized: null,
    onError: null,
  },
};
