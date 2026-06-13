/**
 * store.config.js — fallback تنظیمات فروشگاه (وقتی API در دسترس نیست)
 * منبع اصلی: GET /settings — core/storeSettings.js
 */
export default {
  name: 'آیریس ',
  logo: 'assets/images/logo.png',
  favicon: 'assets/images/logo.png',
  placeholder: 'assets/images/placeholder.png',

  hero: {
    image: 'assets/images/hero.png',
    title: 'آیریس',
    subtitle: 'مرجع اصلی خرید و فروش اکسسوری‌های سورئال و قدمت‌دار',
    ctaPrimary: 'کاوش مجموعه',
    ctaSecondary: 'دسته‌بندی‌ها',
  },

  theme: {
    primary: '#4b6b8a',
    primaryHover: '#5c7c9c',
    background: '#f8f9fb',
    surface: '#eef1f5',
    card: '#e3e7ee',
    border: '#cfd6df',
    muted: '#6b7280',
    textDim: 'rgba(15, 23, 42, 0.6)',
    bodyText: '#1e293b',
  },

  fonts: {
    body: 'Vazirmatn',
    display: 'Agbalumo',
    felipa: 'Felipa',
  },

  shipping: {
    freeFrom: 1500000,
    standardCost: 50000,
  },

  payment: {
    cardNumber: '6219-1234-5678-9012',
    cardOwner: 'آیریس',
    method: 'card_to_card',
  },

  ui: {
    cardRadius: 'rounded-xl',
    btnRadius: 'rounded-lg',
    btnPrimary: 'bg-accent hover:bg-accent-hover text-white',
    cardBase: 'bg-card border border-border',
    cardHover: 'hover:border-accent/40 transition-all duration-300',
  },

  texts: {
    nav: [
      { href: '#/', label: 'خانه' },
      { href: '#/shop', label: 'فروشگاه' },
      { href: '#/categories', label: 'دسته‌بندی‌ها' },
      { href: '#/orders', label: 'سفارشات' },
    ],
    footer: {
      tagline: 'مرجع اصلی خرید و فروش اکسسوری‌های سورئال و قدمت‌دار. هر قطعه یک داستان.',
      support: 'پشتیبانی ۷ روز هفته',
      social: '@iris',
      copyright: '© ۱۴۰۴ آیریس — تمام حقوق محفوظ است',
    },
    newsletter: {
      title: 'به حلقه یاران بپیوندید',
      subtitle: 'برای دریافت اخبار کالکشن‌های جدید عضو شوید.',
      button: 'عضویت',
      placeholder: 'ایمیل شما...',
    },
  },

  api: {
    baseUrl: 'api/v1',
  },
};
