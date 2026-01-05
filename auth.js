// Auth System - ALL EMPLOYEES ACCESS CONTROL
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.csrfTokens = new Map();
        this.rateLimitStore = new Map();
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.lastActivity = Date.now();
        this.init();
    }

    async init() {
        try {
            // Check if Firebase is loaded
            if (typeof firebase === 'undefined') {
                console.error("❌ Firebase is not loaded!");
                return;
            }
            
            // Wait for firebaseConfig to be available
            if (!window.firebaseConfig) {
                console.warn("⏳ Waiting for firebaseConfig...");
                // Retry after 500ms
                setTimeout(() => this.init(), 500);
                return;
            }
            
            // Initialize Firebase if not already initialized
            if (firebase.apps.length === 0) {
                console.log("🚀 Initializing Firebase...");
                firebase.initializeApp(window.firebaseConfig);
            } else {
                console.log("✅ Firebase already initialized");
            }
            
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            // Setup auth state listener
            this.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    await this.handleAuthStateChange(user);
                } else {
                    this.handleLogout();
                }
            });
            
            // Setup session monitoring
            this.setupSessionMonitor();
            
            // Setup activity tracking
            this.setupActivityTracking();
            
            console.log("✅ Auth System initialized successfully");
            
        } catch (error) {
            console.error("❌ Auth system initialization error:", error);
        }
    }
    
    setupSessionMonitor() {
        // Check session every minute
        setInterval(() => {
            this.checkSessionTimeout();
        }, 60000);
    }
    
    setupActivityTracking() {
        // Track user activity
        const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivity = Date.now();
            }, { passive: true });
        });
    }
    
    checkSessionTimeout() {
        const now = Date.now();
        const inactiveTime = now - this.lastActivity;
        
        if (this.currentUser && inactiveTime > this.sessionTimeout) {
            console.log('Session timeout due to inactivity');
            this.showSessionTimeoutWarning();
        }
    }
    
    showSessionTimeoutWarning() {
        if (confirm('Your session will expire due to inactivity. Click OK to stay logged in.')) {
            this.resetSession();
        } else {
            this.logout();
        }
    }
    
    resetSession() {
        this.lastActivity = Date.now();
        console.log('Session reset');
    }
    
    generateCSRFToken(userId) {
        const token = 'csrf_' + 
                     Math.random().toString(36).substr(2, 9) + '_' + 
                     userId + '_' + 
                     Date.now();
        
        // Store token with expiry (1 hour)
        this.csrfTokens.set(token, {
            userId: userId,
            expires: Date.now() + 3600000
        });
        
        // Cleanup old tokens
        this.cleanupCSRFTokens();
        
        return token;
    }
    
    validateCSRFToken(token, userId) {
        const tokenData = this.csrfTokens.get(token);
        
        if (!tokenData) {
            console.warn('CSRF token not found');
            return false;
        }
        
        // Check if token belongs to user
        if (tokenData.userId !== userId) {
            console.warn('CSRF token user mismatch');
            return false;
        }
        
        // Check if token expired
        if (Date.now() > tokenData.expires) {
            console.warn('CSRF token expired');
            this.csrfTokens.delete(token);
            return false;
        }
        
        return true;
    }
    
    cleanupCSRFTokens() {
        const now = Date.now();
        for (const [token, data] of this.csrfTokens.entries()) {
            if (now > data.expires) {
                this.csrfTokens.delete(token);
            }
        }
    }
    
    checkRateLimit(action, identifier, limit = 5, windowMs = 60000) {
        const key = `${identifier}_${action}`;
        const now = Date.now();
        
        if (!this.rateLimitStore.has(key)) {
            this.rateLimitStore.set(key, []);
        }
        
        const timestamps = this.rateLimitStore.get(key);
        
        // Remove old timestamps
        while (timestamps.length > 0 && now - timestamps[0] > windowMs) {
            timestamps.shift();
        }
        
        // Check if limit exceeded
        if (timestamps.length >= limit) {
            return {
                limited: true,
                retryAfter: Math.ceil((timestamps[0] + windowMs - now) / 1000)
            };
        }
        
        // Add current timestamp
        timestamps.push(now);
        this.rateLimitStore.set(key, timestamps);
        
        return { limited: false };
    }
    
    async handleAuthStateChange(user) {
        try {
            // Rate limit auth attempts
            const rateLimit = this.checkRateLimit('auth', user.uid, 10, 300000);
            if (rateLimit.limited) {
                console.warn('Auth rate limited');
                await this.logout();
                return;
            }
            
            // Get employee data
            const employeeDoc = await this.db.collection('employees').doc(user.uid).get();
            
            if (!employeeDoc.exists) {
                console.warn('User not found in employees collection');
                await this.logout();
                return;
            }
            
            const employeeData = employeeDoc.data();
            
            // ✅ ALLOW ALL ACTIVE EMPLOYEES (NOT JUST ADMINS)
            if (employeeData.status !== 'active') {
                console.warn('Inactive employee trying to access:', employeeData.email);
                await this.logout();
                return;
            }
            
            // Store session data
            this.currentUser = {
                id: user.uid,
                email: user.email,
                ...employeeData
            };
            
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            localStorage.setItem('lastLogin', Date.now().toString());
            this.lastActivity = Date.now();
            
            // Update last login timestamp
            await this.db.collection('employees').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                lastActivity: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Employee authenticated:', this.currentUser.email, 'Role:', this.currentUser.role);
            
        } catch (error) {
            console.error('Auth state change error:', error);
            await this.logout();
        }
    }
    
    handleLogout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('lastLogin');
        this.currentUser = null;
        this.csrfTokens.clear();
        console.log('User logged out');
    }
    
    async checkAuth() {
        try {
            // Check localStorage
            const storedUser = localStorage.getItem('currentUser');
            const lastLogin = localStorage.getItem('lastLogin');
            
            if (!storedUser || !lastLogin) {
                return { authenticated: false };
            }
            
            // Check session age (8 hours max)
            const loginTime = parseInt(lastLogin);
            const hoursDiff = (Date.now() - loginTime) / (1000 * 60 * 60);
            
            if (hoursDiff > 8) {
                console.log('Session expired (8 hours)');
                await this.logout();
                return { authenticated: false };
            }
            
            // Check Firebase auth
            const user = this.auth.currentUser;
            if (!user) {
                return { authenticated: false };
            }
            
            // Get fresh employee data
            const employeeDoc = await this.db.collection('employees').doc(user.uid).get();
            
            if (!employeeDoc.exists) {
                await this.logout();
                return { authenticated: false };
            }
            
            const employeeData = employeeDoc.data();
            
            // ✅ ALLOW ALL ACTIVE EMPLOYEES (NOT JUST ADMINS)
            if (employeeData.status !== 'active') {
                console.warn('Inactive employee detected');
                await this.logout();
                return { authenticated: false };
            }
            
            // Update current user
            this.currentUser = {
                id: user.uid,
                email: user.email,
                ...employeeData
            };
            
            // Update activity
            this.lastActivity = Date.now();
            
            return {
                authenticated: true,
                user: this.currentUser,
                csrfToken: this.generateCSRFToken(user.uid)
            };
            
        } catch (error) {
            console.error('Auth check error:', error);
            return { authenticated: false };
        }
    }
    
    async login(email, password) {
        try {
            // Input validation
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            if (!this.isValidEmail(email)) {
                throw new Error('Invalid email format');
            }
            
            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }
            
            // Rate limiting
            const rateLimit = this.checkRateLimit('login', email, 5, 300000);
            if (rateLimit.limited) {
                throw new Error(`Too many login attempts. Please try again in ${rateLimit.retryAfter} seconds`);
            }
            
            // Ensure Firebase is initialized
            if (!this.auth) {
                console.warn('Firebase auth not ready, trying to reinitialize...');
                await this.init();
                
                if (!this.auth) {
                    throw new Error('Authentication system not ready. Please refresh the page.');
                }
            }
            
            // Firebase authentication
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Verify employee exists and is active
            const employeeDoc = await this.db.collection('employees').doc(user.uid).get();
            
            if (!employeeDoc.exists) {
                await this.auth.signOut();
                throw new Error('Access denied. User not found in system.');
            }
            
            const employeeData = employeeDoc.data();
            
            // ✅ ALLOW ALL ACTIVE EMPLOYEES (NOT JUST ADMINS)
            if (employeeData.status !== 'active') {
                await this.auth.signOut();
                throw new Error('Account is inactive. Contact administrator.');
            }
            
            return {
                success: true,
                user: {
                    id: user.uid,
                    email: user.email,
                    ...employeeData
                }
            };
            
        } catch (error) {
            console.error('Login error:', error.code, error.message);
            
            let errorMessage = 'Authentication failed. ';
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage = 'Invalid email or password.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Account disabled. Contact administrator.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many attempts. Try again later.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Check your connection.';
                    break;
                case 'auth/app-not-authorized':
                    errorMessage = 'Authentication not configured. Contact administrator.';
                    break;
                case 'auth/invalid-api-key':
                    errorMessage = 'Invalid configuration. Contact administrator.';
                    break;
                default:
                    errorMessage += error.message || 'Please try again.';
            }
            
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    async logout() {
        try {
            if (this.auth) {
                await this.auth.signOut();
            }
            this.handleLogout();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
            this.handleLogout();
            window.location.href = 'index.html';
        }
    }
    
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        // Admin has all permissions
        if (this.currentUser.role === 'Admin') {
            return true;
        }
        
        // For non-admins, check specific permissions
        const permissionsMap = {
            'Supervisor Manager': {
                manageEmployees: false,
                manageUsers: true,
                manageFinances: true,
                viewReports: true,
                view: true, edit: true, delete: true, manage: true
            },
            'Customer Service Manager': {
                manageEmployees: false,
                manageUsers: true,
                manageFinances: false,
                viewReports: true,
                view: true, edit: true, delete: false, manage: false
            },
            'Supervisor': {
                manageEmployees: false,
                manageUsers: true,
                manageFinances: true,
                viewReports: true,
                view: true, edit: true, delete: true, manage: false
            },
            'Customer Service': {
                manageEmployees: false,
                manageUsers: true,
                manageFinances: false,
                viewReports: false,
                view: true, edit: true, delete: false, manage: false
            },
            'Monitor': {
                manageEmployees: false,
                manageUsers: false,
                manageFinances: false,
                viewReports: true,
                view: true, edit: false, delete: false, manage: false
            }
        };
        
        const rolePermissions = permissionsMap[this.currentUser.role] || {};
        return rolePermissions[permission] || false;
    }
    
    isAdmin() {
        return this.currentUser?.role === 'Admin';
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    isAuthenticated() {
        return this.currentUser !== null;
    }
    
    // Get auth and db instances for external use
    getAuth() {
        return this.auth;
    }
    
    getDB() {
        return this.db;
    }
    
    // Static methods for backward compatibility
    static getUserFromStorage() {
        try {
            const userStr = localStorage.getItem('currentUser');
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    }
    
    static getPermissionsFromStorage() {
        try {
            const user = this.getUserFromStorage();
            if (!user) return {};
            
            // Admin has all permissions
            if (user.role === 'Admin') {
                return {
                    view: true, edit: true, delete: true, manage: true,
                    manageEmployees: true, manageUsers: true,
                    manageFinances: true, viewReports: true
                };
            }
            
            return {};
        } catch {
            return {};
        }
    }
}

// Create global instance with delay to ensure dependencies are loaded
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.authSystem = new AuthSystem();
    }, 100);
});

// Fallback for immediate access
if (!window.authSystem) {
    window.authSystem = {
        login: async () => ({ success: false, error: 'Loading...' }),
        logout: async () => window.location.href = 'index.html',
        checkAuth: async () => ({ authenticated: false }),
        getCurrentUser: () => null,
        getAuth: () => null,
        getDB: () => null
    };
}
