<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: PUT");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));
$id = (int)$data->id;

$query = "UPDATE grocery_items
          SET completed = NOT completed, 
              date_completed = CASE 
                  WHEN completed = 0 THEN NOW() 
                  ELSE NULL 
              END
          WHERE id=:id";

$stmt = $db->prepare($query);
$stmt->bindParam(":id", $id);

if($stmt->execute()) {
    http_response_code(200);
    echo json_encode(array(
        "success" => true,
        "message" => "Item completion status toggled successfully."
    ));
} else {
    http_response_code(503);
    echo json_encode(array(
        "success" => false,
        "message" => "Unable to toggle item completion status."
    ));
}
?>