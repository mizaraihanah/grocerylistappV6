<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$id = isset($_GET['id']) ? (int)$_GET['id'] : die();

$query = "SELECT * FROM grocery_items WHERE id = ? LIMIT 0,1";
$stmt = $db->prepare($query);
$stmt->bindParam(1, $id);
$stmt->execute();

if($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $item_arr = array(
        "id" => (int)$row['id'],
        "name" => $row['name'],
        "quantity" => (int)$row['quantity'],
        "category" => $row['category'],
        "priority" => $row['priority'],
        "estimated_price" => (float)$row['estimated_price'],
        "completed" => (bool)$row['completed'],
        "date_added" => $row['date_added'],
        "date_completed" => $row['date_completed'],
        "expiration_date" => $row['expiration_date'],
        "purchase_date" => $row['purchase_date'],
        "notes" => $row['notes']
    );

    http_response_code(200);
    echo json_encode($item_arr);
} else {
    http_response_code(404);
    echo json_encode(array("message" => "Item does not exist."));
}
?>