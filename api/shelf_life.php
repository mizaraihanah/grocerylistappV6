// api/shelf_life.php - ExpiryTracker component shelf life data endpoint
<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$category = isset($_GET['category']) ? $_GET['category'] : '';
$item_name = isset($_GET['item_name']) ? $_GET['item_name'] : '';

if (!empty($item_name)) {
    // Get shelf life for specific item
    $query = "SELECT * FROM shelf_life_data 
              WHERE item_name = :item_name OR category = :category 
              ORDER BY item_name ASC 
              LIMIT 1";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":item_name", $item_name);
    $stmt->bindParam(":category", $category);
} elseif (!empty($category)) {
    // Get shelf life data for category
    $query = "SELECT * FROM shelf_life_data 
              WHERE category = :category 
              ORDER BY item_name ASC";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":category", $category);
} else {
    // Get all shelf life data
    $query = "SELECT * FROM shelf_life_data 
              ORDER BY category ASC, item_name ASC";
    
    $stmt = $db->prepare($query);
}

$stmt->execute();

$shelf_life_data = array();
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $shelf_life_data[] = array(
        "id" => (int)$row['id'],
        "item_name" => $row['item_name'],
        "category" => $row['category'],
        "shelf_life_days" => (int)$row['shelf_life_days'],
        "storage_type" => $row['storage_type'],
        "notes" => $row['notes']
    );
}

if (count($shelf_life_data) > 0) {
    echo json_encode(array(
        "success" => true,
        "data" => $shelf_life_data
    ));
} else {
    echo json_encode(array(
        "success" => false,
        "message" => "No shelf life data found."
    ));
}
?>