class ManagerSystem {
    constructor() {
        this.userStats = [];
        this.selectedWeek = null;
        this.allTests = [];
        this.allWarnings = [];
        this.init();
    }

    async init() {
        await this.waitForDataManager();
        await this.waitForUser();

        if (!this.isManager()) {
            console.log('User is not a manager, hiding manager features');
            return;
        }

        console.log('✅ Manager detected, initializing manager dashboard');
        this.createManagerDashboard();
        this.activateManagerTab();

        // Listen for data changes
        dataManager.addListener(() => {
            if (this.isManager()) {
                this.loadAllUsersData();
            }
        });

        // Initial load
        await this.loadAllUsersData();
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
        // Check if manager tab already exists
        if (document.querySelector('[data-tab="manager"]')) {
            console.log('Manager tab already exists');
            return;
        }

        console.log('Creating manager dashboard UI');

        // Add manager tab button
        const tabs = document.querySelector('.tabs');
        const managerTab = document.createElement('button');
        managerTab.className = 'tab-btn';
        managerTab.dataset.tab = 'manager';
        managerTab.innerHTML = '👥 Manager Dashboard';
        
        // Insert before admin tab
        const adminTab = document.querySelector('[data-tab="admin"]');
        if (adminTab) {
            tabs.insertBefore(managerTab, adminTab);
        } else {
            tabs.appendChild(managerTab);
        }

        // Add manager tab content if it doesn't exist
        let managerContent = document.getElementById('managerTab');
        if (!managerContent) {
            const mainContent = document.querySelector('.main-content .container');
            managerContent = document.createElement('div');
            managerContent.id = 'managerTab';
            managerContent.className = 'tab-content';
            mainContent.appendChild(managerContent);
        }

        managerContent.innerHTML = this.getManagerDashboardHTML();
        this.setupManagerEventListeners();
    }

    activateManagerTab() {
        const tab = document.querySelector('[data-tab="manager"]');
        if (tab) {
            tab.click();
        }
    }

    getManagerDashboardHTML() {
        return `
            <div class="manager-dashboard">
                <div class="manager-header">
                    <h2>👥 Manager Dashboard</h2>
                    <p class="manager-subtitle">Overview of all users, their activities, and records</p>
                </div>

                <div class="manager-stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-info">
                            <div class="stat-value" id="totalUsers">0</div>
                            <div class="stat-label">Total Users</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🧪</div>
                        <div class="stat-info">
                            <div class="stat-value" id="totalTestsAll">0</div>
                            <div class="stat-label">All Tests</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⚠️</div>
                        <div class="stat-info">
                            <div class="stat-value" id="totalWarningsAll">0</div>
                            <div class="stat-label">All Warnings</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📅</div>
                        <div class="stat-info">
                            <div class="stat-value" id="activeDaysAll">0</div>
                            <div class="stat-label">Active Days</div>
                        </div>
                    </div>
                </div>

                <div class="manager-filters">
                    <h3>Filter Users</h3>
                    <div class="filter-controls">
                        <input type="text" id="userSearchInput" placeholder="Search by name or email..." class="search-input">
                        <select id="roleFilter" class="filter-select">
                            <option value="all">All Roles</option>
                            <option value="manager">Managers Only</option>
                            <option value="user">Users Only</option>
                        </select>
                    </div>
                </div>

                <div class="users-section">
                    <h3>User Activity</h3>
                    <div id="usersTable" class="users-table-container">
                        <div class="loading-state">Loading user data...</div>
                    </div>
                </div>
            </div>
        `;
    }

