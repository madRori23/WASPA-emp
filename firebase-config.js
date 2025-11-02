// firebase-config.js - Firebase configuration and initialization
const firebaseConfig = {
  apiKey: "AIzaSyD6_csrO5MIn7F9cSE1-kHDrn0BGSBTbLo",
  authDomain: "waspa-portal.firebaseapp.com",
  projectId: "waspa-portal",
  storageBucket: "waspa-portal.firebasestorage.app",
  messagingSenderId: "1084614595732",
  appId: "1:1084614595732:web:3abdbd78ce35a27bd3d081"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

    window.db = db;
    window.auth = auth;
    window.firebase = firebase;
    
    console.log('✅ Firebase services initialized:', { db, auth });
    
    // Test connection
    testFirebaseConnection();
    
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
}

// Test Firebase connection
async function testFirebaseConnection() {
    try {
        console.log('🧪 Testing Firebase connection...');
        
        // Try a simple write operation
        const testRef = await db.collection('connectionTests').add({
            test: true,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            message: 'Connection test from WASPA portal'
        });
        
        console.log('✅ Firebase connection test PASSED - Document ID:', testRef.id);
        
        // Clean up test document
        await testRef.delete();
        console.log('🧹 Test document cleaned up');
        
    } catch (error) {
        console.error('❌ Firebase connection test FAILED:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
    }
}
// Initialize Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Firebase collections
const COLLECTIONS = {
    USERS: 'users',
    TESTS: 'tests',
    WARNINGS: 'warnings',
    SETTINGS: 'settings'
};

// Utility functions
const showLoading = () => {
    document.getElementById('loadingSpinner').style.display = 'flex';
};

const hideLoading = () => {
    document.getElementById('loadingSpinner').style.display = 'none';
};

// Error handler
const handleFirebaseError = (error) => {
    console.error('Firebase Error:', error);
    hideLoading();
    
    let message = 'An error occurred. Please try again.';
    
    if (error.code === 'permission-denied') {
        message = 'You do not have permission to perform this action.';
    } else if (error.code === 'unavailable') {
        message = 'Network error. Please check your connection.';
    } else if (error.code === 'not-found') {
        message = 'Requested data not found.';
    }
    
    return message;
};



