-- Rate limiting for login endpoints (run once on deploy)
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    attempt_key VARCHAR(64) NOT NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 1,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_attempt_key_expires (attempt_key, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
