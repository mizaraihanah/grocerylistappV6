<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$query = "SELECT 
            COUNT(*) as total_items,
            SUM(completed) as completed_items,
            COUNT(*) - SUM(completed) as pending_items,
            SUM(estimated_price * quantity) as total_estimated,
            SUM(CASE WHEN completed = 1 THEN estimated_price * quantity ELSE 0 END) as completed_estimated,
            SUM(CASE WHEN priority = 'high' AND completed = 0 THEN 1 ELSE 0 END) as high_priority_pending
          FROM grocery_items";

$stmt = $db->prepare($query);
$stmt->execute();

if($stats = $stmt->fetch(PDO::FETCH_ASSOC)) {
    http_response_code(200);
    echo json_encode(array(
        "success" => true,
        "data" => $stats
    ));
} else {
    http_response_code(404);
    echo json_encode(array(
        "success" => false,
        "message" => "Unable to get statistics."
    ));
}
?>
