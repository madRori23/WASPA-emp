// auth.js - Authentication handling with Firebase
class AuthManager {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.loginPage = document.getElementById('loginPage');
        this.dashboardPage = document.getElementById('dashboardPage');
        this.registerForm = document.getElementById('registerForm');
        this.registerFormElement = document.getElementById('registerFormElement');
        this.showRegisterLink = document.getElementById('showRegister');
        this.showLoginLink = document.getElementById('showLogin');

        this.init();
    }

    async init() {
        await dataManager.init();
        this.setupEventListeners();
        this.checkExistingSession();
    }

    setupEventListeners() {
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        this.registerFormElement.addEventListener('submit', (e) => this.handleRegister(e));
        this.showRegisterLink.addEventListener('click', (e) => this.showRegisterForm(e));
        this.showLoginLink.addEventListener('click', (e) => this.showLoginForm(e));
    }

    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const messageEl = document.getElementById('loginMessage');

        try {
            // 🔥 Auth + Firestore profile
            const user = await dataManager.authenticateUser(email, password);
            dataManager.setCurrentUser(user);
            dataManager.setupRealTimeListeners();

            if (user.role === 'manager') {
            window.location.href = 'manager-dashboard.html';
            }   else {
            window.location.href = 'dashboard.html';
            }

        } catch (error) {
            console.error('Login error:', error);
            messageEl.textContent = 'Invalid email or password';
            messageEl.className = 'message error';
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const messageEl = document.getElementById('registerMessage');

        if (password !== confirmPassword) {
            messageEl.textContent = 'Passwords do not match.';
            messageEl.className = 'message error';
            return;
        }

        try {
            const user = await dataManager.registerUser(email, password, name);
            dataManager.setCurrentUser(user);
            dataManager.setupRealTimeListeners();

            this.showDashboard();
            messageEl.textContent = '';
            messageEl.className = 'message';

        } catch (error) {
            console.error('Registration error:', error);
            messageEl.textContent = 'Registration failed.';
            messageEl.className = 'message error';
        }
    }

    async handleLogout() {
        await dataManager.logout();
        this.showLoginForm();
        this.loginForm.reset();
    }

    checkExistingSession() {
        const user = dataManager.getCurrentUser();
        if (user) {
            dataManager.setupRealTimeListeners();
            this.showDashboard();
        } else {
            this.showLoginForm();
        }
    }

    showLoginForm(e = null) {
        if (e) e.preventDefault();
        this.loginPage.classList.add('active');
        this.dashboardPage.classList.remove('active');
        this.loginForm.parentElement.style.display = 'block';
        this.registerForm.style.display = 'none';
    }

    showRegisterForm(e = null) {
        if (e) e.preventDefault();
        this.loginForm.parentElement.style.display = 'none';
        this.registerForm.style.display = 'block';
    }

    // UPDATED DASHBOARD LOGIC
    showDashboard() {
        const user = dataManager.getCurrentUser();

        this.loginPage.classList.remove('active');
        this.dashboardPage.classList.add('active');

        document.getElementById('userName').textContent = user.name;
        document.getElementById('userEmail').textContent = user.email;

        // Role flag for UI logic
        if (user.role === 'manager' || user.isManager === true) {
            document.body.classList.add('manager-user');
        } else {
            document.body.classList.remove('manager-user');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

