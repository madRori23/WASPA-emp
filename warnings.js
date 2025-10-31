// warnings.js - Warning management functionality (localStorage only)
class WarningsManager {
    constructor() {
        this.warningForm = document.getElementById('warningForm');
        this.warningsList = document.getElementById('warningsList');
        this.clearWarningsBtn = document.getElementById('clearWarnings');
        
        this.init();
    }

    init() {
        this.warningForm.addEventListener('submit', (e) => this.handleWarningSubmit(e));
        this.clearWarningsBtn.addEventListener('click', () => this.handleClearWarnings());
        
        this.loadWarnings();
        this.setDefaultDate();
    }

    handleWarningSubmit(e) {
        e.preventDefault();
        
        const warningData = {
            date: document.getElementById('warningDate').value,
            type: document.getElementById('warningType').value,
            recipient: document.getElementById('warningRecipient').value,
            reference: document.getElementById('warningReference').value,
            details: document.getElementById('warningDetails').value,
            problemAreas: document.getElementById('problemAreas').value
        };

        // Validate form
        if (!this.validateWarningForm(warningData)) {
            return;
        }

        try {
            const warning = dataManager.addWarning(warningData);
            this.addWarningToList(warning);
            this.warningForm.reset();
            this.setDefaultDate();
            
            // Update stats
            if (typeof dashboardManager !== 'undefined') {
                dashboardManager.updateStats();
            }

            // Show success message
            this.showMessage('Warning record added successfully!', 'success');
        } catch (error) {
            console.error('Error adding warning:', error);
            this.showMessage('Failed to add warning record. Please try again.', 'error');
        }
    }

    validateWarningForm(data) {
        if (!data.date || !data.type || !data.recipient || !data.reference || !data.details || !data.problemAreas) {
            this.showMessage('Please fill in all fields', 'error');
            return false;
        }
        
        // Validate reference format
        if (!data.reference.match(/^WA\d{4,}$/)) {
            this.showMessage('Reference must be in format WAxxxx (e.g., WA1234)', 'error');
            return false;
        }
        
        return true;
    }

    handleClearWarnings() {
        if (confirm('Are you sure you want to clear all warning records? This action cannot be undone.')) {
            try {
                dataManager.clearWarnings();
                this.loadWarnings();
                
                if (typeof dashboardManager !== 'undefined') {
                    dashboardManager.updateStats();
                }
                
                this.showMessage('All warning records cleared', 'success');
            } catch (error) {
                console.error('Error clearing warnings:', error);
                this.showMessage('Failed to clear warning records', 'error');
            }
        }
    }

    loadWarnings() {
        try {
            const warnings = dataManager.getWarnings();
            this.renderWarningsList(warnings);
        } catch (error) {
            console.error('Error loading warnings:', error);
            this.showMessage('Failed to load warning records', 'error');
        }
    }

    renderWarningsList(warnings) {
        if (warnings.length === 0) {
            this.warningsList.innerHTML = '<div class="empty-state">No warnings recorded yet</div>';
            return;
        }

        this.warningsList.innerHTML = warnings.map(warning => `
            <div class="record-item">
                <div class="record-header">
                    <div class="record-title">${warning.reference} - ${this.formatWarningType(warning.type)}</div>
                    <div class="record-date">${this.formatDate(warning.date)}</div>
                </div>
                <div class="record-details">
                    <div class="record-recipient"><strong>To:</strong> ${warning.recipient}</div>
                    <div class="record-description">${warning.details}</div>
                    <div class="record-problem-areas"><strong>Code Violations:</strong> ${warning.problemAreas}</div>
                    <div class="record-meta">
                        <span class="record-by">by ${warning.createdBy}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    addWarningToList(warning) {
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        recordItem.innerHTML = `
            <div class="record-header">
                <div class="record-title">${warning.reference} - ${this.formatWarningType(warning.type)}</div>
                <div class="record-date">${this.formatDate(warning.date)}</div>
            </div>
            <div class="record-details">
                <div class="record-recipient"><strong>To:</strong> ${warning.recipient}</div>
                <div class="record-description">${warning.details}</div>
                <div class="record-problem-areas"><strong>Code Violations:</strong> ${warning.problemAreas}</div>
                <div class="record-meta">
                    <span class="record-by">by ${warning.createdBy}</span>
                </div>
            </div>
        `;
        
        // Remove empty state if it exists
        if (this.warningsList.querySelector('.empty-state')) {
            this.warningsList.innerHTML = '';
        }
        
        // Add new warning to the top of the list
        this.warningsList.insertBefore(recordItem, this.warningsList.firstChild);
    }

    formatWarningType(type) {
        const typeMap = {
            'compliance': 'Compliance Issue',
            'service': 'Service Issue',
            'pricing': 'Pricing Issue',
            'other': 'Other Issue'
        };
        return typeMap[type] || type;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('warningDate').value = today;
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.getElementById('warningMessage');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message element
        const messageEl = document.createElement('div');
        messageEl.id = 'warningMessage';
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        // Insert after the form
        this.warningForm.parentNode.insertBefore(messageEl, this.warningForm.nextSibling);
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 3000);
        }
    }

    // Search and filter functionality
    searchWarnings(query) {
        const warnings = dataManager.getWarnings();
        const filteredWarnings = warnings.filter(warning => 
            warning.reference.toLowerCase().includes(query.toLowerCase()) ||
            warning.recipient.toLowerCase().includes(query.toLowerCase()) ||
            warning.details.toLowerCase().includes(query.toLowerCase()) ||
            warning.problemAreas.toLowerCase().includes(query.toLowerCase())
        );
        
        this.renderWarningsList(filteredWarnings);
    }

    // Get warnings by date range
    getWarningsByDateRange(startDate, endDate) {
        const warnings = dataManager.getWarnings();
        return warnings.filter(warning => {
            const warningDate = new Date(warning.date);
            return warningDate >= new Date(startDate) && warningDate <= new Date(endDate);
        });
    }

    // Get warnings by type
    getWarningsByType(type) {
        const warnings = dataManager.getWarnings();
        return warnings.filter(warning => warning.type === type);
    }

    // Get warnings by recipient
    getWarningsByRecipient(recipient) {
        const warnings = dataManager.getWarnings();
        return warnings.filter(warning => warning.recipient === recipient);
    }
}

// Initialize warnings manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WarningsManager();
});
