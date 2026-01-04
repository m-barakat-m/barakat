
// Firebase Configuration - ENVIRONMENT BASED
const getFirebaseConfig = () => {
    // Try to get from environment variables first
    const envConfig = {
        apiKey: process.env.FIREBASE_API_KEY || window.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || window.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID || window.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || window.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || window.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID || window.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID || window.FIREBASE_MEASUREMENT_ID
    };

    // Fallback to hardcoded config (for development only)
    // IMPORTANT: In production, these should come from environment variables
    const devConfig = {
        apiKey: "AIzaSyC_your_dev_api_key_here",
        authDomain: "your-dev-project.firebaseapp.com",
        projectId: "your-dev-project-id",
        storageBucket: "your-dev-project.appspot.com",
        messagingSenderId: "123456789012",
        appId: "1:123456789012:web:abcdef123456",
        measurementId: "G-ABCDEF1234"
    };

    // Production config should never be hardcoded
    const prodConfig = {
        // These should ONLY come from environment variables
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };

    // Determine which config to use
    const isDevelopment = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
        console.warn('⚠️ Using development Firebase config');
        return devConfig;
    }

    // Check if we have environment variables
    if (envConfig.apiKey && envConfig.apiKey !== 'your_actual_api_key_here') {
        console.log('✅ Using environment-based Firebase config');
        return envConfig;
    }

    // Fallback (should only happen in development)
    console.error('❌ No valid Firebase configuration found');
    throw new Error('Firebase configuration is missing');
};

// Export the configuration
const firebaseConfig = getFirebaseConfig();

// For backward compatibility
window.firebaseConfig = firebaseConfig;

// Security check
(function() {
    const publicKeys = ['projectId', 'authDomain', 'storageBucket', 'messagingSenderId'];
    const privateKeys = ['apiKey', 'appId'];
    
    console.group('Firebase Security Check');
    console.log('✅ Public keys:', publicKeys.map(k => ({[k]: firebaseConfig[k]})));
    
    // Warn about exposed private keys
    privateKeys.forEach(key => {
        const value = firebaseConfig[key];
        if (value && !value.includes('your_') && value.length > 10) {
            console.warn(`⚠️ ${key} might be exposed in client code`);
            console.warn(`   Consider using environment variables in production`);
        }
    });
    console.groupEnd();
})();
