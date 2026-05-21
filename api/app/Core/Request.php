<?php
namespace App\Core;

class Request {
    private array $params = [];
    private array $body = [];
    private array $headers = [];

    public function __construct() {
        // Parse JSON body
        $rawBody = file_get_contents('php://input');
        $this->body = json_decode($rawBody, true) ?? [];

        // Also merge $_POST for form data
        if (!empty($_POST)) {
            $this->body = array_merge($this->body, $_POST);
        }

        // Also merge $_FILES
        if (!empty($_FILES)) {
            $this->body = array_merge($this->body, $_FILES);
        }

        // Collect headers
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $headerName = str_replace('_', '-', substr($key, 5));
                $this->headers[$headerName] = $value;
            }
        }
    }

    public function setParams(array $params): void {
        $this->params = $params;
    }

    public function param(string $key, mixed $default = null): mixed {
        return $this->params[$key] ?? $default;
    }

    public function input(string $key, mixed $default = null): mixed {
        return $this->body[$key] ?? $default;
    }

    public function all(): array {
        return array_merge($this->params, $this->body);
    }

    public function only(array $keys): array {
        $data = [];
        foreach ($keys as $key) {
            if (isset($this->body[$key])) {
                $data[$key] = $this->body[$key];
            }
        }
        return $data;
    }

    public function has(string $key): bool {
        return isset($this->body[$key]);
    }

    public function header(string $key, mixed $default = null): mixed {
        return $this->headers[$key] ?? $default;
    }

    public function bearerToken(): ?string {
        $auth = $this->header('AUTHORIZATION', '');
        if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
            return $matches[1];
        }
        return null;
    }

    public function method(): string {
        return $_SERVER['REQUEST_METHOD'];
    }

    public function uri(): string {
        return parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    }

    public function query(string $key, mixed $default = null): mixed {
        return $_GET[$key] ?? $default;
    }
}