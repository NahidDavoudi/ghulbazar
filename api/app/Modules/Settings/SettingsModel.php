<?php

namespace App\Modules\Settings;

use App\Core\Database\Model;

class SettingsModel extends Model
{
    protected string $table = 'shop_settings';
    protected array $fillable = [
        'shop_name',
        'shop_slogan',
        'shop_description',
        'shop_logo',
        'shop_hero_image',
        'shop_poster',
        'shop_favicon',
        'bank_card',
        'bank_owner',
        'payment_method',
        'zarinpal_merchant_id',
        'contact_phone',
        'contact_email',
        'contact_address',
        'social_instagram',
        'social_telegram',
        'social_whatsapp',
        'shipping_standard_cost',
        'shipping_free_from',
        'min_order_amount',
        'sms_enabled',
        'sms_provider',
        'sms_api_key',
        'meta_title',
        'meta_description',
    ];
    protected bool $timestamps = true;

    public function getSingleton(): ?array
    {
        $stmt = $this->pdo->query(
            "SELECT * FROM {$this->table} ORDER BY id ASC LIMIT 1"
        );
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    public function updateSingleton(array $data): bool
    {
        return $this->update(1, $data);
    }
}
