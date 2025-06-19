<?php
class Validator {
    public static function validateGroceryItem($data) {
        $errors = array();

        if (empty($data->name)) {
            $errors['name'] = 'Item name is required';
        } elseif (strlen($data->name) > 255) {
            $errors['name'] = 'Item name must be less than 255 characters';
        }

        if (empty($data->quantity) || !is_numeric($data->quantity) || $data->quantity < 1) {
            $errors['quantity'] = 'Quantity must be a positive number';
        }

        $validCategories = ['fruits', 'vegetables', 'dairy', 'meat', 'pantry', 'beverages', 'snacks', 'frozen', 'household', 'other'];
        if (empty($data->category) || !in_array($data->category, $validCategories)) {
            $errors['category'] = 'Valid category is required';
        }

        $validPriorities = ['low', 'medium', 'high'];
        if (empty($data->priority) || !in_array($data->priority, $validPriorities)) {
            $errors['priority'] = 'Valid priority is required';
        }

        if (isset($data->estimated_price) && (!is_numeric($data->estimated_price) || $data->estimated_price < 0)) {
            $errors['estimated_price'] = 'Estimated price must be a positive number';
        }

        return $errors;
    }
}
?>