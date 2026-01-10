// tests.js - Test management functionality with Firebase
class TestsManager {
    constructor() {
        this.testForm = document.getElementById('testForm');
        this.testsList = document.getElementById('testsList');
        this.clearTestsBtn = document.getElementById('clearTests');
        
        this.init();
    }

    init() {
        this.testForm.addEventListener('submit', (e) => this.handleTestSubmit(e));
        this.clearTestsBtn.addEventListener('click', () => this.handleClearTests());
        
        // Load tests when data is available
        dataManager.addListener(() => this.loadTests());
        this.loadTests();
        this.setDefaultDate();
    }

    async handleTestSubmit(e) {
        e.preventDefault();

        const fileLink = document.getElementById('testFileLink').value.trim();
        
        const testData = {
            date: document.getElementById('testDate').value,
            type: document.getElementById('testType').value,
            network: document.getElementById('testNet').value,
            description: document.getElementById('testDescription').value,
            result: document.getElementById('testResult').value
            fileLink: fileLink || '' 
        };

        // Validate form
        if (!this.validateTestForm(testData)) {
            return;
        }

        try {
            await dataManager.addTest(testData);
            this.testForm.reset();
            this.setDefaultDate();
            
            // Show success message
            this.showMessage('Test record added successfully!', 'success');
        } catch (error) {
            console.error('Error adding test:', error);
            this.showMessage('Failed to add test record. Please try again.', 'error');
        }
    }

    validateTestForm(data) {
        if (!data.date || !data.type || !data.network || !data.description || !data.result) {
            this.showMessage('Please fill in all fields', 'error');
            return false;
        }
        if (data.fileLink) {
            try {
                new URL(data.fileLink);
                if (!data.fileLink.startsWith('http://') && !data.fileLink.startsWith('https://')) {
                    this.showMessage('File link must start with http:// or https://', 'error');
                    return false;
                }
            } catch (error) {
                this.showMessage('Please enter a valid URL for the file link', 'error');
                return false;
            }
        return true;
    }

    async handleClearTests() {
        if (confirm('Are you sure you want to clear all test records? This action cannot be undone.')) {
            try {
                await dataManager.clearTests();
                this.showMessage('All test records cleared', 'success');
            } catch (error) {
                console.error('Error clearing tests:', error);
                this.showMessage('Failed to clear test records', 'error');
            }
        }
    }

    loadTests() {
        const tests = dataManager.getTests();
        this.renderTestsList(tests);
    }

    renderTestsList(tests) {
        if (tests.length === 0) {
            this.testsList.innerHTML = '<div class="empty-state">No tests recorded yet</div>';
            return;
        }

        this.testsList.innerHTML = tests.map(test => `
            <div class="record-item">
                <div class="record-header">
                    <div class="record-title">${test.network} - ${test.type} Test</div>
                    <div class="record-date">${this.formatDate(test.date)}</div>
                </div>
                <div class="record-details">
                    <div class="record-description">${test.description}</div>
                    ${test.fileLink ? `
                        <div class="record-file-link">
                            <i class="fas fa-link"></i> 
                            <a href="${test.fileLink}" target="_blank" rel="noopener noreferrer">
                                View Attached File
                            </a>
                        </div>
                    ` : ''}
                    <div class="record-meta">
                        <span class="result-badge ${test.result.toLowerCase()}">${test.result}</span>
                        <span class="record-by">by ${test.createdBy}</span>
                    </div>
                </div>
            </div>
        `).join('');
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
        document.getElementById('testDate').value = today;
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessage = this.testForm.parentNode.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message element
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        // Insert after the form
        this.testForm.parentNode.insertBefore(messageEl, this.testForm.nextSibling);
        
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

// Initialize tests manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TestsManager();
});

