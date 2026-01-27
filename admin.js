class AdminManager {
    constructor() {
        this.promoteUserForm = null;
        this.allUsersList = null;
        this.adminMessage = null;

        this.init();
    }

    async init() {
        await this.waitForDataManager();

        this.promoteUserForm = document.getElementById('promoteUserForm');
        this.allUsersList = document.getElementById('allUsersList');
        this.adminMessage = document.getElementById('adminMessage');

        if (this.promoteUserForm) {
            this.promoteUserForm.addEventListener('submit', (e) => this.handlePromoteUser(e));
        }

        await this.loadAllUsers();
    }

    async waitForDataManager() {
        while (!window.dataManager || !dataManager.isInitialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async handlePromoteUser(e) {
        e.preventDefault();

        const email = document.getElementById('promoteEmail').value.trim();
        const action = document.getElementById('promoteAction').value;

        if (!email || !action) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        try {
            showLoading();

            const user = await dataManager.getUserByEmail(email);

            if (!user) {
                this.showMessage('User not found with that email', 'error');
                return;
            }

            const isManager = action === 'promote';
            await dataManager.setUserAsManager(user.id, isManager);

            this.showMessage(
                `User ${email} ${isManager ? 'promoted to manager' : 'demoted to regular user'} successfully!`,
                'success'
            );

            this.promoteUserForm.reset();
            await this.loadAllUsers();

        } catch (error) {
            console.error('Error updating user role:', error);
            this.showMessage('Failed to update user role. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    }

    async loadAllUsers() {
        if (!this.allUsersList) return;

        try {
            this.allUsersList.innerHTML = '<div class="loading-state">Loading users...</div>';

            const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();
            const users = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (users.length === 0) {
                this.allUsersList.innerHTML = '<div class="empty-state">No users found</div>';
                return;
            }

            this.renderUsersList(users);
        } catch (error) {
            console.error('Error loading users:', error);
            this.allUsersList.innerHTML = '<div class="empty-state error">Failed to load users</div>';
        }
    }

    renderUsersList(users) {
        this.allUsersList.innerHTML = `
            <table class="admin-users-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Last Login</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.name || 'Unknown'}</td>
                            <td>${user.email}</td>
                            <td>
                                <span class="role-badge ${user.isManager ? 'manager' : 'user'}">
                                    ${user.isManager ? 'Manager' : 'User'}
                                </span>
                            </td>
                            <td>${this.formatDate(user.lastLogin)}</td>
                            <td>
                                <button
                                    class="btn-small ${user.isManager ? 'btn-demote' : 'btn-promote'}"
                                    onclick="adminManager.quickToggleRole('${user.id}', '${user.email}', ${!user.isManager})">
                                    ${user.isManager ? 'Demote' : 'Promote'}
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async quickToggleRole(userId, email, makeManager) {
        const action = makeManager ? 'promote' : 'demote';
        const confirmMsg = `Are you sure you want to ${action} ${email} ${makeManager ? 'to manager' : 'to regular user'}?`;

        if (!confirm(confirmMsg)) return;

        try {
            showLoading();
            await dataManager.setUserAsManager(userId, makeManager);
            this.showMessage(
                `User ${makeManager ? 'promoted to manager' : 'demoted to user'} successfully!`,
                'success'
            );
            await this.loadAllUsers();
        } catch (error) {
            console.error('Error toggling user role:', error);
            this.showMessage('Failed to update user role', 'error');
        } finally {
            hideLoading();
        }
    }

    formatDate(timestamp) {
        if (!timestamp) return 'Never';

        let date;
        if (timestamp.toDate) {
            date = timestamp.toDate();
        } else if (timestamp.seconds) {
            date = new Date(timestamp.seconds * 1000);
        } else {
            date = new Date(timestamp);
        }

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showMessage(message, type) {
        if (!this.adminMessage) return;

        this.adminMessage.textContent = message;
        this.adminMessage.className = `message ${type}`;
        this.adminMessage.style.display = 'block';

        if (type === 'success') {
            setTimeout(() => {
                this.adminMessage.style.display = 'none';
            }, 3000);
        }
    }
}

let adminManager;
document.addEventListener('DOMContentLoaded', () => {
    adminManager = new AdminManager();
});
