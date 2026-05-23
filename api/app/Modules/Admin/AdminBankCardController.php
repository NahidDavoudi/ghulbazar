<?php

namespace App\Modules\Admin;

use App\Core\Database\Database;

/**
 * مدیریت اطلاعات حساب‌های بانکی که به مشتری برای پرداخت کارت‌به‌کارت نمایش داده میشه.
 * این سرویس مستقیم با PDO کار میکنه چون مدل جداگانه‌ای برای bank_cards تعریف نشده.
 */
class AdminBankCardService
{
    private \PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance()->getConnection();
    }

    // ─── Read ─────────────────────────────────────────────────────

    public function getAll(): array
    {
        return $this->pdo->query("
            SELECT * FROM bank_cards ORDER BY is_active DESC, created_at DESC
        ")->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getActive(): array
    {
        return $this->pdo->query("
            SELECT * FROM bank_cards WHERE is_active = 1 ORDER BY created_at DESC
        ")->fetchAll(\PDO::FETCH_ASSOC);
    }

    public function getById(int $id): array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM bank_cards WHERE id = ?");
        $stmt->execute([$id]);
        $card = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$card) {
            throw new \RuntimeException('کارت بانکی یافت نشد.', 404);
        }

        return $card;
    }

    // ─── Create ───────────────────────────────────────────────────

    public function create(array $data): array
    {
        $this->validate($data);

        $stmt = $this->pdo->prepare("
            INSERT INTO bank_cards (bank_name, card_number, account_holder, sheba, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");

        $stmt->execute([
            trim($data['bank_name']),
            $this->normalizeCardNumber($data['card_number']),
            trim($data['account_holder']),
            trim($data['sheba'] ?? ''),
            (int) ($data['is_active'] ?? 1),
        ]);

        return $this->getById((int) $this->pdo->lastInsertId());
    }

    // ─── Update ───────────────────────────────────────────────────

    public function update(int $id, array $data): array
    {
        $this->getById($id); // throws 404 if not found

        $fields = [];
        $params = [];

        if (isset($data['bank_name'])) {
            $fields[] = 'bank_name = ?';
            $params[] = trim($data['bank_name']);
        }
        if (isset($data['card_number'])) {
            $this->validateCardNumber($data['card_number']);
            $fields[] = 'card_number = ?';
            $params[] = $this->normalizeCardNumber($data['card_number']);
        }
        if (isset($data['account_holder'])) {
            $fields[] = 'account_holder = ?';
            $params[] = trim($data['account_holder']);
        }
        if (isset($data['sheba'])) {
            $fields[] = 'sheba = ?';
            $params[] = trim($data['sheba']);
        }
        if (isset($data['is_active'])) {
            $fields[] = 'is_active = ?';
            $params[] = (int) $data['is_active'];
        }

        if (empty($fields)) {
            throw new \RuntimeException('هیچ فیلدی برای بروزرسانی ارسال نشد.', 422);
        }

        $params[] = $id;
        $stmt = $this->pdo->prepare(
            "UPDATE bank_cards SET " . implode(', ', $fields) . " WHERE id = ?"
        );
        $stmt->execute($params);

        return $this->getById($id);
    }

    // ─── Toggle / Delete ──────────────────────────────────────────

    public function toggleActive(int $id): array
    {
        $card = $this->getById($id);
        $stmt = $this->pdo->prepare("UPDATE bank_cards SET is_active = ? WHERE id = ?");
        $stmt->execute([$card['is_active'] ? 0 : 1, $id]);
        return $this->getById($id);
    }

    public function delete(int $id): void
    {
        $this->getById($id); // throws 404 if not found
        $this->pdo->prepare("DELETE FROM bank_cards WHERE id = ?")->execute([$id]);
    }

    // ─── Validation ───────────────────────────────────────────────

    private function validate(array $data): void
    {
        if (empty($data['bank_name'])) {
            throw new \RuntimeException('نام بانک الزامی است.', 422);
        }
        if (empty($data['card_number'])) {
            throw new \RuntimeException('شماره کارت الزامی است.', 422);
        }
        $this->validateCardNumber($data['card_number']);

        if (empty($data['account_holder'])) {
            throw new \RuntimeException('نام صاحب حساب الزامی است.', 422);
        }
    }

    private function validateCardNumber(string $number): void
    {
        $digits = preg_replace('/\D/', '', $number);
        if (strlen($digits) !== 16) {
            throw new \RuntimeException('شماره کارت باید ۱۶ رقم باشد.', 422);
        }
    }

    private function normalizeCardNumber(string $number): string
    {
        // ذخیره به صورت XXXX-XXXX-XXXX-XXXX
        $digits = preg_replace('/\D/', '', $number);
        return implode('-', str_split($digits, 4));
    }
}