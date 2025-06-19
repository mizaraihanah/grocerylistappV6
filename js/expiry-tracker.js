// js/expiry-tracker.js
// Component reused and adapted from spoiltracker repository
// Original: https://github.com/psibir/spoiltracker
// Adaptation: Modified from Python to JavaScript for web integration

/**
 * ExpiryTracker Component
 * 
 * REUSE METHODOLOGY (X-Model Development with Reuse):
 * - Source: spoiltracker Python package by psibir
 * - Adaptation Technique: Gray Box Reuse with Language Translation
 * - Original Methods Adapted:
 *   1. calculate_expiration_date() -> calculateExpirationDate()
 *   2. generate_expiry_report() -> generateExpiryReport() 
 *   3. append_to_expiry_report() -> appendToExpiryReport()
 *   4. clear_expired_entries() -> clearExpiredEntries()
 */

class ExpiryTracker {
    constructor() {
        // Default shelf life data (adapted from spoiltracker's shelflife.csv concept)
        this.shelfLifeData = {
            // Fruits (days)
            'apples': 7,
            'bananas': 5,
            'oranges': 14,
            'strawberries': 3,
            'grapes': 7,
            'lemons': 21,
            
            // Vegetables (days)  
            'lettuce': 7,
            'tomatoes': 7,
            'carrots': 21,
            'potatoes': 30,
            'onions': 30,
            'broccoli': 5,
            
            // Dairy (days)
            'milk': 7,
            'cheese': 14,
            'yogurt': 10,
            'butter': 30,
            'eggs': 21,
            
            // Meat (days)
            'chicken': 3,
            'beef': 5,
            'pork': 3,
            'fish': 2,
            'ground_meat': 2,
            
            // Pantry (days)
            'bread': 7,
            'rice': 365,
            'pasta': 730,
            'canned_goods': 365,
            'flour': 180
        };
        
        this.expiryThreshold = 3; // Default threshold from spoiltracker
    }

    /**
     * Calculate expiration date based on production date and shelf life
     * Adapted from spoiltracker's calculate_expiration_date method
     * 
     * @param {Date} productionDate - When the item was purchased/produced
     * @param {number} shelfLife - Shelf life in days
     * @returns {Date} - Calculated expiration date
     */
    calculateExpirationDate(productionDate, shelfLife) {
        const expirationDate = new Date(productionDate);
        expirationDate.setDate(expirationDate.getDate() + shelfLife);
        return expirationDate;
    }

    /**
     * Get shelf life for a grocery item
     * Adapted from spoiltracker's load_shelf_life_data concept
     * 
     * @param {string} itemName - Name of the grocery item
     * @param {string} category - Category of the item
     * @returns {number} - Shelf life in days
     */
    getShelfLife(itemName, category) {
        const normalizedName = itemName.toLowerCase().replace(/\s+/g, '_');
        
        // Try exact match first
        if (this.shelfLifeData[normalizedName]) {
            return this.shelfLifeData[normalizedName];
        }
        
        // Try partial match
        for (const [key, value] of Object.entries(this.shelfLifeData)) {
            if (normalizedName.includes(key) || key.includes(normalizedName)) {
                return value;
            }
        }
        
        // Default shelf life by category (adapted from spoiltracker's categorization)
        const categoryDefaults = {
            'fruits': 7,
            'vegetables': 7, 
            'dairy': 7,
            'meat': 3,
            'pantry': 30,
            'beverages': 7,
            'snacks': 30,
            'frozen': 90,
            'household': 365
        };
        
        return categoryDefaults[category] || 7; // Default 7 days
    }

    /**
     * Add expiry tracking to grocery item
     * New method combining spoiltracker logic with grocery app data structure
     * 
     * @param {Object} item - Grocery item object
     * @returns {Object} - Item with expiry information added
     */
    addExpiryTracking(item) {
        const purchaseDate = item.date_added ? new Date(item.date_added) : new Date();
        const shelfLife = item.shelf_life || this.getShelfLife(item.name, item.category);
        const expirationDate = this.calculateExpirationDate(purchaseDate, shelfLife);
        
        return {
            ...item,
            shelf_life: shelfLife,
            expiration_date: expirationDate,
            days_until_expiry: this.calculateDaysUntilExpiry(expirationDate),
            is_expired: this.isExpired(expirationDate),
            is_expiring_soon: this.isExpiringSoon(expirationDate, this.expiryThreshold)
        };
    }

