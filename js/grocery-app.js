// js/grocery-app.js
class GroceryAPI {
    constructor(baseURL = 'api/') {
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        const url = this.baseURL + endpoint;
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Get all items
    async getItems(filters = {}) {
        let endpoint = 'read.php';
        const params = new URLSearchParams();
        
        if (filters.search) params.append('search', filters.search);
        if (filters.category) params.append('category', filters.category);
        if (filters.priority) params.append('priority', filters.priority);
        
        if (params.toString()) {
            endpoint += '?' + params.toString();
        }
        
        return this.request(endpoint);
    }

    // Get single item
    async getItem(id) {
        return this.request(`read_single.php?id=${id}`);
    }

    // Create new item
    async createItem(itemData) {
        return this.request('create.php', {
            method: 'POST',
            body: JSON.stringify(itemData)
        });
    }

    // Update item
    async updateItem(itemData) {
        return this.request('update.php', {
            method: 'PUT',
            body: JSON.stringify(itemData)
        });
    }

    // Toggle completion status
    async toggleComplete(id) {
        return this.request('toggle_complete.php', {
            method: 'PUT',
            body: JSON.stringify({ id })
        });
    }

    // Delete item
    async deleteItem(id) {
        return this.request('delete.php', {
            method: 'DELETE',
            body: JSON.stringify({ id })
        });
    }

    // Get statistics
    async getStats() {
        return this.request('stats.php');
    }

    // Clear completed items
    async clearCompleted() {
        return this.request('clear_completed.php', {
            method: 'DELETE'
        });
    }

    // Get shopping list by category
    async getShoppingListByCategory() {
        return this.request('shopping_list.php?action=by_category');
    }

    // Get shopping summary
    async getShoppingSummary() {
        return this.request('shopping_list.php?action=summary');
    }

    // Batch operations
    async batchOperation(action, data) {
        return this.request('batch_operations.php', {
            method: 'POST',
            body: JSON.stringify({ action, ...data })
        });
    }
}

class GroceryApp {
    constructor() {
        this.api = new GroceryAPI();
        this.items = [];
        this.currentView = 'list';
        this.filters = {
            search: '',
            category: '',
            priority: ''
        };
        this.selectedItems = new Set();
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadItems();
        await this.updateStats();
        this.checkReminders();
        
        // Set up periodic refresh
        setInterval(() => this.checkReminders(), 30000);
        setInterval(() => this.updateStats(), 60000);
    }

    setupEventListeners() {
        // Add item form
        document.getElementById('addItemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addItem();
        });

