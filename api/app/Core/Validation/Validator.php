<?php
namespace App\Core\Validation;

class Validator {
    private array $errors = [];
    private array $data;
    private array $rules;

    public function __construct(array $data, array $rules) {
        $this->data = $data;
        $this->rules = $rules;
    }

    public function validate(): bool {
        foreach ($this->rules as $field => $ruleString) {
            $rules = explode('|', $ruleString);
            $value = $this->data[$field] ?? null;

            foreach ($rules as $rule) {
                $params = [];
                if (str_contains($rule, ':')) {
                    [$rule, $paramStr] = explode(':', $rule, 2);
                    $params = explode(',', $paramStr);
                }

                $methodName = 'validate' . ucfirst($rule);
                if (method_exists($this, $methodName)) {
                    $this->$methodName($field, $value, $params);
                }
            }
        }

        return empty($this->errors);
    }

    public function errors(): array {
        return $this->errors;
    }

    public function addError(string $field, string $message): void {
        $this->errors[$field][] = $message;
    }

    private function validateRequired(string $field, mixed $value, array $params): void {
        if ($value === null || $value === '' || (is_array($value) && empty($value))) {
            $this->addError($field, "فیلد {$field} الزامی است");
        }
    }

    private function validateEmail(string $field, mixed $value, array $params): void {
        if ($value && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->addError($field, "{$field} باید یک ایمیل معتبر باشد");
        }
    }

    private function validateMin(string $field, mixed $value, array $params): void {
        if ($value && strlen((string)$value) < (int)$params[0]) {
            $this->addError($field, "{$field} باید حداقل {$params[0]} کاراکتر باشد");
        }
    }

    private function validateMax(string $field, mixed $value, array $params): void {
        if ($value && strlen((string)$value) > (int)$params[0]) {
            $this->addError($field, "{$field} نباید بیشتر از {$params[0]} کاراکتر باشد");
        }
    }

    private function validateNumeric(string $field, mixed $value, array $params): void {
        if ($value && !is_numeric($value)) {
            $this->addError($field, "{$field} باید عددی باشد");
        }
    }
}