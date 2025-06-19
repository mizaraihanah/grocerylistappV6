// api/reminders.php - ReminderSystem component endpoint
<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch($method) {
    case 'GET':
        if ($action === 'create_expiry_reminders') {
            // Call stored procedure to create expiry reminders
            $query = "CALL CreateExpiryReminders()";
            $stmt = $db->prepare($query);
            
            if($stmt->execute()) {
                echo json_encode(array(
                    "success" => true,
                    "message" => "Expiry reminders created successfully."
                ));
            } else {
                echo json_encode(array(
                    "success" => false,
                    "message" => "Failed to create expiry reminders."
                ));
            }
        } else {
            // Get all active reminders
            $query = "SELECT r.*, g.name as item_name, g.category 
                      FROM reminders r 
                      LEFT JOIN grocery_items g ON r.item_id = g.id 
                      WHERE r.is_active = 1 
                      ORDER BY r.reminder_date ASC";
            
            $stmt = $db->prepare($query);
            $stmt->execute();
            
            $reminders = array();
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $reminders[] = array(
                    "id" => (int)$row['id'],
                    "item_id" => (int)$row['item_id'],
                    "item_name" => $row['item_name'],
                    "category" => $row['category'],
                    "reminder_type" => $row['reminder_type'],
                    "title" => $row['title'],
                    "message" => $row['message'],
                    "reminder_date" => $row['reminder_date'],
                    "is_sent" => (bool)$row['is_sent'],
                    "priority" => $row['priority']
                );
            }
            
            echo json_encode(array(
                "success" => true,
                "data" => $reminders
            ));
        }
        break;
        
    case 'POST':
        // Create new reminder
        $data = json_decode(file_get_contents("php://input"));
        
        $query = "INSERT INTO reminders 
                  SET item_id=:item_id, reminder_type=:reminder_type, 
                      title=:title, message=:message, reminder_date=:reminder_date, 
                      priority=:priority";
        
        $stmt = $db->prepare($query);
        
        $item_id = isset($data->item_id) ? (int)$data->item_id : null;
        $reminder_type = htmlspecialchars(strip_tags($data->reminder_type));
        $title = htmlspecialchars(strip_tags($data->title));
        $message = htmlspecialchars(strip_tags($data->message));
        $reminder_date = $data->reminder_date;
        $priority = isset($data->priority) ? htmlspecialchars(strip_tags($data->priority)) : 'medium';
        
        $stmt->bindParam(":item_id", $item_id);
        $stmt->bindParam(":reminder_type", $reminder_type);
        $stmt->bindParam(":title", $title);
        $stmt->bindParam(":message", $message);
        $stmt->bindParam(":reminder_date", $reminder_date);
        $stmt->bindParam(":priority", $priority);
        
        if($stmt->execute()) {
            echo json_encode(array(
                "success" => true,
                "message" => "Reminder created successfully.",
                "id" => $db->lastInsertId()
            ));
        } else {
            echo json_encode(array(
                "success" => false,
                "message" => "Failed to create reminder."
            ));
        }
        break;
        
    case 'PUT':
        // Mark reminder as sent
        $data = json_decode(file_get_contents("php://input"));
        
        $query = "UPDATE reminders 
                  SET is_sent = 1, sent_at = NOW() 
                  WHERE id = :id";
        
        $stmt = $db->prepare($query);
        $id = (int)$data->id;
        $stmt->bindParam(":id", $id);
        
        if($stmt->execute()) {
            echo json_encode(array(
                "success" => true,
                "message" => "Reminder marked as sent."
            ));
        } else {
            echo json_encode(array(
                "success" => false,
                "message" => "Failed to update reminder."
            ));
        }
        break;
        
    case 'DELETE':
        // Deactivate reminder
        $data = json_decode(file_get_contents("php://input"));
        
        $query = "UPDATE reminders 
                  SET is_active = 0 
                  WHERE id = :id";
        
        $stmt = $db->prepare($query);
        $id = (int)$data->id;
        $stmt->bindParam(":id", $id);
        
        if($stmt->execute()) {
            echo json_encode(array(
                "success" => true,
                "message" => "Reminder deactivated."
            ));
        } else {
            echo json_encode(array(
                "success" => false,
                "message" => "Failed to deactivate reminder."
            ));
        }
        break;
}
?>