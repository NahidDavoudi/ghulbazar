<?php
require dirname(__DIR__) . '/vendor/autoload.php';
App\Core\Env::load(dirname(__DIR__) . '/.env');

$service = new App\Modules\Product\ProductService(
    new App\Modules\Product\ProductModel(),
    new App\Modules\Product\ProductImageModel(),
    new App\Modules\Variant\VariantService(
        new App\Modules\Variant\ProductVariantModel(),
        new App\Modules\Variant\InventoryModel(),
        new App\Modules\Product\ProductModel(),
        new App\Modules\Attribute\AttributeValueModel(),
    ),
    new App\Modules\Attribute\AttributeTypeModel(),
);

$p = $service->getById(1);
echo json_encode([
    'id' => $p['id'],
    'variants' => count($p['variants']),
    'stock' => $p['stock'],
    'axes' => count($p['variant_axes']),
], JSON_UNESCAPED_UNICODE) . PHP_EOL;
