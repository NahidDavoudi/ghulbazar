/**

 * store.config.js — fallback تنظیمات فروشگاه (وقتی API در دسترس نیست)

 * منبع اصلی: GET /settings — core/storeSettings.js

 */

export default {

  name: 'IRIS',

  logo: 'assets/images/logo.png',

  favicon: 'assets/images/logo.png',

  placeholder: 'assets/images/placeholder.png',



  hero: {

    image: 'assets/images/hero.png',

    title: 'IRIS',

    subtitle: 'لباس‌های Y2K و لانگ‌اسلیوهای خاص',

    ctaPrimary: 'کاوش مجموعه',

    ctaSecondary: 'دسته‌بندی‌ها',

  },



  feature: {

    image: 'assets/images/poster.png',

    title: 'MACHINED PERFECTION',

    description: 'هر قطعه با دقت صنعتی ساخته شده — از پارچه‌های سنگین تا چاپ کروم با فیت آناتومیک. طراحی شده برای کسانی که جزئیات را می‌بینند.',

    cta: 'مشاهده آرشیو',

    ctaHref: '#/shop',

    items: [

      { icon: 'layers', label: 'HEAVYWEIGHT COTTONS' },

      { icon: 'sparkles', label: 'SCREEN PRINTED CHROME' },

      { icon: 'scan', label: 'ANATOMICAL FIT' },

    ],

    card: {

      tag: 'ARCHIVE',

      title: 'Skull Tank — SS24',

      subtitle: 'Limited drop · ۴۸ عدد',

    },

  },



  theme: {

    primary: '#000000',

    primaryHover: '#333333',

    background: '#ffffff',

    surface: '#f5f5f7',

    card: '#f0f0f2',

    border: '#d2d2d7',

    muted: '#86868b',

    textDim: 'rgba(0, 0, 0, 0.55)',

    bodyText: '#1d1d1f',

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

    cardRadius: 'rounded-[28px]',

    btnRadius: 'rounded-full',

    btnAluminum: 'btn-aluminum',

    btnGlass: 'btn-glass',

    btnPrimary: 'btn-aluminum',

    cardBase: 'bg-white border border-black/5',

    cardHover: 'hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:border-black/10 transition-all duration-500',

  },

  carousel: {

    featured: {

      viewAllHref: '#/shop?featured=1',

      navVariant: 'aluminum',

      cardGap: 16,

      stackOffset: 24,

      mobileStackOffset: 12,

      transitionDuration: 350,

      arrowSize: 40,

      buttonPosition: 'start',

      disabledArrowOpacity: 0.3,

    },

  },



  texts: {

    nav: [

      { href: '#/', label: 'خانه' },

      { href: '#/shop', label: 'فروشگاه' },

      { href: '#/categories', label: 'دسته‌بندی‌ها' },

      { href: '#/orders', label: 'سفارشات' },

    ],

    home: {

      featured: 'محبوب‌ترین‌ها',

      newest: 'جدیدترین محصولات',

      viewAll: 'همه',

    },

    shop: {

      allProducts: 'همه محصولات',

      filtersTitle: 'فیلترها',

      sizeLabel: 'سایز',

      colorLabel: 'رنگ',

      priceLabel: 'محدوده قیمت (تومان)',

      applyFilters: 'اعمال فیلترها',

      clearFilters: 'پاک کردن فیلترها',

      showMore: 'نمایش بیشتر',

      productsFound: 'محصول یافت شد',

      loading: 'در حال بارگذاری...',

      empty: 'محصولی یافت نشد.',

      emptyAction: 'بازگشت',

      filterToggle: 'فیلتر',

      breadcrumbHome: 'خانه',

      breadcrumbShop: 'فروشگاه',

      sizes: ['S', 'M', 'L', 'XL'],

      colors: [

        { id: 'black', label: 'مشکی زغالی' },

        { id: 'white', label: 'سفید یخی' },

        { id: 'grey', label: 'خاکستری تیره' },

      ],

      priceRange: { min: 0, max: 5000000, step: 50000 },

      pageSize: 8,

    },

    product: {

      loading: 'در حال بارگذاری...',

      refPrefix: 'REF:',

      sizeLabel: 'سایز',

      sizeGuide: 'راهنمای سایز',

      sizeGuideHref: '#',

      addToCart: 'افزودن به سبد خرید',

      quickBuy: 'خرید فوری',

      addedToCart: 'محصول به سبد خرید اضافه شد',

      viewCart: 'مشاهده سبد خرید',

      detailsTitle: 'جزئیات و ترکیبات',

      shippingTitle: 'ارسال و مرجوعی',

      shippingText: 'ارسال رایگان برای سفارش‌های بالای ۱،۵۰۰،۰۰۰ تومان. امکان مرجوعی تا ۷ روز پس از تحویل برای محصولات استفاده‌نشده.',

      completeStyle: 'تکمیل استایل',

      viewAll: 'مشاهده همه',

      defaultSizes: ['XS', 'S', 'M', 'L'],

      detailItems: [

        'چاپ با کیفیت بالا',

        'لبه‌های خام و بافت طبیعی',

        'شستشو با آب سرد و پشت‌و‌رو',

      ],

    },

    footer: {

      tagline: 'آیریس — فروشگاه لباس‌های Y2K و لانگ‌اسلیوهای خاص.',

      support: 'پشتیبانی ۷ روز هفته',

      social: '@iris',

      copyright: '© ۱۴۰۴ آیریس — تمام حقوق محفوظ است',

    },

    newsletter: {

      title: '',

      subtitle: 'برای دریافت اخبار کالکشن‌های جدید عضو شوید.',

      button: 'عضویت',

      placeholder: 'ایمیل شما...',

    },

  },



  api: {

    baseUrl: 'api/v1',

  },

};

