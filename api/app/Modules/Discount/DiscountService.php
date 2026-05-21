<?php
namespace App\Modules\Discount;

use App\Core\Database\Database;
use PDO;

class DiscountService
{
    private DiscountModel $model;

    public function __construct()
    {
        $this->model = new DiscountModel();
    }

    public function validateCode(string $code): ?array
    {
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare('
            SELECT id, code, type, value
            FROM discount_codes
            WHERE code = ? AND is_active = 1 AND valid_from <= NOW() AND valid_to >= NOW()
        ');
        $stmt->execute([$code]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    public function create(array $data): int
    {
        // داده‌ها باید شامل code, type, value, valid_from, valid_to باشند
        $data['is_active'] = 1;
        return $this->model->create($data);
    }

    public function deactivate(int $id): void
    {
        $this->model->update($id, ['is_active' => 0]);
    }
}