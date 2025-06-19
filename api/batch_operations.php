// api/batch_operations.php
<?php
include_once '../config/cors.php';
include_once '../config/database.php';
include_once '../models/GroceryItem.php';
include_once '../utils/ResponseHelper.php';

$database = new Database();
$db = $database->getConnection();
$item = new GroceryItem($db);

$data = json_decode(file_get_contents("php://input"));
$action = isset($data->action) ? $data->action : '';

switch($action) {
    case 'mark_multiple_complete':
        if (!isset($data->ids) || !is_array($data->ids)) {
            ResponseHelper::sendError('Invalid item IDs provided');
        }
        
        $completed_count = 0;
        foreach($data->ids as $id) {
            $item->id = $id;
            if($item->toggleComplete()) {
                $completed_count++;
            }
        }
        
        ResponseHelper::sendSuccess("$completed_count items updated successfully");
        break;
        
    case 'delete_multiple':
        if (!isset($data->ids) || !is_array($data->ids)) {
            ResponseHelper::sendError('Invalid item IDs provided');
        }
        
        $deleted_count = 0;
        foreach($data->ids as $id) {
            $item->id = $id;
            if($item->delete()) {
                $deleted_count++;
            }
        }
        
        ResponseHelper::sendSuccess("$deleted_count items deleted successfully");
        break;
        
    case 'duplicate_item':
        if (!isset($data->id)) {
            ResponseHelper::sendError('Item ID is required');
        }
        
        $item->id = $data->id;
        if($item->readOne()) {
            // Create new item with same properties but reset completion
            $item->id = null;
            $item->name = $item->name . ' (Copy)';
            $item->completed = 0;
            
            if($item->create()) {
                ResponseHelper::sendSuccess('Item duplicated successfully', array('id' => $item->id));
            } else {
                ResponseHelper::sendError('Failed to duplicate item');
            }
        } else {
            ResponseHelper::sendError('Original item not found');
        }
        break;
        
    default:
        ResponseHelper::sendError('Invalid action specified');
}
?>