<?php
namespace App\Modules\User;

use App\Modules\User\UserModel;
use App\Core\Http\Response;
use App\Core\Auth\Auth;
class UserService{
    private UserModel $userModel; 

    public function __construct(){
        $this->userModel = new UserModel();
    }
    public function getAll(): array{
        return $this->userModel->getAll();
    }
    public function findById($id){
        return $this->userModel->findById($id);
    }
    public function updateName(int $id, string $name): bool {
        $user = $this->userModel->findById($id);
        if(!$user){
            Response::error("کاربر مورد نظر یافت نشد" , 422);
        }
        return $this->userModel->update($user['id'] , ['name' => $name]);
    }
    public function updatePhone(int $id, string $phone): bool {
        $user = $this->userModel->findById($id);
        if(!$user){
            Response::error("کاربر مورد نظر یافت نشد" , 422);
        }
         // ۲. شماره جدید قبلاً ثبت نشده باشه
         $exists = $this->userModel->findByPhone($phone);
         if ($exists) {
            Response::error("کاربر با این شماره تلفن وجود دارد" , 422);
        }        
        // ۳. آپدیت کن
        return $this->userModel->update($user['id'] , ['phone' => $phone]);
    }
}