<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if(!empty($data->name) && !empty($data->quantity) && !empty($data->category) && !empty($data->priority)) {
    
    $query = "INSERT INTO grocery_items 
              SET name=:name, quantity=:quantity, category=:category, 
                  priority=:priority, estimated_price=:estimated_price, 
                  notes=:notes, expiration_date=:expiration_date, 
                  purchase_date=:purchase_date";

    $stmt = $db->prepare($query);

    // Sanitize input
    $name = htmlspecialchars(strip_tags($data->name));
    $quantity = (int)$data->quantity;
    $category = htmlspecialchars(strip_tags($data->category));
    $priority = htmlspecialchars(strip_tags($data->priority));
    $estimated_price = isset($data->estimated_price) ? (float)$data->estimated_price : 0;
    $notes = isset($data->notes) ? htmlspecialchars(strip_tags($data->notes)) : '';
    $expiration_date = isset($data->expiration_date) && !empty($data->expiration_date) ? $data->expiration_date : null;
    $purchase_date = isset($data->purchase_date) && !empty($data->purchase_date) ? $data->purchase_date : null;

    // Bind values
    $stmt->bindParam(":name", $name);
    $stmt->bindParam(":quantity", $quantity);
    $stmt->bindParam(":category", $category);
    $stmt->bindParam(":priority", $priority);
    $stmt->bindParam(":estimated_price", $estimated_price);
    $stmt->bindParam(":notes", $notes);
    $stmt->bindParam(":expiration_date", $expiration_date);
    $stmt->bindParam(":purchase_date", $purchase_date);

    if($stmt->execute()) {
        $id = $db->lastInsertId();
        
        // Auto-calculate expiration date if not provided
        if ($expiration_date === null && $purchase_date !== null) {
            $shelf_life_query = "SELECT shelf_life_days FROM shelf_life_data 
                                WHERE category = :category 
                                LIMIT 1";
            $shelf_stmt = $db->prepare($shelf_life_query);
            $shelf_stmt->bindParam(":category", $category);
            $shelf_stmt->execute();
            
            if ($shelf_row = $shelf_stmt->fetch(PDO::FETCH_ASSOC)) {
                $shelf_life = $shelf_row['shelf_life_days'];
                $calculated_expiry = date('Y-m-d', strtotime($purchase_date . ' + ' . $shelf_life . ' days'));
                
                $update_query = "UPDATE grocery_items SET expiration_date = :expiration_date WHERE id = :id";
                $update_stmt = $db->prepare($update_query);
                $update_stmt->bindParam(":expiration_date", $calculated_expiry);
                $update_stmt->bindParam(":id", $id);
                $update_stmt->execute();
            }
        }
        
        http_response_code(201);
        echo json_encode(array(
            "success" => true,
            "message" => "Item created successfully.",
            "id" => $id
        ));
    } else {
        http_response_code(503);
        echo json_encode(array(
            "success" => false,
            "message" => "Unable to create item."
        ));
    }
} else {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Unable to create item. Data is incomplete."
    ));
}
?>