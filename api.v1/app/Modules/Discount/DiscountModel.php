<?php
namespace App\Modules\Discount;

use App\Core\Database\Model;

class DiscountModel extends Model
{
    protected string $table = 'discount_codes';
    protected array $fillable = ['code', 'type', 'value', 'valid_from', 'valid_to', 'is_active'];
}