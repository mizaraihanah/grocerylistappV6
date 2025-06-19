// models/ShoppingList.php
<?php
class ShoppingList {
    private $conn;
    private $table_name = "grocery_items";

    public function __construct($db) {
        $this->conn = $db;
    }

    // Get shopping list grouped by category
    public function getShoppingListByCategory() {
        $query = "SELECT category, 
                         GROUP_CONCAT(
                             CONCAT(name, ' (', quantity, ')') 
                             ORDER BY priority DESC, name 
                             SEPARATOR ', '
                         ) as items,
                         COUNT(*) as item_count,
                         SUM(estimated_price) as category_total
                  FROM " . $this->table_name . "
                  WHERE completed = 0
                  GROUP BY category
                  ORDER BY category";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    // Get shopping summary
    public function getShoppingSummary() {
        $query = "SELECT 
                    COUNT(*) as total_items,
                    SUM(quantity) as total_quantity,
                    SUM(estimated_price) as total_estimated,
                    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_count,
                    COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority_count,
                    COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority_count
                  FROM " . $this->table_name . "
                  WHERE completed = 0";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Generate shopping list PDF/Print format
    public function generatePrintableList() {
        $query = "SELECT category, name, quantity, priority, estimated_price
                  FROM " . $this->table_name . "
                  WHERE completed = 0
                  ORDER BY 
                    category,
                    CASE priority 
                        WHEN 'high' THEN 3 
                        WHEN 'medium' THEN 2 
                        WHEN 'low' THEN 1 
                    END DESC,
                    name";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }
}