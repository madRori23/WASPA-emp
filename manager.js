class ManagerSystem {
    constructor() {
        this.userStats = [];
        this.selectedWeek = null;
        this.allTests = [];
        this.allWarnings = [];
        this.isLoading = false;
        this.init();
    }

    async init() {
        console.log('🎯 ManagerSystem: Starting initialization...');
        
        await this.waitForDataManager();
        await this.waitForUser();

        if (!this.isManager()) {
            console.log('❌ ManagerSystem: User is not a manager, skipping initialization');
            return;
        }

        console.log('✅ ManagerSystem: Manager detected, setting up dashboard');
        
        // Give the DOM time to load
        setTimeout(async () => {
            this.createManagerDashboard();
            await this.loadAllUsersData();
        }, 500);

        // Listen for data changes
        dataManager.addListener(() => {
            if (this.isManager() && !this.isLoading) {
                console.log('🔄 ManagerSystem: Data changed, reloading...');
                this.loadAllUsersData();
            }
        });
    }

    async waitForDataManager() {
        let attempts = 0;
        while ((!window.dataManager || !dataManager.isInitialized) && attempts < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.dataManager || !dataManager.isInitialized) {
            console.error('❌ ManagerSystem: DataManager not available after waiting');
            throw new Error('DataManager initialization timeout');
        }
        
        console.log('✅ ManagerSystem: DataManager is ready');
    }

    async waitForUser() {
        let attempts = 0;
        while (!dataManager.getCurrentUser() && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!dataManager.getCurrentUser()) {
            console.error('❌ ManagerSystem: User not available after waiting');
            throw new Error('User initialization timeout');
        }
        
        console.log('✅ ManagerSystem: User is ready');
    }

    isManager() {
        const user = dataManager.getCurrentUser();
        const isManager = user?.role === 'manager' || user?.isManager === true;
        console.log(`🔍 ManagerSystem: Checking manager status - ${isManager ? 'YES' : 'NO'}`, {
            email: user?.email,
            role: user?.role,
            isManager: user?.isManager
        });
        return isManager;
    }

    createManagerDashboard() {
        console.log('🎨 ManagerSystem: Creating dashboard UI...');
        
        // Check if manager tab already exists
        if (document.querySelector('[data-tab="manager"]')) {
            console.log('ℹ️ ManagerSystem: Manager tab already exists');
            return;
        }

        // Add manager tab button
        const tabs = document.querySelector('.tabs');
        if (!tabs) {
            console.error('❌ ManagerSystem: Tabs container not found');
            return;
        }

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

        // Add click handler for tab switching
        managerTab.addEventListener('click', () => {
            // Remove active from all tabs
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Activate manager tab
            managerTab.classList.add('active');
            document.getElementById('managerTab').classList.add('active');
        });

        // Add or update manager tab content
        let managerContent = document.getElementById('managerTab');
        const mainContent = document.querySelector('.main-content .container');
        
        if (!managerContent) {
            managerContent = document.createElement('div');
            managerContent.id = 'managerTab';
            managerContent.className = 'tab-content';
            mainContent.appendChild(managerContent);
        }

        managerContent.innerHTML = this.getManagerDashboardHTML();
        this.setupManagerEventListeners();
        
        console.log('✅ ManagerSystem: Dashboard UI created');
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
                        <button id="refreshManagerData" class="btn btn-secondary" style="padding: 12px 20px;">
                            🔄 Refresh Data
                        </button>
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

        // Refresh button
        const refreshBtn = document.getElementById('refreshManagerData');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('🔄 Manual refresh triggered');
                this.loadAllUsersData();
            });
        }
    }

    async loadAllUsersData() {
        if (this.isLoading) {
            console.log('⏭️ ManagerSystem: Already loading, skipping...');
            return;
        }

        this.isLoading = true;
        
        try {
            showLoading();
            console.log('📊 ManagerSystem: Loading all users data...');

            // Check if Firebase is available
            if (!window.db || !window.COLLECTIONS) {
                throw new Error('Firebase not initialized');
            }

            // Load all users - NO FILTERING BY CURRENT USER
            console.log('👥 Fetching all users...');
            const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();
            const users = usersSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            console.log(`✅ Found ${users.length} users:`, users.map(u => u.email));

            // Load ALL tests - NO FILTERING BY CURRENT USER
            console.log('🧪 Fetching all tests...');
            const testsSnapshot = await db.collection(COLLECTIONS.TESTS).get();
            this.allTests = testsSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            console.log(`✅ Found ${this.allTests.length} tests`);

            // Load ALL warnings - NO FILTERING BY CURRENT USER
            console.log('⚠️ Fetching all warnings...');
            const warningsSnapshot = await db.collection(COLLECTIONS.WARNINGS).get();
            this.allWarnings = warningsSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            console.log(`✅ Found ${this.allWarnings.length} warnings`);

            // Build user stats
            this.userStats = users.map(user => {
                const userTests = this.allTests.filter(test => test.userId === user.id);
                const userWarnings = this.allWarnings.filter(warning => warning.userId === user.id);

                console.log(`📊 User ${user.email}: ${userTests.length} tests, ${userWarnings.length} warnings`);

                return {
                    user: user,
                    testsCount: userTests.length,
                    warningsCount: userWarnings.length,
                    tests: userTests,
                    warnings: userWarnings,
                    lastActivity: this.getLastActivity(userTests, userWarnings)
                };
            });

            console.log('✅ ManagerSystem: User stats built:', this.userStats.length);

            this.updateManagerStats();
            this.renderUsersTable();

        } catch (error) {
            console.error('❌ ManagerSystem: Error loading data:', error);
            const container = document.getElementById('usersTable');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <p>❌ Failed to load user data</p>
                        <p style="color: var(--text-gray); font-size: 0.9rem;">Error: ${error.message}</p>
                        <p style="color: var(--text-gray); font-size: 0.9rem;">Check console for details</p>
                        <button onclick="managerSystem.loadAllUsersData()" class="btn btn-primary" style="margin-top: 15px;">
                            Retry
                        </button>
                    </div>
                `;
            }
        } finally {
            hideLoading();
            this.isLoading = false;
        }
    }

    getLastActivity(tests, warnings) {
        const allActivities = [
            ...tests.map(t => t.createdAt),
            ...warnings.map(w => w.createdAt)
        ].filter(Boolean);

        if (allActivities.length === 0) return null;

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
        console.log('📈 Updating manager stats...');
        
        const totalUsers = this.userStats.length;
        const totalTests = this.allTests.length;
        const totalWarnings = this.allWarnings.length;
        const uniqueDates = new Set(this.allTests.map(test => test.date));
        const activeDays = uniqueDates.size;

        console.log('Stats:', { totalUsers, totalTests, totalWarnings, activeDays });

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('totalTestsAll').textContent = totalTests;
        document.getElementById('totalWarningsAll').textContent = totalWarnings;
        document.getElementById('activeDaysAll').textContent = activeDays;
    }

    filterUsers() {
        const searchTerm = document.getElementById('userSearchInput')?.value.toLowerCase() || '';
        const roleFilter = document.getElementById('roleFilter')?.value || 'all';

        console.log('🔍 Filtering users:', { searchTerm, roleFilter });

        const filtered = this.userStats.filter(stat => {
            const matchesSearch = !searchTerm || 
                stat.user.name?.toLowerCase().includes(searchTerm) ||
                stat.user.email?.toLowerCase().includes(searchTerm);

            const matchesRole = roleFilter === 'all' ||
                (roleFilter === 'manager' && (stat.user.isManager || stat.user.role === 'manager')) ||
                (roleFilter === 'user' && !stat.user.isManager && stat.user.role !== 'manager');

            return matchesSearch && matchesRole;
        });

        console.log(`✅ Filtered to ${filtered.length} users`);
        this.renderUsersTable(filtered);
    }

    renderUsersTable(users = this.userStats) {
        const container = document.getElementById('usersTable');
        
        if (!container) {
            console.error('❌ usersTable container not found');
            return;
        }

        console.log(`🎨 Rendering ${users.length} user cards...`);
        
        if (users.length === 0) {
            container.innerHTML = '<div class="empty-state">No users found matching your criteria</div>';
            return;
        }

        // Sort by last activity
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

        // Add expand/collapse handlers
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

        console.log('✅ User cards rendered successfully');
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

// Initialize manager system
let managerSystem;
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, creating ManagerSystem...');
    managerSystem = new ManagerSystem();
});
