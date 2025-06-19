// utils/ResponseHelper.php - Utility for consistent API responses
<?php
class ResponseHelper {
    public static function sendJSON($data, $status_code = 200) {
        http_response_code($status_code);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    public static function sendSuccess($message, $data = null) {
        $response = array(
            'success' => true,
            'message' => $message
        );
        
        if ($data !== null) {
            $response['data'] = $data;
        }
        
        self::sendJSON($response);
    }

    public static function sendError($message, $status_code = 400) {
        $response = array(
            'success' => false,
            'message' => $message
        );
        
        self::sendJSON($response, $status_code);
    }

    public static function sendValidationError($errors) {
        $response = array(
            'success' => false,
            'message' => 'Validation failed',
            'errors' => $errors
        );
        
        self::sendJSON($response, 422);
    }
}