    /**
     * Calculate days until expiry
     * Helper method adapted from spoiltracker's date calculation logic
     * 
     * @param {Date} expirationDate - The expiration date
     * @returns {number} - Days until expiry (negative if expired)
     */
    calculateDaysUntilExpiry(expirationDate) {
        const today = new Date();
        const timeDiff = expirationDate.getTime() - today.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    /**
     * Check if item is expired
     * Adapted from spoiltracker's expired entry detection
     * 
     * @param {Date} expirationDate - The expiration date
     * @returns {boolean} - True if expired
     */
    isExpired(expirationDate) {
        return new Date() > expirationDate;
    }

    /**
     * Check if item is expiring soon
     * Adapted from spoiltracker's threshold checking logic
     * 
     * @param {Date} expirationDate - The expiration date  
     * @param {number} threshold - Days threshold for "expiring soon"
     * @returns {boolean} - True if expiring within threshold
     */
    isExpiringSoon(expirationDate, threshold = this.expiryThreshold) {
        const daysUntilExpiry = this.calculateDaysUntilExpiry(expirationDate);
        return daysUntilExpiry <= threshold && daysUntilExpiry > 0;
    }

    /**
     * Generate expiry report for grocery items
     * Adapted from spoiltracker's generate_expiry_report method
     * 
     * @param {Array} items - Array of grocery items
     * @param {number} days - Days threshold for report
     * @returns {Object} - Expiry report object
     */
    generateExpiryReport(items, days = this.expiryThreshold) {
        const itemsWithExpiry = items.map(item => this.addExpiryTracking(item));
        
        // Filter items based on expiry status
        const expired = itemsWithExpiry.filter(item => item.is_expired);
        const expiringSoon = itemsWithExpiry.filter(item => 
            item.is_expiring_soon && item.days_until_expiry <= days
        );
        const fresh = itemsWithExpiry.filter(item => 
            !item.is_expired && !item.is_expiring_soon
        );

        // Sort by days until expiry (adapted from spoiltracker's sort_expiry_report)
        expired.sort((a, b) => b.days_until_expiry - a.days_until_expiry);
        expiringSoon.sort((a, b) => a.days_until_expiry - b.days_until_expiry);

        return {
            expired: expired,
            expiring_soon: expiringSoon,
            fresh: fresh,
            total_items: itemsWithExpiry.length,
            expired_count: expired.length,
            expiring_soon_count: expiringSoon.length,
            fresh_count: fresh.length,
            report_date: new Date(),
            threshold_days: days
        };
    }

    /**
     * Clear expired entries from item list
     * Adapted from spoiltracker's clear_expired_entries method
     * 
     * @param {Array} items - Array of grocery items
     * @returns {Object} - Result with cleaned items and removal count
     */
    clearExpiredEntries(items) {
        const itemsWithExpiry = items.map(item => this.addExpiryTracking(item));
        const nonExpired = itemsWithExpiry.filter(item => !item.is_expired);
        const expiredCount = itemsWithExpiry.length - nonExpired.length;
        
        return {
            items: nonExpired,
            expired_removed: expiredCount,
            message: `Removed ${expiredCount} expired item(s)`
        };
    }

    /**
     * Get expiry status for display
     * New method for UI integration
     * 
     * @param {Object} item - Grocery item with expiry data
     * @returns {Object} - Status object for UI display
     */
    getExpiryStatus(item) {
        const itemWithExpiry = this.addExpiryTracking(item);
        
        let status = 'fresh';
        let badgeClass = 'bg-success';
        let message = `${itemWithExpiry.days_until_expiry} days left`;
        
        if (itemWithExpiry.is_expired) {
            status = 'expired';
            badgeClass = 'bg-danger';
            message = `Expired ${Math.abs(itemWithExpiry.days_until_expiry)} days ago`;
        } else if (itemWithExpiry.is_expiring_soon) {
            status = 'expiring_soon';
            badgeClass = 'bg-warning';
            message = `Expires in ${itemWithExpiry.days_until_expiry} day(s)`;
        }
        
        return {
            status: status,
            badgeClass: badgeClass,
            message: message,
            daysUntilExpiry: itemWithExpiry.days_until_expiry,
            expirationDate: itemWithExpiry.expiration_date
        };
    }

    /**
     * Update shelf life data
     * Adapted from spoiltracker's customizable shelf life concept
     * 
     * @param {Object} newShelfLifeData - New shelf life mappings
     */
    updateShelfLifeData(newShelfLifeData) {
        this.shelfLifeData = { ...this.shelfLifeData, ...newShelfLifeData };
    }

    /**
     * Set expiry threshold
     * Adapted from spoiltracker's configurable days threshold
     * 
     * @param {number} days - New threshold in days
     */
    setExpiryThreshold(days) {
        this.expiryThreshold = days;
    }

    /**
     * Export expiry report to CSV format
     * Adapted from spoiltracker's report generation functionality
     * 
     * @param {Object} report - Expiry report object
     * @returns {string} - CSV formatted string
     */
    exportReportToCSV(report) {
        const headers = ['Name', 'Category', 'Purchase Date', 'Expiration Date', 'Days Until Expiry', 'Status'];
        let csv = headers.join(',') + '\n';
        
        const allItems = [...report.expired, ...report.expiring_soon, ...report.fresh];
        
        allItems.forEach(item => {
            const row = [
                `"${item.name}"`,
                item.category,
                item.date_added ? new Date(item.date_added).toLocaleDateString() : '',
                item.expiration_date.toLocaleDateString(),
                item.days_until_expiry,
                item.is_expired ? 'Expired' : item.is_expiring_soon ? 'Expiring Soon' : 'Fresh'
            ];
            csv += row.join(',') + '\n';
        });
        
        return csv;
    }
}

// Integration with main Grocery App
// This shows how the reused component integrates with the existing system

class ExpiryIntegration {
    constructor(groceryApp) {
        this.groceryApp = groceryApp;
        this.expiryTracker = new ExpiryTracker();
    }

