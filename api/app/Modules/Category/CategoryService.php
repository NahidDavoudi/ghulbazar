<?php
namespace App\Modules\Category;

use App\Modules\Category\CategoryModel;
use App\Core\Http\Response;
class CategoryService {
    protected CategoryModel $model;
    public function __construct(){
        $this->model = new CategoryModel();
    }
    public function getAll(){
        $result = $this->model->All();
        Response::success($result);
    }
    public function create($data){
        if (!$this->findByName($data['name']) || !$this->findBySlug($data['slug'])){
            
        }
    }
}