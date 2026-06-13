CREATE TABLE IF NOT EXISTS otp_codes (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    phone        VARCHAR(15)  NOT NULL,
    code         VARCHAR(10)  NOT NULL,
    purpose      ENUM('login', 'register', 'reset_password') NOT NULL DEFAULT 'login',
    attempts     TINYINT UNSIGNED NOT NULL DEFAULT 0,
    max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 5,
    expires_at   DATETIME NOT NULL,
    verified_at  DATETIME NULL,
    created_at   DATETIME NOT NULL,
    INDEX idx_phone_purpose (phone, purpose),
    INDEX idx_expires (expires_at)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    token_hash VARCHAR(64)  NOT NULL,
    expires_at DATETIME     NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires (expires_at)
);
