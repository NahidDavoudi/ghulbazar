<?php
namespace App\Modules\Category;
use App\Core\Database\Model;
class CategoryModel extends Model{
    protected string $table = 'categories';
    protected array $fillable = ['name' , 'slug' , 'description' , 'poster_image'];

    public function findById($id){
        return $this->find($id);
    }
    public function findByName($name){
        return $this->findBy('name' , $name);
    }
    public function findBySlug($slug){
        return $this->findBy('slug' , $slug);
    }
}