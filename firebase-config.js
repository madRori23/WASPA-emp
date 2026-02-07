// firebase-config.js - Firebase configuration and initialization
const firebaseConfig = {
  apiKey: "AIzaSyBdTWkylqrpva6uiZ0jU4m_mITncQB2--Y",
  authDomain: "waspa-portal-77264.firebaseapp.com",
  projectId: "waspa-portal-77264",
  storageBucket: "waspa-portal-77264.firebasestorage.app",
  messagingSenderId: "63736778623",
  appId: "1:63736778623:web:b828a62a3a588e5b9ad44a"
};

// Initialize Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('🔥 Firebase initialized successfully');
    } else {
        firebase.app(); // if already initialized, use that one
        console.log('🔥 Firebase already initialized');
    }

    // Initialize Firebase services
    const db = firebase.firestore();
    const auth = firebase.auth();

    // Firebase collections
    const COLLECTIONS = {
        USERS: 'users',
        TESTS: 'tests',
        WARNINGS: 'warnings',
        SETTINGS: 'settings',
        CONNECTION_TESTS: 'connectionTests'
    };

    // Make variables globally available
    window.db = db;
    window.auth = auth;
    window.firebase = firebase;
    window.COLLECTIONS = COLLECTIONS;
    
    console.log('✅ Firebase services initialized');
    
    // Test connection with error handling - run with delay
    setTimeout(() => testFirebaseConnection(), 1000);
    
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
}

// Test Firebase connection
async function testFirebaseConnection() {
    try {
        console.log('🧪 Testing Firebase connection...');
        
        // Add a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Connection test timeout')), 5000);
        });
        
        const testRef = db.collection('connectionTests').doc('test_connection');
        
        // Use Promise.race to prevent hanging
        await Promise.race([
            testRef.set({
                test: true,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                message: 'Connection test from WASPA portal',
                testId: Date.now()
            }),
            timeoutPromise
        ]);
        
        console.log('✅ Firebase connection test PASSED - Document written');
        
        // Try to read it back with timeout
        try {
            const readPromise = testRef.get();
            const readTimeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Read timeout')), 3000);
            });
            
            const docSnap = await Promise.race([readPromise, readTimeoutPromise]);
            if (docSnap.exists) {
                console.log('✅ Firebase read test PASSED');
            } else {
                console.log('⚠️ Firebase document not found');
            }
        } catch (readError) {
            console.log('⚠️ Firebase read test skipped:', readError.message);
        }
        
        // Clean up test document with timeout
        try {
            const deletePromise = testRef.delete();
            const deleteTimeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Delete timeout')), 3000);
            });
            
            await Promise.race([deletePromise, deleteTimeoutPromise]);
            console.log('🧹 Test document cleaned up');
        } catch (deleteError) {
            console.log('⚠️ Test document cleanup skipped:', deleteError.message);
        }
        
    } catch (error) {
        console.error('❌ Firebase connection test had issues:', error.name, error.message);
        
        // Don't show error if it's just a timeout
        if (error.message !== 'Connection test timeout') {
            // Provide specific guidance
            if (error.code === 'permission-denied') {
                console.error('💡 SOLUTION: Update Firestore security rules in Firebase Console');
                console.error('💡 Go to: Firebase Console > Firestore > Rules');
                
                // Show user-friendly message
                showFirebaseErrorToUser();
            }
        }
    }
}

// Show user-friendly error message
function showFirebaseErrorToUser() {
    const loginMessage = document.getElementById('loginMessage');
    if (loginMessage) {
        loginMessage.innerHTML = `
            <div class="message error">
                <strong>Database Connection Issue</strong><br>
                Please check Firebase security rules. 
                <a href="https://console.firebase.google.com/project/waspa-portal-77264/firestore/rules" 
                   target="_blank" style="color: white; text-decoration: underline;">
                   Click here to fix
                </a>
            </div>
        `;
    }
}

// Utility functions
window.showLoading = () => {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'flex';
    }
};

window.hideLoading = () => {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
};

// Error handler
window.handleFirebaseError = (error) => {
    console.error('Firebase Error:', error);
    hideLoading();
    
    let message = 'An error occurred. Please try again.';
    
    if (error.code === 'permission-denied') {
        message = 'Database permissions issue. Please check security rules.';
    } else if (error.code === 'unavailable') {
        message = 'Network error. Please check your connection.';
    } else if (error.code === 'not-found') {
        message = 'Requested data not found.';
    }
    
    return message;
};
