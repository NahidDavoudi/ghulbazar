ghulbazar/
│
├── api.js                 ← همینجور نگه دار، فقط utils رو بکش بیرون
│
├── router.js              ← دست نزن، تمیزه ✅
├── login.js               ← دست نزن ✅
├── app.js                 ← کوچه‌ کن (فقط header/footer/cart)
│
├── utils/
│   ├── dom.js             ← $, show, hide, text, getVal
│   ├── toast.js           ← از api.js و admin.js بکش بیرون
│   ├── formatters.js      ← formatPrice, statusBadge, renderStars
│   └── validators.js      ← اگه form validation داری
│
├── pages/                 ← pages.js رو بشکن
│   ├── home.js
│   ├── shop.js
│   ├── product.js
│   ├── cart.js
│   ├── checkout.js
│   ├── orders.js
│   └── categories.js
│
└── admin/
    ├── admin.js           ← فقط bootstrap + sidebar + auth
    └── pages/
        ├── dashboard.js
        ├── products.js
        ├── categories.js
        ├── orders.js
        ├── users.js
        └── discounts.js