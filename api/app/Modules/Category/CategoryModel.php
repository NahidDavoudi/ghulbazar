<?php
namespace App\Modules\Category;

class CategoryModel extends Model{
    protected $table = 'categories';
    protected $fillable = ['name' , 'slug' , 'description' , 'poster_image'];

    public function findById($id){
        return $this->find($id);
    }
}