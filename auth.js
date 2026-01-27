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
        // Wait for data manager to initialize
        await dataManager.init();
        
        this.setupEventListeners();
        
        // Check if user is already logged in
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
            const user = await dataManager.authenticateUser(email, password);
            dataManager.setCurrentUser(user);
            dataManager.setupRealTimeListeners();
            this.showDashboard();
            messageEl.textContent = '';
            messageEl.className = 'message';
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Invalid email or password';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your connection.';
            }
            
            messageEl.textContent = errorMessage;
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

        // Basic validation
        if (password !== confirmPassword) {
            messageEl.textContent = 'Passwords do not match.';
            messageEl.className = 'message error';
            return;
        }

        if (password.length < 6) {
            messageEl.textContent = 'Password must be at least 6 characters long.';
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
            let errorMessage = 'Failed to create account. Please try again.';
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'An account with this email already exists.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Please use a stronger password.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your connection.';
            }
            
            messageEl.textContent = errorMessage;
            messageEl.className = 'message error';
        }
    }

    async handleLogout() {
        try {
            dataManager.cleanupListeners();
            await dataManager.logout();
            this.showLoginForm();
            this.loginForm.reset();
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error during logout. Please try again.');
        }
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
        this.loginForm.parentElement.style.display = 'block';
        this.registerForm.style.display = 'none';
        this.loginPage.classList.add('active');
        this.dashboardPage.classList.remove('active');
    }

    showRegisterForm(e = null) {
        if (e) e.preventDefault();
        this.loginForm.parentElement.style.display = 'none';
        this.registerForm.style.display = 'block';
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
