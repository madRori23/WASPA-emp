class DataManager {
    constructor() {
        this.currentUser = null;
        this.tests = [];
        this.warnings = [];
        this.listeners = [];
        this.isInitialized = false;
        this.firebaseReady = false;

        // Wait for Firebase before initializing
        this.waitForFirebase()
            .then(() => this.init())
            .catch(error => {
                console.error('❌ Failed to initialize Firebase:', error);
            });
    }

    /* =========================================================
       FIREBASE INITIALIZATION
       ========================================================= */

    async waitForFirebase() {
        const maxWaitTime = 10000;
        const startTime = Date.now();

        console.log('⏳ Waiting for Firebase services...');

        while (Date.now() - startTime < maxWaitTime) {
            if (window.auth && window.db && window.COLLECTIONS) {
                console.log('✅ Firebase services available');
                this.firebaseReady = true;
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error('Firebase initialization timeout');
    }

    async init() {
        if (!this.firebaseReady) return;

        console.log('🚀 Initializing DataManager...');

        return new Promise(resolve => {
            auth.onAuthStateChanged(async (user) => {
                console.log('🔍 Auth state changed:', user ? 'User logged in' : 'No user');

                if (user) {
                    // 🔥 ALWAYS load user role from Firestore (source of truth)
                    const userDoc = await db
                        .collection(COLLECTIONS.USERS)
                        .doc(user.uid)
                        .get();

                    const userData = userDoc.data() || {};

                    this.currentUser = {
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName || userData.name || user.email.split('@')[0],

                        // ✅ ROLE COMES FROM FIRESTORE ONLY
                        role: userData.role || 'user',
                        isManager: userData.isManager || false
                    };

                    console.log(
                        '👤 User loaded:',
                        this.currentUser.email,
                        '| Role:',
                        this.currentUser.role
                    );

                    await this.loadData();
                    this.setupRealTimeListeners();
                } else {
                    this.currentUser = null;
                    this.tests = [];
                    this.warnings = [];
                }

                this.isInitialized = true;
                console.log('✅ DataManager initialized');
                resolve();
            });
        });
    }

    /* =========================================================
       AUTHENTICATION (🔥 MAJOR FIXES HERE)
       ========================================================= */

    async authenticateUser(email, password) {
        if (!this.firebaseReady) {
            throw new Error('Authentication service not ready.');
        }

        try {
            showLoading();
            console.log('🔐 Authenticating user...');

            const cred = await auth.signInWithEmailAndPassword(email, password);
            const authUser = cred.user;

            console.log('✅ Firebase auth success:', authUser.email);

            const userRef = db.collection(COLLECTIONS.USERS).doc(authUser.uid);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                // ✅ CHANGE #1:
                // Only set DEFAULT role for BRAND NEW users
                await userRef.set({
                    email: authUser.email,
                    name: authUser.displayName || authUser.email.split('@')[0],
                    role: 'user',
                    isManager: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // ✅ CHANGE #2:
                // NEVER overwrite role on login
                await userRef.update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // ✅ CHANGE #3:
            // ALWAYS re-fetch Firestore user after login
            const freshUserDoc = await userRef.get();
            const userData = freshUserDoc.data();

            return {
                uid: authUser.uid,
                email: authUser.email,
                name: authUser.displayName || userData.name,
                role: userData.role || 'user',
                isManager: userData.isManager || false
            };

        } catch (error) {
            console.error('❌ Authentication error:', error);
            throw new Error('Invalid email or password');
        } finally {
            hideLoading();
        }
    }

    /* =========================================================
       REGISTRATION
       ========================================================= */

    async registerUser(email, password, name) {
        try {
            showLoading();

            const cred = await auth.createUserWithEmailAndPassword(email, password);
            const user = cred.user;

            await user.updateProfile({ displayName: name });

            await db.collection(COLLECTIONS.USERS).doc(user.uid).set({
                email: user.email,
                name: name,
                role: 'user',
                isManager: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });

            return {
                uid: user.uid,
                email: user.email,
                name: name,
                role: 'user',
                isManager: false
            };
        } finally {
            hideLoading();
        }
    }

    /* =========================================================
       USER STATE
       ========================================================= */

    setCurrentUser(user) {
        this.currentUser = user;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async logout() {
        await auth.signOut();
        this.currentUser = null;
        this.tests = [];
        this.warnings = [];
        this.cleanupListeners();
        this.notifyListeners();
    }

    /* =========================================================
       DATA LOADING
       ========================================================= */

    async loadData() {
        if (!this.currentUser) return;

        try {
            showLoading();

            const testsSnap = await db.collection(COLLECTIONS.TESTS)
                .where('userId', '==', this.currentUser.uid)
                .get();

            this.tests = testsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const warningsSnap = await db.collection(COLLECTIONS.WARNINGS)
                .where('userId', '==', this.currentUser.uid)
                .get();

            this.warnings = warningsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            this.notifyListeners();
        } finally {
            hideLoading();
        }
    }

    /* =========================================================
       REAL-TIME LISTENERS
       ========================================================= */

    setupRealTimeListeners() {
        if (!this.currentUser) return;

        this.testsUnsubscribe = db.collection(COLLECTIONS.TESTS)
            .where('userId', '==', this.currentUser.uid)
            .onSnapshot(snapshot => {
                this.tests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                this.notifyListeners();
            });

        this.warningsUnsubscribe = db.collection(COLLECTIONS.WARNINGS)
            .where('userId', '==', this.currentUser.uid)
            .onSnapshot(snapshot => {
                this.warnings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                this.notifyListeners();
            });
    }

    cleanupListeners() {
        if (this.testsUnsubscribe) this.testsUnsubscribe();
        if (this.warningsUnsubscribe) this.warningsUnsubscribe();
    }

    /* =========================================================
       MANAGER ROLE MANAGEMENT
       ========================================================= */

    async setUserAsManager(userId, isManager = true) {
        await db.collection(COLLECTIONS.USERS).doc(userId).update({
            role: isManager ? 'manager' : 'user',
            isManager: isManager
        });

        // ✅ Update local cache if current user
        if (this.currentUser?.uid === userId) {
            this.currentUser.role = isManager ? 'manager' : 'user';
            this.currentUser.isManager = isManager;
        }
    }

    /* 
       EVENT SYSTEM
        */

    addListener(cb) {
        this.listeners.push(cb);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb());
    }
}

/* =========================================================
   GLOBAL INSTANCE
   ========================================================= */

let dataManager;
dataManager = new DataManager();
