<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

// Check for search parameter
$keywords = isset($_GET['search']) ? $_GET['search'] : '';
$category = isset($_GET['category']) ? $_GET['category'] : '';
$priority = isset($_GET['priority']) ? $_GET['priority'] : '';

if (!empty($keywords)) {
    $query = "SELECT * FROM grocery_items
              WHERE name LIKE ? OR category LIKE ? OR notes LIKE ?
              ORDER BY 
              CASE priority 
                  WHEN 'high' THEN 3 
                  WHEN 'medium' THEN 2 
                  WHEN 'low' THEN 1 
              END DESC, 
              completed ASC, name ASC";
    
    $stmt = $db->prepare($query);
    $keywords = htmlspecialchars(strip_tags($keywords));
    $keywords = "%{$keywords}%";
    
    $stmt->bindParam(1, $keywords);
    $stmt->bindParam(2, $keywords);
    $stmt->bindParam(3, $keywords);
} elseif (!empty($category)) {
    $query = "SELECT * FROM grocery_items
              WHERE category = ?
              ORDER BY 
              CASE priority 
                  WHEN 'high' THEN 3 
                  WHEN 'medium' THEN 2 
                  WHEN 'low' THEN 1 
              END DESC, 
              completed ASC, name ASC";
    
    $stmt = $db->prepare($query);
    $category = htmlspecialchars(strip_tags($category));
    $stmt->bindParam(1, $category);
} elseif (!empty($priority)) {
    $query = "SELECT * FROM grocery_items
              WHERE priority = ?
              ORDER BY completed ASC, name ASC";
    
    $stmt = $db->prepare($query);
    $priority = htmlspecialchars(strip_tags($priority));
    $stmt->bindParam(1, $priority);
} else {
    $query = "SELECT * FROM grocery_items 
              ORDER BY 
              CASE priority 
                  WHEN 'high' THEN 3 
                  WHEN 'medium' THEN 2 
                  WHEN 'low' THEN 1 
              END DESC, 
              completed ASC, name ASC";
    
    $stmt = $db->prepare($query);
}

$stmt->execute();
$num = $stmt->rowCount();

if($num > 0) {
    $items_arr = array();
    $items_arr["records"] = array();

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        extract($row);
        $item_record = array(
            "id" => (int)$id,
            "name" => $name,
            "quantity" => (int)$quantity,
            "category" => $category,
            "priority" => $priority,
            "estimated_price" => (float)$estimated_price,
            "completed" => (bool)$completed,
            "date_added" => $date_added,
            "date_completed" => $date_completed,
            "expiration_date" => $expiration_date,
            "purchase_date" => $purchase_date,
            "notes" => $notes
        );

        array_push($items_arr["records"], $item_record);
    }

    http_response_code(200);
    echo json_encode($items_arr);
} else {
    http_response_code(404);
    echo json_encode(array("message" => "No items found."));
}
?>