<?php
namespace App\Core;

abstract class Middleware
{
    /**
     * Handle the middleware
     * Return true to continue, false to stop
     */
    abstract public function handle(Request $request): bool;

    /**
     * Return unauthorized response
     */
    protected function unauthorized(string $message = 'دسترسی غیرمجاز'): void
    {
        Response::unauthorized($message);
    }

    /**
     * Return forbidden response
     */
    protected function forbidden(string $message = 'شما اجازه دسترسی ندارید'): void
    {
        Response::forbidden($message);
    }

    /**
     * Return error response
     */
    protected function error(string $message, int $code = 400): void
    {
        Response::error($message, $code);
    }
}