<?php
// api/update.php
?>
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

$query = "UPDATE grocery_items
          SET name=:name, quantity=:quantity, category=:category, 
              priority=:priority, estimated_price=:estimated_price, 
              notes=:notes, expiration_date=:expiration_date, 
              purchase_date=:purchase_date
          WHERE id=:id";

$stmt = $db->prepare($query);

// Sanitize input
$id = (int)$data->id;
$name = htmlspecialchars(strip_tags($data->name));
$quantity = (int)$data->quantity;
$category = htmlspecialchars(strip_tags($data->category));
$priority = htmlspecialchars(strip_tags($data->priority));
$estimated_price = isset($data->estimated_price) ? (float)$data->estimated_price : 0;
$notes = isset($data->notes) ? htmlspecialchars(strip_tags($data->notes)) : '';
$expiration_date = isset($data->expiration_date) && !empty($data->expiration_date) ? $data->expiration_date : null;
$purchase_date = isset($data->purchase_date) && !empty($data->purchase_date) ? $data->purchase_date : null;

// Bind values
$stmt->bindParam(":id", $id);
$stmt->bindParam(":name", $name);
$stmt->bindParam(":quantity", $quantity);
$stmt->bindParam(":category", $category);
$stmt->bindParam(":priority", $priority);
$stmt->bindParam(":estimated_price", $estimated_price);
$stmt->bindParam(":notes", $notes);
$stmt->bindParam(":expiration_date", $expiration_date);
$stmt->bindParam(":purchase_date", $purchase_date);

if($stmt->execute()) {
    http_response_code(200);
    echo json_encode(array(
        "success" => true,
        "message" => "Item updated successfully."
    ));
} else {
    http_response_code(503);
    echo json_encode(array(
        "success" => false,
        "message" => "Unable to update item."
    ));
}
?>