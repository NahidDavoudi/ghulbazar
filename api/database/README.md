# راه‌اندازی دیتابیس

## نصب تازه (پیشنهادی)

```bash
mysql -u root -p your_database < api/database/schema.sql
```

فایل `schema.sql` شامل تمام جداول و seedهای اولیه است (ادغام همه migrationها).

## migrationهای جداگانه (برای دیتابیس موجود)

1. `otp_codes.sql` — جدول OTP و refresh tokens
2. `product_catalog_migration.sql` — ساختار محصولات و variants
3. `shop_settings_migration.sql` — تنظیمات فروشگاه
4. `legal_content_migration.sql` — محتوای قانونی JSON
5. `login_attempts.sql` — rate limit ورود
6. `security_migration.sql` — token blacklist، ایندکس‌های امنیتی
7. `orders_cancel_reason.sql` — ستون دلیل لغو سفارش
8. `promo_banners.sql` — بنرهای تبلیغاتی

اسکریپت‌های PHP:
- `migrate_product_catalog.php` — افزودن ستون‌ها + seed attributes
- `migrate_product_cleanup.php` — مهاجرت فیلدهای legacy
- `cleanup_expired_security.php` — پاک‌سازی token/otp/attempt منقضی (cron)

## نکات

- قبل از production، یک dump از schema نهایی بگیرید و در محل امن نگه دارید.
- پس از migration، یک کاربر admin دستی یا از seed موجود ایجاد کنید.

## بررسی سلامت

```sql
SHOW TABLES LIKE 'login_attempts';
SHOW TABLES LIKE 'otp_codes';
SHOW TABLES LIKE 'shop_settings';
```
