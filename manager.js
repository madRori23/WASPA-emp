class ManagerSystem {
    constructor() {
        this.userStats = [];
        this.selectedWeek = null;
        this.allTests = [];
        this.allWarnings = [];
        this.isLoading = false;
        this.initAttempts = 0;
        this.maxInitAttempts = 20; // Reduced from 200
        
        console.log('🎯 ManagerSystem: Constructor called, scheduling initialization...');
        
        // Don't initialize immediately - wait for everything to be ready
        this.initTimeout = setTimeout(() => {
            this.init().catch(error => {
                console.error('❌ ManagerSystem initialization failed:', error);
            });
        }, 2000); // Wait 2 seconds before trying
    }

    async init() {
        console.log('🎯 ManagerSystem: Starting initialization...');
        
        try {
            // Wait for DataManager to be available
            await this.waitForDataManager();
            
            // Check if user exists and is manager
            const user = dataManager.getCurrentUser();
            if (!user) {
                console.log('ℹ️ ManagerSystem: No user logged in');
                return;
            }

            if (!this.isManager()) {
                console.log('ℹ️ ManagerSystem: User is not a manager, skipping dashboard creation');
                return;
            }

            console.log('✅ ManagerSystem: Manager detected, setting up dashboard');
            
            // Give the DOM more time to be ready
            await new Promise(resolve => setTimeout(resolve, 500));
            
            this.createManagerDashboard();
            await this.loadAllUsersData();

            // Listen for data changes
            dataManager.addListener(() => {
                if (this.isManager() && !this.isLoading) {
                    console.log('🔄 ManagerSystem: Data changed, reloading...');
                    this.loadAllUsersData();
                }
            });
            
            console.log('✅ ManagerSystem: Initialization complete!');
            
        } catch (error) {
            console.error('❌ ManagerSystem: Initialization error:', error);
        }
    }

    async waitForDataManager() {
        console.log('⏳ Waiting for DataManager...');
        
        // Check immediately first
        if (window.dataManager && dataManager.isInitialized) {
            console.log('✅ DataManager already ready');
            return;
        }
        
        while (this.initAttempts < this.maxInitAttempts) {
            this.initAttempts++;
            
            if (window.dataManager && typeof dataManager.isInitialized !== 'undefined') {
                console.log(`✅ DataManager ready after ${this.initAttempts} attempts`);
                return;
            }
            
            if (this.initAttempts % 5 === 0) {
                console.log(`⏳ Still waiting for DataManager... (${this.initAttempts}/${this.maxInitAttempts})`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 100ms
        }
        
        // If we get here, check one more time
        if (window.dataManager) {
            console.log('✅ DataManager found but isInitialized check failed, proceeding anyway');
            return;
        }
        
        throw new Error('DataManager initialization timeout');
    }

    isManager() {
        if (!window.dataManager || typeof dataManager.isManager !== 'function') {
            console.warn('⚠️ isManager function not available');
            return false;
        }
        return dataManager.isManager();
    }

    createManagerDashboard() {
        console.log('🎨 Creating manager dashboard UI...');
        
        // Check if already exists
        if (document.querySelector('[data-tab="manager"]')) {
            console.log('ℹ️ Manager tab already exists, skipping creation');
            return;
        }

        // Find tabs container
        const tabs = document.querySelector('.tabs');
        if (!tabs) {
            console.error('❌ Tabs container not found! Retrying in 1 second...');
            setTimeout(() => this.createManagerDashboard(), 1000);
            return;
        }

        // Create tab button
        const managerTab = document.createElement('button');
        managerTab.className = 'tab-btn';
        managerTab.dataset.tab = 'manager';
        managerTab.innerHTML = '👥 Manager Dashboard';
        
        // Insert before admin tab if it exists
        const adminTab = document.querySelector('[data-tab="admin"]');
        if (adminTab) {
            tabs.insertBefore(managerTab, adminTab);
        } else {
            tabs.appendChild(managerTab);
        }

        // Add click handler
        managerTab.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            managerTab.classList.add('active');
            const managerContent = document.getElementById('managerTab');
            if (managerContent) {
                managerContent.classList.add('active');
            }
        });

        // Create tab content
        this.createManagerContent();
        
        console.log('✅ Manager dashboard UI created successfully');
    }

    createManagerContent() {
        const mainContent = document.querySelector('.main-content .container');
        if (!mainContent) {
            console.error('❌ Main content container not found');
            return;
        }
        
        // Remove existing manager content if any
        const existingContent = document.getElementById('managerTab');
        if (existingContent) {
            existingContent.remove();
        }

        // Create new manager content
        const managerContent = document.createElement('div');
        managerContent.id = 'managerTab';
        managerContent.className = 'tab-content';
        managerContent.innerHTML = this.getManagerDashboardHTML();
        mainContent.appendChild(managerContent);
        
        this.setupManagerEventListeners();
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
        setTimeout(() => {
            const searchInput = document.getElementById('userSearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', () => this.filterUsers());
            }

            const roleFilter = document.getElementById('roleFilter');
            if (roleFilter) {
                roleFilter.addEventListener('change', () => this.filterUsers());
            }

            const refreshBtn = document.getElementById('refreshManagerData');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    console.log('🔄 Manual refresh triggered');
                    this.loadAllUsersData();
                });
            }
        }, 100);
    }

    async loadAllUsersData() {
        if (this.isLoading) {
            console.log('⏭️ Already loading, skipping...');
            return;
        }

        this.isLoading = true;
        
        try {
            showLoading();
            console.log('📊 Loading all users data via DataManager...');

            // Verify DataManager has the method
            if (typeof dataManager.getAllData !== 'function') {
                throw new Error('DataManager.getAllData method not found.');
            }

            // Use the new DataManager method
            const allData = await dataManager.getAllData();
            
            const users = allData.users;
            this.allTests = allData.tests;
            this.allWarnings = allData.warnings;

            console.log(`✅ Loaded: ${users.length} users, ${this.allTests.length} tests, ${this.allWarnings.length} warnings`);

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

            console.log('✅ User stats built:', this.userStats.length);

            this.updateManagerStats();
            this.renderUsersTable();

        } catch (error) {
            console.error('❌ Error loading manager data:', error);
            const container = document.getElementById('usersTable');
            if (container) {
                container.innerHTML = `
                    <div class="error-state" style="padding: 40px; text-align: center;">
                        <h3 style="color: var(--accent-red); margin-bottom: 15px;">❌ Failed to Load Data</h3>
                        <p style="color: var(--text-gray); margin-bottom: 10px;">Error: ${error.message}</p>
                        <button onclick="managerSystem.loadAllUsersData()" class="btn btn-primary">
                            🔄 Retry
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
            if (activity?.toDate) return activity.toDate();
            if (activity?.seconds) return new Date(activity.seconds * 1000);
            if (typeof activity === 'string') return new Date(activity);
            return activity;
        }).filter(date => !isNaN(date.getTime()));

        if (dates.length === 0) return null;
        return new Date(Math.max(...dates));
    }

    updateManagerStats() {
        const totalUsers = this.userStats.length;
        const totalTests = this.allTests.length;
        const totalWarnings = this.allWarnings.length;
        const uniqueDates = new Set(this.allTests.map(test => test.date));
        const activeDays = uniqueDates.size;

        console.log('📈 Stats:', { totalUsers, totalTests, totalWarnings, activeDays });

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('totalTestsAll').textContent = totalTests;
        document.getElementById('totalWarningsAll').textContent = totalWarnings;
        document.getElementById('activeDaysAll').textContent = activeDays;
    }

    filterUsers() {
        const searchInput = document.getElementById('userSearchInput');
        const roleFilter = document.getElementById('roleFilter');
        
        if (!searchInput || !roleFilter) return;
        
        const searchTerm = searchInput.value.toLowerCase() || '';
        const roleFilterValue = roleFilter.value || 'all';

        const filtered = this.userStats.filter(stat => {
            const matchesSearch = !searchTerm || 
                stat.user.name?.toLowerCase().includes(searchTerm) ||
                stat.user.email?.toLowerCase().includes(searchTerm);

            const matchesRole = roleFilterValue === 'all' ||
                (roleFilterValue === 'manager' && (stat.user.isManager || stat.user.role === 'manager')) ||
                (roleFilterValue === 'user' && !stat.user.isManager && stat.user.role !== 'manager');

            return matchesSearch && matchesRole;
        });

        this.renderUsersTable(filtered);
    }

    renderUsersTable(users = this.userStats) {
        const container = document.getElementById('usersTable');
        
        if (!container) {
            console.error('❌ usersTable container not found');
            return;
        }
        
        if (users.length === 0) {
            container.innerHTML = '<div class="empty-state">No users found</div>';
            return;
        }

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
        setTimeout(() => {
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
        }, 100);
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
        if (date.toDate) dateObj = date.toDate();
        else if (date.seconds) dateObj = new Date(date.seconds * 1000);
        else if (typeof date === 'string') dateObj = new Date(date);
        else dateObj = date;

        if (isNaN(dateObj.getTime())) return 'Invalid Date';

        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Initialize manager system with better timing
let managerSystem;

function initManagerSystem() {
    console.log('🚀 Initializing ManagerSystem...');
    
    // Wait a bit longer to ensure everything is loaded
    setTimeout(() => {
        try {
            managerSystem = new ManagerSystem();
            console.log('✅ ManagerSystem instance created');
        } catch (error) {
            console.error('❌ ManagerSystem creation failed:', error);
        }
    }, 3000); // Wait 3 seconds
}

// Wait for everything to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded, scheduling ManagerSystem init');
        initManagerSystem();
    });
} else {
    console.log('📄 DOM already loaded, scheduling ManagerSystem init');
    initManagerSystem();
}
