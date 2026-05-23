<?php

namespace App\Modules\Order;

use App\Core\Database\Model;

class PaymentReceiptModel extends Model
{
    protected string $table = 'payment_receipts';
    protected bool $timestamps = false;  // فقط created_at دارد
    protected array $fillable = [
        'order_id',
        'file_name',
        'file_path',
    ];

    public function findByOrderId(int $orderId): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table} WHERE order_id = ? LIMIT 1
        ");
        $stmt->execute([$orderId]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function hasReceipt(int $orderId): bool
    {
        return $this->exists('order_id', $orderId);
    }
}
