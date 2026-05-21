<?php
namespace App\Models;
use App\Core\Database;

class UserModel extends Model{
    protected  $table = 'users';
    protected $fillable = ['name' , 'password_hash' , 'phone'];

}