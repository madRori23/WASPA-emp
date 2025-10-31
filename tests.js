// tests.js - Test management functionality
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
        
        this.loadTests();
    }

    handleTestSubmit(e) {
        e.preventDefault();
        
        const testData = {
            date: document.getElementById('testDate').value,
            type: document.getElementById('testType').value,
            network: document.getElementById('testNet').value,
            description: document.getElementById('testDescription').value,
            result: document.getElementById('testResult').value
        };

        // Validate form
        if (!this.validateTestForm(testData)) {
            return;
        }

        const test = dataManager.addTest(testData);
        this.addTestToList(test);
        this.testForm.reset();
        this.setDefaultDate();
        
        // Update stats
        if (typeof dashboardManager !== 'undefined') {
            dashboardManager.updateStats();
        }

        // Show success message
        this.showMessage('Test record added successfully!', 'success');
    }

    validateTestForm(data) {
        if (!data.date || !data.type || !data.network || !data.description || !data.result) {
            this.showMessage('Please fill in all fields', 'error');
            return false;
        }
        return true;
    }

    handleClearTests() {
        if (confirm('Are you sure you want to clear all test records? This action cannot be undone.')) {
            dataManager.clearTests();
            this.loadTests();
            
            if (typeof dashboardManager !== 'undefined') {
                dashboardManager.updateStats();
            }
            
            this.showMessage('All test records cleared', 'success');
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
                    <div class="record-meta">
                        <span class="result-badge ${test.result.toLowerCase()}">${test.result}</span>
                        <span class="record-by">by ${test.createdBy}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    addTestToList(test) {
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        recordItem.innerHTML = `
            <div class="record-header">
                <div class="record-title">${test.network} - ${test.type} Test</div>
                <div class="record-date">${this.formatDate(test.date)}</div>
            </div>
            <div class