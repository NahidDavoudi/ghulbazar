# معماری فرانت‌اند — Online Store Template
**Stack:** HTML · Tailwind CSS · Vanilla JS · Alpine.js · Navigo.js · Swiper.js · GSAP · Lucide Icons

---

## ساختار کامل پوشه‌ها

```
/
├── index.html                  ← SPA shell (فقط یک بار لود میشه)
├── login.html                  ← صفحه ورود (جداست چون نیاز به auth ندارد)
│
├── admin/
│   ├── index.html              ← پنل ادمین (جدا از فروشگاه)
│   └── .htaccess               ← basic auth - لایه امنیتی اول
│
├── api/                        ← بک‌اند PHP (دست نمی‌خوره)
│
└── assets/
    ├── css/
    │   ├── input.css           ← Tailwind source
    │   ├── output.css          ← Tailwind compiled
    │   ├── fonts.css           ← Vazirmatn
    │   └── libs/
    │       └── swiper-bundle.min.css
    │
    ├── fonts/
    │   └── vazirmatn/
    │
    ├── images/                 ← ← ← فقط اینجا عوض میشه (هر فروشگاه)
    │   ├── logo.png
    │   ├── hero.jpg
    │   ├── banner.jpg
    │   └── placeholder.png
    │
    └── js/
        ├── app.js              ← Entry point
        ├── login.js            ← منطق صفحه لاگین
        │
        ├── config/             ← ← ← فقط اینجا عوض میشه (هر فروشگاه)
        │   └── store.config.js
        │
        ├── core/               ← هسته - هیچ‌وقت دست نمی‌خوره
        │   ├── api.js
        │   ├── router.js
        │   ├── state.js
        │   ├── auth.js
        │   └── events.js
        │
        ├── components/         ← UI blocks - ندرتاً دست می‌خوره
        │   ├── ProductCard.js
        │   ├── CategoryCard.js
        │   ├── CartDrawer.js
        │   ├── OrderRow.js
        │   ├── Toast.js
        │   ├── Modal.js
        │   ├── Pagination.js
        │   └── Breadcrumb.js
        │
        ├── pages/              ← منطق هر صفحه - گاهی دست می‌خوره
        │   ├── home.js
        │   ├── shop.js
        │   ├── product.js
        │   ├── cart.js
        │   ├── checkout.js
        │   ├── orders.js
        │   └── payment.js
        │
        ├── admin/              ← پنل ادمین
        │   ├── admin.js        ← Entry point ادمین
        │   └── pages/
        │       ├── dashboard.js
        │       ├── products.js
        │       ├── orders.js
        │       ├── users.js
        │       ├── categories.js
        │       └── discounts.js
        │
        ├── utils/              ← ابزارهای کمکی
        │   ├── dom.js
        │   ├── helpers.js
        │   └── priceFormatter.js
        │
        └── libs/               ← کتابخانه‌های third-party
            ├── navigo.min.js
            ├── swiper-bundle.min.js
            ├── lucide.min.js
            ├── persian-date.min.js
            └── d3.min.js
```

---

## شرح وظایف هر لایه

---

### `config/store.config.js` — تنظیمات فروشگاه

**تنها فایلی که برای هر فروشگاه جدید عوض می‌شه.**

**باید داشته باشه:**
- نام فروشگاه، لوگو، رنگ‌های تم
- متن‌های Hero و Banner
- آدرس API base URL
- استایل کامپوننت‌ها (گردی دکمه‌ها، سایه کارت‌ها)
- تنظیمات ارسال (رایگان از چه مبلغی)

**نباید داشته باشه:**
- هیچ منطق JS
- هیچ API call
- هیچ وابستگی به فایل دیگه‌ای

```js
// نمونه
const storeConfig = {
  name: 'غول بازار',
  logo: '/assets/images/logo.png',
  hero: { image: '/assets/images/hero.jpg', title: 'بهترین اکسسوری‌ها' },
  theme: { primary: '#E63946', secondary: '#457B9D' },
  shipping: { freeFrom: 500000 },
  ui: { cardRadius: 'rounded-2xl', btnRadius: 'rounded-full' }
};
```

---

### `core/api.js` — HTTP Layer

**مسئول تمام ارتباط با بک‌اند.**

**باید داشته باشه:**
- یک `_request` مرکزی که همه requestها ازش رد میشن
- attach کردن JWT token به همه requestها
- parse کردن response envelope `{status, data, message}`
- مدیریت مرکزی خطاها (401، 404، 500)
- refresh token logic

**نباید داشته باشه:**
- هیچ منطق UI (نمایش toast، redirect)
- هیچ دانشی از component یا page
- هیچ state مستقیم (فقط return می‌کنه)

```js
// همه متدهای public
api.auth.login(phone, password)
api.auth.logout()
api.products.getAll(filters)
api.products.getOne(id)
api.cart.get()
api.cart.add(productId, quantity)
api.cart.remove(itemId)
api.orders.getAll()
api.orders.create(data)
api.checkout.verify(data)
```

---

### `core/router.js` — مسیریابی

**مسئول مدیریت navigation با Navigo.**

**باید داشته باشه:**
- تعریف همه routeها
- guard برای routeهای نیازمند auth
- صدا زدن page module مربوطه
- مدیریت 404

**نباید داشته باشه:**
- هیچ منطق render UI
- هیچ API call
- دانش از محتوای صفحات

---

### `core/state.js` — State مشترک

**مسئول داده‌هایی که بین چند component/page مشترکن.**

