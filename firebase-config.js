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
firebase.initializeApp(firebaseConfig);

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
