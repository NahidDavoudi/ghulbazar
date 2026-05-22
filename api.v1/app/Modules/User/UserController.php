<?php
namespace App\Modules\User;

use App\Core\Controller;
use App\Core\Http\Request;
use App\Modules\User\UserService;
use App\Core\Auth\Auth;
use App\Core\Validation\PasswordValidator;
class UserController extends Controller 
{
    private UserService $userService;

    public function __construct(){
        $this->userService = new UserService();
    }
    public function index(){
        $users = $this->userService->getAll();
        $this->success($users, 'لیست کاربران دریافت شد');
    }
    public function update_name(Request $request){
        $token = $request->bearerToken();
        if(!$token){
            $this->unauthorized('توکن ارائه نشده است');
            return;
        }
        $decoded = Auth::verifyToken($token);
        if(!$decoded){
            $this->unauthorized('توکن نامعتبر است');
            return;
        }
        $userId = $decoded->data->user_id ?? null;
        if(!$userId){
            $this->error('کاربر یافت نشد', 404);
            return;
        }
        $this->validate($request->all(), [
            'name' => 'required|min:3'
        ]);
        $result = $this->userService->updateName($userId, $request->input('name'));
        if($result){
            $this->success(['name' => $request->input('name')], 'نام کاربر با موفقیت به‌روزرسانی شد');
        } else {
            $this->error('خطا در به‌روزرسانی نام', 500);
        }
    }
    public function update_phone(Request $request){
        $token = $request->bearerToken();
        if(!$token){
            $this->unauthorized('توکن ارائه نشده است');
            return;
        }
        $decoded = Auth::verifyToken($token);
        if(!$decoded){
            $this->unauthorized('توکن نامعتبر است');
            return;
        }
        $userId = $decoded->data->user_id ?? null;
        if(!$userId){
            $this->error('کاربر یافت نشد', 404);
            return;
        }
        $this->validate($request->all(),['phone' =>'required']);
        $phone = $request->input('phone');
        if (!preg_match('/^09\d{9}$/', $phone))
        {
            $this->validationError(['phone' => ['شماره موبایل معتبر نیست']]);
        }
        $result = $this->userService->update_phone($userId , $phone);
        if($result){
            $this->success(['name' => $request->input('name')], ' شماره تلفن با موفقیت به‌روزرسانی شد');
        } else {
            $this->error('خطا در به‌روزرسانی شماره تلفن', 500);
        }
    }
}