**باید داشته باشه:**
- تعداد آیتم‌های سبد خرید
- اطلاعات user لاگین‌کرده
- سیستم subscribe/publish ساده

**نباید داشته باشه:**
- داده‌های اختصاصی یک صفحه (مثل لیست محصولات)
- هیچ منطق API
- هیچ منطق UI

```js
state.set('cartCount', 3)          // set
state.get('cartCount')             // get
state.on('cartCount', callback)    // subscribe
```

---

### `core/auth.js` — مدیریت توکن

**مسئول ذخیره و خواندن JWT.**

**باید داشته باشه:**
- ذخیره/خواندن/پاک‌کردن token از localStorage
- بررسی expiry توکن
- تشخیص لاگین بودن کاربر

**نباید داشته باشه:**
- هیچ API call (اون کار api.js است)
- هیچ redirect یا UI logic

---

### `core/events.js` — Event Bus

**برای ارتباط بین componentهایی که به هم وابسته نیستن.**

**باید داشته باشه:**
- `emit(eventName, data)`
- `on(eventName, callback)`
- `off(eventName, callback)`

**مثال کاربرد:**
```js
// وقتی محصول به سبد اضافه میشه
events.emit('cart:updated', { count: 5 })

// navbar badge گوش میده
events.on('cart:updated', ({ count }) => updateBadge(count))
```

---

### `components/` — UI Blocks

**هر component یک UI قابل استفاده مجدد.**

**هر component باید داشته باشه:**
- متد `render(data)` → برمیگردونه HTML string
- متد `bind(element, callbacks)` → event listener‌ها رو attach می‌کنه
- هیچ API call مستقیم (از طریق callback از page دریافت می‌کنه)

**نباید داشته باشه:**
- هیچ API call مستقیم
- هیچ دانش از page یا route
- هیچ global state مستقیم

```js
// استفاده درست در page
const html = ProductCard.render(product)
container.insertAdjacentHTML('beforeend', html)
ProductCard.bind(container.lastElementChild, {
  onAddToCart: (id) => api.cart.add(id)  // ← منطق در page است
})
```

---

### `pages/` — منطق صفحات

**هر page مسئول یک route.**

**باید داشته باشه:**
- fetch داده از `api.js`
- ترکیب componentها برای ساخت صفحه
- منطق اختصاصی آن صفحه
- مدیریت loading و error state آن صفحه

**نباید داشته باشه:**
- HTML inline زیاد (باید به component تبدیل بشه)
- مستقیم با localStorage کار کنه (از `auth.js` استفاده کنه)
- منطقی که در صفحه دیگه‌ای هم استفاده میشه (بره توی component)

---

### `utils/` — ابزارهای کمکی

**توابع pure که هیچ وابستگی به بقیه لایه‌ها ندارن.**

| فایل | وظیفه |
|------|--------|
| `dom.js` | querySelector shorthand، createElement helper |
| `helpers.js` | debounce، throttle، formatDate |
| `priceFormatter.js` | تبدیل عدد به فرمت ریال/تومان |

**قانون:** اگه یه تابع به `api.js` یا `state.js` نیاز داشت، utils نیست — باید بره توی core یا page.

---

## قانون طلایی لایه‌بندی

```
config    →  فقط داده، بدون منطق
core      →  منطق زیرساختی، بدون UI
components →  UI خالص، بدون API call مستقیم
pages     →  ترکیب همه چیز، منطق اختصاصی
utils     →  توابع pure، بدون وابستگی
```

هر لایه فقط به لایه‌های زیرش وابسته‌ست:

```
pages  →  می‌تونه از  core + components + utils استفاده کنه
components  →  می‌تونه از  utils استفاده کنه
core  →  می‌تونه از  utils استفاده کنه
utils  →  به هیچ لایه‌ای وابسته نیست
```

---

## چه وقت Stitch لازم داری؟

| وضعیت | کار |
|--------|-----|
| فروشگاه استاندارد | فقط `config/store.config.js` عوض کن |
| نیاز به یک section خاص | آن section رو از Stitch بگیر، به component تبدیل کن |
| طراحی کاملاً متفاوت | Stitch برای visual reference، کد رو دستی بنویس |

---

## راه‌اندازی فروشگاه جدید (Template Workflow)

برای راه‌اندازی یک فروشگاه جدید از این تمپلیت:

```
1. کل پوشه پروژه را کپی کن
2. assets/js/config/store.config.js را ویرایش کن (نام، رنگ، متن، UI، API)
3. assets/images/ را جایگزین کن (logo, hero, placeholder)
4. (اختیاری) assets/css/fonts.css — فونت سفارشی
5. npm run build:css  — یا: npx @tailwindcss/cli -i assets/css/input.css -o assets/css/output.css
6. api.baseUrl در store.config.js را برای deployment تنظیم کن
```

### فقط این فایل‌ها باید عوض شوند

| فایل/پوشه | محتوا |
|---|---|
| `assets/js/config/store.config.js` | برند، تم، متن‌ها، shipping، payment، UI classes |
| `assets/images/*` | logo، hero، placeholder |

### این لایه‌ها دست نمی‌خورند

`core/` · `components/` · `pages/` · `utils/` · `config/app.config.js`

### Entry points

| صفحه | فایل |
|---|---|
| فروشگاه SPA | `app.html` → `assets/js/app.js` |
| ورود | `login.html` → `assets/js/login.js` |
| ادمین | `admin.html` → `assets/js/admin/admin.js` |

---

*این سند reference معماری پروژه‌ست — هر بار که فروشگاه جدید می‌گیری اینجا نگاه کن.*
