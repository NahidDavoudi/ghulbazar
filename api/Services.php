<?php
// Services.php - Business Logic (image handling, discount validation, etc.)

require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/Repository.php';

class Services {
    private Repository $repo;
    
    public function __construct() {
        $this->repo = new Repository();
    }
    
    /**
     * Upload a product image from $_FILES, store file, add DB record.
     * @return array ['image_url' => string, 'message' => string]
     */
    public function uploadProductImage(int $productId, array $file, bool $isMain, int $sortOrder): array {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            error('No image uploaded or upload error', 400);
        }
        $allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($file['type'], $allowed)) {
            error('Invalid image type. Allowed: jpeg, png, webp', 400);
        }
        
        if (!is_dir('uploads')) {
            mkdir('uploads', 0755, true);
        }
        
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid('prod_') . '.' . $ext;
        $dest = 'uploads/' . $filename;
        
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            error('Failed to upload image', 500);
        }
        
        $imageUrl = '/uploads/' . $filename;
        $this->repo->addProductImage($productId, $imageUrl, $isMain ? 1 : 0, $sortOrder);
        
        return ['image_url' => $imageUrl, 'message' => 'Image uploaded'];
    }
    
    /**
     * Delete product image – remove file and DB record.
     */
    public function deleteProductImage(int $imageId): void {
        $image = $this->repo->getProductImageById($imageId);
        if (!$image) {
            error('Image not found', 404);
        }
        $filepath = ltrim($image['image_url'], '/');
        if (file_exists($filepath)) {
            unlink($filepath);
        }
        $this->repo->deleteProductImage($imageId);
    }
    
    // Additional business logic can be added here (e.g., discount validation, order total calculation, etc.)
}