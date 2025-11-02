// dashboard.js - Dashboard functionality
class DashboardManager {
    constructor() {
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        this.init();
    }

    init() {
        this.setupTabNavigation();
        this.setupDataListeners();
        this.setDefaultDates();
        
        // Update stats when data changes
        dataManager.addListener(() => {
            this.updateStats();
        });
        
        // Initial stats update
        this.updateStats();
    }

    setupTabNavigation() {
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                
                // Update active tab button
                this.tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update active tab content
                this.tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(`${tabId}Tab`).classList.add('active');
                
                // Update stats when switching to dashboard tabs
                this.updateStats();
            });
        });
    }

    setupDataListeners() {
        // Stats are updated automatically via the data manager listener
    }

    updateStats() {
        const testsToday = dataManager.getTestsToday().length;
        const warningsToday = dataManager.getWarningsToday().length;
        const totalTests = dataManager.getTotalTests();
        const activeDays = dataManager.getActiveDays();

        document.getElementById('testsToday').textContent = testsToday;
        document.getElementById('warningsToday').textContent = warningsToday;
        document.getElementById('totalTests').textContent = totalTests;
        document.getElementById('activeDays').textContent = activeDays;

        // Update export stats
        this.updateExportStats();
    }

    updateExportStats() {
        document.getElementById('exportTestCount').textContent = dataManager.getTests().length;
        document.getElementById('exportWarningCount').textContent = dataManager.getWarnings().length;
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
        
        // Track last export
        const lastExport = localStorage.getItem('waspa_last_export');
        document.getElementById('lastExportDate').textContent = lastExport ? 
            new Date(lastExport).toLocaleString() : 'Never';
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('testDate').value = today;
        document.getElementById('warningDate').value = today;
        
        // Set default export dates (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        document.getElementById('exportStartDate').value = thirtyDaysAgo.toISOString().split('T')[0];
        document.getElementById('exportEndDate').value = today;
    }

    // Call this when exports happen
    recordExport() {
        localStorage.setItem('waspa_last_export', new Date().toISOString());
        this.updateExportStats();
    }
}

// Initialize dashboard manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});