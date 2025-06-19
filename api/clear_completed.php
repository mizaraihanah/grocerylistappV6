<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$query = "DELETE FROM grocery_items WHERE completed = 1";
$stmt = $db->prepare($query);

if($stmt->execute()) {
    http_response_code(200);
    echo json_encode(array(
        "success" => true,
        "message" => "Completed items cleared successfully."
    ));
} else {
    http_response_code(503);
    echo json_encode(array(
        "success" => false,
        "message" => "Unable to clear completed items."
    ));
}
?>