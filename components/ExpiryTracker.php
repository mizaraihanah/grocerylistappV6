// components/ExpiryTracker.php - Server-side ExpiryTracker component
<?php
/**
 * ExpiryTracker Component - Server Side
 * Reused and adapted from spoiltracker repository
 * Original: https://github.com/psibir/spoiltracker
 */
class ExpiryTracker {
    private $db;
    private $defaultShelfLife = array(
        'fruits' => 7,
        'vegetables' => 7,
        'dairy' => 7,
        'meat' => 3,
        'pantry' => 30,
        'beverages' => 14,
        'snacks' => 30,
        'frozen' => 90,
        'household' => 365
    );
    
    public function __construct($database) {
        $this->db = $database;
    }
    
    /**
     * Calculate expiration date based on purchase date and shelf life
     * Adapted from spoiltracker's calculate_expiration_date method
     */
    public function calculateExpirationDate($purchaseDate, $shelfLifeDays) {
        $date = new DateTime($purchaseDate);
        $date->add(new DateInterval('P' . $shelfLifeDays . 'D'));
        return $date->format('Y-m-d');
    }
    
    /**
     * Get shelf life for item from database or defaults
     */
    public function getShelfLife($itemName, $category) {
        $query = "SELECT shelf_life_days FROM shelf_life_data 
                  WHERE item_name = :item_name OR category = :category 
                  ORDER BY item_name ASC 
                  LIMIT 1";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':item_name', $itemName);
        $stmt->bindParam(':category', $category);
        $stmt->execute();
        
        if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            return (int)$row['shelf_life_days'];
        }
        
        return isset($this->defaultShelfLife[$category]) ? 
               $this->defaultShelfLife[$category] : 7;
    }
    
    /**
     * Generate expiry report using stored procedure
     * Adapted from spoiltracker's generate_expiry_report method
     */
    public function generateExpiryReport() {
        $query = "CALL GetExpiryReport()";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        
        $expired = array();
        $expiring_soon = array();
        $fresh = array();
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            switch($row['expiry_status']) {
                case 'expired':
                    $expired[] = $row;
                    break;
                case 'expiring_soon':
                    $expiring_soon[] = $row;
                    break;
                case 'fresh':
                    $fresh[] = $row;
                    break;
            }
        }
        
        return array(
            'expired' => $expired,
            'expiring_soon' => $expiring_soon,
            'fresh' => $fresh,
            'expired_count' => count($expired),
            'expiring_soon_count' => count($expiring_soon),
            'fresh_count' => count($fresh),
            'total_items' => count($expired) + count($expiring_soon) + count($fresh)
        );
    }
    
    /**
     * Auto-calculate expiration dates for items without dates
     */
    public function autoCalculateExpirationDates() {
        $query = "UPDATE grocery_items g
                  LEFT JOIN shelf_life_data s ON g.category = s.category
                  SET g.expiration_date = DATE_ADD(
                      COALESCE(g.purchase_date, DATE(g.date_added)), 
                      INTERVAL COALESCE(s.shelf_life_days, :default_days) DAY
                  )
                  WHERE g.expiration_date IS NULL 
                  AND g.completed = 0
                  AND (g.purchase_date IS NOT NULL OR g.date_added IS NOT NULL)";
        
        $stmt = $this->db->prepare($query);
        $defaultDays = 7;
        $stmt->bindParam(':default_days', $defaultDays);
        
        return $stmt->execute();
    }
}
?>