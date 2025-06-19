<?php
// api/expiry_report.php - ExpiryTracker component endpoint
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

// Call the stored procedure for expiry report
$query = "CALL GetExpiryReport()";
$stmt = $db->prepare($query);
$stmt->execute();

$expired = array();
$expiring_soon = array();
$fresh = array();

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $item = array(
        "id" => (int)$row['id'],
        "name" => $row['name'],
        "quantity" => (int)$row['quantity'],
        "category" => $row['category'],
        "priority" => $row['priority'],
        "estimated_price" => (float)$row['estimated_price'],
        "expiration_date" => $row['expiration_date'],
        "purchase_date" => $row['purchase_date'],
        "expiry_status" => $row['expiry_status'],
        "days_until_expiry" => (int)$row['days_until_expiry'],
        "notes" => $row['notes']
    );
    
    switch($row['expiry_status']) {
        case 'expired':
            $expired[] = $item;
            break;
        case 'expiring_soon':
            $expiring_soon[] = $item;
            break;
        case 'fresh':
            $fresh[] = $item;
            break;
    }
}

$report = array(
    "expired" => $expired,
    "expiring_soon" => $expiring_soon,
    "fresh" => $fresh,
    "expired_count" => count($expired),
    "expiring_soon_count" => count($expiring_soon),
    "fresh_count" => count($fresh),
    "total_items" => count($expired) + count($expiring_soon) + count($fresh),
    "report_date" => date('Y-m-d H:i:s')
);

http_response_code(200);
echo json_encode(array(
    "success" => true,
    "data" => $report
));
?>