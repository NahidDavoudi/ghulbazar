# راه‌اندازی دیتابیس

## ترتیب اجرای migrationها

1. `otp_codes.sql` — جدول OTP و refresh tokens
2. `product_catalog_migration.sql` — ساختار محصولات و variants
3. `shop_settings_migration.sql` — تنظیمات فروشگاه
4. `login_attempts.sql` — rate limit ورود (جدید)
5. `orders_cancel_reason.sql` — ستون دلیل لغو سفارش (جدید)

## نکات

- فایل `schema.sql` کامل در gitignore است؛ برای onboarding از migrationهای موجود استفاده کنید.
- قبل از production، یک dump از schema نهایی بگیرید و در محل امن نگه دارید.
- پس از migration، یک کاربر admin دستی یا از seed موجود ایجاد کنید.

## دستور نمونه (MySQL)

```sql
SOURCE otp_codes.sql;
SOURCE product_catalog_migration.sql;
SOURCE shop_settings_migration.sql;
SOURCE login_attempts.sql;
```

## بررسی سلامت

```sql
SHOW TABLES LIKE 'login_attempts';
SHOW TABLES LIKE 'otp_codes';
SHOW TABLES LIKE 'shop_settings';
```
