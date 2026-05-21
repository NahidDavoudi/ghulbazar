<?php
namespace App\Core;

abstract class Controller
{
    /**
     * Return JSON response
     */
    protected function json(array $data, int $code = 200): void
    {
        Response::json($data, $code);
    }

    /**
     * Success response
     */
    protected function success(mixed $data = null, string $message = 'عملیات با موفقیت انجام شد', int $code = 200): void
    {
        Response::success($data, $message, $code);
    }

    /**
     * Created response
     */
    protected function created(mixed $data = null, string $message = 'با موفقیت ایجاد شد'): void
    {
        Response::created($data, $message);
    }

    /**
     * Error response
     */
    protected function error(string $message, int $code = 400, mixed $errors = null): void
    {
        Response::error($message, $code, $errors);
    }

    /**
     * Validation error response
     */
    protected function validationError(array $errors, string $message = 'خطای اعتبارسنجی'): void
    {
        Response::validation($errors, $message);
    }

    /**
     * Not found response
     */
    protected function notFound(string $message = 'موردی یافت نشد'): void
    {
        Response::notFound($message);
    }

    /**
     * Unauthorized response
     */
    protected function unauthorized(string $message = 'دسترسی غیرمجاز'): void
    {
        Response::unauthorized($message);
    }

    /**
     * Forbidden response
     */
    protected function forbidden(string $message = 'شما اجازه دسترسی ندارید'): void
    {
        Response::forbidden($message);
    }

    /**
     * No content response
     */
    protected function noContent(string $message = 'با موفقیت حذف شد'): void
    {
        Response::noContent($message);
    }

    /**
     * Get current user
     */
    protected function user(): ?object
    {
        return Auth::user();
    }

    /**
     * Get current user ID
     */
    protected function userId(): ?int
    {
        return Auth::id();
    }

    /**
     * Check if user is authenticated
     */
    protected function isAuthenticated(): bool
    {
        return Auth::check();
    }

    /**
     * Validate request data
     */
    protected function validate(array $data, array $rules): bool
    {
        $validator = new Validator($data, $rules);

        if (!$validator->validate()) {
            $this->validationError($validator->errors());
            return false;
        }

        return true;
    }
}