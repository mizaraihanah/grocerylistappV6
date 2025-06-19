// api/shopping_list.php
<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../config/database.php';
include_once '../models/ShoppingList.php';

$database = new Database();
$db = $database->getConnection();
$shoppingList = new ShoppingList($db);

$action = isset($_GET['action']) ? $_GET['action'] : 'list';

switch($action) {
    case 'by_category':
        $stmt = $shoppingList->getShoppingListByCategory();
        $categories = array();
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $categories[] = $row;
        }
        
        echo json_encode(array(
            "success" => true,
            "data" => $categories
        ));
        break;
        
    case 'summary':
        $summary = $shoppingList->getShoppingSummary();
        echo json_encode(array(
            "success" => true,
            "data" => $summary
        ));
        break;
        
    case 'printable':
        $stmt = $shoppingList->generatePrintableList();
        $items = array();
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $items[] = $row;
        }
        
        echo json_encode(array(
            "success" => true,
            "data" => $items
        ));
        break;
        
    default:
        echo json_encode(array(
            "success" => false,
            "message" => "Invalid action"
        ));
}
?>