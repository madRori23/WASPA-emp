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
    SETTINGS: 'settings'
  };

  // Make variables globally available
  window.db = db;
  window.auth = auth;
  window.firebase = firebase;
  window.COLLECTIONS = COLLECTIONS;
  
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
    message = 'You do not have permission to perform this action.';
  } else if (error.code === 'unavailable') {
    message = 'Network error. Please check your connection.';
  } else if (error.code === 'not-found') {
    message = 'Requested data not found.';
  }
  
  return message;
};









