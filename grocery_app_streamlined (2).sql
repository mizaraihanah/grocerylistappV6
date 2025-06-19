-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 19, 2025 at 05:11 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `grocery_app_streamlined`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `CreateExpiryReminders` ()   BEGIN
    -- Create reminders for items expiring within 3 days
    INSERT INTO reminders (item_id, reminder_type, title, message, reminder_date, priority)
    SELECT 
        g.id,
        'expiry_warning',
        CONCAT(g.name, ' expiring soon'),
        CONCAT(g.name, ' will expire in ', DATEDIFF(g.expiration_date, CURDATE()), ' day(s)'),
        DATE_SUB(g.expiration_date, INTERVAL 1 DAY),
        g.priority
    FROM grocery_items g
    LEFT JOIN reminders r ON g.id = r.item_id AND r.reminder_type = 'expiry_warning' AND r.is_active = 1
    WHERE g.completed = 0 
    AND g.expiration_date IS NOT NULL
    AND g.expiration_date > CURDATE()
    AND g.expiration_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
    AND r.id IS NULL;
    
    -- Create reminders for expired items
    INSERT INTO reminders (item_id, reminder_type, title, message, reminder_date, priority)
    SELECT 
        g.id,
        'expired',
        CONCAT(g.name, ' has expired'),
        CONCAT(g.name, ' expired on ', DATE_FORMAT(g.expiration_date, '%M %d, %Y'), '. Please remove from list.'),
        NOW(),
        'high'
    FROM grocery_items g
    LEFT JOIN reminders r ON g.id = r.item_id AND r.reminder_type = 'expired' AND r.is_active = 1
    WHERE g.completed = 0 
    AND g.expiration_date IS NOT NULL
    AND g.expiration_date < CURDATE()
    AND r.id IS NULL;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `GetExpiryReport` ()   BEGIN
    SELECT 
        g.*,
        s.shelf_life_days,
        CASE 
            WHEN g.expiration_date IS NULL THEN 'no_date'
            WHEN g.expiration_date < CURDATE() THEN 'expired'
            WHEN g.expiration_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY) THEN 'expiring_soon'
            ELSE 'fresh'
        END as expiry_status,
        DATEDIFF(g.expiration_date, CURDATE()) as days_until_expiry
    FROM grocery_items g
    LEFT JOIN shelf_life_data s ON g.category = s.category
    WHERE g.completed = 0
    ORDER BY 
        CASE 
            WHEN g.expiration_date < CURDATE() THEN 1
            WHEN g.expiration_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY) THEN 2
            ELSE 3
        END,
        g.expiration_date ASC;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `grocery_items`
--

CREATE TABLE `grocery_items` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `category` enum('fruits','vegetables','dairy','meat','pantry','beverages','snacks','frozen','household') NOT NULL,
  `priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `estimated_price` decimal(10,2) DEFAULT 0.00,
  `completed` tinyint(1) DEFAULT 0,
  `date_added` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_completed` timestamp NULL DEFAULT NULL,
  `expiration_date` date DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `grocery_items`
--

INSERT INTO `grocery_items` (`id`, `name`, `quantity`, `category`, `priority`, `estimated_price`, `completed`, `date_added`, `date_completed`, `expiration_date`, `purchase_date`, `notes`, `created_at`, `updated_at`) VALUES
(2, 'Flour', 1, 'pantry', 'high', 3.00, 0, '2025-06-18 15:05:40', NULL, '2025-07-16', '2025-06-18', '28 days left', '2025-06-18 15:05:40', '2025-06-18 15:05:40'),
(4, 'Salt', 1, 'pantry', 'medium', 3.50, 0, '2025-06-18 15:05:40', NULL, '2025-06-29', '2025-06-18', 'No expiry date', '2025-06-18 15:05:40', '2025-06-18 16:01:06'),
(5, 'Fresh Milk', 1, 'dairy', 'high', 3.99, 1, '2025-06-18 15:05:40', '2025-06-19 02:21:25', '2025-06-22', '2025-06-18', 'Keep refrigerated', '2025-06-18 15:05:40', '2025-06-19 02:21:25'),
(6, 'Bananas', 6, 'fruits', 'medium', 2.99, 0, '2025-06-18 15:05:40', NULL, '2025-06-23', '2025-06-18', 'Room temperature storage', '2025-06-18 15:05:40', '2025-06-18 15:05:40'),
(8, 'Rice Flour', 1, 'pantry', 'medium', 2.50, 0, '2025-06-18 15:59:22', NULL, '2025-07-06', '2025-06-18', '', '2025-06-18 15:59:22', '2025-06-18 15:59:22'),
(9, 'Candy', 1, 'snacks', 'low', 2.00, 0, '2025-06-18 16:33:13', NULL, '2025-07-18', '2025-06-18', '', '2025-06-18 16:33:13', '2025-06-18 16:33:13'),
(10, 'Tea', 1, 'beverages', 'high', 5.00, 0, '2025-06-19 03:04:32', NULL, '2025-07-01', '2025-06-19', '', '2025-06-19 03:04:32', '2025-06-19 03:04:32');

--
-- Triggers `grocery_items`
--
DELIMITER $$
CREATE TRIGGER `update_completion_date` BEFORE UPDATE ON `grocery_items` FOR EACH ROW BEGIN
    IF NEW.completed = TRUE AND OLD.completed = FALSE THEN
        SET NEW.date_completed = NOW();
    ELSEIF NEW.completed = FALSE AND OLD.completed = TRUE THEN
        SET NEW.date_completed = NULL;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `reminders`
