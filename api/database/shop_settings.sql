CREATE TABLE IF NOT EXISTS shop_settings (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shop_name               VARCHAR(255) NOT NULL DEFAULT '',
    shop_slogan             VARCHAR(255) NOT NULL DEFAULT '',
    shop_description        TEXT NULL,
    shop_logo               VARCHAR(500) NOT NULL DEFAULT '',
    shop_hero_image         VARCHAR(500) NOT NULL DEFAULT '',
    shop_poster             VARCHAR(500) NOT NULL DEFAULT '',
    shop_favicon            VARCHAR(500) NOT NULL DEFAULT '',
    bank_card               VARCHAR(50)  NOT NULL DEFAULT '',
    bank_owner              VARCHAR(255) NOT NULL DEFAULT '',
    payment_method          ENUM('card_to_card', 'zarinpal', 'both') NOT NULL DEFAULT 'card_to_card',
    zarinpal_merchant_id    VARCHAR(100) NULL,
    contact_phone           VARCHAR(50)  NOT NULL DEFAULT '',
    contact_email           VARCHAR(255) NOT NULL DEFAULT '',
    contact_address         TEXT NULL,
    social_instagram        VARCHAR(255) NOT NULL DEFAULT '',
    social_telegram         VARCHAR(255) NOT NULL DEFAULT '',
    social_whatsapp         VARCHAR(50)  NOT NULL DEFAULT '',
    shipping_standard_cost  INT UNSIGNED NOT NULL DEFAULT 0,
    shipping_free_from      INT UNSIGNED NOT NULL DEFAULT 0,
    min_order_amount        INT UNSIGNED NOT NULL DEFAULT 0,
    sms_enabled             TINYINT(1) NOT NULL DEFAULT 0,
    sms_provider            VARCHAR(50) NOT NULL DEFAULT 'kavenegar',
    sms_api_key             VARCHAR(255) NOT NULL DEFAULT '',
    meta_title              VARCHAR(255) NOT NULL DEFAULT '',
    meta_description        VARCHAR(500) NOT NULL DEFAULT '',
    created_at              DATETIME NOT NULL,
    updated_at              DATETIME NOT NULL
);

INSERT IGNORE INTO shop_settings (id, created_at, updated_at)
VALUES (1, NOW(), NOW());
