
class UsersManager {
    constructor() {
        this.users = [];
        this.filteredUsers = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.currentFilter = 'all';
        this.currentSort = 'newest';
        this.searchTerm = '';
        this.isProcessing = false;
        this.initialized = false;
        this.csrfToken = this.generateCSRFToken();
    }

    generateCSRFToken() {
        return 'csrf_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    async init() {
        if (this.initialized) return;
        
        console.log("🚀 Initializing Users Manager...");
        
        try {
            // 1. FIRST: Check authentication
            await this.checkAuth();
            
            // 2. Setup event listeners
            this.setupEvents();
            
            // 3. Update user info
            this.updateUserInfo();
            
            // 4. Load users data
            await this.loadUsersData();
            
            this.initialized = true;
            console.log("✅ Users Manager initialized successfully");
            
        } catch (error) {
            console.error("❌ System initialization error:", error);
            this.showError("System error: " + error.message);
        }
    }
    
    async checkAuth() {
        const user = await authSystem.checkAuth();
        if (!user.authenticated) {
            window.location.href = 'index.html';
            throw new Error("Not authenticated");
        }
        
        // Check permissions
        if (!authSystem.hasPermission('manageUsers')) {
            this.showMessage("You don't have permission to access this page.", 'error');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);
            throw new Error("No permission");
        }
    }
    
    setupEvents() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindEvents());
        } else {
            this.bindEvents();
        }
    }
    
    bindEvents() {
        try {
            // Logout button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => authSystem.logout());
            }
            
            // Dashboard button
            const dashboardLink = document.querySelector('[href="dashboard.html"]');
            if (dashboardLink) {
                dashboardLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.location.href = 'dashboard.html';
                });
            }
            
            // Add user button
            const addUserBtn = document.getElementById('addUserBtn');
            if (addUserBtn) {
                addUserBtn.addEventListener('click', () => this.showAddUserModal());
            }
            
            // Search functionality with debounce and rate limiting
            let searchTimeout;
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    if (this.rateLimit('search', 500)) return;
                    
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        this.searchTerm = e.target.value;
                        this.filterAndSortUsers();
                    }, 300);
                });
            }
            
            const clearSearchBtn = document.getElementById('clearSearchBtn');
            if (clearSearchBtn) {
                clearSearchBtn.addEventListener('click', () => {
                    if (searchInput) searchInput.value = '';
                    this.searchTerm = '';
                    this.filterAndSortUsers();
                });
            }
            
            // Filter and sort
            const statusFilter = document.getElementById('statusFilter');
            if (statusFilter) {
                statusFilter.addEventListener('change', (e) => {
                    this.currentFilter = e.target.value;
                    this.filterAndSortUsers();
                });
            }
            
            const sortBy = document.getElementById('sortBy');
            if (sortBy) {
                sortBy.addEventListener('change', (e) => {
                    this.currentSort = e.target.value;
                    this.filterAndSortUsers();
                });
            }
            
            // Export button
            const exportBtn = document.getElementById('exportBtn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    if (this.rateLimit('export', 2000)) {
                        this.showMessage('Please wait before exporting again', 'warning');
                        return;
                    }
                    this.exportUsersData();
                });
            }
            
            // Refresh button
            const refreshBtn = document.getElementById('refreshBtn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    if (this.rateLimit('refresh', 3000)) {
                        this.showMessage('Please wait before refreshing again', 'warning');
                        return;
                    }
                    this.loadUsersData();
                });
            }
            
            // Pagination
            const prevPageBtn = document.getElementById('prevPageBtn');
            if (prevPageBtn) {
                prevPageBtn.addEventListener('click', () => {
                    this.prevPage();
                });
            }
            
            const nextPageBtn = document.getElementById('nextPageBtn');
            if (nextPageBtn) {
                nextPageBtn.addEventListener('click', () => {
                    this.nextPage();
                });
            }
            
            const itemsPerPage = document.getElementById('itemsPerPage');
            if (itemsPerPage) {
                itemsPerPage.addEventListener('change', (e) => {
                    this.itemsPerPage = parseInt(e.target.value);
                    this.currentPage = 1;
                    this.updatePagination();
                    this.renderUsersTable();
                });
            }
            
            // Modal close buttons
            const closeAddUserModal = document.getElementById('closeAddUserModal');
            if (closeAddUserModal) {
                closeAddUserModal.addEventListener('click', () => {
                    this.hideAddUserModal();
                });
            }
            
            const closeUserDetailsModal = document.getElementById('closeUserDetailsModal');
            if (closeUserDetailsModal) {
                closeUserDetailsModal.addEventListener('click', () => {
                    this.hideUserDetailsModal();
                });
            }
            
            const cancelAddUserBtn = document.getElementById('cancelAddUserBtn');
            if (cancelAddUserBtn) {
                cancelAddUserBtn.addEventListener('click', () => {
                    this.hideAddUserModal();
                });
            }
            
            // Add user form with CSRF protection
            const addUserForm = document.getElementById('addUserForm');
            if (addUserForm) {
                // Add CSRF token to form
                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = 'csrf_token';
                csrfInput.value = this.csrfToken;
                addUserForm.appendChild(csrfInput);
                
                addUserForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.addNewUser();
                });
            }
            
            // Close modals when clicking outside
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.remove('active');
                    }
                });
            });
            
            console.log("✅ Event listeners setup completed");
            
        } catch (error) {
            console.error("❌ Error setting up event listeners:", error);
        }
    }
    
    rateLimit(action, minInterval) {
        const now = Date.now();
        const lastAction = this.lastActionTimes?.[action] || 0;
        
        if (!this.lastActionTimes) this.lastActionTimes = {};
        
        if (now - lastAction < minInterval) {
            return true; // Rate limited
        }
        
        this.lastActionTimes[action] = now;
        return false;
    }
    
    updateUserInfo() {
        try {
            const user = authSystem.currentUser;
            const userNameElement = document.getElementById('userName');
            const userRoleElement = document.getElementById('userRole');
            
            if (user && userNameElement && userRoleElement) {
                userNameElement.textContent = user.name || user.email || 'User';
                userRoleElement.textContent = user.role || 'User';
            }
        } catch (error) {
            console.error("Error updating user info:", error);
        }
    }
    
    async loadUsersData() {
        if (this.isProcessing) {
            this.showMessage('Already processing, please wait...', 'info');
            return;
        }
        
        try {
            this.isProcessing = true;
            this.showLoading(true);
            
            console.log("📊 Loading users data...");
            
            // Verify CSRF token is still valid
            if (!this.validateCSRFToken()) {
                this.showMessage('Security token expired, refreshing page...', 'warning');
                setTimeout(() => location.reload(), 2000);
                return;
            }
            
            // Load users from Firestore with timeout
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 30000)
            );
            
            const loadPromise = (async () => {
                const usersSnapshot = await this.db.collection('users').get();
                const profilesSnapshot = await this.db.collection('profiles').get();
                const incomesSnapshot = await this.db.collection('incomes').get();
                const expensesSnapshot = await this.db.collection('expenses').get();
                
                return { usersSnapshot, profilesSnapshot, incomesSnapshot, expensesSnapshot };
            })();
            
            const snapshots = await Promise.race([loadPromise, timeoutPromise]);
            
            this.users = [];
            const profilesMap = {};
            
            // Process profiles
            snapshots.profilesSnapshot.forEach(doc => {
                const profile = doc.data();
                profilesMap[profile.userId] = profile;
            });
            
            // Process users
            snapshots.usersSnapshot.forEach(doc => {
                const userData = doc.data();
                const userId = userData.userId || doc.id;
                const profile = profilesMap[userId];
                
                // Calculate totals
                let totalIncome = 0;
                snapshots.incomesSnapshot.forEach(incomeDoc => {
                    const income = incomeDoc.data();
                    if (income.user_id === userId) {
                        totalIncome += Number(income.amount) || 0;
                    }
                });
                
                let totalExpenses = 0;
                snapshots.expensesSnapshot.forEach(expenseDoc => {
                    const expense = expenseDoc.data();
                    if (expense.userId === userId) {
                        totalExpenses += Number(expense.amount) || 0;
                    }
                });
                
                // Create user object
                const user = {
                    id: doc.id,
                    userId: userId,
                    name: userData.name || 'Unknown',
                    email: userData.email || 'No email',
                    phone: profile?.phone || userData.phone || 'N/A',
                    createdAt: userData.createdAt?.toDate?.(),
                    profileStatus: profile ? 'active' : 'inactive',
                    totalIncome: totalIncome,
                    totalExpenses: totalExpenses,
                    hasProfile: !!profile,
                    profileData: profile,
                    status: userData.status || 'active',
                    role: userData.role || 'user'
                };
                
                this.users.push(user);
            });
            
            console.log(`✅ Loaded ${this.users.length} users`);
            
            // Update statistics
            await this.updateStatistics();
            
            // Filter and sort users
            this.filterAndSortUsers();
            
        } catch (error) {
            console.error("❌ Error loading users data:", error);
            this.showMessage("Error loading users data: " + error.message, 'error');
        } finally {
            this.showLoading(false);
            this.isProcessing = false;
        }
    }
    
    validateCSRFToken() {
        // In production, validate against server
        // For now, just check if token exists and is recent
        const tokenAge = Date.now() - parseInt(this.csrfToken.split('_').pop());
        return tokenAge < 3600000; // 1 hour
    }
    
    async addNewUser() {
        try {
            // Validate CSRF token
            const form = document.getElementById('addUserForm');
            const formToken = form?.csrf_token?.value;
            
            if (!formToken || formToken !== this.csrfToken) {
                this.showMessage('Security token invalid, please refresh the page', 'error');
                return;
            }
            
            const name = document.getElementById('newUserName').value.trim();
            const email = document.getElementById('newUserEmail').value.trim();
            const phone = document.getElementById('newUserPhone').value.trim();
            const password = document.getElementById('newUserPassword').value;
            const status = document.getElementById('newUserStatus').value;
            
            // Input validation
            if (!this.validateUserInput(name, email, phone, password)) {
                return;
            }
            
            // Rate limiting for user creation
            if (this.rateLimit('createUser', 5000)) {
                this.showMessage('Please wait before creating another user', 'warning');
                return;
            }
            
            // Check if email already exists
            const existingUser = await this.db.collection('users')
                .where('email', '==', email)
                .limit(1)
                .get();
            
            if (!existingUser.empty) {
                this.showMessage('A user with this email already exists', 'error');
                return;
            }
            
            // Create user in Firebase Auth
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;
            
            // Create user document in Firestore
            await this.db.collection('users').doc(userId).set({
                name: name,
                email: email,
                phone: phone || '',
                status: status,
                role: 'user',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Create profile document
            await this.db.collection('profiles').doc(userId).set({
                userId: userId,
                name: name,
                email: email,
                phone: phone || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Show success message
            this.showMessage(`User ${name} created successfully!`, 'success');
            
            // Hide modal and refresh data
            this.hideAddUserModal();
            await this.loadUsersData();
            
            // Generate new CSRF token
            this.csrfToken = this.generateCSRFToken();
            
        } catch (error) {
            console.error("Error adding user:", error);
            
            let errorMessage = 'Error creating user: ';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email already in use';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak (minimum 6 characters)';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'User creation is not allowed';
                    break;
                default:
                    errorMessage += error.message;
            }
            
            this.showMessage(errorMessage, 'error');
        }
    }
    
    validateUserInput(name, email, phone, password) {
        // Name validation
        if (!name || name.length < 2) {
            this.showMessage('Please enter a valid name (minimum 2 characters)', 'error');
            return false;
        }
        
        if (name.length > 100) {
            this.showMessage('Name is too long (maximum 100 characters)', 'error');
            return false;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return false;
        }
        
        // Phone validation (optional)
        if (phone && !/^[\d\s\-\+\(\)]{10,20}$/.test(phone)) {
            this.showMessage('Please enter a valid phone number', 'error');
            return false;
        }
        
        // Password validation
        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters', 'error');
            return false;
        }
        
        if (password.length > 100) {
            this.showMessage('Password is too long (maximum 100 characters)', 'error');
            return false;
        }
        
        return true;
    }
    
    // ... بقية الدوال (updateStatistics, filterAndSortUsers, sortUsers, updatePagination, renderUsersTable, etc.)
    // تبقى كما هي مع إضافة CSRF token حيثما لزم
    
    showError(message) {
        const container = document.querySelector('.main-content');
        if (container && !container.querySelector('.auth-error')) {
            const errorHTML = `
                <div class="auth-error" style="text-align: center; padding: 50px; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 50px; margin-bottom: 20px;"></i>
                    <h2>⚠️ Security Error</h2>
                    <p>${message}</p>
                    <button onclick="window.location.href='index.html'" class="btn btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-sign-in-alt"></i> Go to Login
                    </button>
                </div>
            `;
            container.innerHTML = errorHTML;
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
        }
    }
    
    async initializeFirebase() {
        try {
            let app;
            if (!firebase.apps.length) {
                app = firebase.initializeApp(firebaseConfig);
            } else {
                app = firebase.app();
            }
            
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            // Enable offline persistence for better performance
            this.db.enablePersistence().catch((err) => {
                console.warn('Firebase persistence failed:', err);
            });
            
            console.log("✅ Firebase initialized successfully");
            
        } catch (error) {
            console.error("❌ Firebase initialization error:", error);
            throw new Error("Failed to connect to database");
        }
    }
}

// Initialize users manager
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // First initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        // Wait for auth system
        await authSystem.checkAuth();
        
        // Create and initialize manager
        window.usersManager = new UsersManager();
        await window.usersManager.initializeFirebase();
        await window.usersManager.init();
        
    } catch (error) {
        console.error("Failed to initialize Users Manager:", error);
        
        const container = document.querySelector('.main-content');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 50px; color: #dc3545; margin-bottom: 20px;"></i>
                    <h2>System Initialization Failed</h2>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> Reload Page
                    </button>
                </div>
            `;
        }
    }
});