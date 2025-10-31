// data.js - Data management and storage
class DataManager {
    constructor() {
        this.users = [
            { email: 'admin@waspa.org', password: 'password', name: 'Admin User' }
        ];
        this.currentUser = null;
        this.tests = JSON.parse(localStorage.getItem('waspa_tests')) || [];
        this.warnings = JSON.parse(localStorage.getItem('waspa_warnings')) || [];
    }

    // User authentication methods
    authenticateUser(email, password) {
        return this.users.find(user => 
            user.email === email && user.password === password
        );
    }

    setCurrentUser(user) {
        this.currentUser = user;
        localStorage.setItem('waspa_current_user', JSON.stringify(user));
    }

    getCurrentUser() {
        if (!this.currentUser) {
            this.currentUser = JSON.parse(localStorage.getItem('waspa_current_user'));
        }
        return this.currentUser;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('waspa_current_user');
    }

    // Test methods
    addTest(testData) {
        const test = {
            id: Date.now().toString(),
            date: testData.date,
            type: testData.type,
            network: testData.network,
            description: testData.description,
            result: testData.result,
            createdBy: this.currentUser.email,
            createdAt: new Date().toISOString()
        };
        
        this.tests.unshift(test);
        this.saveTests();
        return test;
    }

    getTests() {
        return this.tests;
    }

    getTestsToday() {
        const today = new Date().toDateString();
        return this.tests.filter(test => 
            new Date(test.date).toDateString() === today
        );
    }

    clearTests() {
        this.tests = [];
        this.saveTests();
    }

    saveTests() {
        localStorage.setItem('waspa_tests', JSON.stringify(this.tests));
    }

    // Warning methods
    addWarning(warningData) {
        const warning = {
            id: Date.now().toString(),
            date: warningData.date,
            type: warningData.type,
            recipient: warningData.recipient,
            reference: warningData.reference,
            details: warningData.details,
            problemAreas: warningData.problemAreas,
            createdBy: this.currentUser.email,
            createdAt: new Date().toISOString()
        };
        
        this.warnings.unshift(warning);
        this.saveWarnings();
        return warning;
    }

    getWarnings() {
        return this.warnings;
    }

    getWarningsToday() {
        const today = new Date().toDateString();
        return this.warnings.filter(warning => 
            new Date(warning.date).toDateString() === today
        );
    }

    clearWarnings() {
        this.warnings = [];
        this.saveWarnings();
    }

    saveWarnings() {
        localStorage.setItem('waspa_warnings', JSON.stringify(this.warnings));
    }

    // Export methods
    exportTestsToCSV() {
        const headers = ['Date', 'Type', 'Network', 'Description', 'Result', 'Created By'];
        const csvData = this.tests.map(test => [
            test.date,
            test.type,
            test.network,
            `"${test.description.replace(/"/g, '""')}"`,
            test.result,
            test.createdBy
        ]);
        
        return [headers, ...csvData].map(row => row.join(',')).join('\n');
    }

    exportWarningsToCSV() {
        const headers = ['Date', 'Type', 'Recipient', 'Reference', 'Details', 'Problem Areas', 'Created By'];
        const csvData = this.warnings.map(warning => [
            warning.date,
            warning.type,
            `"${warning.recipient.replace(/"/g, '""')}"`,
            warning.reference,
            `"${warning.details.replace(/"/g, '""')}"`,
            `"${warning.problemAreas.replace(/"/g, '""')}"`,
            warning.createdBy
        ]);
        
        return [headers, ...csvData].map(row => row.join(',')).join('\n');
    }

    exportAllData() {
        return {
            tests: this.tests,
            warnings: this.warnings,
            exportedAt: new Date().toISOString(),
            exportedBy: this.currentUser.email
        };
    }

    // Stats methods
    getTotalTests() {
        return this.tests.length;
    }

    getActiveDays() {
        const uniqueDates = new Set(this.tests.map(test => test.date));
        return uniqueDates.size;
    }
}

// Initialize global data manager
const dataManager = new DataManager();
