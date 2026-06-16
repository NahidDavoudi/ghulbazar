<?php
require __DIR__ . '/vendor/autoload.php';

use App\Core\Env;
use App\Core\Sms\SmsManager;

Env::load(__DIR__ . '/.env');
SmsManager::reset();

try {
    $provider = SmsManager::provider();
    echo 'Driver: ' . $provider->getName() . PHP_EOL;
    $provider->send('09123456789', 'تست فروشگاه آیریس');
    echo "OK\n";
} catch (Throwable $e) {
    echo 'ERR: ' . $e->getMessage() . PHP_EOL;
    exit(1);
}