        // Search and filters
        document.getElementById('searchItems').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.debounceLoadItems();
        });

        document.getElementById('filterCategory').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.loadItems();
        });

        document.getElementById('filterPriority').addEventListener('change', (e) => {
            this.filters.priority = e.target.value;
            this.loadItems();
        });

        // Modal events
        document.getElementById('shoppingModeModal').addEventListener('show.bs.modal', () => {
            this.loadShoppingMode();
        });

        document.getElementById('statsModal').addEventListener('show.bs.modal', () => {
            this.updateStats();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Bulk operations
        document.getElementById('selectAllBtn')?.addEventListener('click', () => {
            this.selectAllItems();
        });

        document.getElementById('bulkCompleteBtn')?.addEventListener('click', () => {
            this.bulkMarkComplete();
        });

        document.getElementById('bulkDeleteBtn')?.addEventListener('click', () => {
            this.bulkDelete();
        });
    }

    debounceLoadItems = this.debounce(() => this.loadItems(), 300);

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async addItem() {
        const formData = this.getFormData();
        
        try {
            const response = await this.api.createItem(formData);
            
            if (response.success) {
                this.showToast('Item added successfully!', 'success');
                this.resetForm();
                await this.loadItems();
                await this.updateStats();
            }
        } catch (error) {
            this.showToast('Error adding item: ' + error.message, 'error');
        }
    }

    getFormData() {
        return {
            name: document.getElementById('itemName').value.trim(),
            quantity: parseInt(document.getElementById('quantity').value),
            category: document.getElementById('category').value,
            priority: document.getElementById('priority').value,
            estimated_price: parseFloat(document.getElementById('estimatedPrice').value) || 0,
            notes: document.getElementById('notes')?.value || ''
        };
    }

    resetForm() {
        document.getElementById('addItemForm').reset();
        document.getElementById('quantity').value = 1;
        document.getElementById('priority').value = 'medium';
    }

    async loadItems() {
        try {
            this.showLoading(true);
            const response = await this.api.getItems(this.filters);
            
            if (response.records) {
                this.items = response.records;
                this.renderItems();
            } else {
                this.items = [];
                this.renderEmptyState();
            }
        } catch (error) {
            this.showToast('Error loading items: ' + error.message, 'error');
            this.renderEmptyState();
        } finally {
            this.showLoading(false);
        }
    }

    renderItems() {
        const container = document.getElementById('itemsList');
        
        if (this.items.length === 0) {
            this.renderEmptyState();
            return;
        }

        if (this.currentView === 'list') {
            container.innerHTML = this.items.map(item => this.createItemCard(item)).join('');
        } else {
            container.innerHTML = `
                <div class="row g-3">
                    ${this.items.map(item => `<div class="col-md-6 col-lg-4">${this.createItemCard(item)}</div>`).join('')}
                </div>
            `;
        }
    }

    createItemCard(item) {
        const categoryClass = `category-${item.category}`;
        const priorityClass = `priority-${item.priority}`;
        const completedClass = item.completed ? 'completed' : '';
        const isSelected = this.selectedItems.has(item.id);

        return `
            <div class="item-card card mb-3 fade-in ${priorityClass} ${completedClass}" data-item-id="${item.id}">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-1">
                            <div class="form-check">
                                <input class="form-check-input item-select" type="checkbox" 
                                       value="${item.id}" ${isSelected ? 'checked' : ''}
                                       onchange="groceryApp.toggleItemSelection(${item.id})">
                            </div>
                        </div>
                        <div class="col-md-1">
                            <div class="form-check">
                                <input class="form-check-input completion-checkbox" type="checkbox" 
                                       ${item.completed ? 'checked' : ''} 
                                       onchange="groceryApp.toggleComplete(${item.id})">
                            </div>
                        </div>
                        <div class="col-md-3">
                            <h6 class="item-name mb-1">${this.escapeHtml(item.name)}</h6>
                            <span class="badge category-badge ${categoryClass}">${item.category}</span>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">Qty:</small>
                            <span class="fw-bold">${item.quantity}</span>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">Priority:</small>
                            <div class="priority-indicator priority-${item.priority}">
                                ${item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                            </div>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">Est. Price:</small>
                            <div class="fw-bold text-success">$${parseFloat(item.estimated_price).toFixed(2)}</div>
                        </div>
                        <div class="col-md-1">
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-secondary" type="button" 
                                        data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#" onclick="groceryApp.editItem(${item.id})">
                                        <i class="fas fa-edit me-2"></i>Edit
                                    </a></li>
                                    <li><a class="dropdown-item" href="#" onclick="groceryApp.duplicateItem(${item.id})">
                                        <i class="fas fa-copy me-2"></i>Duplicate
                                    </a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="groceryApp.deleteItem(${item.id})">
                                        <i class="fas fa-trash me-2"></i>Delete
                                    </a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    ${item.notes ? `<div class="mt-2"><small class="text-muted">${this.escapeHtml(item.notes)}</small></div>` : ''}
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        const container = document.getElementById('itemsList');
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No items found</h5>
                <p class="text-muted">Add some items to your grocery list!</p>
            </div>
        `;
    }

    async toggleComplete(id) {
        try {
            const response = await this.api.toggleComplete(id);
            
            if (response.success) {
                const item = this.items.find(item => item.id === id);
                if (item) {
                    item.completed = !item.completed;
                    this.renderItems();
                    await this.updateStats();
                    
                    if (item.completed) {
                        this.showToast(`${item.name} marked as completed!`, 'success');
                    }
                }
            }
        } catch (error) {
            this.showToast('Error updating item: ' + error.message, 'error');
        }
    }

    async editItem(id) {
        try {
            const response = await this.api.getItem(id);
            const item = response;
            
            if (item) {
                // Populate edit form
                document.getElementById('editItemId').value = item.id;
                document.getElementById('editItemName').value = item.name;
                document.getElementById('editQuantity').value = item.quantity;
                document.getElementById('editCategory').value = item.category;
                document.getElementById('editPriority').value = item.priority;
                document.getElementById('editEstimatedPrice').value = item.estimated_price;
                document.getElementById('editNotes').value = item.notes || '';
                
                // Show modal
                new bootstrap.Modal(document.getElementById('editModal')).show();
            }
        } catch (error) {
            this.showToast('Error loading item: ' + error.message, 'error');
        }
    }

    async updateItem() {
        const itemData = {
            id: parseInt(document.getElementById('editItemId').value),
            name: document.getElementById('editItemName').value.trim(),
            quantity: parseInt(document.getElementById('editQuantity').value),
            category: document.getElementById('editCategory').value,
            priority: document.getElementById('editPriority').value,
            estimated_price: parseFloat(document.getElementById('editEstimatedPrice').value) || 0,
            notes: document.getElementById('editNotes')?.value || ''
        };

        try {
            const response = await this.api.updateItem(itemData);
            
            if (response.success) {
                bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
                this.showToast('Item updated successfully!', 'success');
                await this.loadItems();
                await this.updateStats();
            }
        } catch (error) {
            this.showToast('Error updating item: ' + error.message, 'error');
        }
    }

    async deleteItem(id) {
        const item = this.items.find(item => item.id === id);
        if (!item) return;

        if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
            try {
                const response = await this.api.deleteItem(id);
                
                if (response.success) {
                    this.showToast('Item deleted successfully!', 'success');
                    await this.loadItems();
                    await this.updateStats();
                }
            } catch (error) {
                this.showToast('Error deleting item: ' + error.message, 'error');
            }
        }
    }

    async duplicateItem(id) {
        try {
            const response = await this.api.batchOperation('duplicate_item', { id });
            
            if (response.success) {
                this.showToast('Item duplicated successfully!', 'success');
                await this.loadItems();
                await this.updateStats();
            }
        } catch (error) {
            this.showToast('Error duplicating item: ' + error.message, 'error');
        }
    }

    async clearCompleted() {
        const completedCount = this.items.filter(item => item.completed).length;
        
        if (completedCount === 0) {
            this.showToast('No completed items to clear!', 'info');
            return;
        }

        if (confirm(`Are you sure you want to delete ${completedCount} completed item(s)?`)) {
            try {
                const response = await this.api.clearCompleted();
                
                if (response.success) {
                    this.showToast(`${completedCount} completed items cleared!`, 'success');
                    await this.loadItems();
                    await this.updateStats();
                }
            } catch (error) {
                this.showToast('Error clearing items: ' + error.message, 'error');
            }
        }
    }

    toggleView() {
        this.currentView = this.currentView === 'list' ? 'grid' : 'list';
        const icon = document.getElementById('viewToggleIcon');
        icon.className = this.currentView === 'list' ? 'fas fa-th-list' : 'fas fa-th';
        this.renderItems();
    }

    async updateStats() {
        try {
            const response = await this.api.getStats();
            
            if (response.success && response.data) {
                const stats = response.data;
                document.getElementById('totalItems').textContent = stats.total_items || 0;
                document.getElementById('completedItems').textContent = stats.completed_items || 0;
                document.getElementById('pendingItems').textContent = stats.pending_items || 0;
                document.getElementById('totalEstimated').textContent = `${parseFloat(stats.total_estimated || 0).toFixed(2)}`;
            }
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    checkReminders() {
        const highPriorityIncomplete = this.items.filter(item => 
            item.priority === 'high' && !item.completed
        );

        if (highPriorityIncomplete.length > 0) {
            const reminderText = `You have ${highPriorityIncomplete.length} high priority item(s) pending: ${highPriorityIncomplete.map(item => item.name).join(', ')}`;
            this.showReminder(reminderText);
        }
    }

    showReminder(text) {
        const alert = document.getElementById('reminderAlert');
        const reminderText = document.getElementById('reminderText');
        reminderText.textContent = text;
        alert.classList.remove('d-none');
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            alert.classList.add('d-none');
        }, 10000);
    }

    async loadShoppingMode() {
        try {
            const response = await this.api.getShoppingListByCategory();
            const container = document.getElementById('shoppingModeList');
            
            if (response.success && response.data.length > 0) {
                container.innerHTML = response.data.map(category => `
                    <div class="mb-4">
                        <h6 class="text-uppercase fw-bold text-muted mb-3">
                            <i class="fas fa-tag me-2"></i>${category.category}
                            <span class="badge bg-secondary ms-2">${category.item_count} items</span>
                            <span class="badge bg-success ms-1">${parseFloat(category.category_total).toFixed(2)}</span>
                        </h6>
                        <div class="alert alert-light">
                            ${category.items}
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                        <h5>All items completed!</h5>
                        <p class="text-muted">Great job finishing your shopping list!</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading shopping mode:', error);
        }
    }

    // Bulk operations
    toggleItemSelection(id) {
        if (this.selectedItems.has(id)) {
            this.selectedItems.delete(id);
        } else {
            this.selectedItems.add(id);
        }
        this.updateBulkControls();
    }

    selectAllItems() {
        const checkboxes = document.querySelectorAll('.item-select');
        const allSelected = this.selectedItems.size === this.items.length;
        
        if (allSelected) {
            this.selectedItems.clear();
            checkboxes.forEach(cb => cb.checked = false);
        } else {
            this.items.forEach(item => this.selectedItems.add(item.id));
            checkboxes.forEach(cb => cb.checked = true);
        }
        
        this.updateBulkControls();
    }

    updateBulkControls() {
        const selectedCount = this.selectedItems.size;
        const bulkControls = document.getElementById('bulkControls');
        
        if (selectedCount > 0) {
            if (!bulkControls) {
                this.createBulkControls();
            }
            document.getElementById('selectedCount').textContent = selectedCount;
        } else {
            bulkControls?.remove();
        }
    }

    createBulkControls() {
        const container = document.querySelector('.container');
        const bulkControls = document.createElement('div');
        bulkControls.id = 'bulkControls';
        bulkControls.className = 'alert alert-info d-flex justify-content-between align-items-center';
        bulkControls.innerHTML = `
            <span><span id="selectedCount">0</span> items selected</span>
            <div>
                <button class="btn btn-sm btn-success me-2" onclick="groceryApp.bulkMarkComplete()">
                    <i class="fas fa-check me-1"></i>Mark Complete
                </button>
                <button class="btn btn-sm btn-danger me-2" onclick="groceryApp.bulkDelete()">
                    <i class="fas fa-trash me-1"></i>Delete
                </button>
                <button class="btn btn-sm btn-secondary" onclick="groceryApp.clearSelection()">
                    <i class="fas fa-times me-1"></i>Clear Selection
                </button>
            </div>
        `;
        
        const itemsList = document.getElementById('itemsList').parentNode.parentNode;
        itemsList.parentNode.insertBefore(bulkControls, itemsList);
    }

    clearSelection() {
        this.selectedItems.clear();
        document.querySelectorAll('.item-select').forEach(cb => cb.checked = false);
        document.getElementById('bulkControls')?.remove();
    }

    async bulkMarkComplete() {
        if (this.selectedItems.size === 0) return;
        
        try {
            const response = await this.api.batchOperation('mark_multiple_complete', {
                ids: Array.from(this.selectedItems)
            });
            
            if (response.success) {
                this.showToast(response.message, 'success');
                this.clearSelection();
                await this.loadItems();
                await this.updateStats();
            }
        } catch (error) {
            this.showToast('Error updating items: ' + error.message, 'error');
        }
    }

    async bulkDelete() {
        if (this.selectedItems.size === 0) return;
        
        if (confirm(`Are you sure you want to delete ${this.selectedItems.size} selected item(s)?`)) {
            try {
                const response = await this.api.batchOperation('delete_multiple', {
                    ids: Array.from(this.selectedItems)
                });
                
                if (response.success) {
                    this.showToast(response.message, 'success');
                    this.clearSelection();
                    await this.loadItems();
                    await this.updateStats();
                }
            } catch (error) {
                this.showToast('Error deleting items: ' + error.message, 'error');
            }
        }
    }

    // Utility functions
    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (show) {
            if (!loadingIndicator) {
                const indicator = document.createElement('div');
                indicator.id = 'loadingIndicator';
                indicator.className = 'text-center py-3';
                indicator.innerHTML = '<div class="loading"></div> Loading...';
                document.getElementById('itemsList').appendChild(indicator);
            }
        } else {
            loadingIndicator?.remove();
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer') || this.createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${this.escapeHtml(message)}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '1050';
        document.body.appendChild(container);
        return container;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + N to focus on new item input
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            document.getElementById('itemName').focus();
        }
        
        // Ctrl/Cmd + F to focus on search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            document.getElementById('searchItems').focus();
        }
        
        // Escape to clear search
        if (e.key === 'Escape') {
            document.getElementById('searchItems').value = '';
            this.filters.search = '';
            this.loadItems();
        }
        
        // Ctrl/Cmd + A to select all items
        if ((e.ctrlKey || e.metaKey) && e.key === 'a' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            this.selectAllItems();
        }
    }

    // Export/Import functionality
    async exportData() {
        try {
            const response = await this.api.getItems();
            const data = {
                items: response.records || [],
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `grocery-list-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('Grocery list exported successfully!', 'success');
        } catch (error) {
            this.showToast('Error exporting data: ' + error.message, 'error');
        }
    }

    async importData(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.items && Array.isArray(data.items)) {
                    if (confirm('This will add items to your current grocery list. Continue?')) {
                        let successCount = 0;
                        for (const item of data.items) {
                            try {
                                delete item.id; // Let the server assign new IDs
                                await this.api.createItem(item);
                                successCount++;
                            } catch (error) {
                                console.error('Error importing item:', error);
                            }
                        }
                        
                        this.showToast(`Successfully imported ${successCount} items!`, 'success');
                        await this.loadItems();
                        await this.updateStats();
                    }
                } else {
                    throw new Error('Invalid file format');
                }
            } catch (error) {
                this.showToast('Error importing file: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    // Print functionality
    printShoppingList() {
        const printWindow = window.open('', '_blank');
        const incompleteItems = this.items.filter(item => !item.completed);
        
        // Group by category
        const grouped = incompleteItems.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {});
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Shopping List</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #333; border-bottom: 2px solid #333; }
                    h2 { color: #666; margin-top: 30px; }
                    .item { margin: 10px 0; padding: 5px; border-bottom: 1px solid #eee; }
                    .priority-high { border-left: 3px solid #dc3545; padding-left: 10px; }
                    .priority-medium { border-left: 3px solid #ffc107; padding-left: 10px; }
                    .priority-low { border-left: 3px solid #28a745; padding-left: 10px; }
                    .total { font-weight: bold; margin-top: 20px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <h1>Shopping List</h1>
                <p>Generated on: ${new Date().toLocaleDateString()}</p>
                
                ${Object.entries(grouped).map(([category, items]) => `
                    <h2>${category.charAt(0).toUpperCase() + category.slice(1)}</h2>
                    ${items.map(item => `
                        <div class="item priority-${item.priority}">
                            <strong>${item.name}</strong> (${item.quantity})
                            ${item.estimated_price > 0 ? ` - ${item.estimated_price.toFixed(2)}` : ''}
                            ${item.notes ? `<br><small>${item.notes}</small>` : ''}
                        </div>
                    `).join('')}
                `).join('')}
                
                <div class="total">
                    Total Items: ${incompleteItems.length}<br>
                    Estimated Total: ${incompleteItems.reduce((sum, item) => sum + parseFloat(item.estimated_price), 0).toFixed(2)}
                </div>
                
                <button class="no-print" onclick="window.print()">Print</button>
                <button class="no-print" onclick="window.close()">Close</button>
            </body>
            </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
    }
}

// Voice input functionality
class VoiceInput {
    constructor(app) {
        this.app = app;
        this.recognition = null;
        this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        
        if (this.isSupported) {
            this.setupRecognition();
        }
    }

    setupRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim();
            document.getElementById('itemName').value = transcript;
            this.app.showToast('Voice input captured: ' + transcript, 'success');
        };
        
        this.recognition.onerror = (event) => {
            this.app.showToast('Voice recognition error: ' + event.error, 'error');
        };
        
        this.recognition.onend = () => {
            this.updateVoiceButton(false);
        };
    }

    start() {
        if (!this.isSupported) {
            this.app.showToast('Voice recognition not supported in this browser.', 'error');
            return;
        }
        
        this.recognition.start();
        this.updateVoiceButton(true);
        this.app.showToast('Listening... Speak now!', 'info');
    }

    updateVoiceButton(listening) {
        const button = document.getElementById('voiceInputBtn');
        if (button) {
            button.innerHTML = listening ? 
                '<i class="fas fa-microphone-slash"></i>' : 
                '<i class="fas fa-microphone"></i>';
            button.disabled = listening;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the main app
    window.groceryApp = new GroceryApp();
    
    // Initialize voice input
    window.voiceInput = new VoiceInput(window.groceryApp);
    
    // Add voice input button if supported
    if (window.voiceInput.isSupported) {
        const itemNameGroup = document.getElementById('itemName').parentNode;
        if (!itemNameGroup.classList.contains('input-group')) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group';
            const itemName = document.getElementById('itemName');
            itemNameGroup.insertBefore(inputGroup, itemName);
            inputGroup.appendChild(itemName);
            inputGroup.insertAdjacentHTML('beforeend', `
                <button class="btn btn-outline-secondary" type="button" id="voiceInputBtn" 
                        onclick="window.voiceInput.start()" title="Voice Input">
                    <i class="fas fa-microphone"></i>
                </button>
            `);
        }
    }
    
    // Add export/import functionality to navbar
    const navbar = document.querySelector('.navbar-nav');
    navbar.insertAdjacentHTML('beforeend', `
        <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                <i class="fas fa-cog me-1"></i>Options
            </a>
            <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="#" onclick="window.groceryApp.exportData()">
                    <i class="fas fa-download me-2"></i>Export List
                </a></li>
                <li><a class="dropdown-item" href="#" onclick="document.getElementById('importFile').click()">
                    <i class="fas fa-upload me-2"></i>Import List
                </a></li>
                <li><a class="dropdown-item" href="#" onclick="window.groceryApp.printShoppingList()">
                    <i class="fas fa-print me-2"></i>Print List
                </a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" onclick="clearAllData()">
                    <i class="fas fa-trash me-2"></i>Clear All Data
                </a></li>
            </ul>
        </li>
    `);
    
    // Add hidden file input for import
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'importFile';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            window.groceryApp.importData(file);
        }
    });
    document.body.appendChild(fileInput);
});

// Global functions for onclick handlers
function toggleView() {
    window.groceryApp.toggleView();
}

function clearCompleted() {
    window.groceryApp.clearCompleted();
}

function updateItem() {
    window.groceryApp.updateItem();
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        // This would need to be implemented in the PHP API
        window.groceryApp.showToast('Clear all data feature needs to be implemented in the backend.', 'info');
    }
}