
// Firebase Configuration - ACTUAL VALUES FROM FIREBASE
const CONFIG = {
    // Firebase Config (من Firebase Console)
    FIREBASE_API_KEY: "AIzaSyD9763GBD2mjYp3RGf4ZWwjsf5qAnheXHM",
    FIREBASE_AUTH_DOMAIN: "money-manager-9e9ca.firebaseapp.com",
    FIREBASE_PROJECT_ID: "money-manager-9e9ca",
    FIREBASE_STORAGE_BUCKET: "money-manager-9e9ca.firebasestorage.app",
    FIREBASE_MESSAGING_SENDER_ID: "85460317731",
    FIREBASE_APP_ID: "1:85460317731:web:c427969d0c4abc35be2396",
    FIREBASE_MEASUREMENT_ID: "G-LYDZVQGEYG",
    
    // App Configuration
    APP_NAME: "Money Manager",
    APP_VERSION: "1.0.0",
    ENVIRONMENT: "production",
    
    // Security Settings
    CSRF_TOKEN_LIFETIME: 7200, // 2 hours in seconds
    SESSION_TIMEOUT: 28800, // 8 hours in seconds
    RATE_LIMIT_WINDOW: 60, // 1 minute in seconds
    MAX_REQUESTS_PER_MINUTE: 60,
    
    // Database Settings
    FIRESTORE_CACHE_SIZE: 50, // MB
    OFFLINE_PERSISTENCE: true
};

// Make it globally available
window.CONFIG = CONFIG;

console.log("✅ Config file loaded with REAL Firebase values");
console.log("App:", CONFIG.APP_NAME, "v" + CONFIG.APP_VERSION);
console.log("Firebase Project:", CONFIG.FIREBASE_PROJECT_ID);
console.log("Environment:", CONFIG.ENVIRONMENT);
