// auth.js - Authentication handling
class AuthManager {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.loginPage = document.getElementById('loginPage');
        this.dashboardPage = document.getElementById('dashboardPage');
        
        this.init();
    }

    init() {
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Check if user is already logged in
        this.checkExistingSession();
    }

    handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const messageEl = document.getElementById('loginMessage');

        const user = dataManager.authenticateUser(email, password);
        
        if (user) {
            dataManager.setCurrentUser(user);
            this.showDashboard();
            messageEl.textContent = '';
            messageEl.className = 'message';
        } else {
            messageEl.textContent = 'Invalid email or password';
            messageEl.className = 'message error';
        }
    }

    handleLogout() {
        dataManager.logout();
        this.showLogin();
        this.loginForm.reset();
    }

    checkExistingSession() {
        const user = dataManager.getCurrentUser();
        if (user) {
            this.showDashboard();
        } else {
            this.showLogin();
        }
    }

    showLogin() {
        this.loginPage.classList.add('active');
        this.dashboardPage.classList.remove('active');
    }

    showDashboard() {
        this.loginPage.classList.remove('active');
        this.dashboardPage.classList.add('active');
        
        // Update user info in dashboard
        const user = dataManager.getCurrentUser();
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userEmail').textContent = user.email;
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});
