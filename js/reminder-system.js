// js/reminder-system.js
// Component reused and adapted from customer-reminder-php repository
// Original: https://github.com/atchopba/customer-reminder-php
// Adaptation: Modified from PHP to JavaScript for client-side integration

/**
 * ReminderSystem Component
 * 
 * REUSE METHODOLOGY (X-Model Development with Reuse):
 * - Source: customer-reminder-php by atchopba
 * - Adaptation Technique: Gray Box Reuse with Architecture Translation
 * - Original Concepts Adapted:
 *   1. Reminder scheduling and management
 *   2. Customer notification system -> Grocery item notification
 *   3. Reminder types and priorities -> Expiry-based reminders
 *   4. Notification delivery system -> Browser notifications
 */

class ReminderSystem {
    constructor(expiryTracker) {
        this.expiryTracker = expiryTracker;
        this.reminders = JSON.parse(localStorage.getItem('groceryReminders') || '[]');
        this.notificationPermission = false;
        this.reminderTypes = {
            EXPIRY_WARNING: 'expiry_warning',
            EXPIRED: 'expired', 
            PURCHASE_REMINDER: 'purchase_reminder',
            SHOPPING_LIST: 'shopping_list'
        };
        
        // Adapted from customer-reminder-php's reminder frequency settings
        this.reminderFrequency = {
            DAILY: 24 * 60 * 60 * 1000,    // 24 hours in milliseconds
            WEEKLY: 7 * 24 * 60 * 60 * 1000, // 7 days
            MONTHLY: 30 * 24 * 60 * 60 * 1000 // 30 days
        };
        
        this.notificationCenter = [];
        this.isProcessing = false;
        
        this.init();
    }

    /**
     * Initialize reminder system
     * Adapted from customer-reminder-php's initialization process
     */
    async init() {
        await this.requestNotificationPermission();
        this.startReminderEngine();
        this.setupPeriodicChecks();
        this.loadExistingReminders();
    }

    /**
     * Request notification permission
     * Browser API integration (new functionality)
     */
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission === 'granted';
            
