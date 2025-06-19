// components/ReminderSystem.php - Server-side ReminderSystem component
<?php
/**
 * ReminderSystem Component - Server Side
 * Reused and adapted from customer-reminder-php repository
 * Original: https://github.com/atchopba/customer-reminder-php
 */
class ReminderSystem {
    private $db;
    private $reminderTypes = array(
        'EXPIRY_WARNING' => 'expiry_warning',
        'EXPIRED' => 'expired',
        'PURCHASE_REMINDER' => 'purchase_reminder',
        'SHOPPING_LIST' => 'shopping_list'
    );
    
    public function __construct($database) {
        $this->db = $database;
    }
    
    /**
     * Create reminder for grocery item
     * Adapted from customer-reminder-php's reminder creation logic
     */
    public function createReminder($itemId, $type, $title, $message, $reminderDate, $priority = 'medium') {
        $query = "INSERT INTO reminders 
                  SET item_id=:item_id, reminder_type=:reminder_type, 
                      title=:title, message=:message, reminder_date=:reminder_date, 
                      priority=:priority";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':item_id', $itemId);
        $stmt->bindParam(':reminder_type', $type);
        $stmt->bindParam(':title', $title);
        $stmt->bindParam(':message', $message);
        $stmt->bindParam(':reminder_date', $reminderDate);
        $stmt->bindParam(':priority', $priority);
        
        if ($stmt->execute()) {
            return $this->db->lastInsertId();
        }
        
        return false;
    }
    
    /**
     * Setup automatic expiry reminders
     * Adapted from customer-reminder-php's automated reminder system
     */
    public function setupExpiryReminders() {
        // Use stored procedure to create expiry reminders
        $query = "CALL CreateExpiryReminders()";
        $stmt = $this->db->prepare($query);
        
        return $stmt->execute();
    }
    
    /**
     * Get pending reminders
     */
    public function getPendingReminders() {
        $query = "SELECT r.*, g.name as item_name, g.category 
                  FROM reminders r 
                  LEFT JOIN grocery_items g ON r.item_id = g.id 
                  WHERE r.is_active = 1 
                  AND r.is_sent = 0 
                  AND r.reminder_date <= NOW() 
                  ORDER BY r.priority DESC, r.reminder_date ASC";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        
        $reminders = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $reminders[] = $row;
        }
        
        return $reminders;
    }
    
    /**
     * Mark reminder as sent
     * Adapted from customer-reminder-php's notification tracking
     */
    public function markReminderAsSent($reminderId) {
        $query = "UPDATE reminders 
                  SET is_sent = 1, sent_at = NOW() 
                  WHERE id = :id";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $reminderId);
        
        return $stmt->execute();
    }
    
    /**
     * Deactivate reminders for completed items
     */
    public function deactivateItemReminders($itemId) {
        $query = "UPDATE reminders 
                  SET is_active = 0 
                  WHERE item_id = :item_id AND is_active = 1";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':item_id', $itemId);
        
        return $stmt->execute();
    }
    
    /**
     * Generate reminder message
     * Adapted from customer-reminder-php's message generation
     */
    public function generateReminderMessage($itemName, $type, $daysUntilExpiry = null) {
        switch($type) {
            case $this->reminderTypes['EXPIRY_WARNING']:
                return "⚠️ {$itemName} expires in {$daysUntilExpiry} day(s)!";
            case $this->reminderTypes['EXPIRED']:
                return "🚨 {$itemName} has expired! Please remove from list.";
            case $this->reminderTypes['PURCHASE_REMINDER']:
                return "🛒 Don't forget to buy {$itemName}!";
            case $this->reminderTypes['SHOPPING_LIST']:
                return "📝 {$itemName} is on your shopping list.";
            default:
                return "Reminder about {$itemName}";
        }
    }
}
?>