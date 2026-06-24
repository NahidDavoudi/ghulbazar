-- Migration: enamad trust seal HTML in shop settings
-- Usage: run via php api/database/migrate_enamad_settings.php

ALTER TABLE shop_settings ADD COLUMN enamad_html TEXT NULL AFTER meta_description;