            if (!this.notificationPermission) {
                console.warn('Notification permission denied. Reminders will only show in-app.');
            }
        }
    }

    /**
     * Create reminder for grocery item
     * Adapted from customer-reminder-php's reminder creation logic
     * 
     * @param {Object} item - Grocery item
     * @param {string} type - Type of reminder
     * @param {Date} reminderDate - When to show reminder
     * @param {Object} options - Additional options
     * @returns {Object} - Created reminder object
     */
    createReminder(item, type, reminderDate, options = {}) {
        const reminder = {
            id: this.generateReminderId(),
            item_id: item.id,
            item_name: item.name,
            item_category: item.category,
            type: type,
            reminder_date: reminderDate,
            created_date: new Date(),
            is_active: true,
            is_sent: false,
            priority: this.getReminderPriority(type, item),
            message: this.generateReminderMessage(item, type),
            recurring: options.recurring || false,
            frequency: options.frequency || null,
            notification_methods: options.notification_methods || ['in_app', 'browser'],
            metadata: {
                expiration_date: item.expiration_date,
                days_until_expiry: item.days_until_expiry,
                shelf_life: item.shelf_life
            }
        };

        this.reminders.push(reminder);
        this.saveReminders();
        
        return reminder;
    }

    /**
     * Generate reminder ID
     * Helper method adapted from customer-reminder-php's ID generation
     */
    generateReminderId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get reminder priority based on type and item
     * Adapted from customer-reminder-php's priority system
     * 
     * @param {string} type - Reminder type
     * @param {Object} item - Grocery item
     * @returns {string} - Priority level
     */
    getReminderPriority(type, item) {
        // High priority for expired items or high priority grocery items
        if (type === this.reminderTypes.EXPIRED || item.priority === 'high') {
            return 'high';
        }
        
        // Medium priority for expiry warnings
        if (type === this.reminderTypes.EXPIRY_WARNING) {
            return 'medium';
        }
        
        // Low priority for other reminders
        return 'low';
    }

    /**
     * Generate reminder message
     * Adapted from customer-reminder-php's message generation system
     * 
     * @param {Object} item - Grocery item
     * @param {string} type - Reminder type
     * @returns {string} - Generated message
     */
    generateReminderMessage(item, type) {
        const messages = {
            [this.reminderTypes.EXPIRY_WARNING]: `⚠️ ${item.name} expires in ${item.days_until_expiry} day(s)!`,
            [this.reminderTypes.EXPIRED]: `🚨 ${item.name} has expired! Please remove from list.`,
            [this.reminderTypes.PURCHASE_REMINDER]: `🛒 Don't forget to buy ${item.name}!`,
            [this.reminderTypes.SHOPPING_LIST]: `📝 You have ${item.quantity} ${item.name} on your shopping list.`
        };
        
        return messages[type] || `Reminder about ${item.name}`;
    }

    /**
     * Set up automatic expiry reminders for items
     * Core functionality adapted from customer-reminder-php's automated reminders
     * 
     * @param {Array} groceryItems - Array of grocery items
     */
    setupExpiryReminders(groceryItems) {
        groceryItems.forEach(item => {
            const itemWithExpiry = this.expiryTracker.addExpiryTracking(item);
            
            // Skip if item is already expired or completed
            if (itemWithExpiry.is_expired || item.completed) {
                return;
            }
            
            // Check if reminder already exists
            const existingReminder = this.reminders.find(r => 
                r.item_id === item.id && 
                r.type === this.reminderTypes.EXPIRY_WARNING &&
                r.is_active
            );
            
            if (existingReminder) {
                return; // Reminder already exists
            }
            
            // Create expiry warning reminder
            if (itemWithExpiry.days_until_expiry <= 7 && itemWithExpiry.days_until_expiry > 0) {
                const reminderDate = new Date();
                reminderDate.setDate(reminderDate.getDate() + (itemWithExpiry.days_until_expiry - 1));
                
                this.createReminder(itemWithExpiry, this.reminderTypes.EXPIRY_WARNING, reminderDate, {
                    recurring: false,
                    notification_methods: ['in_app', 'browser']
                });
            }
            
            // Create expired item reminder for the expiration date
            const expiredReminderDate = new Date(itemWithExpiry.expiration_date);
            this.createReminder(itemWithExpiry, this.reminderTypes.EXPIRED, expiredReminderDate, {
                recurring: false,
                notification_methods: ['in_app', 'browser']
            });
        });
    }

    /**
     * Start reminder engine
     * Adapted from customer-reminder-php's reminder processing engine
     */
    startReminderEngine() {
        // Check for due reminders every minute
        setInterval(() => {
            this.processReminders();
        }, 60000); // 1 minute
        
        // Initial check
        this.processReminders();
    }

    /**
     * Set up periodic checks
     * Additional method for regular maintenance
     */
    setupPeriodicChecks() {
        // Daily cleanup of old reminders
        setInterval(() => {
            this.cleanupOldReminders();
        }, 24 * 60 * 60 * 1000); // 24 hours
    }

    /**
     * Load existing reminders from storage
     */
    loadExistingReminders() {
        try {
            const stored = localStorage.getItem('groceryReminders');
            if (stored) {
                this.reminders = JSON.parse(stored);
                // Convert date strings back to Date objects
                this.reminders.forEach(reminder => {
                    reminder.reminder_date = new Date(reminder.reminder_date);
                    reminder.created_date = new Date(reminder.created_date);
                });
            }
        } catch (error) {
            console.error('Error loading reminders:', error);
            this.reminders = [];
        }
    }

    /**
     * Save reminders to storage
     */
    saveReminders() {
        try {
            localStorage.setItem('groceryReminders', JSON.stringify(this.reminders));
        } catch (error) {
            console.error('Error saving reminders:', error);
        }
    }

    /**
     * Process due reminders
     * Core processing logic adapted from customer-reminder-php
     */
    processReminders() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const now = new Date();
        
        this.reminders.forEach(reminder => {
            if (!reminder.is_active || reminder.is_sent) {
                return;
            }
            
            const reminderDate = new Date(reminder.reminder_date);
            
            // Check if reminder is due
            if (now >= reminderDate) {
                this.sendReminder(reminder);
                this.markReminderAsSent(reminder);
                
                // Handle recurring reminders
                if (reminder.recurring && reminder.frequency) {
                    this.scheduleNextRecurrence(reminder);
                }
            }
        });

        this.isProcessing = false;
    }

    /**
     * Send reminder notification
     * Adapted from customer-reminder-php's notification delivery system
     * 
     * @param {Object} reminder - Reminder object
     */
    sendReminder(reminder) {
        const methods = reminder.notification_methods || ['in_app'];
        
        methods.forEach(method => {
            switch (method) {
                case 'browser':
                    this.sendBrowserNotification(reminder);
                    break;
                case 'in_app':
                    this.sendInAppNotification(reminder);
                    break;
            }
        });
        
        // Log reminder activity (adapted from customer-reminder-php's logging)
        this.logReminderActivity(reminder, 'sent');
    }

    /**
     * Send browser notification
     * Browser API integration
     */
    sendBrowserNotification(reminder) {
        if (!this.notificationPermission) {
            return;
        }
        
        const options = {
            body: reminder.message,
            icon: this.getNotificationIcon(reminder.type),
            tag: `grocery-reminder-${reminder.id}`,
            requireInteraction: reminder.priority === 'high',
            silent: reminder.priority === 'low'
        };
        
        const notification = new Notification('Grocery Reminder', options);
        
        // Auto-close after 10 seconds for low priority
        if (reminder.priority === 'low') {
            setTimeout(() => notification.close(), 10000);
        }
        
        // Handle notification click
        notification.onclick = () => {
            window.focus();
            this.handleReminderClick(reminder);
            notification.close();
        };
    }

    /**
     * Send in-app notification
     * UI integration method
     */
    sendInAppNotification(reminder) {
        // Create toast notification
        if (window.groceryApp && window.groceryApp.showToast) {
            const toastType = reminder.priority === 'high' ? 'error' : 
                            reminder.priority === 'medium' ? 'warning' : 'info';
            
            window.groceryApp.showToast(reminder.message, toastType);
        }
        
        // Add to in-app notification center
        this.addToNotificationCenter(reminder);
    }

    /**
     * Get notification icon based on reminder type
     */
    getNotificationIcon(type) {
        const icons = {
            [this.reminderTypes.EXPIRY_WARNING]: '⚠️',
            [this.reminderTypes.EXPIRED]: '🚨',
            [this.reminderTypes.PURCHASE_REMINDER]: '🛒',
            [this.reminderTypes.SHOPPING_LIST]: '📝'
        };
        
        return icons[type] || '📱';
    }

    /**
     * Handle reminder click event
     */
    handleReminderClick(reminder) {
        // Mark as interacted
        reminder.interacted = true;
        this.saveReminders();
        
        // Navigate to relevant section if possible
        if (window.groceryApp && window.groceryApp.navigateToItem) {
            window.groceryApp.navigateToItem(reminder.item_id);
        }
        
        // Log interaction
        this.logReminderActivity(reminder, 'clicked');
    }

    /**
     * Add reminder to notification center
     */
    addToNotificationCenter(reminder) {
        const notification = {
            id: reminder.id,
            message: reminder.message,
            type: reminder.type,
            priority: reminder.priority,
            timestamp: new Date(),
            read: false,
            item_id: reminder.item_id,
            item_name: reminder.item_name
        };
        
        this.notificationCenter.unshift(notification);
        
        // Keep only last 50 notifications
        if (this.notificationCenter.length > 50) {
            this.notificationCenter = this.notificationCenter.slice(0, 50);
        }
        
        // Update UI if notification center exists
        this.updateNotificationCenterUI();
    }

    /**
     * Update notification center UI
     */
    updateNotificationCenterUI() {
        const unreadCount = this.notificationCenter.filter(n => !n.read).length;
        
        // Update notification badge
        const badge = document.getElementById('notification-badge');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
        
        // Update notification list
        const list = document.getElementById('notification-list');
        if (list) {
            list.innerHTML = '';
            this.notificationCenter.forEach(notification => {
                const item = this.createNotificationItem(notification);
                list.appendChild(item);
            });
        }
    }

    /**
     * Create notification item element
     */
    createNotificationItem(notification) {
        const item = document.createElement('div');
        item.className = `notification-item ${notification.read ? 'read' : 'unread'} priority-${notification.priority}`;
        item.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
            </div>
            <button class="notification-close" onclick="reminderSystem.markAsRead('${notification.id}')">×</button>
        `;
        
        item.addEventListener('click', () => {
            this.markAsRead(notification.id);
            if (window.groceryApp && window.groceryApp.navigateToItem) {
                window.groceryApp.navigateToItem(notification.item_id);
            }
        });
        
        return item;
    }

    /**
     * Mark reminder as sent
     */
    markReminderAsSent(reminder) {
        reminder.is_sent = true;
        reminder.sent_date = new Date();
        this.saveReminders();
    }

    /**
     * Schedule next recurrence for recurring reminders
     */
    scheduleNextRecurrence(reminder) {
        if (!reminder.frequency) return;
        
        const nextDate = new Date(reminder.reminder_date);
        nextDate.setTime(nextDate.getTime() + reminder.frequency);
        
        const newReminder = { ...reminder };
        newReminder.id = this.generateReminderId();
        newReminder.reminder_date = nextDate;
        newReminder.is_sent = false;
        newReminder.created_date = new Date();
        
        this.reminders.push(newReminder);
        this.saveReminders();
    }

    /**
     * Log reminder activity
     */
    logReminderActivity(reminder, action) {
        const logEntry = {
            reminder_id: reminder.id,
            item_id: reminder.item_id,
            action: action,
            timestamp: new Date(),
            priority: reminder.priority,
            type: reminder.type
        };
        
        console.log('Reminder Activity:', logEntry);
        
        // Store activity log if needed
        const activityLog = JSON.parse(localStorage.getItem('reminderActivityLog') || '[]');
        activityLog.push(logEntry);
        
        // Keep only last 100 log entries
        if (activityLog.length > 100) {
            activityLog.splice(0, activityLog.length - 100);
        }
        
        localStorage.setItem('reminderActivityLog', JSON.stringify(activityLog));
    }

    /**
     * Deactivate reminders for a specific item
     */
    deactivateItemReminders(itemId) {
        this.reminders.forEach(reminder => {
            if (reminder.item_id === itemId && reminder.is_active) {
                reminder.is_active = false;
                reminder.deactivated_date = new Date();
            }
        });
        this.saveReminders();
    }

    /**
     * Clean up old reminders
     */
    cleanupOldReminders() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        this.reminders = this.reminders.filter(reminder => {
            const reminderDate = new Date(reminder.reminder_date);
            return reminderDate > thirtyDaysAgo || reminder.is_active;
        });
        
        this.saveReminders();
    }

    /**
     * Mark notification as read
     */
    markAsRead(notificationId) {
        const notification = this.notificationCenter.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.updateNotificationCenterUI();
        }
    }

    /**
     * Format time for display
     */
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    /**
     * Get all active reminders
     */
    getActiveReminders() {
        return this.reminders.filter(r => r.is_active);
    }

    /**
     * Get reminders for specific item
     */
    getItemReminders(itemId) {
        return this.reminders.filter(r => r.item_id === itemId);
    }

    /**
     * Get reminder statistics
     */
    getStatistics() {
        const active = this.reminders.filter(r => r.is_active).length;
        const sent = this.reminders.filter(r => r.is_sent).length;
        const pending = this.reminders.filter(r => r.is_active && !r.is_sent).length;
        
        return {
            total: this.reminders.length,
            active,
            sent,
            pending,
            unread_notifications: this.notificationCenter.filter(n => !n.read).length
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReminderSystem;
}