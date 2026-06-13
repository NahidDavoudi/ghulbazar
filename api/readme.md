# NadCore — Mini PHP Framework

یه فریم‌ورک سبک و دست‌ساز برای نوشتن REST API با PHP خالص.  
بدون وابستگی سنگین — فقط ساختار، کنترل، و کد تمیز.

---

## ساختار پروژه

```
Core/
├── Http/
│   ├── Router.php              ← روتر اصلی با HTTP methods و route groups
│   ├── Request.php             ← مدیریت ورودی‌ها، headers، user
│   ├── Response.php            ← خروجی استاندارد JSON برای REST API
│   ├── MiddlewareInterface.php ← interface برای نوشتن middleware
│   └── Pipeline.php            ← زنجیره اجرای middleware ها
├── Auth/
│   └── Auth.php                ← JWT — تولید، تأیید، چرخش توکن
├── Database/
│   ├── Database.php            ← اتصال PDO (Singleton)
│   └── Model.php               ← Base Model با CRUD، paginate، softDelete
├── Validation/
│   ├── Validator.php           ← اعتبارسنجی با قوانین pipe-separated
│   └── PasswordValidator.php   ← اعتبارسنجی قدرت رمز عبور
├── Security/
│   └── RateLimiter.php         ← محدودسازی درخواست با Redis
├── Cache/
│   └── RedisConnector.php      ← اتصال Redis (Singleton)
├── Controller.php              ← Base Controller
├── Session.php                 ← مدیریت Session
└── Env.php                     ← خواندن متغیرهای محیطی از .env
```

---

## راه‌اندازی سریع

### ۱. نصب وابستگی‌ها

```bash
composer require firebase/php-jwt predis/predis
```

### ۲. تنظیم `.env`

```env
DB_HOST=localhost
DB_NAME=my_database
DB_USER=root
DB_PASS=

JWT_SECRET=your-super-secret-key
REFRESH_SECRET=your-refresh-secret-key

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=null
```

### ۳. فایل `index.php`

```php
<?php
require_once __DIR__ . '/vendor/autoload.php';

use App\Core\Http\Router;
use App\Core\Http\Request;

$router = new Router();
require_once __DIR__ . '/routes/api.php';
$router->dispatch(new Request());
```

### ۴. `routes/api.php`

```php
<?php
use App\Middleware\AuthMiddleware;
use App\Modules\Auth\AuthController;
use App\Modules\User\UserController;

// مسیرهای عمومی
$router->post('/api/v1/auth/register', [AuthController::class, 'register']);
$router->post('/api/v1/auth/login',    [AuthController::class, 'login']);

// مسیرهای محافظت‌شده
$router->group([
    'prefix'     => '/api/v1',
    'middleware' => [AuthMiddleware::class],
], function ($router) {
    $router->get('/me', [UserController::class, 'me']);
});
```

---

## Router

### تعریف route

```php
$router->get('/users',        [UserController::class, 'index']);
$router->post('/users',       [UserController::class, 'store']);
$router->get('/users/{id}',   [UserController::class, 'show']);
$router->put('/users/{id}',   [UserController::class, 'update']);
$router->patch('/users/{id}', [UserController::class, 'patch']);
$router->delete('/users/{id}',[UserController::class, 'destroy']);
```

### پارامتر داینامیک

```php
// پارامتر اجباری
$router->get('/posts/{slug}', [PostController::class, 'show']);

// پارامتر اختیاری
$router->get('/archive/{year?}', [PostController::class, 'archive']);
```

پارامترها داخل متد controller از طریق `$request->param()` قابل دسترسند:

```php
public function show(Request $request): void
{
    $id = $request->param('id');   // string
    // یا تایپ‌هینت کن، Router خودش cast می‌کنه:
}

public function show(Request $request, int $id): void
{
    // $id به عنوان int تزریق میشه
}
```

### Route Groups

```php
$router->group([
    'prefix'     => '/api/v1',
    'middleware' => [AuthMiddleware::class],
], function ($router) {

    $router->get('/dashboard', [DashboardController::class, 'index']);

    // nested group — middleware ها انباشته میشن
    $router->group([
        'prefix'     => '/admin',
        'middleware' => [AdminMiddleware::class],
    ], function ($router) {
        $router->get('/users', [AdminController::class, 'users']);
    });
});
```

### Named Routes

```php
$router->get('/users/{id}', [UserController::class, 'show'])->name('users.show');

// ساخت URL:
$url = $router->route('users.show', ['id' => 42]);
// → /api/v1/users/42
```

### Closure به عنوان handler

