// warnings.js - Warning management functionality with Firebase
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
        
        // Load warnings when data is available
        dataManager.addListener(() => this.loadWarnings());
        this.loadWarnings();
        this.setDefaultDate();
    }

    async handleWarningSubmit(e) {
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
            await dataManager.addWarning(warningData);
            this.warningForm.reset();
            this.setDefaultDate();
            
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

    async handleClearWarnings() {
        if (confirm('Are you sure you want to clear all warning records? This action cannot be undone.')) {
            try {
                await dataManager.clearWarnings();
                this.showMessage('All warning records cleared', 'success');
            } catch (error) {
                console.error('Error clearing warnings:', error);
                this.showMessage('Failed to clear warning records', 'error');
            }
        }
    }

    loadWarnings() {
        const warnings = dataManager.getWarnings();
        this.renderWarningsList(warnings);
    }

    renderWarningsList(warnings) {
        if (warnings.length === 0) {
            this.warningsList.innerHTML = '<div class="empty-state">No warnings recorded yet</div>';
            return;
        }

        this.warningsList.innerHTML = warnings.map(warning => `
            <div class="record-item warning">
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
}

// Initialize warnings manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WarningsManager();
});
