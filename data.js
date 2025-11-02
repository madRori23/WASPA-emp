// data.js - Data management with Firebase
class DataManager {
    constructor() {
        this.currentUser = null;
        this.tests = [];
        this.warnings = [];
        this.listeners = [];
        this.isInitialized = false;
        
        this.init();
    }

    if (typeof auth === 'undefined' || typeof db === 'undefined') {
      console.error('Firebase not initialized');
      // Retry initialization after a short delay
      setTimeout(() => {
        if (typeof auth !== 'undefined' && typeof db !== 'undefined') {
          this.init();
        }
      }, 1000);
      return;
    }
    
    this.init();
  }

    async init() {
        // Wait for auth state to be determined
        return new Promise((resolve) => {
            onAuthStateChanged(async (user) => {
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
                resolve();
            });
        });
    }

    async loadData() {
        if (!this.currentUser) return;

        try {
            showLoading();
            
            // Load tests
            const testsSnapshot = await db.collection(COLLECTIONS.TESTS)
                .where('userId', '==', this.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();
            
            this.tests = testsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Load warnings
            const warningsSnapshot = await db.collection(COLLECTIONS.WARNINGS)
                .where('userId', '==', this.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get();
            
            this.warnings = warningsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.notifyListeners();
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        } finally {
            hideLoading();
        }
    }

    // User authentication methods
    async authenticateUser(email, password) {
        try {
            showLoading();
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Check if user exists in users collection, if not create them
            const userDoc = await db.collection(COLLECTIONS.USERS).doc(user.uid).get();
            
            if (!userDoc.exists) {
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
            console.error('Authentication error:', error);
            throw error;
        } finally {
            hideLoading();
        }
    }

    async registerUser(email, password, name) {
        try {
            showLoading();
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update profile
            await user.updateProfile({
                displayName: name
            });
            
            // Create user document
            await db.collection(COLLECTIONS.USERS).doc(user.uid).set({
                email: user.email,
                name: name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return {
                uid: user.uid,
                email: user.email,
                name: name
            };
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
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
            await auth.signOut();
            this.currentUser = null;
            this.tests = [];
            this.warnings = [];
            this.notifyListeners();
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    // Event system for real-time updates
    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => callback());
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
                createdBy: this.currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const docRef = await db.collection(COLLECTIONS.TESTS).add(test);
            test.id = docRef.id;
            
            // Don't add to local array here - real-time listener will handle it
            this.notifyListeners();
            
            return test;
        } catch (error) {
            console.error('Error adding test:', error);
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
            
            // Local array will be updated by real-time listener
        } catch (error) {
            console.error('Error clearing tests:', error);
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
            
            // Don't add to local array here - real-time listener will handle it
            this.notifyListeners();
            
            return warning;
        } catch (error) {
            console.error('Error adding warning:', error);
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
            
            // Local array will be updated by real-time listener
        } catch (error) {
            console.error('Error clearing warnings:', error);
            throw error;
        } finally {
            hideLoading();
        }
    }

    // Real-time listeners
    setupRealTimeListeners() {
        if (!this.currentUser) return;

        // Real-time tests listener
        this.testsUnsubscribe = db.collection(COLLECTIONS.TESTS)
            .where('userId', '==', this.currentUser.uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                this.tests = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                this.notifyListeners();
            }, (error) => {
                console.error('Tests real-time listener error:', error);
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
                this.notifyListeners();
            }, (error) => {
                console.error('Warnings real-time listener error:', error);
            });
    }

    // Cleanup listeners
    cleanupListeners() {
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

// Initialize global data manager
const dataManager = new DataManager();


