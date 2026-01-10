class DataManager {
    constructor() {
        this.currentUser = null;
        this.tests = [];
        this.warnings = [];
        this.listeners = [];
        this.isInitialized = false;
        this.firebaseReady = false;
        
        // Wait for Firebase to be ready before initializing
        this.waitForFirebase().then(() => {
            this.init();
        }).catch(error => {
            console.error('❌ Failed to initialize Firebase:', error);
        });
    }

    // Wait for Firebase to be available globally
    async waitForFirebase() {
        const maxWaitTime = 10000; // 10 seconds
        const startTime = Date.now();
        
        console.log('⏳ Waiting for Firebase services...');
        
        while (Date.now() - startTime < maxWaitTime) {
            // Check if Firebase services are available globally
            if (window.auth && window.db && window.COLLECTIONS) {
                console.log('✅ Firebase services available');
                this.firebaseReady = true;
                return;
            }
            // Wait 100ms and check again
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error('Firebase initialization timeout - services not available after 10 seconds');
    }

    async init() {
        if (!this.firebaseReady) {
            console.error('Firebase not ready, cannot initialize DataManager');
            return;
        }

        console.log('🚀 Initializing DataManager...');

        // Wait for auth state to be determined
        return new Promise((resolve) => {
            auth.onAuthStateChanged(async (user) => {
                console.log('🔐 Auth state changed:', user ? 'User logged in' : 'No user');
                if (user) {
                    this.currentUser = {
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName || user.email.split('@')[0]
                    };
                    await this.loadData();
                    this.setupRealTimeListeners();
                } else {
                    this.currentUser = null;
                    this.tests = [];
                    this.warnings = [];
                }
                this.isInitialized = true;
                console.log('✅ DataManager initialized successfully');
                resolve();
            });
        });
    }

    async loadData() {
        if (!this.currentUser) return;

        try {
            showLoading();
            console.log('📦 Loading user data...');
            
            // Load tests
            const testsSnapshot = await db.collection(COLLECTIONS.TESTS)
                .where('userId', '==', this.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();
            
            this.tests = testsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log(`📊 Loaded ${this.tests.length} tests`);

            // Load warnings
            const warningsSnapshot = await db.collection(COLLECTIONS.WARNINGS)
                .where('userId', '==', this.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();
            
            this.warnings = warningsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log(`⚠️ Loaded ${this.warnings.length} warnings`);

            this.notifyListeners();
        } catch (error) {
            console.error('❌ Error loading data:', error);
            throw error;
        } finally {
            hideLoading();
        }
    }

    // User authentication methods
    async authenticateUser(email, password) {
        if (!this.firebaseReady) {
            throw new Error('Authentication service not ready. Please refresh the page.');
        }

        try {
            showLoading();
            console.log('🔐 Authenticating user...');
            
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('✅ User authenticated:', user.email);

            // Check if user exists in users collection, if not create them
            const userDoc = await db.collection(COLLECTIONS.USERS).doc(user.uid).get();
            
            if (!userDoc.exists) {
                console.log('👤 Creating new user document...');
                await db.collection(COLLECTIONS.USERS).doc(user.uid).set({
                    email: user.email,
                    name: user.displayName || user.email.split('@')[0],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Update last login
                await db.collection(COLLECTIONS.USERS).doc(user.uid).update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            return {
                uid: user.uid,
                email: user.email,
                name: user.displayName || user.email.split('@')[0]
            };
        } catch (error) {
            console.error('❌ Authentication error:', error);
            
            // Provide user-friendly error messages
            let userMessage = 'Authentication failed. Please try again.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    userMessage = 'No account found with this email.';
                    break;
                case 'auth/wrong-password':
                    userMessage = 'Incorrect password. Please try again.';
                    break;
                case 'auth/invalid-email':
                    userMessage = 'Please enter a valid email address.';
                    break;
                case 'auth/user-disabled':
                    userMessage = 'This account has been disabled.';
                    break;
            }
            
            throw new Error(userMessage);
        } finally {
            hideLoading();
        }
    }

    async registerUser(email, password, name) {
        if (!this.firebaseReady) {
            throw new Error('Registration service not ready. Please refresh the page.');
        }

        try {
            showLoading();
            console.log('👤 Starting user registration...');
            
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('✅ User created:', user.uid);

            // Update profile
            await user.updateProfile({
                displayName: name
            });
            
            console.log('📝 Creating user document...');
            
            // Create user document
            await db.collection(COLLECTIONS.USERS).doc(user.uid).set({
                email: user.email,
                name: name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('🎉 User registration completed successfully');
            
            return {
                uid: user.uid,
                email: user.email,
                name: name
            };
        } catch (error) {
            console.error('❌ Registration error:', {
                code: error.code,
                message: error.message
            });
            
            // Provide user-friendly error messages
            let userMessage = 'Registration failed. Please try again.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    userMessage = 'This email is already registered.';
                    break;
                case 'auth/invalid-email':
                    userMessage = 'Please enter a valid email address.';
                    break;
                case 'auth/operation-not-allowed':
                    userMessage = 'Email/password accounts are not enabled. Please contact support.';
                    break;
                case 'auth/weak-password':
                    userMessage = 'Password is too weak. Please use at least 6 characters.';
                    break;
                case 'auth/configuration-not-found':
                    userMessage = 'Authentication service is not configured properly. Please refresh the page.';
                    break;
            }
            
            throw new Error(userMessage);
        } finally {
            hideLoading();
        }
    }

    setCurrentUser(user) {
        this.currentUser = user;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async logout() {
        try {
            console.log('🚪 Logging out...');
            await auth.signOut();
            this.currentUser = null;
            this.tests = [];
            this.warnings = [];
            this.cleanupListeners();
            this.notifyListeners();
            console.log('✅ Logout successful');
        } catch (error) {
            console.error('❌ Logout error:', error);
            throw error;
        }
    }

    // Event system for real-time updates
    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }

    // Test methods
    async addTest(testData) {
    if (!this.currentUser) throw new Error('User not authenticated');

    try {
        showLoading();
        const test = {
            userId: this.currentUser.uid,
            date: testData.date,
            type: testData.type,
            network: testData.network,
            description: testData.description,
            result: testData.result,
            fileLink: testData.fileLink || '', // Add file link field
            createdBy: this.currentUser.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection(COLLECTIONS.TESTS).add(test);
        test.id = docRef.id;
        
        console.log('✅ Test added:', test.id);
        return test;
    } catch (error) {
        console.error('❌ Error adding test:', error);
        throw error;
    } finally {
        hideLoading();
    }
}

    getTests() {
        return this.tests;
    }

    getTestsToday() {
        const today = new Date().toDateString();
        return this.tests.filter(test => {
            const testDate = new Date(test.date).toDateString();
            return testDate === today;
        });
    }

    async clearTests() {
        if (!this.currentUser) throw new Error('User not authenticated');

        try {
            showLoading();
            // Get all user's tests
            const testsSnapshot = await db.collection(COLLECTIONS.TESTS)
                .where('userId', '==', this.currentUser.uid)
                .get();
            
            // Delete all tests in batch
            const batch = db.batch();
            testsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log('✅ Tests cleared successfully');
        } catch (error) {
            console.error('❌ Error clearing tests:', error);
            throw error;
        } finally {
            hideLoading();
        }
    }

    // Warning methods
    async addWarning(warningData) {
        if (!this.currentUser) throw new Error('User not authenticated');

        try {
            showLoading();
            const warning = {
                userId: this.currentUser.uid,
                date: warningData.date,
                type: warningData.type,
                recipient: warningData.recipient,
                reference: warningData.reference,
                details: warningData.details,
                problemAreas: warningData.problemAreas,
                createdBy: this.currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const docRef = await db.collection(COLLECTIONS.WARNINGS).add(warning);
            warning.id = docRef.id;
            
            console.log('✅ Warning added:', warning.id);
            return warning;
        } catch (error) {
            console.error('❌ Error adding warning:', error);
            throw error;
        } finally {
            hideLoading();
        }
    }

    getWarnings() {
        return this.warnings;
    }

    getWarningsToday() {
        const today = new Date().toDateString();
        return this.warnings.filter(warning => {
            const warningDate = new Date(warning.date).toDateString();
            return warningDate === today;
        });
    }

    async clearWarnings() {
        if (!this.currentUser) throw new Error('User not authenticated');

        try {
            showLoading();
            // Get all user's warnings
            const warningsSnapshot = await db.collection(COLLECTIONS.WARNINGS)
                .where('userId', '==', this.currentUser.uid)
                .get();
            
            // Delete all warnings in batch
            const batch = db.batch();
            warningsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log('✅ Warnings cleared successfully');
        } catch (error) {
            console.error('❌ Error clearing warnings:', error);
            throw error;
        } finally {
            hideLoading();
        }
    }

    // Real-time listeners
    setupRealTimeListeners() {
        if (!this.currentUser) return;

        console.log('👂 Setting up real-time listeners...');

        // Real-time tests listener
        this.testsUnsubscribe = db.collection(COLLECTIONS.TESTS)
            .where('userId', '==', this.currentUser.uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                this.tests = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`📊 Real-time tests update: ${this.tests.length} tests`);
                this.notifyListeners();
            }, (error) => {
                console.error('❌ Tests real-time listener error:', error);
            });

        // Real-time warnings listener
        this.warningsUnsubscribe = db.collection(COLLECTIONS.WARNINGS)
            .where('userId', '==', this.currentUser.uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                this.warnings = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`⚠️ Real-time warnings update: ${this.warnings.length} warnings`);
                this.notifyListeners();
            }, (error) => {
                console.error('❌ Warnings real-time listener error:', error);
            });
    }

    // Cleanup listeners
    cleanupListeners() {
        console.log('🧹 Cleaning up listeners...');
        if (this.testsUnsubscribe) {
            this.testsUnsubscribe();
        }
        if (this.warningsUnsubscribe) {
            this.warningsUnsubscribe();
        }
    }

    // Export methods (remain the same as they work with local data)
    exportTestsToCSV() {
        const headers = ['Date', 'Type', 'Network', 'Description', 'Result', 'Created By'];
        const csvData = this.tests.map(test => [
            test.date,
            test.type,
            test.network,
            `"${test.description.replace(/"/g, '""')}"`,
            test.result,
            test.createdBy
        ]);
        
        return [headers, ...csvData].map(row => row.join(',')).join('\n');
    }

    exportWarningsToCSV() {
        const headers = ['Date', 'Type', 'Recipient', 'Reference', 'Details', 'Problem Areas', 'Created By'];
        const csvData = this.warnings.map(warning => [
            warning.date,
            warning.type,
            `"${warning.recipient.replace(/"/g, '""')}"`,
            warning.reference,
            `"${warning.details.replace(/"/g, '""')}"`,
            `"${warning.problemAreas.replace(/"/g, '""')}"`,
            warning.createdBy
        ]);
        
        return [headers, ...csvData].map(row => row.join(',')).join('\n');
    }

    exportAllData() {
        return {
            tests: this.tests,
            warnings: this.warnings,
            exportedAt: new Date().toISOString(),
            exportedBy: this.currentUser.email
        };
    }

    // Stats methods
    getTotalTests() {
        return this.tests.length;
    }

    getActiveDays() {
        const uniqueDates = new Set(this.tests.map(test => test.date));
        return uniqueDates.size;
    }

    // Filter methods for advanced export
    getFilteredTests(startDate, endDate, network) {
        let filteredTests = this.tests;

        if (startDate) {
            filteredTests = filteredTests.filter(test => test.date >= startDate);
        }

        if (endDate) {
            filteredTests = filteredTests.filter(test => test.date <= endDate);
        }

        if (network) {
            filteredTests = filteredTests.filter(test => test.network === network);
        }

        return filteredTests;
    }

    getFilteredWarnings(startDate, endDate) {
        let filteredWarnings = this.warnings;

        if (startDate) {
            filteredWarnings = filteredWarnings.filter(warning => warning.date >= startDate);
        }

        if (endDate) {
            filteredWarnings = filteredWarnings.filter(warning => warning.date <= endDate);
        }

        return filteredWarnings;
    }
}

// Initialize global data manager with error handling
let dataManager;

try {
    dataManager = new DataManager();
    console.log('✅ DataManager instance created');
} catch (error) {
    console.error('❌ DataManager creation failed:', error);
}

