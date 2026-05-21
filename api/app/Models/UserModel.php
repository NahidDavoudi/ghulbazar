<?php
namespace App\Models;
use App\Core\Database;

class UserModel extends Model{
    protected  $table = 'users';
    protected $fillable = ['name' , 'password_hash' , 'phone'];
    protected $primaryKey = 'id' ; 
    protected $hidden = ['password_hash'];

    public function findByPhone($phone){
        return $this->findBy('phone' , $phone);
    }
}
