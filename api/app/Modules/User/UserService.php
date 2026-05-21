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
            Response::error("User not found", 422);
        }
        return $this->userModel->update($user['id'] , ['name' => $name]);
    }
    public function updatePhone(int $id, string $phone): bool {
        $user = $this->userModel->findById($id);
        if(!$user){
            Response::error("User not found", 422);
        }
         $exists = $this->userModel->findByPhone($phone);
         if ($exists) {
            Response::error("A user with this phone number already exists", 422);
        }        
        return $this->userModel->update($user['id'] , ['phone' => $phone]);
    }
    public function updatePassword($id , $current , $new){
        $user = $this->userModel->findById($id);
        if(!$user){
            Response::error("User not found", 422);
        }
        if(!password_verify($current , $user['password_hash'])){
            Response::error("password is not correct", 422);
        }
        $password_hash = password_hash($new , PASSWORD_DEFAULT);
        $result = $this->userModel->update($user['id'] , ['password_hash' => $password_hash]);
    }
}