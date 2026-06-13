<?php

namespace App\Modules\Users;

use App\Core\Database\Model;

class UsersAddressModel extends Model
{
    protected string $table = 'addresses';
    protected bool $timestamps = false;
    protected array $fillable = [
        'user_id',
        'address',
        'city',
        'title',
        'province',
        'postal_code',
        'receiver',
        'phone',
        'is_default'	    
        ];
    public function getByUserId(int $userId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM {$this->table} WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public function belongsToUser(int $addressId, int $userId): bool
    {
        $stmt = $this->pdo->prepare("
            SELECT COUNT(*) FROM {$this->table}
            WHERE id = ? AND user_id = ?
        ");
        $stmt->execute([$addressId, $userId]);
        return (bool) $stmt->fetchColumn();
    }
}
