<?php
/**
 * Web Monitor Agent - Configuration
 * Update these values with your Namecheap hosting details
 */

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_db_name');       // e.g., youruser_webmonitor
define('DB_USER', 'your_db_user');       // e.g., youruser_monitor
define('DB_PASS', 'your_db_password');

// Email Configuration (uses PHP mail() by default on shared hosting)
define('SMTP_ENABLED', false);           // Set true to use SMTP instead of mail()
define('SMTP_HOST', 'mail.yourdomain.com');
define('SMTP_PORT', 465);
define('SMTP_USER', 'alerts@yourdomain.com');
define('SMTP_PASS', 'your_email_password');
define('SMTP_SECURE', 'ssl');

// App Settings
define('NOTIFY_EMAIL', 'your_email@example.com');  // Where to send alerts
define('APP_NAME', 'WebWatch Agent');
define('APP_URL', 'https://yourdomain.com/webmonitor/');
define('APP_SECRET', 'CHANGE_THIS_TO_A_RANDOM_STRING_64_CHARS'); // Auth token for cron
define('TIMEZONE', 'Asia/Colombo');

date_default_timezone_set(TIMEZONE);

// Database connection
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER, DB_PASS,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
        } catch (PDOException $e) {
            die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
        }
    }
    return $pdo;
}
