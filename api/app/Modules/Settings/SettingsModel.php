<?php

namespace App\Modules\Settings;

use App\Core\Database\Model;

class SettingsModel extends Model
{
    protected string $table = 'shop_settings';
    protected array $fillable = [
        'shop_name',
        'shop_slogan',
        'shop_logo',
        'shop_poster',
        'bank_card',
        'bank_owner',
        'payment_method',
        'zarinpal_merchant_id',
        'sms_enabled',
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
