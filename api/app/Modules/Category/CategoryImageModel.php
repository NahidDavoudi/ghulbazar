<?php 
namespace App\Modules\Category;

class CategoryImageModel extends Model {
    protected $table = 'category_images';
    protected $fillable = ['category_id','image_url','title','is_main','sort_orde'] ;
    public function add_image
}