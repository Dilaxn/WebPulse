<?php
/**
 * Database Setup Script - Run once to create tables
 * Access: yourdomain.com/webmonitor/install.php
 * DELETE THIS FILE AFTER INSTALLATION
 */
require_once __DIR__ . '/config.php';

$pdo = getDB();

$sql = "
CREATE TABLE IF NOT EXISTS monitors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    check_type ENUM('price','text','element','custom') NOT NULL DEFAULT 'text',
    selector VARCHAR(500) DEFAULT NULL COMMENT 'CSS selector or regex pattern',
    condition_type ENUM('less_than','greater_than','equals','contains','not_contains','available') NOT NULL DEFAULT 'contains',
    condition_value VARCHAR(500) DEFAULT NULL,
    check_interval INT NOT NULL DEFAULT 3600 COMMENT 'Check interval in seconds',
    last_checked DATETIME DEFAULT NULL,
    last_value TEXT DEFAULT NULL,
    last_status ENUM('ok','alert','error','pending') DEFAULT 'pending',
    alert_sent TINYINT(1) DEFAULT 0,
    alert_cooldown INT DEFAULT 86400 COMMENT 'Seconds before re-alerting',
    last_alert_at DATETIME DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    notes TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS check_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monitor_id INT NOT NULL,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('ok','alert','error') NOT NULL,
    value_found TEXT DEFAULT NULL,
    response_code INT DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    alert_triggered TINYINT(1) DEFAULT 0,
    FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE,
    INDEX idx_monitor_checked (monitor_id, checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS alert_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monitor_id INT NOT NULL,
    alert_type ENUM('email','webhook') DEFAULT 'email',
    message TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success TINYINT(1) DEFAULT 1,
    FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";

try {
    $pdo->exec($sql);

    // Insert sample monitors
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM monitors");
    $stmt->execute();
    if ($stmt->fetchColumn() == 0) {
        $pdo->exec("
            INSERT INTO monitors (name, url, check_type, selector, condition_type, condition_value, check_interval, notes) VALUES
            ('Gold Price - Ravi Jewellers', 'https://ravijewellers.lk/', 'price', '.gold-price,#gold-price,[class*=price],[class*=gold],td:contains(gold),body', 'less_than', '360000', 1800, 'Notify when gold price drops below 360,000 LKR. Check every 30 minutes.'),
            ('German A1 Weekend Course - Goethe', 'https://www.goethe.de/ins/lk/en/spr/kur/tup.cfm?objectId=25077723&&f={\"age\":\"ER\",\"category\":\"001,002,003,004,005,006,007,009\",\"languageLevelGroup\":[\"136\"]}', 'text', '.course-item,.schedule,body', 'contains', 'Saturday,Sunday,Sat,Sun,weekend', 3600, 'Notify when A1 German course with Saturday/Sunday schedule is available. Check every hour.')
        ");
    }

    echo "<!DOCTYPE html><html><head><title>Install Success</title>
    <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0a;color:#e0e0e0}
    .box{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:40px;max-width:500px;text-align:center}
    h1{color:#00ff88;margin-bottom:10px}code{background:#2a2a2a;padding:2px 8px;border-radius:4px;font-size:13px}
    .warn{color:#ff6b6b;margin-top:20px;font-weight:bold}</style></head>
    <body><div class='box'>
    <h1>✅ Installation Complete</h1>
    <p>Database tables created successfully.</p>
    <p>Sample monitors have been added.</p>
    <p class='warn'>⚠️ DELETE this file now: <code>install.php</code></p>
    <p>Then visit <a href='index.php' style='color:#00ff88'>the dashboard</a></p>
    </div></body></html>";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
