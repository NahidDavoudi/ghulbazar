<?php
namespace App\Modules\Category;

use App\Modules\Category\CategoryImageModel;

class CategoryImageService {
    protected CategoryImageModel $model;
    public function __construct(){
        $this->model = new CategoryImageModel();
    }
}