```php
$router->get('/ping', function (Request $request) {
    Response::success(['pong' => true]);
});
```

---

## Request

```php
// URL params (از route pattern)
$id = $request->param('id');
$id = $request->param('id', 0); // با مقدار پیش‌فرض

// Body (JSON یا Form Data)
$name  = $request->input('name');
$email = $request->input('email', '');

// همه body
$data = $request->all();

// فقط فیلدهای مشخص
$data = $request->only(['name', 'email', 'phone']);

// بررسی وجود فیلد
if ($request->has('avatar')) { ... }

// Query string  (?page=2)
$page = $request->query('page', 1);

// Header
$lang = $request->header('Accept-Language');

// توکن JWT
$token = $request->bearerToken();

// HTTP method
$method = $request->method(); // GET, POST, ...

// کاربر جاری (بعد از AuthMiddleware)
$user   = $request->user();
$userId = $request->userId();
```

---

## Response

همه‌ی پاسخ‌ها این ساختار رو دارن:

```json
{
  "success": true | false,
  "message": "...",
  "data": { ... }
}
```

### متدهای موفقیت

```php
// 200 — موفق با داده
Response::success($data);
Response::success($data, 'کاربر یافت شد');

// 201 — ایجاد شد
Response::created($newUser);
Response::created($newUser, 'ثبت‌نام با موفقیت انجام شد');

// 200 — لیست صفحه‌بندی‌شده
// خروجی Model::paginate() رو مستقیم بده
Response::paginated($model->paginate(1, 15));
```

خروجی `paginated`:

```json
{
  "success": true,
  "message": "لیست با موفقیت دریافت شد",
  "data": [...],
  "meta": {
    "total": 100,
    "per_page": 15,
    "current_page": 1,
    "last_page": 7
  }
}
```

```php
// 204 — بدون محتوا (برای DELETE)
Response::noContent();
```

### متدهای خطا

```php
Response::error('پیام خطا');               // 400
Response::error('پیام', 400, $errorsArray); // با جزئیات

Response::validation($errors);             // 422
Response::notFound();                      // 404
Response::unauthorized();                  // 401
Response::forbidden();                     // 403
Response::conflict('ایمیل تکراری است');    // 409
Response::tooManyRequests();               // 429
Response::serverError();                   // 500
```

خروجی `validation`:

```json
{
  "success": false,
  "message": "خطای اعتبارسنجی",
  "errors": {
    "email": ["فرمت ایمیل نادرست است"],
    "password": ["رمز عبور باید حداقل ۸ کاراکتر باشد"]
  }
}
```

---

## Controller

هر controller از `App\Core\Controller` ارث‌بری می‌کنه:

```php
<?php
namespace App\Modules\Product;

use App\Core\Controller;
use App\Core\Http\Request;

class ProductController extends Controller
{
    private ProductModel $model;

    public function __construct()
    {
        $this->model = new ProductModel();
    }

    public function index(Request $request): void
    {
        $page    = (int) $request->query('page', 1);
        $results = $this->model->paginate($page, 15);
        $this->paginated($results);           // ← متد inherited از Controller
    }

    public function show(Request $request, int $id): void
    {
        $product = $this->model->find($id);

        if (!$product) {
            $this->notFound('محصول یافت نشد');
            return;
        }

        $this->success($product);
    }

    public function store(Request $request): void
    {
        $valid = $this->validate($request->all(), [
            'name'  => 'required|min:2|max:100',
            'price' => 'required|numeric',
        ]);

        if (!$valid) return; // validate خودش Response::validation رو برمیگردونه

        $id = $this->model->create($request->only(['name', 'price', 'description']));
        $this->created(['id' => $id]);
    }
}
```

---

## Model

```php
<?php
namespace App\Modules\Product;

use App\Core\Database\Model;

class ProductModel extends Model
{
    protected string $table      = 'products';
    protected array  $fillable   = ['name', 'price', 'description', 'category_id'];
    protected array  $hidden     = ['deleted_at'];
    protected bool   $timestamps = true;
}
```

### متدهای موجود

```php
$model = new ProductModel();

// خواندن
$model->find(5);                                    // یه رکورد با ID
$model->findBy('slug', 'iphone-15');                // با هر ستون
$model->all();                                      // همه رکوردها
$model->paginate(1, 15);                            // صفحه‌بندی
$model->paginate(2, 10, ['status' => 'active'],     // با شرط و مرتب‌سازی
                         ['created_at' => 'DESC']);
$model->count();                                    // تعداد کل
$model->count(['status' => 'active']);              // تعداد با شرط
$model->exists('email', 'test@example.com');        // بررسی تکراری بودن
$model->exists('email', 'test@example.com', $id);  // به‌جز یه ID خاص

// نوشتن
$newId = $model->create(['name' => 'محصول جدید', 'price' => 50000]);
$model->update(5, ['price' => 60000]);
$model->delete(5);        // حذف کامل
$model->softDelete(5);    // حذف نرم (ست کردن deleted_at)
```

