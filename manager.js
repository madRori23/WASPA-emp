class ManagerSystem {
    constructor() {
        this.managerDashboard = null;
        this.userStats = [];
        this.selectedWeek = null;
        
        this.init();
    }

    async init() {
        // Wait for data manager to be ready
        await this.waitForDataManager();
        
        // Check if current user is a manager
        this.checkManagerRole();
        
        // Setup manager-specific listeners
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

    checkManagerRole() {
        const user = dataManager.getCurrentUser();
        if (user && this.isManager()) {
            this.createManagerDashboard();
        }
    }

    isManager() {
        const user = dataManager.getCurrentUser();
        if (!user) return false;
        
        // Check if user has manager role in Firestore or is designated manager
        // You can customize this logic based on your needs
        return user.role === 'manager' || user.isManager === true;
    }

    createManagerDashboard() {
        // Check if manager tab already exists
        if (document.querySelector('[data-tab="manager"]')) return;

        // Add manager tab to navigation
        const tabs = document.querySelector('.tabs');
        const managerTab = document.createElement('button');
        managerTab.className = 'tab-btn';
        managerTab.setAttribute('data-tab', 'manager');
        managerTab.textContent = '👥 Manager Dashboard';
        tabs.appendChild(managerTab);

        // Create manager tab content
        const mainContent = document.querySelector('.main-content .container');
        const managerContent = document.createElement('div');
        managerContent.id = 'managerTab';
        managerContent.className = 'tab-content';
        managerContent.innerHTML = this.getManagerDashboardHTML();
        mainContent.appendChild(managerContent);

        // Setup event listeners
        this.setupManagerEventListeners();
        
        // Load initial data
        this.loadAllUsersData();
    }

    getManagerDashboardHTML() {
        return `
            <div class="manager-dashboard">
                <!-- Week Selection -->
                <div class="week-selector-card">
                    <h2>📅 Performance Period</h2>
                    <div class="week-selector">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="weekStartDate">Week Start</label>
                                <input type="date" id="weekStartDate">
                            </div>
                            <div class="form-group">
                                <label for="weekEndDate">Week End</label>
                                <input type="date" id="weekEndDate">
                            </div>
                            <div class="form-group" style="align-self: flex-end;">
                                <button id="loadWeekData" class="btn btn-primary">
                                    <i class="fas fa-sync"></i> Load Week Data
                                </button>
                            </div>
                        </div>
                        <div class="quick-selectors">
                            <button class="btn btn-secondary" id="selectThisWeek">This Week</button>
                            <button class="btn btn-secondary" id="selectLastWeek">Last Week</button>
                            <button class="btn btn-secondary" id="selectThisMonth">This Month</button>
                        </div>
                    </div>
                </div>

                <!-- Overall Stats -->
                <div class="manager-stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-info">
                            <div class="stat-value" id="totalUsers">0</div>
                            <div class="stat-label">Active Users</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🧪</div>
                        <div class="stat-info">
                            <div class="stat-value" id="totalTestsAll">0</div>
                            <div class="stat-label">Total Tests</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⚠️</div>
                        <div class="stat-info">
                            <div class="stat-value" id="totalWarningsAll">0</div>
                            <div class="stat-label">Total Warnings</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-info">
                            <div class="stat-value" id="avgTestsPerUser">0</div>
                            <div class="stat-label">Avg Tests/User</div>
                        </div>
                    </div>
                </div>

                <!-- User Performance Table -->
                <div class="users-performance-card">
                    <div class="card-header">
                        <h2>User Performance Overview</h2>
                        <div class="header-actions">
                            <button id="exportAllUsers" class="btn btn-primary">
                                <i class="fas fa-file-excel"></i> Export All Users
                            </button>
                        </div>
                    </div>
                    
                    <div class="search-filter">
                        <input type="text" id="userSearch" placeholder="Search by name or email..." class="search-input">
                        <select id="sortBy" class="sort-select">
                            <option value="name">Sort by Name</option>
                            <option value="tests">Sort by Tests</option>
                            <option value="warnings">Sort by Warnings</option>
                            <option value="activity">Sort by Activity</option>
                        </select>
                    </div>

                    <div id="usersTable" class="users-table">
                        <div class="loading-state">Loading user data...</div>
                    </div>
                </div>

                <!-- Detailed User Modal (will be created dynamically) -->
                <div id="userDetailModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <span class="close-modal">&times;</span>
                        <div id="userDetailContent"></div>
                    </div>
                </div>
            </div>
        `;
    }

    setupManagerEventListeners() {
        // Week selection
        document.getElementById('loadWeekData').addEventListener('click', () => {
            this.loadWeekData();
        });

        document.getElementById('selectThisWeek').addEventListener('click', () => {
            this.selectThisWeek();
        });

        document.getElementById('selectLastWeek').addEventListener('click', () => {
            this.selectLastWeek();
        });

        document.getElementById('selectThisMonth').addEventListener('click', () => {
            this.selectThisMonth();
        });

        // Export all users
        document.getElementById('exportAllUsers').addEventListener('click', () => {
            this.exportAllUsersReport();
        });

        // Search and sort
        document.getElementById('userSearch').addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });

        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.sortUsers(e.target.value);
        });

        // Modal close
        const modal = document.getElementById('userDetailModal');
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Set default week (this week)
        this.selectThisWeek();
    }

    selectThisWeek() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        document.getElementById('weekStartDate').value = monday.toISOString().split('T')[0];
        document.getElementById('weekEndDate').value = sunday.toISOString().split('T')[0];
        
        this.loadWeekData();
    }

    selectLastWeek() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const lastMonday = new Date(today);
        lastMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - 7);
        
        const lastSunday = new Date(lastMonday);
        lastSunday.setDate(lastMonday.getDate() + 6);

        document.getElementById('weekStartDate').value = lastMonday.toISOString().split('T')[0];
        document.getElementById('weekEndDate').value = lastSunday.toISOString().split('T')[0];
        
        this.loadWeekData();
    }

    selectThisMonth() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        document.getElementById('weekStartDate').value = firstDay.toISOString().split('T')[0];
        document.getElementById('weekEndDate').value = lastDay.toISOString().split('T')[0];
        
        this.loadWeekData();
    }

    async loadAllUsersData() {
        try {
            showLoading();
            
            // Get all users from Firestore
            const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();
            const users = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Get stats for each user
            this.userStats = await Promise.all(users.map(async (user) => {
                return await this.getUserStats(user);
            }));

            this.updateManagerStats();
            this.renderUsersTable();
        } catch (error) {
            console.error('Error loading users data:', error);
            this.showMessage('Failed to load user data', 'error');
        } finally {
            hideLoading();
        }
    }

    async loadWeekData() {
        const startDate = document.getElementById('weekStartDate').value;
        const endDate = document.getElementById('weekEndDate').value;

        if (!startDate || !endDate) {
            this.showMessage('Please select both start and end dates', 'error');
            return;
        }

        this.selectedWeek = { startDate, endDate };
        await this.loadAllUsersData();
    }

    async getUserStats(user) {
        try {
            let testsQuery = db.collection(COLLECTIONS.TESTS).where('userId', '==', user.id);
            let warningsQuery = db.collection(COLLECTIONS.WARNINGS).where('userId', '==', user.id);

            // Apply date filter if week is selected
            if (this.selectedWeek) {
                testsQuery = testsQuery
                    .where('date', '>=', this.selectedWeek.startDate)
                    .where('date', '<=', this.selectedWeek.endDate);
                
                warningsQuery = warningsQuery
                    .where('date', '>=', this.selectedWeek.startDate)
                    .where('date', '<=', this.selectedWeek.endDate);
            }

            const [testsSnapshot, warningsSnapshot] = await Promise.all([
                testsQuery.get(),
                warningsQuery.get()
            ]);

            const tests = testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const warnings = warningsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Calculate compliance rate
            const compliantTests = tests.filter(t => t.result === 'Compliant').length;
            const complianceRate = tests.length > 0 ? (compliantTests / tests.length * 100).toFixed(1) : 0;

            // Calculate network distribution
            const networkStats = {};
            tests.forEach(test => {
                networkStats[test.network] = (networkStats[test.network] || 0) + 1;
            });

            // Get last activity
            const allDates = [...tests.map(t => t.date), ...warnings.map(w => w.date)];
            const lastActivity = allDates.length > 0 ? 
                new Date(Math.max(...allDates.map(d => new Date(d)))).toLocaleDateString() : 
                'No activity';

            return {
                user,
                tests,
                warnings,
                testCount: tests.length,
                warningCount: warnings.length,
                complianceRate,
                networkStats,
                lastActivity,
                totalActivity: tests.length + warnings.length
            };
        } catch (error) {
            console.error(`Error getting stats for user ${user.email}:`, error);
            return {
                user,
                tests: [],
                warnings: [],
                testCount: 0,
                warningCount: 0,
                complianceRate: 0,
                networkStats: {},
                lastActivity: 'Error',
                totalActivity: 0
            };
        }
    }

    updateManagerStats() {
        const totalUsers = this.userStats.length;
        const totalTests = this.userStats.reduce((sum, stat) => sum + stat.testCount, 0);
        const totalWarnings = this.userStats.reduce((sum, stat) => sum + stat.warningCount, 0);
        const avgTests = totalUsers > 0 ? (totalTests / totalUsers).toFixed(1) : 0;

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('totalTestsAll').textContent = totalTests;
        document.getElementById('totalWarningsAll').textContent = totalWarnings;
        document.getElementById('avgTestsPerUser').textContent = avgTests;
    }

    renderUsersTable() {
        const tableContainer = document.getElementById('usersTable');
        
        if (this.userStats.length === 0) {
            tableContainer.innerHTML = '<div class="empty-state">No user data available</div>';
            return;
        }

        const periodText = this.selectedWeek ? 
            `${new Date(this.selectedWeek.startDate).toLocaleDateString()} - ${new Date(this.selectedWeek.endDate).toLocaleDateString()}` :
            'All Time';

        tableContainer.innerHTML = `
            <div class="period-indicator">
                <strong>Period:</strong> ${periodText}
            </div>
            <table class="performance-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Tests</th>
                        <th>Warnings</th>
                        <th>Compliance</th>
                        <th>Last Activity</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.userStats.map(stat => `
                        <tr class="user-row" data-user-id="${stat.user.id}">
                            <td class="user-name">${stat.user.name || 'Unknown'}</td>
                            <td class="user-email">${stat.user.email}</td>
                            <td class="stat-value">${stat.testCount}</td>
                            <td class="stat-value">${stat.warningCount}</td>
                            <td class="stat-value">
                                <span class="compliance-badge ${stat.complianceRate >= 80 ? 'high' : stat.complianceRate >= 60 ? 'medium' : 'low'}">
                                    ${stat.complianceRate}%
                                </span>
                            </td>
                            <td class="last-activity">${stat.lastActivity}</td>
                            <td class="action-buttons">
                                <button class="btn-small btn-view" onclick="managerSystem.viewUserDetails('${stat.user.id}')">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                <button class="btn-small btn-export" onclick="managerSystem.exportUserReport('${stat.user.id}')">
                                    <i class="fas fa-download"></i> Export
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    filterUsers(searchTerm) {
        const rows = document.querySelectorAll('.user-row');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const name = row.querySelector('.user-name').textContent.toLowerCase();
            const email = row.querySelector('.user-email').textContent.toLowerCase();
            
            if (name.includes(term) || email.includes(term)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    sortUsers(sortBy) {
        switch (sortBy) {
            case 'name':
                this.userStats.sort((a, b) => a.user.name.localeCompare(b.user.name));
                break;
            case 'tests':
                this.userStats.sort((a, b) => b.testCount - a.testCount);
                break;
            case 'warnings':
                this.userStats.sort((a, b) => b.warningCount - a.warningCount);
                break;
            case 'activity':
                this.userStats.sort((a, b) => b.totalActivity - a.totalActivity);
                break;
        }
        this.renderUsersTable();
    }

    viewUserDetails(userId) {
        const userStat = this.userStats.find(stat => stat.user.id === userId);
        if (!userStat) return;

        const modal = document.getElementById('userDetailModal');
        const content = document.getElementById('userDetailContent');

        content.innerHTML = `
            <h2>📊 ${userStat.user.name}'s Performance Details</h2>
            
            <div class="user-detail-stats">
                <div class="detail-stat">
                    <div class="detail-label">Total Tests</div>
                    <div class="detail-value">${userStat.testCount}</div>
                </div>
                <div class="detail-stat">
                    <div class="detail-label">Total Warnings</div>
                    <div class="detail-value">${userStat.warningCount}</div>
                </div>
                <div class="detail-stat">
                    <div class="detail-label">Compliance Rate</div>
                    <div class="detail-value">${userStat.complianceRate}%</div>
                </div>
                <div class="detail-stat">
                    <div class="detail-label">Last Activity</div>
                    <div class="detail-value">${userStat.lastActivity}</div>
                </div>
            </div>

            <h3>Network Distribution</h3>
            <div class="network-breakdown">
                ${Object.entries(userStat.networkStats).map(([network, count]) => `
                    <div class="network-item">
                        <span class="network-name">${network}:</span>
                        <span class="network-count">${count} tests</span>
                    </div>
                `).join('')}
            </div>

            <h3>Recent Tests</h3>
            <div class="recent-items">
                ${userStat.tests.slice(0, 5).map(test => `
                    <div class="item-card">
                        <div class="item-header">
                            <span>${test.network} - ${test.type}</span>
                            <span class="item-date">${new Date(test.date).toLocaleDateString()}</span>
                        </div>
                        <div class="item-description">${test.description}</div>
                        <div class="item-result ${test.result.toLowerCase()}">${test.result}</div>
                    </div>
                `).join('') || '<p>No tests in this period</p>'}
            </div>

            <h3>Recent Warnings</h3>
            <div class="recent-items">
                ${userStat.warnings.slice(0, 5).map(warning => `
                    <div class="item-card warning">
                        <div class="item-header">
                            <span>${warning.reference}</span>
                            <span class="item-date">${new Date(warning.date).toLocaleDateString()}</span>
                        </div>
                        <div class="item-description">${warning.recipient}</div>
                        <div class="item-details">${warning.details}</div>
                    </div>
                `).join('') || '<p>No warnings in this period</p>'}
            </div>

            <div class="modal-actions">
                <button class="btn btn-primary" onclick="managerSystem.exportUserReport('${userId}')">
                    <i class="fas fa-download"></i> Export This User's Report
                </button>
            </div>
        `;

        modal.style.display = 'block';
    }

    async exportUserReport(userId) {
        const userStat = this.userStats.find(stat => stat.user.id === userId);
        if (!userStat) return;

        try {
            showLoading();

            const workbook = XLSX.utils.book_new();
            const periodText = this.selectedWeek ? 
                `${this.selectedWeek.startDate} to ${this.selectedWeek.endDate}` :
                'All Time';

            // Summary sheet
            const summaryData = [
                { 'User Performance Report': '' },
                { 'User Name': userStat.user.name },
                { 'Email': userStat.user.email },
                { 'Report Period': periodText },
                { 'Generated': new Date().toLocaleString() },
                { '': '' },
                { 'PERFORMANCE SUMMARY': '' },
                { 'Total Tests Conducted': userStat.testCount },
                { 'Total Warnings Issued': userStat.warningCount },
                { 'Compliance Rate': `${userStat.complianceRate}%` },
                { 'Last Activity': userStat.lastActivity },
                { '': '' },
                { 'NETWORK BREAKDOWN': '' },
                ...Object.entries(userStat.networkStats).map(([network, count]) => ({
                    [network]: `${count} tests`
                }))
            ];

            const summarySheet = XLSX.utils.json_to_sheet(summaryData);
            summarySheet['!cols'] = [{ wch: 30 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

            // Tests sheet
            if (userStat.tests.length > 0) {
                const testsData = userStat.tests.map(test => ({
                    'Date': new Date(test.date).toLocaleDateString(),
                    'Type': test.type,
                    'Network': test.network,
                    'Description': test.description,
                    'Result': test.result,
                    'File Link': test.fileLink || 'No file attached'
                }));
                const testsSheet = XLSX.utils.json_to_sheet(testsData);
                testsSheet['!cols'] = [
                    { wch: 12 }, { wch: 15 }, { wch: 12 },
                    { wch: 50 }, { wch: 15 }, { wch: 50 }
                ];
                XLSX.utils.book_append_sheet(workbook, testsSheet, "Tests");
            }

            // Warnings sheet
            if (userStat.warnings.length > 0) {
                const warningsData = userStat.warnings.map(warning => ({
                    'Date': new Date(warning.date).toLocaleDateString(),
                    'Type': warning.type,
                    'Recipient': warning.recipient,
                    'Reference': warning.reference,
                    'Details': warning.details,
                    'Problem Areas': warning.problemAreas
                }));
                const warningsSheet = XLSX.utils.json_to_sheet(warningsData);
                warningsSheet['!cols'] = [
                    { wch: 12 }, { wch: 20 }, { wch: 30 },
                    { wch: 15 }, { wch: 50 }, { wch: 50 }
                ];
                XLSX.utils.book_append_sheet(workbook, warningsSheet, "Warnings");
            }

            const fileName = `WASPA_${userStat.user.name.replace(/\s+/g, '_')}_Report_${this.getCurrentDate()}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            this.showMessage(`Report exported for ${userStat.user.name}`, 'success');
        } catch (error) {
            console.error('Error exporting user report:', error);
            this.showMessage('Failed to export user report', 'error');
        } finally {
            hideLoading();
        }
    }

    async exportAllUsersReport() {
        try {
            showLoading();

            const workbook = XLSX.utils.book_new();
            const periodText = this.selectedWeek ? 
                `${this.selectedWeek.startDate} to ${this.selectedWeek.endDate}` :
                'All Time';

            // Overview sheet
            const overviewData = [
                { 'WASPA Manager Report - All Users': '' },
                { 'Report Period': periodText },
                { 'Generated': new Date().toLocaleString() },
                { 'Generated By': dataManager.getCurrentUser().email },
                { '': '' },
                { 'OVERALL STATISTICS': '' },
                { 'Total Active Users': this.userStats.length },
                { 'Total Tests': this.userStats.reduce((s, u) => s + u.testCount, 0) },
                { 'Total Warnings': this.userStats.reduce((s, u) => s + u.warningCount, 0) },
                { 'Average Tests per User': (this.userStats.reduce((s, u) => s + u.testCount, 0) / this.userStats.length).toFixed(1) }
            ];

            const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
            overviewSheet['!cols'] = [{ wch: 30 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(workbook, overviewSheet, "Overview");

            // User summary sheet
            const userSummaryData = this.userStats.map(stat => ({
                'User Name': stat.user.name,
                'Email': stat.user.email,
                'Tests': stat.testCount,
                'Warnings': stat.warningCount,
                'Compliance Rate': `${stat.complianceRate}%`,
                'Last Activity': stat.lastActivity,
                'Total Activity': stat.totalActivity
            }));

            const summarySheet = XLSX.utils.json_to_sheet(userSummaryData);
            summarySheet['!cols'] = [
                { wch: 20 }, { wch: 30 }, { wch: 10 },
                { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
            ];
            XLSX.utils.book_append_sheet(workbook, summarySheet, "User Summary");

            // Individual sheets for top performers (top 10)
            const topPerformers = [...this.userStats]
                .sort((a, b) => b.totalActivity - a.totalActivity)
                .slice(0, 10);

            topPerformers.forEach((stat, index) => {
                if (stat.tests.length > 0) {
                    const userData = stat.tests.map(test => ({
                        'Date': new Date(test.date).toLocaleDateString(),
                        'Type': test.type,
                        'Network': test.network,
                        'Result': test.result
                    }));
                    
                    const userSheet = XLSX.utils.json_to_sheet(userData);
                    userSheet['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];
                    
                    // Truncate name for sheet (max 31 chars)
                    const sheetName = stat.user.name.substring(0, 28);
                    XLSX.utils.book_append_sheet(workbook, userSheet, sheetName);
                }
            });

            const fileName = `WASPA_All_Users_Report_${this.getCurrentDate()}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            this.showMessage('All users report exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting all users report:', error);
            this.showMessage('Failed to export all users report', 'error');
        } finally {
            hideLoading();
        }
    }

    getCurrentDate() {
        return new Date().toISOString().split('T')[0].replace(/-/g, '');
    }

    showMessage(message, type) {
        const container = document.querySelector('.manager-dashboard');
        if (!container) return;

        const existingMsg = container.querySelector('.manager-message');
        if (existingMsg) existingMsg.remove();

        const messageEl = document.createElement('div');
        messageEl.className = `message manager-message ${type}`;
        messageEl.textContent = message;
        
        container.insertBefore(messageEl, container.firstChild);
        
        if (type === 'success') {
            setTimeout(() => messageEl.remove(), 3000);
        }
    }
}

// Initialize manager system
let managerSystem;
document.addEventListener('DOMContentLoaded', () => {
    managerSystem = new ManagerSystem();
});