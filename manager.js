class ManagerSystem {
    constructor() {
        this.userStats = [];
        this.selectedWeek = null;
        this.init();
    }

    async init() {
        await this.waitForDataManager();
        await this.waitForUser();

        if (!this.isManager()) return;

        this.createManagerDashboard();
        this.activateManagerTab();

        dataManager.addListener(() => {
            if (this.isManager()) {
                this.updateManagerStats();
            }
        });
    }

    async waitForDataManager() {
        while (!window.dataManager || !dataManager.isInitialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async waitForUser() {
        while (!dataManager.getCurrentUser()) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    isManager() {
        const user = dataManager.getCurrentUser();
        return user?.role === 'manager' || user?.isManager === true;
    }

    createManagerDashboard() {
        if (document.querySelector('[data-tab="manager"]')) return;

        const tabs = document.querySelector('.tabs');
        const managerTab = document.createElement('button');
        managerTab.className = 'tab-btn';
        managerTab.dataset.tab = 'manager';
        managerTab.textContent = '👥 Manager Dashboard';
        tabs.appendChild(managerTab);

        const mainContent = document.querySelector('.main-content .container');
        const managerContent = document.createElement('div');
        managerContent.id = 'managerTab';
        managerContent.className = 'tab-content';
        managerContent.innerHTML = this.getManagerDashboardHTML();
        mainContent.appendChild(managerContent);

        this.setupManagerEventListeners();
        this.loadAllUsersData();
    }

    activateManagerTab() {
        const tab = document.querySelector('[data-tab="manager"]');
        if (tab) tab.click();
    }

    getManagerDashboardHTML() {
        return `
            <div class="manager-dashboard">
                <h2>👥 Manager Dashboard</h2>
                <div class="manager-stats-grid">
                    <div class="stat-card">
                        <div class="stat-value" id="totalUsers">0</div>
                        <div class="stat-label">Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="totalTestsAll">0</div>
                        <div class="stat-label">Tests</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="totalWarningsAll">0</div>
                        <div class="stat-label">Warnings</div>
                    </div>
                </div>
                <div id="usersTable">Loading...</div>
            </div>
        `;
    }

    async loadAllUsersData() {
        const users = await dataManager.getAllUsers();
        
        this.userStats = users.map(u => ({ user: u }));
        this.updateManagerStats();
    }

    updateManagerStats() {
        const totalUsers = this.userStats.length;

        let totalTest = 0;
        let totalWarnings = 0;

        this.userStats.forEach(u => {
            totalTests += u.user.tests?.length || 0;
            totalWarnings += u.user.warnings?.length || 0;
        });

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('totalTestsAll').textContent = totalTests;
        document.getElementById('totalWarningsAll').textContent = totalWarnings;
    }
}

let managerSystem;
document.addEventListener('DOMContentLoaded', () => {
    managerSystem = new ManagerSystem();
});

