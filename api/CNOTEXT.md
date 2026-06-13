# PROJECT CONTEXT — NadCore Universal E-Commerce Backend

> This file is the **primary context** for AI assistants (Cursor) working on this project.
> Read this before touching any file.

---

## 1. PROJECT VISION

This is **not a one-shop backend**. The goal is a **universal, reusable PHP REST API** that powers
multiple different online stores without rewriting the core logic.

Each new shop is a new **tenant/project** that reuses this backend with:
- Different configuration (payment methods, shipping rules, auth methods)
- Different product categories and attributes
- Same underlying API structure and conventions

**Current live project using this backend:** Ghulbazar (غول‌بازار) — Persian antique jewelry shop.
**Future projects:** NadAgro (rice shop), and other e-commerce stores.

The backend is built on **NadCore** — a custom PHP MVC micro-framework built from scratch (no Laravel,
no Symfony). All architectural decisions must respect NadCore conventions.

---

## 2. CORE PHILOSOPHY

### Flexibility over hardcoding
Every business rule that *might differ* between shops must be **configurable via the admin panel**,
not hardcoded. Examples:
- Payment methods (which are active)
- Shipping cost (flat rate, free threshold, per-zone)
- Auth methods (OTP only / password only / both)
- Order statuses and their labels
- Tax rates
- Discount rules

### Config-driven feature flags
Features are toggled via a `settings` table in the database (key-value store). The admin panel
provides a UI to change these. The API reads from this table at runtime.

**Example settings keys:**
```
auth.otp_enabled          = true
auth.password_enabled     = true
payment.gateway_enabled   = true      # ZarinPal / IDPay
payment.manual_enabled    = true      # Card-to-card + receipt upload
payment.cod_enabled       = false     # Cash on delivery
shipping.mode             = flat      # flat | zone | free_above
shipping.flat_rate        = 35000     # in Tomans
shipping.free_threshold   = 500000   # free if order > this amount
```

### REST-first, clean naming
All endpoints follow strict REST conventions:
- Resource names are **plural nouns**, never verbs
- HTTP methods carry the action semantics
- Versioned under `/api/v1/`
- Consistent JSON envelope for all responses (see Section 6)

---

## 3. AUTHENTICATION SYSTEM

The auth system supports **two modes simultaneously** — both can be active at the same time.
Which modes are active is controlled by settings flags.

### Mode A — OTP (SMS-based)
```
POST /api/v1/auth/otp/request     → send OTP to phone number
POST /api/v1/auth/otp/verify      → verify OTP → returns JWT
```
- OTP is 5 digits, expires in 2 minutes
- Phone must be Iranian format (09xxxxxxxxx)
- Rate limited: max 3 requests per 10 minutes per phone

### Mode B — Password
```
POST /api/v1/auth/register        → create account with phone + password
POST /api/v1/auth/login           → login with phone + password → returns JWT
POST /api/v1/auth/forgot-password → request reset (via OTP SMS)
POST /api/v1/auth/reset-password  → set new password after OTP verify
```

### Shared Auth Endpoints
```
POST /api/v1/auth/refresh         → refresh access token using refresh token
POST /api/v1/auth/logout          → invalidate refresh token
GET  /api/v1/auth/me              → get current user profile
```

### JWT Strategy
- Access token: 15 minutes expiry
- Refresh token: 30 days expiry, stored in DB (allows server-side revocation)
- Both tokens returned on login/OTP-verify
- Auth header: `Authorization: Bearer {access_token}`

---

## 4. PAYMENT SYSTEM

**Critical design rule:** Payment method availability is controlled by admin settings, not by code
deployment. Adding a new payment method = flipping a setting flag, not a code change.

### Payment Method A — Payment Gateway (Online)
Supports: **ZarinPal** and **IDPay** (switchable via settings)

