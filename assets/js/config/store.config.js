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
    subtitle: 'فروشگاه خرید و فروش لباس های Y2K و لانگ اسلیو های خاص است.',
    ctaPrimary: 'کاوش مجموعه',
    ctaSecondary: 'دسته‌بندی‌ها',
  },

  theme: {
    primary: '#000000',                // Black
    primaryHover: '#5a5a5a',           // Aluminium (medium brightness for hover)
    background: '#ffffff',             // White
    surface: '#f1f3f4',                // Light Aluminium shade (almost white)
    card: '#c0c0c0',                   // Aluminium (classic hex)
    border: '#b8b8b8',                 // Aluminium (slightly darker for border)
    muted: '#8c8c8c',                  // Muted Aluminium (mid gray)
    textDim: 'rgba(0, 0, 0, 0.5)',     // Dimmed black text (for subtle text)
    bodyText: '#000000',               // Full black body text
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
    btnPrimary: 'bg-black hover:bg-[#5a5a5a] text-white',
    cardBase: 'bg-[#c0c0c0] border border-[#b8b8b8]', // updated for aluminium palette
    cardHover: 'hover:border-black transition-all duration-300', // hover to black border
  },

  texts: {
    nav: [
      { href: '#/', label: 'خانه' },
      { href: '#/shop', label: 'فروشگاه' },
      { href: '#/categories', label: 'دسته‌بندی‌ها' },
      { href: '#/orders', label: 'سفارشات' },
    ],
    footer: {
      tagline: 'آیریس یک فروشگاه خرید و فروش لباس های Y2K و لانگ اسلیو های خاص است.',
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
