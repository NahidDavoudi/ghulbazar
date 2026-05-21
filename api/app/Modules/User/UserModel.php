<?php

namespace App\Modules\User;

use App\Core\Database\Model;

class UserModel extends Model
{
    protected string $table = 'users';
    protected string $primaryKey = 'id';
    protected array $fillable = [
        'name',
        'phone',
        'password',        
        'is_active'
    ];
    protected array $hidden = [
        'password',
    ];
    protected bool $timestamps = true;
    protected string $createdAt = 'created_at';
    protected string $updatedAt = 'updated_at';

    public function create(array $data): int
    {
        if (isset($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        return parent::create($data);
    }

    public function update(int|string $id, array $data): bool {
        if (isset($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        return parent::update($id, $data);
    }

    public function getAll(): array {
        return $this->all();
    }
    
    public function findById(int $id): ?array {
        return $this->find($id);
    }

    public function findByPhone(string $phone): ?array
    {
        return $this->findBy('phone', $phone);
    }

    public function phoneExists(string $phone, ?int $excludeId = null): bool
    {
        return $this->exists('phone', $phone, $excludeId);
    }
    public function getActiveUsers(): array
    {
        $sql = "SELECT * FROM {$this->table} WHERE is_active = '1'";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}