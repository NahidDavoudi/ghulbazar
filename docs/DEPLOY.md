# چک‌لیست استقرار Production (MVP)

## قبل از deploy

- [ ] فایل `api/.env` از روی `api/.env.example` ساخته شده
- [ ] `APP_ENV=production`
- [ ] `JWT_SECRET` و `REFRESH_SECRET` حداقل ۳۲ کاراکتر و یکتا
- [ ] `SMS_DRIVER=http` و تنظیمات SMS واقعی پر شده
- [ ] `APP_BASE_PATH` مطابق مسیر نصب روی سرور (مثلاً `/universal`)
- [ ] اطلاعات کارت بانکی از پنل ادمین → تنظیمات ثبت شده
- [ ] migrationهای دیتابیس اجرا شده (شامل `login_attempts.sql`)

## دستورات deploy

```bash
# 1. وابستگی‌های PHP
cd api
composer install --no-dev --optimize-autoloader

# 2. CSS
cd ..
npm install
npm run build:css

# 3. دیتابیس (در MySQL)
# api/database/login_attempts.sql
# api/database/otp_codes.sql
# api/database/product_catalog_migration.sql
# api/database/shop_settings_migration.sql
```

## پرمیشن‌ها

- [ ] `uploads/` قابل نوشتن توسط PHP (755 یا 775)
- [ ] `api/storage/logs/` قابل نوشتن (755 یا 775)
- [ ] `api/.env` فقط برای وب‌سرور قابل خواندن (600 یا 640)

## Apache / Nginx

- [ ] Document root به ریشه پروژه (`index.html`, `admin.html`, `api/`)
- [ ] rewrite برای API به `api/index.php`
- [ ] `.htaccess` دامنه production بررسی شده

## بعد از deploy

- [ ] `docs/SMOKE_TEST.md` اجرا شده
- [ ] لاگ `api/storage/logs/` بدون خطای 5xx تکراری
- [ ] صفحه پرداخت شماره کارت واقعی (نه پیام fallback) نشان می‌دهد

## Rollback

- نسخه قبلی `.env` و دیتابیس backup
- restore فایل‌ها + `composer install`
- بررسی migrationها قبل از rollback schema