```
POST /api/v1/payments/gateway/initiate    → create payment request → returns redirect URL
GET  /api/v1/payments/gateway/verify      → callback from gateway → verify + update order
```

Flow:
1. Client calls initiate → gets `payment_url`
2. User redirects to gateway → pays
3. Gateway redirects to `verify` callback → backend confirms → order status updated

### Payment Method B — Manual Card-to-Card
```
POST /api/v1/payments/manual/submit       → submit card transfer info + receipt image upload
GET  /api/v1/payments/manual/{orderId}    → get manual payment status
```

Admin endpoints:
```
GET    /api/v1/admin/payments/manual          → list pending manual payments
PATCH  /api/v1/admin/payments/manual/{id}     → approve or reject (with optional note)
```

Flow:
1. User transfers money to shop's card
2. User uploads receipt image + fills in transfer reference number
3. Admin sees pending payment in panel, reviews receipt image
4. Admin approves → order moves to `confirmed` status
   Admin rejects → order moves back to `payment_failed` + user notified

### Payment Method C — COD (Cash on Delivery) [optional, flag-gated]
No financial transaction needed — just marks order as `pending_payment_on_delivery`.

### Shared Payment Endpoints
```
GET  /api/v1/payments/order/{orderId}     → get payment status for an order
GET  /api/v1/admin/payments              → list all payments (with filters)
```

---

## 5. SHIPPING SYSTEM

Shipping cost is **never hardcoded**. It's calculated at checkout based on active mode in settings.

### Modes (set in admin):
| Mode | Description |
|------|-------------|
| `flat` | Fixed cost for all orders |
| `free_above` | Free if order total exceeds threshold |
| `zone` | Different cost per province/city |
| `free` | Always free shipping |

### Shipping Endpoints
```
GET  /api/v1/shipping/calculate           → calculate shipping for current cart + address
GET  /api/v1/admin/shipping/settings      → get shipping config
PUT  /api/v1/admin/shipping/settings      → update shipping config
GET  /api/v1/admin/shipping/zones         → list province/city zones with their costs
POST /api/v1/admin/shipping/zones         → add zone
PUT  /api/v1/admin/shipping/zones/{id}    → update zone cost
```

---

## 6. API RESPONSE ENVELOPE

**Every single response** — success or error — uses this exact JSON structure:

```json
// Success
{
  "success": true,
  "data": { ... },
  "message": "عملیات با موفقیت انجام شد",
  "meta": {                    // only for paginated lists
    "current_page": 1,
    "per_page": 15,
    "total": 87,
    "last_page": 6
  }
}

// Error
{
  "success": false,
  "data": null,
  "message": "پیام خطا برای نمایش به کاربر",
  "errors": {                  // only for validation errors (422)
    "phone": ["فرمت شماره موبایل صحیح نیست"],
    "email": ["ایمیل قبلاً ثبت شده است"]
  }
}
```

### HTTP Status Codes Used
| Code | When |
|------|------|
| 200 | Successful GET / PATCH / PUT |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE (no body) |
| 400 | Bad request (wrong params, business logic error) |
| 401 | Unauthenticated |
| 403 | Forbidden (authenticated but no permission) |
| 404 | Resource not found |
| 422 | Validation error (with `errors` field) |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

## 7. FULL ENDPOINT MAP

### Auth
```
POST   /api/v1/auth/otp/request
POST   /api/v1/auth/otp/verify
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
PATCH  /api/v1/auth/change-password
```

### Users
```
GET    /api/v1/users/profile
PATCH  /api/v1/users/profile
GET    /api/v1/users/addresses
POST   /api/v1/users/addresses
PUT    /api/v1/users/addresses/{id}
DELETE /api/v1/users/addresses/{id}
PATCH  /api/v1/users/addresses/{id}/default
GET    /api/v1/users/orders
```

