<?php
namespace App\Core\Http;

use App\Core\Http\Request;

class Router {
    private $currentController = "User";
    private $currentMethod = "index";
    private array $params = [];

    public function __construct(){
        $url = $this->getUrl();

        // پیدا کردن کنترلر
        if (!empty($url[0])) {
            $controllerName = ucwords($url[0]);
            $className = "App\\Modules\\{$controllerName}\\{$controllerName}Controller";
            if (class_exists($className)) {
                $this->currentController = $className;
                unset($url[0]);
            } else {
                die("کنترلر {$controllerName} یافت نشد.");
            }
        } else {
            $className = "App\\Controllers\\{$this->currentController}Controller";
            $this->currentController = $className;
        }
        
        // ساختن شیء کنترلر
        $this->currentController = new $this->currentController;

        // پیدا کردن متد
        if (!empty($url[1])) {
            $methodName = $url[1];
            if (method_exists($this->currentController, $methodName)) {
                $this->currentMethod = $methodName;
                unset($url[1]);
            }
        }
        
        // پارامترهای باقی‌مانده URL
        $urlParams = $url ? array_values($url) : [];
        
        // 🆕 تحلیل پارامترهای متد
        $reflection = new \ReflectionMethod($this->currentController, $this->currentMethod);
        $methodParams = $reflection->getParameters();
        
        $args = [];
        foreach ($methodParams as $param) {
            $type = $param->getType();
            
            if ($type && $type->getName() === 'App\Core\Http\Request') {
                // اگر پارامتر از نوع Request است، خودکار بساز
                $args[] = new Request();
            } elseif ($type && $type->getName() === 'int') {
                // اگر پارامتر از نوع int است، از URL بخوان
                $args[] = !empty($urlParams) ? (int) array_shift($urlParams) : 0;
            } else {
                // بقیه موارد
                $args[] = !empty($urlParams) ? array_shift($urlParams) : null;
            }
        }
        
        // فراخوانی متد با پارامترهای درست
        call_user_func_array([$this->currentController, $this->currentMethod], $args);
    }

    public function getUrl(){
        if (isset($_GET['url'])){
            $url = $_GET['url'];
            $url = rtrim($url , '/');
            $url = filter_var($url , FILTER_SANITIZE_URL);
            $url = explode('/', $url );
        }
        return $url ?? [];
    }
}