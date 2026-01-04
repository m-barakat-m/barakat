
// Firebase Configuration - Reads from window.CONFIG
const firebaseConfig = {
    apiKey: window.CONFIG.FIREBASE_API_KEY,
    authDomain: window.CONFIG.FIREBASE_AUTH_DOMAIN,
    projectId: window.CONFIG.FIREBASE_PROJECT_ID,
    storageBucket: window.CONFIG.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: window.CONFIG.FIREBASE_MESSAGING_SENDER_ID,
    appId: window.CONFIG.FIREBASE_APP_ID,
    measurementId: window.CONFIG.FIREBASE_MEASUREMENT_ID
};

// Make it globally available
window.firebaseConfig = firebaseConfig;

// Validation check
(function() {
    console.group('Firebase Configuration Status');
    console.log('Project ID:', firebaseConfig.projectId);
    console.log('Auth Domain:', firebaseConfig.authDomain);
    
    // Check if config is using placeholder values
    const hasPlaceholder = 
        firebaseConfig.apiKey.includes("your_") ||
        firebaseConfig.projectId.includes("your-project") ||
        firebaseConfig.apiKey === "AIzaSyC_your_actual_api_key_from_firebase";
    
    if (hasPlaceholder) {
        console.error('❌ FIREBASE CONFIG HAS PLACEHOLDER VALUES!');
        console.error('Please update config.js with your actual Firebase values');
        
        // Show alert to user
        setTimeout(() => {
            alert('⚠️ Firebase configuration is not set!\n\nPlease open config.js file and replace the placeholder values with your actual Firebase credentials from Firebase Console.');
        }, 1000);
    } else {
        console.log('✅ Firebase config loaded successfully');
    }
    console.groupEnd();
})();
