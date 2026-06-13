CREATE TABLE IF NOT EXISTS shop_settings (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shop_name            VARCHAR(255) NOT NULL DEFAULT '',
    shop_slogan          VARCHAR(255) NOT NULL DEFAULT '',
    shop_logo            VARCHAR(500) NOT NULL DEFAULT '',
    shop_poster          VARCHAR(500) NOT NULL DEFAULT '',
    bank_card            VARCHAR(50)  NOT NULL DEFAULT '',
    bank_owner           VARCHAR(255) NOT NULL DEFAULT '',
    payment_method       ENUM('card_to_card', 'zarinpal', 'both') NOT NULL DEFAULT 'card_to_card',
    zarinpal_merchant_id VARCHAR(100) NULL,
    sms_enabled          TINYINT(1) NOT NULL DEFAULT 0,
    created_at           DATETIME NOT NULL,
    updated_at           DATETIME NOT NULL
);

INSERT IGNORE INTO shop_settings (id, created_at, updated_at)
VALUES (1, NOW(), NOW());
