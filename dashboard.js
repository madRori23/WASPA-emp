class DashboardManager {
    constructor() {
        console.log('📊 DashboardManager: Initializing...');
        this.tabButtons = null;
        this.tabContents = null;
        
        // Initialize with delay to ensure DOM is ready
        setTimeout(() => this.init(), 100);
    }

    async init() {
        try {
            // Wait for DOM elements to be available
            await this.waitForElements();
            
            this.setupTabNavigation();
            this.setupDataListeners();
            this.setDefaultDates();
            
            // Update stats when data changes
            if (window.dataManager) {
                dataManager.addListener(() => {
                    this.updateStats();
                });
                
                // Initial stats update
                this.updateStats();
            } else {
                console.warn('⚠️ dataManager not available yet');
                // Try to update stats later
                setTimeout(() => {
                    if (window.dataManager) {
                        dataManager.addListener(() => {
                            this.updateStats();
                        });
                        this.updateStats();
                    }
                }, 1000);
            }
            
            console.log('✅ DashboardManager: Initialized successfully');
        } catch (error) {
            console.error('❌ DashboardManager initialization error:', error);
            // Try again in 1 second
            setTimeout(() => this.init(), 1000);
        }
    }

    async waitForElements() {
        const maxWaitTime = 5000; // 5 seconds
        const startTime = Date.now();
        
        console.log('⏳ Waiting for dashboard elements...');
        
        while (Date.now() - startTime < maxWaitTime) {
            this.tabButtons = document.querySelectorAll('.tab-btn');
            this.tabContents = document.querySelectorAll('.tab-content');
            
            if (this.tabButtons.length > 0 && this.tabContents.length > 0) {
                console.log(`✅ Dashboard elements found after ${Math.round((Date.now() - startTime)/100)}ms`);
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.warn('⚠️ Dashboard elements not found after 5 seconds, continuing anyway');
        // Don't throw error, just continue with what we have
    }

    setupTabNavigation() {
        if (!this.tabButtons || this.tabButtons.length === 0) {
            console.warn('⚠️ No tab buttons found, will try again later');
            setTimeout(() => this.setupTabNavigation(), 500);
            return;
        }

        this.tabButtons.forEach(button => {
            // Remove any existing listeners by cloning
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', () => {
                const tabId = newButton.getAttribute('data-tab');
                
                // Update active tab button
                this.tabButtons.forEach(btn => btn.classList.remove('active'));
                newButton.classList.add('active');
                
                // Update active tab content
                this.tabContents.forEach(content => {
                    if (content) {
                        content.classList.remove('active');
                    }
                });
                const tabContent = document.getElementById(`${tabId}Tab`);
                if (tabContent) {
                    tabContent.classList.add('active');
                }
                
                // Update stats when switching to dashboard tabs
                this.updateStats();
            });
        });
        
        // Update the NodeList reference
        this.tabButtons = document.querySelectorAll('.tab-btn');
    }

    setupDataListeners() {
        // Stats are updated automatically via the data manager listener
    }

    updateStats() {
        try {
            if (!dataManager || typeof dataManager.getTestsToday !== 'function') {
                console.warn('⚠️ dataManager not available for stats update');
                return;
            }

            const testsToday = dataManager.getTestsToday().length;
            const warningsToday = dataManager.getWarningsToday().length;
            const totalTests = dataManager.getTotalTests();
            const activeDays = dataManager.getActiveDays();

            // Safely update each element
            this.updateElementText('testsToday', testsToday);
            this.updateElementText('warningsToday', warningsToday);
            this.updateElementText('totalTests', totalTests);
            this.updateElementText('activeDays', activeDays);

            // Update export stats
            this.updateExportStats();
        } catch (error) {
            console.error('❌ Error updating stats:', error);
        }
    }

    updateElementText(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`⚠️ Element #${elementId} not found`);
        }
    }

    updateExportStats() {
        try {
            if (!dataManager || typeof dataManager.getTests !== 'function') {
                console.warn('⚠️ dataManager not available for export stats');
                return;
            }

            this.updateElementText('exportTestCount', dataManager.getTests().length);
            this.updateElementText('exportWarningCount', dataManager.getWarnings().length);
            this.updateElementText('lastUpdated', new Date().toLocaleString());
            
            // Track last export
            const lastExport = localStorage.getItem('waspa_last_export');
            this.updateElementText('lastExportDate', lastExport ? 
                new Date(lastExport).toLocaleString() : 'Never');
        } catch (error) {
            console.error('❌ Error updating export stats:', error);
        }
    }

    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        
        // Safely set date values
        this.setDateValue('testDate', today);
        this.setDateValue('warningDate', today);
        
        // Set default export dates (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        this.setDateValue('exportStartDate', thirtyDaysAgo.toISOString().split('T')[0]);
        this.setDateValue('exportEndDate', today);
    }

    setDateValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value;
        } else {
            console.warn(`⚠️ Date element #${elementId} not found`);
        }
    }

    // Call this when exports happen
    recordExport() {
        localStorage.setItem('waspa_last_export', new Date().toISOString());
        this.updateExportStats();
    }
}

// Initialize dashboard manager with better timing
let dashboardManager;

function initDashboardManager() {
    console.log('🚀 Initializing DashboardManager...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOM loaded, creating DashboardManager');
            setTimeout(() => {
                dashboardManager = new DashboardManager();
            }, 100);
        });
    } else {
        console.log('📄 DOM already loaded, creating DashboardManager');
        setTimeout(() => {
            dashboardManager = new DashboardManager();
        }, 100);
    }
}

// Start initialization
initDashboardManager();
