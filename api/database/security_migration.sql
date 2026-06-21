-- Security hardening migration (run once on deploy)
-- token blacklist, refresh token constraints, rate-limit indexes

CREATE TABLE IF NOT EXISTS token_blacklist (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    jti_hash   VARCHAR(64)  NOT NULL,
    user_id    INT UNSIGNED NULL,
    token_type ENUM('access', 'refresh') NOT NULL DEFAULT 'access',
    reason     VARCHAR(64)  NULL,
    expires_at DATETIME     NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_jti_hash (jti_hash),
    INDEX idx_expires (expires_at),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure refresh_tokens has unique hash (safe if table already exists)
ALTER TABLE refresh_tokens
    ADD UNIQUE INDEX uq_token_hash (token_hash);

-- login_attempts: extra index for cleanup
ALTER TABLE login_attempts
    ADD INDEX idx_expires_at (expires_at);

-- otp_codes: index for rate-limit queries
ALTER TABLE otp_codes
    ADD INDEX idx_phone_created (phone, created_at);
