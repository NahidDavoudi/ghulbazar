<?php

namespace App\Core;

use App\Core\Validation\Validator;
use App\Core\Auth\Auth;
use App\Core\Http\Response;

abstract class Controller
{
    protected function json(array $data, int $code = 200): void
    {
        Response::json($data, $code);
    }

    protected function success(mixed $data = null, string $message = 'عملیات با موفقیت انجام شد', int $code = 200): void
    {
        Response::success($data, $message, $code);
    }

    protected function created(mixed $data = null, string $message = 'با موفقیت ایجاد شد'): void
    {
        Response::created($data, $message);
    }

    protected function error(string $message, int $code = 400, mixed $errors = null): void
    {
        Response::error($message, $code, $errors);
    }

    protected function validationError(array $errors, string $message = 'خطای اعتبارسنجی'): void
    {
        Response::validation($errors, $message);
    }

    protected function notFound(string $message = 'موردی یافت نشد'): void
    {
        Response::notFound($message);
    }

    protected function unauthorized(string $message = 'دسترسی غیرمجاز'): void
    {
        Response::unauthorized($message);
    }

    protected function forbidden(string $message = 'شما اجازه دسترسی ندارید'): void
    {
        Response::forbidden($message);
    }

    protected function noContent(string $message = 'با موفقیت حذف شد'): void
    {
        Response::noContent($message);
    }

    protected function user(): ?object
    {
        return Auth::user();
    }

    protected function userId(): ?int
    {
        return Auth::id();
    }

    protected function isAuthenticated(): bool
    {
        return Auth::check();
    }

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