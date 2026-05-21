<?php
namespace App\Core;
use App\Core\Request;
use App\Core\Response;
class Router
{
    private array $routes = [];
    private string $prefix = '';
    private array $groupMiddleware = [];
    private string $basePath = '';

    public function __construct(string $basePath = '')
    {
        $this->basePath = rtrim($basePath, '/');
    }

    public function group(string $prefix, callable $callback, array $middleware = []): void
    {
        $previousPrefix = $this->prefix;
        $previousMiddleware = $this->groupMiddleware;

        $this->prefix .= $prefix;
        $this->groupMiddleware = array_merge($this->groupMiddleware, $middleware);

        $callback($this);

        $this->prefix = $previousPrefix;
        $this->groupMiddleware = $previousMiddleware;
    }

    public function get(string $path, mixed $handler, array $middleware = []): void
    {
        $this->addRoute('GET', $path, $handler, $middleware);
    }

    public function post(string $path, mixed $handler, array $middleware = []): void
    {
        $this->addRoute('POST', $path, $handler, $middleware);
    }

    public function put(string $path, mixed $handler, array $middleware = []): void
    {
        $this->addRoute('PUT', $path, $handler, $middleware);
    }

    public function delete(string $path, mixed $handler, array $middleware = []): void
    {
        $this->addRoute('DELETE', $path, $handler, $middleware);
    }

    public function patch(string $path, mixed $handler, array $middleware = []): void
    {
        $this->addRoute('PATCH', $path, $handler, $middleware);
    }

    private function addRoute(string $method, string $path, mixed $handler, array $middleware): void
    {
        $this->routes[] = [
            'method' => $method,
            'path' => $this->prefix . $path,
            'handler' => $handler,
            'middleware' => array_merge($this->groupMiddleware, $middleware)
        ];
    }

    public function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        // Remove basePath from the beginning of the URI if set
        if (!empty($this->basePath) && str_starts_with($uri, $this->basePath)) {
            $uri = substr($uri, strlen($this->basePath));
        }

        // Ensure URI starts with a slash
        if (empty($uri) || $uri[0] !== '/') {
            $uri = '/' . $uri;
        }

        foreach ($this->routes as $route) {
            $pattern = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $route['path']);
            $pattern = '#^' . $pattern . '$#';

            if ($route['method'] === $method && preg_match($pattern, $uri, $matches)) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);

                $request = new Request();
                $request->setParams($params);

                // Run middleware
                foreach ($route['middleware'] as $middleware) {
                    // Middleware can be a class name string or an already instantiated object
                    if (is_string($middleware)) {
                        $middleware = new $middleware();
                    }

                    if (method_exists($middleware, 'handle')) {
                        $result = $middleware->handle($request);
                        if ($result === false) {
                            return; // Stop if middleware fails
                        }
                    }
                }

                // Handle the route
                // در متد dispatch، بخش handler رو اینطوری تغییر بده:
                if (is_array($route['handler'])) {
                    [$controllerClass, $action] = $route['handler'];
                    $controller = Container::get($controllerClass); // استفاده از Container
                    $controller->$action($request);
                
                } elseif (is_callable($route['handler'])) {
                    call_user_func($route['handler'], $request);
                }

                return;
            }
        }

        // No route matched
        Response::error('Route not found', 404);
    }
}