<?php
define('DATABASE_DSN', 'mysql:host=' . getenv('DB_HOST') . ';dbname=' . getenv('DB_NAME'));
define('DATABASE_USER', getenv('DB_USER'));
define('DATABASE_PASS', getenv('DB_PASSWORD'));
define('CACHE_DSN', 'memcached://localhost:11211'); 