    /**
     * Add expiry tracking to existing grocery app
     * Integration method following X-Model component assembly
     */
    enhanceGroceryItems() {
        // Enhance existing items with expiry data
        this.groceryApp.items = this.groceryApp.items.map(item => 
            this.expiryTracker.addExpiryTracking(item)
        );
        
        // Re-render with expiry information
        this.groceryApp.renderItems();
    }

    /**
     * Generate and display expiry report
     * Integration with grocery app's modal system
     */
    showExpiryReport(days = 3) {
        const report = this.expiryTracker.generateExpiryReport(this.groceryApp.items, days);
        this.displayExpiryModal(report);
    }

    /**
     * Display expiry report in modal
     * UI integration method
     */
    displayExpiryModal(report) {
        const modalContent = `
            <div class="expiry-report">
                <div class="row mb-3">
                    <div class="col-md-3">
                        <div class="card text-center border-danger">
                            <div class="card-body">
                                <h3 class="text-danger">${report.expired_count}</h3>
                                <small>Expired Items</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center border-warning">
                            <div class="card-body">
                                <h3 class="text-warning">${report.expiring_soon_count}</h3>
                                <small>Expiring Soon</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center border-success">
                            <div class="card-body">
                                <h3 class="text-success">${report.fresh_count}</h3>
                                <small>Fresh Items</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center border-info">
                            <div class="card-body">
                                <h3 class="text-info">${report.total_items}</h3>
                                <small>Total Items</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${report.expired_count > 0 ? this.renderExpirySection('Expired Items', report.expired, 'danger') : ''}
                ${report.expiring_soon_count > 0 ? this.renderExpirySection('Expiring Soon', report.expiring_soon, 'warning') : ''}
            </div>
        `;

        // Show in existing modal or create new one
        this.showModal('Expiry Report', modalContent);
    }

    /**
     * Render expiry section
     * Helper method for modal content
     */
    renderExpirySection(title, items, alertClass) {
        return `
            <div class="mb-4">
                <h5 class="text-${alertClass}">${title}</h5>
                <div class="list-group">
                    ${items.map(item => `
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${item.name}</strong>
                                <br>
                                <small class="text-muted">${item.category} • Expires: ${item.expiration_date.toLocaleDateString()}</small>
                            </div>
                            <span class="badge bg-${alertClass}">${Math.abs(item.days_until_expiry)} days</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Show modal helper
     */
    showModal(title, content) {
        // Create or update existing expiry modal
        let modal = document.getElementById('expiryModal');
        if (!modal) {
            modal = this.createExpiryModal();
        }
        
        modal.querySelector('.modal-title').textContent = title;
        modal.querySelector('.modal-body').innerHTML = content;
        
        new bootstrap.Modal(modal).show();
    }

    /**
     * Create expiry modal
     */
    createExpiryModal() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'expiryModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title"></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body"></div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-danger" onclick="expiryIntegration.clearExpiredItems()">
                            Clear Expired Items
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Clear expired items integration
     */
    async clearExpiredItems() {
        const result = this.expiryTracker.clearExpiredEntries(this.groceryApp.items);
        
        if (result.expired_removed > 0) {
            // Update grocery app items
            this.groceryApp.items = result.items;
            
            // Update in backend if using API
            for (const item of this.groceryApp.items.filter(item => 
                this.expiryTracker.isExpired(new Date(item.expiration_date))
            )) {
                try {
                    await this.groceryApp.api.deleteItem(item.id);
                } catch (error) {
                    console.error('Error deleting expired item:', error);
                }
            }
            
            // Refresh display
            this.groceryApp.loadItems();
            this.groceryApp.showToast(result.message, 'success');
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('expiryModal')).hide();
        } else {
            this.groceryApp.showToast('No expired items to remove', 'info');
        }
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExpiryTracker, ExpiryIntegration };
}