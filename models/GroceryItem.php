<?php
class GroceryItem {
    private $conn;
    private $table_name = "grocery_items";

    public $id;
    public $name;
    public $quantity;
    public $category;
    public $priority;
    public $estimated_price;
    public $completed;
    public $date_added;
    public $date_completed;
    public $notes;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Create grocery item
    public function create() {
        $query = "INSERT INTO " . $this->table_name . "
                  SET name=:name, quantity=:quantity, category=:category, 
                      priority=:priority, estimated_price=:estimated_price, 
                      completed=:completed, notes=:notes, date_added=NOW()";

        $stmt = $this->conn->prepare($query);

        // Sanitize input
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->quantity = htmlspecialchars(strip_tags($this->quantity));
        $this->category = htmlspecialchars(strip_tags($this->category));
        $this->priority = htmlspecialchars(strip_tags($this->priority));
        $this->estimated_price = htmlspecialchars(strip_tags($this->estimated_price));
        $this->completed = htmlspecialchars(strip_tags($this->completed));
        $this->notes = htmlspecialchars(strip_tags($this->notes));

        // Bind values
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":quantity", $this->quantity);
        $stmt->bindParam(":category", $this->category);
        $stmt->bindParam(":priority", $this->priority);
        $stmt->bindParam(":estimated_price", $this->estimated_price);
        $stmt->bindParam(":completed", $this->completed);
        $stmt->bindParam(":notes", $this->notes);

        if($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    // Read all grocery items
    public function read() {
        $query = "SELECT * FROM " . $this->table_name . " ORDER BY 
                  CASE priority 
                      WHEN 'high' THEN 3 
                      WHEN 'medium' THEN 2 
                      WHEN 'low' THEN 1 
                  END DESC, 
                  completed ASC, name ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    // Read single item
    public function readOne() {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = ? LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if($row) {
            $this->name = $row['name'];
            $this->quantity = $row['quantity'];
            $this->category = $row['category'];
            $this->priority = $row['priority'];
            $this->estimated_price = $row['estimated_price'];
            $this->completed = $row['completed'];
            $this->date_added = $row['date_added'];
            $this->date_completed = $row['date_completed'];
            $this->notes = $row['notes'];
            return true;
        }
        return false;
    }

    // Update grocery item
    public function update() {
        $query = "UPDATE " . $this->table_name . "
                  SET name=:name, quantity=:quantity, category=:category, 
                      priority=:priority, estimated_price=:estimated_price, 
                      completed=:completed, notes=:notes
                  WHERE id=:id";

        $stmt = $this->conn->prepare($query);

        // Sanitize input
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->quantity = htmlspecialchars(strip_tags($this->quantity));
        $this->category = htmlspecialchars(strip_tags($this->category));
        $this->priority = htmlspecialchars(strip_tags($this->priority));
        $this->estimated_price = htmlspecialchars(strip_tags($this->estimated_price));
        $this->completed = htmlspecialchars(strip_tags($this->completed));
        $this->notes = htmlspecialchars(strip_tags($this->notes));
        $this->id = htmlspecialchars(strip_tags($this->id));

        // Bind values
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":quantity", $this->quantity);
        $stmt->bindParam(":category", $this->category);
        $stmt->bindParam(":priority", $this->priority);
        $stmt->bindParam(":estimated_price", $this->estimated_price);
        $stmt->bindParam(":completed", $this->completed);
        $stmt->bindParam(":notes", $this->notes);
        $stmt->bindParam(":id", $this->id);

        return $stmt->execute();
    }

    // Toggle completion status
    public function toggleComplete() {
        $query = "UPDATE " . $this->table_name . "
                  SET completed = NOT completed, 
                      date_completed = CASE 
                          WHEN completed = 0 THEN NOW() 
                          ELSE NULL 
                      END
                  WHERE id=:id";

        $stmt = $this->conn->prepare($query);
        $this->id = htmlspecialchars(strip_tags($this->id));
        $stmt->bindParam(":id", $this->id);

        return $stmt->execute();
    }

    // Delete grocery item
    public function delete() {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $this->id = htmlspecialchars(strip_tags($this->id));
        $stmt->bindParam(1, $this->id);

        return $stmt->execute();
    }

    // Search items
    public function search($keywords) {
        $query = "SELECT * FROM " . $this->table_name . "
                  WHERE name LIKE ? OR category LIKE ? OR notes LIKE ?
                  ORDER BY 
                  CASE priority 
                      WHEN 'high' THEN 3 
                      WHEN 'medium' THEN 2 
                      WHEN 'low' THEN 1 
                  END DESC, 
                  completed ASC, name ASC";

        $stmt = $this->conn->prepare($query);
        $keywords = htmlspecialchars(strip_tags($keywords));
        $keywords = "%{$keywords}%";
        
        $stmt->bindParam(1, $keywords);
        $stmt->bindParam(2, $keywords);
        $stmt->bindParam(3, $keywords);
        $stmt->execute();

        return $stmt;
    }

    // Get items by category
    public function getByCategory($category) {
        $query = "SELECT * FROM " . $this->table_name . "
                  WHERE category = ?
                  ORDER BY 
                  CASE priority 
                      WHEN 'high' THEN 3 
                      WHEN 'medium' THEN 2 
                      WHEN 'low' THEN 1 
                  END DESC, 
                  completed ASC, name ASC";

        $stmt = $this->conn->prepare($query);
        $category = htmlspecialchars(strip_tags($category));
        $stmt->bindParam(1, $category);
        $stmt->execute();

        return $stmt;
    }

    // Get statistics
    public function getStats() {
        $query = "SELECT 
                    COUNT(*) as total_items,
                    SUM(completed) as completed_items,
                    COUNT(*) - SUM(completed) as pending_items,
                    SUM(estimated_price) as total_estimated,
                    SUM(CASE WHEN completed = 1 THEN estimated_price ELSE 0 END) as completed_estimated,
                    SUM(CASE WHEN priority = 'high' AND completed = 0 THEN 1 ELSE 0 END) as high_priority_pending
                  FROM " . $this->table_name;

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Clear completed items
    public function clearCompleted() {
        $query = "DELETE FROM " . $this->table_name . " WHERE completed = 1";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute();
    }

    // Get items by priority
    public function getByPriority($priority) {
        $query = "SELECT * FROM " . $this->table_name . "
                  WHERE priority = ?
                  ORDER BY completed ASC, name ASC";

        $stmt = $this->conn->prepare($query);
        $priority = htmlspecialchars(strip_tags($priority));
        $stmt->bindParam(1, $priority);
        $stmt->execute();

        return $stmt;
    }
}
?>