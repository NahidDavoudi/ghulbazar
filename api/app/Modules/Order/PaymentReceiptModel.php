<?php
namespace App\Modules\Order;

use App\Core\Database\Model;

class PaymentReceiptModel extends Model
{
    protected string $table = 'payment_receipts';
    protected array $fillable = ['order_id', 'file_name', 'file_path'];
}