--

CREATE TABLE `reminders` (
  `id` int(11) NOT NULL,
  `item_id` int(11) DEFAULT NULL,
  `reminder_type` enum('expiry_warning','expired','purchase_reminder','shopping_list') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `reminder_date` datetime NOT NULL,
  `is_sent` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `sent_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shelf_life_data`
--

CREATE TABLE `shelf_life_data` (
  `id` int(11) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `category` enum('fruits','vegetables','dairy','meat','pantry','beverages','snacks','frozen','household') NOT NULL,
  `shelf_life_days` int(11) NOT NULL,
  `storage_type` enum('room_temperature','refrigerator','freezer','pantry') DEFAULT 'room_temperature',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `shelf_life_data`
--

INSERT INTO `shelf_life_data` (`id`, `item_name`, `category`, `shelf_life_days`, `storage_type`, `notes`, `created_at`) VALUES
(1, 'apples', 'fruits', 7, 'refrigerator', 'Store in crisper drawer', '2025-06-18 15:05:40'),
(2, 'bananas', 'fruits', 5, 'room_temperature', 'Keep at room temperature', '2025-06-18 15:05:40'),
(3, 'oranges', 'fruits', 14, 'refrigerator', 'Can last longer in fridge', '2025-06-18 15:05:40'),
(4, 'strawberries', 'fruits', 3, 'refrigerator', 'Very perishable', '2025-06-18 15:05:40'),
(5, 'grapes', 'fruits', 7, 'refrigerator', 'Store unwashed', '2025-06-18 15:05:40'),
(6, 'lettuce', 'vegetables', 7, 'refrigerator', 'Keep in crisper', '2025-06-18 15:05:40'),
(7, 'tomatoes', 'vegetables', 7, 'room_temperature', 'Better flavor at room temp', '2025-06-18 15:05:40'),
(8, 'carrots', 'vegetables', 21, 'refrigerator', 'Remove green tops', '2025-06-18 15:05:40'),
(9, 'potatoes', 'vegetables', 30, 'pantry', 'Cool, dark place', '2025-06-18 15:05:40'),
(10, 'onions', 'vegetables', 30, 'pantry', 'Cool, dry place', '2025-06-18 15:05:40'),
(11, 'milk', 'dairy', 7, 'refrigerator', 'Check expiration date', '2025-06-18 15:05:40'),
(12, 'cheese', 'dairy', 14, 'refrigerator', 'Hard cheeses last longer', '2025-06-18 15:05:40'),
(13, 'yogurt', 'dairy', 10, 'refrigerator', 'Check sell-by date', '2025-06-18 15:05:40'),
(14, 'eggs', 'dairy', 21, 'refrigerator', 'Store in original carton', '2025-06-18 15:05:40'),
(15, 'chicken', 'meat', 3, 'refrigerator', 'Use quickly or freeze', '2025-06-18 15:05:40'),
(16, 'beef', 'meat', 5, 'refrigerator', 'Ground beef 1-2 days', '2025-06-18 15:05:40'),
(17, 'pork', 'meat', 3, 'refrigerator', 'Use quickly', '2025-06-18 15:05:40'),
(18, 'fish', 'meat', 2, 'refrigerator', 'Very perishable', '2025-06-18 15:05:40'),
(19, 'bread', 'pantry', 7, 'room_temperature', 'Keep in breadbox', '2025-06-18 15:05:40'),
(20, 'rice', 'pantry', 365, 'pantry', 'Dry storage', '2025-06-18 15:05:40'),
(21, 'pasta', 'pantry', 730, 'pantry', 'Dry storage', '2025-06-18 15:05:40'),
(22, 'flour', 'pantry', 180, 'pantry', 'Keep sealed', '2025-06-18 15:05:40'),
(23, 'juice', 'beverages', 7, 'refrigerator', 'After opening', '2025-06-18 15:05:40'),
(24, 'soda', 'beverages', 270, 'pantry', 'Unopened cans', '2025-06-18 15:05:40'),
(25, 'crackers', 'snacks', 90, 'pantry', 'Keep sealed', '2025-06-18 15:05:40'),
(26, 'chips', 'snacks', 30, 'pantry', 'After opening', '2025-06-18 15:05:40'),
(27, 'frozen_vegetables', 'frozen', 365, 'freezer', 'Keep frozen', '2025-06-18 15:05:40'),
(28, 'frozen_meat', 'frozen', 180, 'freezer', 'Properly wrapped', '2025-06-18 15:05:40'),
(29, 'detergent', 'household', 730, 'pantry', 'Keep dry', '2025-06-18 15:05:40');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `grocery_items`
--
ALTER TABLE `grocery_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_completed` (`completed`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_expiration` (`expiration_date`);

--
-- Indexes for table `reminders`
--
ALTER TABLE `reminders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `item_id` (`item_id`),
  ADD KEY `idx_reminder_date` (`reminder_date`),
  ADD KEY `idx_active` (`is_active`),
  ADD KEY `idx_sent` (`is_sent`);

--
-- Indexes for table `shelf_life_data`
--
ALTER TABLE `shelf_life_data`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_item_category` (`item_name`,`category`),
  ADD KEY `idx_category` (`category`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `grocery_items`
--
ALTER TABLE `grocery_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `reminders`
--
ALTER TABLE `reminders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `shelf_life_data`
--
ALTER TABLE `shelf_life_data`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `reminders`
--
ALTER TABLE `reminders`
  ADD CONSTRAINT `reminders_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `grocery_items` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