### Products
```
GET    /api/v1/products
GET    /api/v1/products/{id}
GET    /api/v1/products/{id}/variants
GET    /api/v1/products/search
POST   /api/v1/admin/products
PUT    /api/v1/admin/products/{id}
DELETE /api/v1/admin/products/{id}
POST   /api/v1/admin/products/{id}/images
DELETE /api/v1/admin/products/{id}/images/{imageId}
PATCH  /api/v1/admin/products/{id}/images/{imageId}/primary
```

### Categories
```
GET    /api/v1/categories
GET    /api/v1/categories/{id}
GET    /api/v1/categories/{id}/products
POST   /api/v1/admin/categories
PUT    /api/v1/admin/categories/{id}
DELETE /api/v1/admin/categories/{id}
```

### Cart
```
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/{id}
DELETE /api/v1/cart/items/{id}
DELETE /api/v1/cart
POST   /api/v1/cart/coupon
DELETE /api/v1/cart/coupon
```

### Orders
```
POST   /api/v1/orders
GET    /api/v1/orders/{id}
POST   /api/v1/orders/{id}/cancel
GET    /api/v1/admin/orders
GET    /api/v1/admin/orders/{id}
PATCH  /api/v1/admin/orders/{id}/status
```

### Payments
```
POST   /api/v1/payments/gateway/initiate
GET    /api/v1/payments/gateway/verify
POST   /api/v1/payments/manual/submit
GET    /api/v1/payments/manual/{orderId}
GET    /api/v1/payments/order/{orderId}
GET    /api/v1/admin/payments
GET    /api/v1/admin/payments/manual
PATCH  /api/v1/admin/payments/manual/{id}
```

### Shipping
```
GET    /api/v1/shipping/calculate
GET    /api/v1/admin/shipping/settings
PUT    /api/v1/admin/shipping/settings
GET    /api/v1/admin/shipping/zones
POST   /api/v1/admin/shipping/zones
PUT    /api/v1/admin/shipping/zones/{id}
DELETE /api/v1/admin/shipping/zones/{id}
```

### Discounts / Coupons
```
GET    /api/v1/admin/discounts
POST   /api/v1/admin/discounts
PUT    /api/v1/admin/discounts/{id}
DELETE /api/v1/admin/discounts/{id}
PATCH  /api/v1/admin/discounts/{id}/toggle
```

### Admin — Settings
```
GET    /api/v1/admin/settings
PATCH  /api/v1/admin/settings
GET    /api/v1/admin/settings/{group}       # e.g. group=payment, group=shipping
PATCH  /api/v1/admin/settings/{group}
```

### Admin — Dashboard
```
GET    /api/v1/admin/dashboard/stats
GET    /api/v1/admin/dashboard/recent-orders
GET    /api/v1/admin/dashboard/sales-chart
```

### Admin — Users
```
GET    /api/v1/admin/users
GET    /api/v1/admin/users/{id}
PATCH  /api/v1/admin/users/{id}/status
```

### Locations (Iran-specific)
```
GET    /api/v1/locations/provinces
GET    /api/v1/locations/provinces/{id}/cities
```

---

## 8. DATABASE CONVENTIONS

- All tables use `snake_case`
- Primary keys: `id` (auto-increment int)
- Timestamps: `created_at`, `updated_at` (DATETIME)
- Soft deletes: `deleted_at` (DATETIME, nullable)
- Monetary values stored in **Tomans as integers** (no decimals)
- Phone numbers stored as string `09xxxxxxxxx`
- Booleans stored as `TINYINT(1)`

### Key Tables
```
users, user_addresses
products, product_images, product_variants, product_attributes
categories
carts, cart_items
orders, order_items, order_status_history
payments
discounts, discount_usages
settings
provinces, cities
otp_codes
refresh_tokens
```

---

## 9. FRAMEWORK — NadCore

NadCore is a **custom PHP MVC framework** built from scratch. Do NOT suggest using Laravel, Symfony,
or any other framework. Work within NadCore conventions:

