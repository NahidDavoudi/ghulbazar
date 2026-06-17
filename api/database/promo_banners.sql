-- Promo banners for home page slider
CREATE TABLE IF NOT EXISTS promo_banners (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(200) NOT NULL DEFAULT '',
    image_url   VARCHAR(500) NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed from existing shop_poster if table is empty
INSERT INTO promo_banners (title, image_url, sort_order, is_active)
SELECT 'پوستر تبلیغاتی', shop_poster, 0, 1
FROM shop_settings
WHERE shop_poster IS NOT NULL
  AND shop_poster != ''
  AND NOT EXISTS (SELECT 1 FROM promo_banners LIMIT 1);
