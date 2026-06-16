-- دلیل لغو سفارش (مثلاً هنگام رد رسید توسط ادمین)
-- Run once (ignore error if column already exists)
ALTER TABLE orders ADD COLUMN cancel_reason TEXT NULL AFTER notes;
