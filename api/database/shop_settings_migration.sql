-- Migration: extend shop_settings for admin settings panel
-- Run once on existing databases (ignore errors if column already exists)

ALTER TABLE shop_settings ADD COLUMN shop_description TEXT NULL AFTER shop_slogan;
ALTER TABLE shop_settings ADD COLUMN shop_hero_image VARCHAR(500) NOT NULL DEFAULT '' AFTER shop_logo;
ALTER TABLE shop_settings ADD COLUMN shop_favicon VARCHAR(500) NOT NULL DEFAULT '' AFTER shop_poster;
ALTER TABLE shop_settings ADD COLUMN contact_phone VARCHAR(50) NOT NULL DEFAULT '' AFTER zarinpal_merchant_id;
ALTER TABLE shop_settings ADD COLUMN contact_email VARCHAR(255) NOT NULL DEFAULT '' AFTER contact_phone;
ALTER TABLE shop_settings ADD COLUMN contact_address TEXT NULL AFTER contact_email;
ALTER TABLE shop_settings ADD COLUMN social_instagram VARCHAR(255) NOT NULL DEFAULT '' AFTER contact_address;
ALTER TABLE shop_settings ADD COLUMN social_telegram VARCHAR(255) NOT NULL DEFAULT '' AFTER social_instagram;
ALTER TABLE shop_settings ADD COLUMN social_whatsapp VARCHAR(50) NOT NULL DEFAULT '' AFTER social_telegram;
ALTER TABLE shop_settings ADD COLUMN shipping_standard_cost INT UNSIGNED NOT NULL DEFAULT 0 AFTER social_whatsapp;
ALTER TABLE shop_settings ADD COLUMN shipping_free_from INT UNSIGNED NOT NULL DEFAULT 0 AFTER shipping_standard_cost;
ALTER TABLE shop_settings ADD COLUMN min_order_amount INT UNSIGNED NOT NULL DEFAULT 0 AFTER shipping_free_from;
ALTER TABLE shop_settings ADD COLUMN sms_provider VARCHAR(50) NOT NULL DEFAULT 'kavenegar' AFTER sms_enabled;
ALTER TABLE shop_settings ADD COLUMN sms_api_key VARCHAR(255) NOT NULL DEFAULT '' AFTER sms_provider;
ALTER TABLE shop_settings ADD COLUMN meta_title VARCHAR(255) NOT NULL DEFAULT '' AFTER sms_api_key;
ALTER TABLE shop_settings ADD COLUMN meta_description VARCHAR(500) NOT NULL DEFAULT '' AFTER meta_title;
