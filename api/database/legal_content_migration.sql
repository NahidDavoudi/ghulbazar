-- Migration: store editable legal/page content as JSON
-- Run once on existing databases (ignore errors if column already exists)

ALTER TABLE shop_settings ADD COLUMN legal_content JSON NULL AFTER meta_description;
