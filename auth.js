// Authentication and Authorization System
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.permissions = {};
        this.isAuthenticated = false;
    }

    // Initialize Firebase services
    init() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        return this;
    }

    // Check authentication state
    checkAuth() {
        return new Promise((resolve, reject) => {
            this.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    try {
                        await this.loadUserData(user.uid);
                        this.isAuthenticated = true;
                        resolve({ authenticated: true, user: this.currentUser });
                    } catch (error) {
                        this.isAuthenticated = false;
                        reject(error);
                    }
                } else {
                    this.isAuthenticated = false;
                    this.currentUser = null;
                    resolve({ authenticated: false });
                }
            });
        });
    }

    // Login with email and password
    async login(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            await this.loadUserData(userCredential.user.uid);
            this.isAuthenticated = true;
            return { success: true, user: this.currentUser };
        } catch (error) {
            this.isAuthenticated = false;
            return { success: false, error: error.message };
        }
    }

    // Load employee data from Firestore
    async loadUserData(userId) {
        const doc = await this.db.collection('employees').doc(userId).get();
        
        if (!doc.exists) {
            throw new Error('Employee not found in database');
        }
        
        this.currentUser = { 
            id: doc.id, 
            uid: userId,
            ...doc.data() 
        };
        
        this.userRole = this.currentUser.role;
        this.setPermissions();
        this.saveToLocalStorage();
        
        return this.currentUser;
    }

    // Set permissions based on role (translated to English)
    setPermissions() {
        const permissionsMap = {
            'Admin': { 
                view: true, 
                edit: true, 
                delete: true, 
                manage: true,
                manageEmployees: true,
                manageUsers: true,
                manageFinances: true,
                viewReports: true
            },
            'Supervisor Manager': { 
                view: true, 
                edit: true, 
                delete: true, 
                manage: true,
                manageEmployees: false,
                manageUsers: true,
                manageFinances: true,
                viewReports: true
            },
            'Customer Service Manager': { 
                view: true, 
                edit: true, 
                delete: false, 
                manage: false,
                manageEmployees: false,
                manageUsers: true,
                manageFinances: false,
                viewReports: true
            },
            'Supervisor': { 
                view: true, 
                edit: true, 
                delete: true, 
                manage: false,
                manageEmployees: false,
                manageUsers: true,
                manageFinances: true,
                viewReports: true
            },
            'Customer Service': { 
                view: true, 
                edit: true, 
                delete: false, 
                manage: false,
                manageEmployees: false,
                manageUsers: true,
                manageFinances: false,
                viewReports: false
            },
            'Monitor': { 
                view: true, 
                edit: false, 
                delete: false, 
                manage: false,
                manageEmployees: false,
                manageUsers: false,
                manageFinances: false,
                viewReports: true
            }
        };

        this.permissions = permissionsMap[this.userRole] || { view: false };
    }

    // Save to local storage
    saveToLocalStorage() {
        localStorage.setItem('user', JSON.stringify(this.currentUser));
        localStorage.setItem('role', this.userRole);
        localStorage.setItem('permissions', JSON.stringify(this.permissions));
        localStorage.setItem('lastLogin', new Date().toISOString());
    }

    // Clear local storage
    clearLocalStorage() {
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        localStorage.removeItem('permissions');
        localStorage.removeItem('lastLogin');
    }

    // Logout
    async logout() {
        try {
            await this.auth.signOut();
            this.clearLocalStorage();
            this.currentUser = null;
            this.userRole = null;
            this.permissions = {};
            this.isAuthenticated = false;
            
            // Redirect to login page
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    // Check permission
    hasPermission(permission) {
        return this.permissions[permission] === true;
    }

    // Get user data from local storage (for quick access)
    static getUserFromStorage() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    // Get permissions from local storage
    static getPermissionsFromStorage() {
        const permissionsStr = localStorage.getItem('permissions');
        return permissionsStr ? JSON.parse(permissionsStr) : {};
    }

    // Check if user is authenticated
    static isUserAuthenticated() {
        return localStorage.getItem('user') !== null;
    }
}

// Initialize global auth instance
window.authSystem = new AuthSystem().init();