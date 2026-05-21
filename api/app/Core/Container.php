<?php
namespace App\Core;

class Container
{
    private static array $instances = [];
    private static array $bindings = [];

    /**
     * ثبت یک binding
     */
    public static function bind(string $abstract, callable|string $concrete): void
    {
        self::$bindings[$abstract] = $concrete;
    }

    /**
     * دریافت یک نمونه
     */
    public static function get(string $abstract): mixed
    {
        // اگر قبلاً ساخته شده، همان را برگردان
        if (isset(self::$instances[$abstract])) {
            return self::$instances[$abstract];
        }

        // اگر binding تعریف شده
        if (isset(self::$bindings[$abstract])) {
            $concrete = self::$bindings[$abstract];
            
            if (is_callable($concrete)) {
                // Debug: Catch any exception during factory call
                try {
                    $instance = $concrete();
                    if (!is_object($instance)) {
                        throw new \RuntimeException("Container binding for '{$abstract}' did not return an object.");
                    }
                    self::$instances[$abstract] = $instance;
                } catch (\Throwable $e) {
                    throw new \RuntimeException(
                        "Error instantiating bound factory for '{$abstract}': " . $e->getMessage(), 0, $e
                    );
                }
            } else {
                // Debug: Ensure class exists before instantiation
                if (!class_exists($concrete)) {
                    throw new \RuntimeException("Container binding for '{$abstract}' refers to undefined class '{$concrete}'.");
                }
                try {
                    self::$instances[$abstract] = new $concrete();
                } catch (\Throwable $e) {
                    throw new \RuntimeException(
                        "Error instantiating class '{$concrete}' for binding '{$abstract}': " . $e->getMessage(), 0, $e
                    );
                }
            }
            
            return self::$instances[$abstract];
        }

        // Auto-wiring با Reflection
        return self::resolve($abstract);
    }

    /**
     * ساخت خودکار با تزریق وابستگی‌ها
     */
    private static function resolve(string $class): object
    {
        if (!class_exists($class)) {
            throw new \RuntimeException("Attempting to resolve undefined class '{$class}'.");
        }

        $reflection = new \ReflectionClass($class);
        $constructor = $reflection->getConstructor();

        if (!$constructor) {
            $instance = new $class();
            self::$instances[$class] = $instance;
            return $instance;
        }

        $params = [];
        foreach ($constructor->getParameters() as $param) {
            $type = $param->getType();

            if ($type && !$type->isBuiltin()) {
                $depClass = $type->getName();
                if (!class_exists($depClass)) {
                    throw new \RuntimeException("Cannot resolve parameter \${$param->getName()} for '{$class}': class '{$depClass}' does not exist.");
                }
                $params[] = self::get($depClass);
            } elseif ($param->isDefaultValueAvailable()) {
                $params[] = $param->getDefaultValue();
            } else {
                throw new \RuntimeException("Cannot resolve parameter \${$param->getName()} for '{$class}': no type and no default value.");
            }
        }

        try {
            $instance = $reflection->newInstanceArgs($params);
            self::$instances[$class] = $instance;
        } catch (\Throwable $e) {
            throw new \RuntimeException(
                "Error resolving dependencies for '{$class}': " . $e->getMessage(),
                0,
                $e
            );
        }
        
        return $instance;
    }

    /**
     * ثبت یک نمونه آماده
     */
    public static function instance(string $abstract, object $instance): void
    {
        if (!is_object($instance)) {
            throw new \InvalidArgumentException("Provided instance for '{$abstract}' is not an object.");
        }
        self::$instances[$abstract] = $instance;
    }
}