### Directory Structure
```
/app
  /Controllers       # Handle HTTP requests, delegate to Services
  /Services          # Business logic (never query DB directly)
  /Models            # DB interaction (PDO-based active record pattern)
  /Middleware        # Auth, rate limit, admin-only, etc.
  /Validators        # Input validation classes
  /Helpers           # Utility functions (response builder, file upload, etc.)
/config
  /app.php           # App-level config
  /database.php
  /routes.php        # All route definitions
/public
  index.php          # Entry point
```

### Response Helper
Always use the `ApiResponse` helper, never return raw JSON:
```php
return ApiResponse::success($data, 'message', 201);
return ApiResponse::error('message', 422, $errors);
return ApiResponse::paginate($data, $meta);
```

### Validation
Validation happens in Validator classes before the controller logic:
```php
$validator = new ProductValidator($request->body());
if (!$validator->passes()) {
    return ApiResponse::error('خطای اعتبارسنجی', 422, $validator->errors());
}
```

---

## 10. IRAN-SPECIFIC RULES

These are non-negotiable for all Persian e-commerce projects:

- Phone numbers: must be valid Iranian mobile format (`09[0-9]{9}`)
- Postal codes: exactly 10 digits, no spaces (`[0-9]{10}`)
- National ID (کد ملی): 10 digits with checksum validation
- Province/City dropdowns use the seeded `provinces` + `cities` tables
- Payment gateways: **ZarinPal** (primary) and **IDPay** (secondary)
- SMS provider: used for OTP — abstracted behind `SmsService` interface
- All user-facing messages in the response `message` field are in **Persian**
- Monetary display is in **Tomans** (stored as integers, displayed with separator)

---

## 11. SECURITY RULES

- All admin endpoints are protected by `AdminMiddleware` (checks `role = admin` in JWT)
- All user endpoints are protected by `AuthMiddleware` (validates JWT)
- Public endpoints: product listing, category listing, locations, auth endpoints
- File uploads (receipt images, product images): max 5MB, allowed types: jpg/png/webp
- Uploaded files stored in `/storage/uploads/{type}/{year}/{month}/`
- Never expose internal IDs in file paths — use UUID-based filenames
- Rate limiting on OTP endpoints (stored in cache/DB)
- SQL injection: use PDO prepared statements only — never string-concatenate queries
- JWT secret in `.env`, never in codebase

---

## 12. WHAT CURSOR SHOULD KNOW ABOUT TASKS

### When adding a new endpoint:
1. Define route in `config/routes.php`
2. Create or update Controller method (thin — only handles HTTP in/out)
3. Business logic goes in Service class
4. Add Validator class if there's input
5. Use `ApiResponse` helper for all returns
6. Update `API_MAP.md` with the new endpoint

### When modifying a feature:
1. Check if the feature is config-driven (read from `settings` table first)
2. Do not hardcode values that could differ per shop
3. Keep Services decoupled — a Service should not know about HTTP

### When asked to generate OpenAPI spec:
- Read `config/routes.php` for all routes
- Read relevant Controller + Validator files for input/output structure
- Use response envelope from Section 6 for all response schemas
- Group by tag: auth, users, products, cart, orders, payments, shipping, admin

---

## 13. CURRENT STATUS

| Module | Status |
|--------|--------|
| Auth (OTP + Password) | ✅ Built |
| Products + Variants | ✅ Built |
| Categories | ✅ Built |
| Cart | ✅ Built |
| Orders | ✅ Built |
| Payment — Gateway | ✅ Built |
| Payment — Manual | 🔨 In Progress |
| Shipping — Config-driven | 🔨 In Progress |
| Admin Settings Panel | 🔨 In Progress |
| Discounts / Coupons | ⏳ Planned |
| Admin Dashboard Stats | ⏳ Planned |
| OpenAPI Documentation | ⏳ Planned |

---

*Last updated: 1404 — NadCorp / Nahid*