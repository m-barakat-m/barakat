
// Firebase Configuration - Reads from window.CONFIG
const getFirebaseConfig = () => {
    // Wait for CONFIG to be loaded
    if (!window.CONFIG) {
        console.error("❌ CONFIG is not loaded!");
        
        // Try to load config manually
        setTimeout(() => {
            if (!window.CONFIG) {
                alert("❌ Error: Config file not loaded!\nPlease refresh the page.");
            }
        }, 1000);
        
        throw new Error("Config file not loaded. Make sure config.js is loaded before firebase-config.js");
    }
    
    const config = window.CONFIG;
    
    // Create Firebase config object
    const firebaseConfig = {
        apiKey: config.FIREBASE_API_KEY,
        authDomain: config.FIREBASE_AUTH_DOMAIN,
        projectId: config.FIREBASE_PROJECT_ID,
        storageBucket: config.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
        appId: config.FIREBASE_APP_ID,
        measurementId: config.FIREBASE_MEASUREMENT_ID
    };
    
    // Validate Firebase config
    console.group('Firebase Configuration Status');
    console.log('✅ Project ID:', firebaseConfig.projectId);
    console.log('✅ Auth Domain:', firebaseConfig.authDomain);
    console.log('✅ API Key:', firebaseConfig.apiKey.substring(0, 10) + '...');
    console.groupEnd();
    
    return firebaseConfig;
};

// Initialize and export
const firebaseConfig = getFirebaseConfig();
window.firebaseConfig = firebaseConfig;

console.log("✅ Firebase config loaded successfully!");
