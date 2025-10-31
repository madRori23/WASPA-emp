// dashboard.js - Dashboard functionality
class DashboardManager {
    constructor() {
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        this.init();
    }

    init() {
        this.setupTabNavigation();
        this.updateStats();
        this.setDefaultDates();
        
        // Update stats when navigating back to dashboard
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateStats();
            }
        });
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
        document.getElementById('exportTestCount').textContent = totalTests;
        document.getElementById('exportWarningCount').textContent = dataManager.getWarnings().length;
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('testDate').value = today;
        document.getElementById('warningDate').value = today;
    }
}

// Initialize dashboard manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});