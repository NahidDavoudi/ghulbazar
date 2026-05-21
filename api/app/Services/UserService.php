<?php
namespace App\Services;
use App\Models\UserModel;
use App\Core\Http\Response;

class UserService {
    protected UserModel $model;
    public function __construct(){
        $this->model = new UserModel;
    }
    public function getInfo($data){
        $user = $this->model->findByPhone($data['phone']);
        if (!$user){
            Response::error('user not found' , 404);
        }
        $result = [
            'name' => $user['name'],
            'phone' => $user['phone'],
            'role' => $user['role']
        ];
        Response::success($result , 200);
    }
    public function UpdateName($id, $name){
        $user = $this->find($id);
        if (!$user){
            Response::error('user not found' , 404);
        }
        $result = $this->update($id , $name);
        Response::success($result , 200);
    }
    public function UpdatePassword($id , $current , $new){
        $user = $this->find($id);
        if (!$user){
            Response::error('user not found' , 404);
        }
        if(!password_verify($current , $user['password_hash'])){
            Response::error("password does'nt match");
        }
        $result = $this->update($id , $new);
        


    }
}