    setupManagerEventListeners() {
        // Search filter
        const searchInput = document.getElementById('userSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterUsers());
        }

        // Role filter
        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter) {
            roleFilter.addEventListener('change', () => this.filterUsers());
        }
    }

    async loadAllUsersData() {
        try {
            showLoading();
            console.log('📊 Loading all users data...');

            // Load all users
            const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();
            const users = usersSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));

            console.log(`Found ${users.length} users`);

            // Load all tests
            const testsSnapshot = await db.collection(COLLECTIONS.TESTS).get();
            this.allTests = testsSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));

            console.log(`Found ${this.allTests.length} tests`);

            // Load all warnings
            const warningsSnapshot = await db.collection(COLLECTIONS.WARNINGS).get();
            this.allWarnings = warningsSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));

            console.log(`Found ${this.allWarnings.length} warnings`);

            // Build user stats
            this.userStats = users.map(user => {
                const userTests = this.allTests.filter(test => test.userId === user.id);
                const userWarnings = this.allWarnings.filter(warning => warning.userId === user.id);

                return {
                    user: user,
                    testsCount: userTests.length,
                    warningsCount: userWarnings.length,
                    tests: userTests,
                    warnings: userWarnings,
                    lastActivity: this.getLastActivity(userTests, userWarnings)
                };
            });

            this.updateManagerStats();
            this.renderUsersTable();

        } catch (error) {
            console.error('❌ Error loading manager data:', error);
            document.getElementById('usersTable').innerHTML = 
                '<div class="error-state">Failed to load user data. Please refresh the page.</div>';
        } finally {
            hideLoading();
        }
    }

    getLastActivity(tests, warnings) {
        const allActivities = [
            ...tests.map(t => t.createdAt),
            ...warnings.map(w => w.createdAt)
        ].filter(Boolean);

        if (allActivities.length === 0) return null;

        // Convert Firestore timestamps to dates and find the most recent
        const dates = allActivities.map(activity => {
            if (activity?.toDate) {
                return activity.toDate();
            } else if (activity?.seconds) {
                return new Date(activity.seconds * 1000);
            } else {
                return new Date(activity);
            }
        });

        return new Date(Math.max(...dates));
    }

    updateManagerStats() {
        document.getElementById('totalUsers').textContent = this.userStats.length;
        document.getElementById('totalTestsAll').textContent = this.allTests.length;
        document.getElementById('totalWarningsAll').textContent = this.allWarnings.length;

        // Calculate unique active days across all tests
        const uniqueDates = new Set(this.allTests.map(test => test.date));
        document.getElementById('activeDaysAll').textContent = uniqueDates.size;
    }

    filterUsers() {
        const searchTerm = document.getElementById('userSearchInput')?.value.toLowerCase() || '';
        const roleFilter = document.getElementById('roleFilter')?.value || 'all';

        const filtered = this.userStats.filter(stat => {
            const matchesSearch = !searchTerm || 
                stat.user.name?.toLowerCase().includes(searchTerm) ||
                stat.user.email?.toLowerCase().includes(searchTerm);

            const matchesRole = roleFilter === 'all' ||
                (roleFilter === 'manager' && (stat.user.isManager || stat.user.role === 'manager')) ||
                (roleFilter === 'user' && !stat.user.isManager && stat.user.role !== 'manager');

            return matchesSearch && matchesRole;
        });

        this.renderUsersTable(filtered);
    }

    renderUsersTable(users = this.userStats) {
        const container = document.getElementById('usersTable');
        
        if (users.length === 0) {
            container.innerHTML = '<div class="empty-state">No users found</div>';
            return;
        }

        // Sort by last activity (most recent first)
        const sortedUsers = [...users].sort((a, b) => {
            if (!a.lastActivity) return 1;
            if (!b.lastActivity) return -1;
            return b.lastActivity - a.lastActivity;
        });

        container.innerHTML = `
            <div class="users-grid">
                ${sortedUsers.map(stat => this.renderUserCard(stat)).join('')}
            </div>
        `;

        // Add click handlers for expanding user details
        sortedUsers.forEach((stat, index) => {
            const card = container.querySelectorAll('.user-card')[index];
            const expandBtn = card?.querySelector('.expand-btn');
            const detailsSection = card?.querySelector('.user-details');

            if (expandBtn && detailsSection) {
                expandBtn.addEventListener('click', () => {
                    const isExpanded = detailsSection.style.display === 'block';
                    detailsSection.style.display = isExpanded ? 'none' : 'block';
                    expandBtn.textContent = isExpanded ? '▼ Show Details' : '▲ Hide Details';
                });
            }
        });
    }

    renderUserCard(stat) {
        const user = stat.user;
        const lastActivityText = stat.lastActivity 
            ? this.formatDate(stat.lastActivity)
            : 'No activity yet';

        return `
            <div class="user-card">
                <div class="user-card-header">
                    <div class="user-info-main">
                        <h4>${user.name || 'Unknown User'}</h4>
                        <p class="user-email">${user.email}</p>
                        <span class="role-badge ${user.isManager || user.role === 'manager' ? 'manager' : 'user'}">
                            ${user.isManager || user.role === 'manager' ? 'Manager' : 'User'}
                        </span>
                    </div>
                    <div class="user-stats-summary">
                        <div class="stat-mini">
                            <span class="stat-mini-value">${stat.testsCount}</span>
                            <span class="stat-mini-label">Tests</span>
                        </div>
                        <div class="stat-mini">
                            <span class="stat-mini-value">${stat.warningsCount}</span>
                            <span class="stat-mini-label">Warnings</span>
                        </div>
                    </div>
                </div>
                
                <div class="user-card-meta">
                    <span class="last-activity">Last activity: ${lastActivityText}</span>
                </div>

                <button class="expand-btn">▼ Show Details</button>

                <div class="user-details" style="display: none;">
                    ${this.renderUserTests(stat.tests)}
                    ${this.renderUserWarnings(stat.warnings)}
                </div>
            </div>
        `;
    }

    renderUserTests(tests) {
        if (tests.length === 0) {
            return '<div class="detail-section"><h5>Tests</h5><p class="empty-text">No tests recorded</p></div>';
        }

        return `
            <div class="detail-section">
                <h5>Tests (${tests.length})</h5>
                <div class="detail-list">
                    ${tests.slice(0, 5).map(test => `
                        <div class="detail-item">
                            <div class="detail-item-header">
                                <span class="detail-title">${test.network} - ${test.type}</span>
                                <span class="detail-date">${this.formatDate(test.date)}</span>
                            </div>
                            <p class="detail-description">${test.description}</p>
                            ${test.fileLink ? `<a href="${test.fileLink}" target="_blank" class="file-link">📎 View File</a>` : ''}
                            <span class="result-badge ${test.result?.toLowerCase()}">${test.result}</span>
                        </div>
                    `).join('')}
                    ${tests.length > 5 ? `<p class="more-items">+ ${tests.length - 5} more tests</p>` : ''}
                </div>
            </div>
        `;
    }

    renderUserWarnings(warnings) {
        if (warnings.length === 0) {
            return '<div class="detail-section"><h5>Warnings</h5><p class="empty-text">No warnings recorded</p></div>';
        }

        return `
            <div class="detail-section">
                <h5>Warnings (${warnings.length})</h5>
                <div class="detail-list">
                    ${warnings.slice(0, 5).map(warning => `
                        <div class="detail-item">
                            <div class="detail-item-header">
                                <span class="detail-title">${warning.reference}</span>
                                <span class="detail-date">${this.formatDate(warning.date)}</span>
                            </div>
                            <p class="detail-recipient">To: ${warning.recipient}</p>
                            <p class="detail-description">${warning.details}</p>
                            <p class="detail-problems">Violations: ${warning.problemAreas}</p>
                        </div>
                    `).join('')}
                    ${warnings.length > 5 ? `<p class="more-items">+ ${warnings.length - 5} more warnings</p>` : ''}
                </div>
            </div>
        `;
    }

    formatDate(date) {
        if (!date) return 'N/A';

        let dateObj;
        if (date.toDate) {
            dateObj = date.toDate();
        } else if (date.seconds) {
            dateObj = new Date(date.seconds * 1000);
        } else if (typeof date === 'string') {
            dateObj = new Date(date);
        } else {
            dateObj = date;
        }

        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

let managerSystem;
document.addEventListener('DOMContentLoaded', () => {
    managerSystem = new ManagerSystem();
});