---

## Validation

```php
$valid = $this->validate($request->all(), [
    'name'     => 'required|min:2|max:50',
    'email'    => 'required|email',
    'age'      => 'required|numeric',
    'password' => 'required|min:8',
]);
```

| قانون | مثال | توضیح |
|---|---|---|
| `required` | `required` | فیلد الزامی |
| `email` | `email` | فرمت ایمیل |
| `min` | `min:3` | حداقل طول |
| `max` | `max:100` | حداکثر طول |
| `numeric` | `numeric` | عدد بودن |

برای اعتبارسنجی رمز عبور:

```php
use App\Core\Validation\PasswordValidator;

$result = PasswordValidator::validate($password);
if (!$result['valid']) {
    Response::validation(['password' => $result['errors']]);
}
```

---

## Auth — JWT

```php
use App\Core\Auth\Auth;

// تولید access token (پیش‌فرض ۲۴ ساعت)
$token = Auth::generateToken(['user_id' => 1, 'role' => 'admin']);

// تولید refresh token (۳۰ روز) + ذخیره در DB
$refreshToken = Auth::generateRefreshToken($userId, $payload);

// تأیید توکن
$decoded = Auth::verifyToken($token);

// چرخش refresh token (توکن قدیمی باطل، جفت جدید صادر میشه)
$tokens = Auth::rotateRefreshToken($refreshToken);
// → ['token' => '...', 'refresh_token' => '...', 'expires_in' => 3600]

// helper ها
Auth::check();              // bool
Auth::user();               // object | null
Auth::id();                 // int | null
Auth::role();               // string | null
Auth::hasRole('admin');     // bool
Auth::hasRole(['admin', 'editor']); // bool

// logout
Auth::revokeRefreshToken($refreshToken);      // این دستگاه
Auth::revokeAllUserTokens($userId);            // همه دستگاه‌ها
```

---

## Middleware

```php
<?php
namespace App\Middleware;

use App\Core\Http\MiddlewareInterface;
use App\Core\Http\Request;
use App\Core\Http\Response;
use App\Core\Auth\Auth;

class AuthMiddleware implements MiddlewareInterface
{
    public function handle(Request $request, callable $next): void
    {
        $token = $request->bearerToken();

        if (!$token) {
            Response::unauthorized('توکن ارسال نشده است');
        }

        try {
            $decoded = Auth::verifyToken($token);
            $request->setUser($decoded->data);
        } catch (\Firebase\JWT\ExpiredException) {
            Response::unauthorized('توکن منقضی شده است');
        } catch (\Exception) {
            Response::unauthorized('توکن نامعتبر است');
        }

        $next($request);
    }
}
```

نکته: وقتی `Response::unauthorized()` صدا زده میشه، داخلش `exit` هست — پس نیازی به `return` بعدش نیست.

---

## RateLimiter

```php
use App\Core\Security\RateLimiter;

$limiter = new RateLimiter();
$key     = 'login:' . $_SERVER['REMOTE_ADDR'];

if ($limiter->tooManyAttempts($key, max: 5, decaySeconds: 60)) {
    Response::tooManyRequests('تعداد تلاش‌های مجاز تمام شد. یک دقیقه صبر کنید.');
}

$limiter->hit($key, 60);

// بعد از login موفق
$limiter->resetAttempts('login');
```

---

## جدول نگاشت HTTP Status

| متد Response | HTTP Code | کاربرد |
|---|---|---|
| `success()` | 200 | دریافت یا عملیات موفق |
| `created()` | 201 | ایجاد منبع جدید |
| `paginated()` | 200 | لیست با صفحه‌بندی |
| `noContent()` | 204 | حذف موفق |
| `error()` | 400 | درخواست نادرست |
| `unauthorized()` | 401 | نیاز به login |
| `forbidden()` | 403 | دسترسی ممنوع |
| `notFound()` | 404 | منبع وجود ندارد |
| `conflict()` | 409 | داده تکراری |
| `validation()` | 422 | خطای اعتبارسنجی |
| `tooManyRequests()` | 429 | Rate limit |
| `serverError()` | 500 | خطای سرور |