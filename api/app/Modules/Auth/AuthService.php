<?php
namespace App\Modules\Auth;
use App\Modules\User\UserModel;
class AuthService
{
    protected UserModel $userModel;
    public function __construct()
    {
        $this->userModel = new UserModel();
    }
    
}