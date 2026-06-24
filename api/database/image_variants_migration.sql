-- Migration: image variant URLs (WebP large/medium/thumb)
-- Run once on existing databases (ignore errors if column already exists)

-- product_images
ALTER TABLE product_images ADD COLUMN image_large_url VARCHAR(500) NULL AFTER image_url;
ALTER TABLE product_images ADD COLUMN image_medium_url VARCHAR(500) NULL AFTER image_large_url;
ALTER TABLE product_images ADD COLUMN image_thumb_url VARCHAR(500) NULL AFTER image_medium_url;

-- category_images
ALTER TABLE category_images ADD COLUMN image_large_url VARCHAR(500) NULL AFTER image_url;
ALTER TABLE category_images ADD COLUMN image_medium_url VARCHAR(500) NULL AFTER image_large_url;
ALTER TABLE category_images ADD COLUMN image_thumb_url VARCHAR(500) NULL AFTER image_medium_url;

-- categories poster
ALTER TABLE categories ADD COLUMN poster_image_medium VARCHAR(500) NULL AFTER poster_image;
ALTER TABLE categories ADD COLUMN poster_image_thumb VARCHAR(500) NULL AFTER poster_image_medium;

-- promo_banners
ALTER TABLE promo_banners ADD COLUMN image_large_url VARCHAR(500) NULL AFTER image_url;
ALTER TABLE promo_banners ADD COLUMN image_medium_url VARCHAR(500) NULL AFTER image_large_url;
ALTER TABLE promo_banners ADD COLUMN image_thumb_url VARCHAR(500) NULL AFTER image_medium_url;

-- shop_settings branding variants
ALTER TABLE shop_settings ADD COLUMN shop_logo_medium VARCHAR(500) NOT NULL DEFAULT '' AFTER shop_logo;
ALTER TABLE shop_settings ADD COLUMN shop_logo_thumb VARCHAR(500) NOT NULL DEFAULT '' AFTER shop_logo_medium;
ALTER TABLE shop_settings ADD COLUMN shop_hero_image_medium VARCHAR(500) NOT NULL DEFAULT '' AFTER shop_hero_image;
ALTER TABLE shop_settings ADD COLUMN shop_hero_image_thumb VARCHAR(500) NOT NULL DEFAULT '' AFTER shop_hero_image_medium;
ALTER TABLE shop_settings ADD COLUMN shop_poster_medium VARCHAR(500) NOT NULL DEFAULT '' AFTER shop_poster;
ALTER TABLE shop_settings ADD COLUMN shop_poster_thumb VARCHAR(500) NOT NULL DEFAULT '' AFTER shop_poster_medium;
ALTER TABLE shop_settings ADD COLUMN shop_favicon_medium VARCHAR(500) NOT NULL DEFAULT '' AFTER shop_favicon;
ALTER TABLE shop_settings ADD COLUMN shop_favicon_thumb VARCHAR(500) NOT NULL DEFAULT '' AFTER shop_favicon_medium;
