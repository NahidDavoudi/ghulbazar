<?php 
namespace App\Modules\Category;
use App\Core\Database\Model;

class CategoryImageModel extends Model {
    protected $table = 'category_images';
    protected $fillable = ['category_id','image_url','title','is_main','sort_orde'] ;

    public function addImage($id , $imgUrl){
        $this->create();
    }
}
