// Users Management System - COMPLETE VERSION WITH FIXES
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
        this.init();
    }

    async init() {
        console.log("🚀 Initializing Users Manager...");
        
        // Check authentication
        await this.checkAuth();
        
        // Initialize Firebase
        try {
            let app;
            if (!firebase.apps.length) {
                app = firebase.initializeApp(firebaseConfig);
            } else {
                app = firebase.app();
            }
            
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            // Setup event listeners
            this.setupEvents();
            
            // Load users data
            await this.loadUsersData();
            
            // Update user info in navbar
            this.updateUserInfo();
            
        } catch (error) {
            console.error("❌ System initialization error:", error);
            this.showError("System error: " + error.message);
        }
    }
    
    async checkAuth() {
        const user = await authSystem.checkAuth();
        if (!user.authenticated) {
            window.location.href = 'index.html';
            return;
        }
        
        // Check permissions
        if (!authSystem.hasPermission('manageUsers')) {
            this.showMessage("You don't have permission to access this page.", 'error');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);
            return;
        }
    }
    
    setupEvents() {
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            authSystem.logout();
        });
        
        // Dashboard button
        document.querySelector('[href="dashboard.html"]').addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'dashboard.html';
        });
        
        // Add user button
        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.showAddUserModal();
        });
        
        // Search functionality with debounce
        let searchTimeout;
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchTerm = e.target.value;
                this.filterAndSortUsers();
            }, 300);
        });
        
        document.getElementById('clearSearchBtn').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            this.searchTerm = '';
            this.filterAndSortUsers();
        });
        
        // Filter and sort
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.filterAndSortUsers();
        });
        
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.filterAndSortUsers();
        });
        
        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportUsersData();
        });
        
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadUsersData();
        });
        
        // Pagination
        document.getElementById('prevPageBtn').addEventListener('click', () => {
            this.prevPage();
        });
        
        document.getElementById('nextPageBtn').addEventListener('click', () => {
            this.nextPage();
        });
        
        document.getElementById('itemsPerPage').addEventListener('change', (e) => {
            this.itemsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.updatePagination();
            this.renderUsersTable();
        });
        
        // Modal close buttons
        document.getElementById('closeAddUserModal').addEventListener('click', () => {
            this.hideAddUserModal();
        });
        
        document.getElementById('closeUserDetailsModal').addEventListener('click', () => {
            this.hideUserDetailsModal();
        });
        
        document.getElementById('cancelAddUserBtn').addEventListener('click', () => {
            this.hideAddUserModal();
        });
        
        // Add user form
        document.getElementById('addUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addNewUser();
        });
        
        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }
    
    updateUserInfo() {
        const user = authSystem.currentUser;
        if (user) {
            document.getElementById('userName').textContent = user.name || user.email;
            document.getElementById('userRole').textContent = user.role || 'User';
        }
    }
    
    async loadUsersData() {
        if (this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            // Show loading state
            this.showLoading(true);
            
            // Load users from Firestore
            const usersSnapshot = await this.db.collection('users').get();
            this.users = [];
            
            // Load profiles to get additional data
            const profilesSnapshot = await this.db.collection('profiles').get();
            const profilesMap = {};
            profilesSnapshot.forEach(doc => {
                const profile = doc.data();
                profilesMap[profile.userId] = profile;
            });
            
            // Load incomes and expenses for each user
            const incomesSnapshot = await this.db.collection('incomes').get();
            const expensesSnapshot = await this.db.collection('expenses').get();
            
            // Process users data
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                const userId = userData.userId || doc.id;
                const profile = profilesMap[userId];
                
                // Calculate total income for this user
                let totalIncome = 0;
                incomesSnapshot.forEach(incomeDoc => {
                    const income = incomeDoc.data();
                    if (income.user_id === userId) {
                        totalIncome += Number(income.amount) || 0;
                    }
                });
                
                // Calculate total expenses for this user
                let totalExpenses = 0;
                expensesSnapshot.forEach(expenseDoc => {
                    const expense = expenseDoc.data();
                    if (expense.userId === userId) {
                        totalExpenses += Number(expense.amount) || 0;
                    }
                });
                
                // Safely get created date
                let createdAt = null;
                if (userData.createdAt && typeof userData.createdAt.toDate === 'function') {
                    createdAt = userData.createdAt.toDate();
                } else if (userData.createdAt) {
                    createdAt = new Date(userData.createdAt);
                }
                
                // Create user object with all data
                const user = {
                    id: doc.id,
                    userId: userId,
                    name: userData.name || 'Unknown',
                    email: userData.email || 'No email',
                    phone: profile?.phone || userData.phone || 'N/A',
                    createdAt: createdAt,
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
            
            // Cache data for session
            this.cacheData('users', this.users);
            
        } catch (error) {
            console.error("❌ Error loading users data:", error);
            this.showMessage("Error loading users data: " + error.message, 'error');
            
            // Try to load cached data
            const cached = this.getCachedData('users');
            if (cached) {
                this.users = cached;
                this.filterAndSortUsers();
                this.showMessage("Loaded cached data", 'warning');
            }
        } finally {
            // Hide loading state
            this.showLoading(false);
            this.isProcessing = false;
        }
    }
    
    async updateStatistics() {
        const totalUsers = this.users.length;
        const activeProfiles = this.users.filter(user => user.hasProfile).length;
        
        // Calculate growth this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const usersThisMonth = this.users.filter(user => {
            const joinDate = user.createdAt;
            return joinDate && joinDate >= startOfMonth;
        }).length;
        
        // Calculate averages
        let totalIncomeSum = 0;
        let totalExpensesSum = 0;
        let usersWithData = 0;
        
        this.users.forEach(user => {
            if (user.totalIncome > 0 || user.totalExpenses > 0) {
                totalIncomeSum += user.totalIncome;
                totalExpensesSum += user.totalExpenses;
                usersWithData++;
            }
        });
        
        const avgIncome = usersWithData > 0 ? totalIncomeSum / usersWithData : 0;
        const avgExpenses = usersWithData > 0 ? totalExpensesSum / usersWithData : 0;
        const profilesPercentage = totalUsers > 0 ? Math.round((activeProfiles / totalUsers) * 100) : 0;
        
        // Update UI
        document.getElementById('totalUsersCount').textContent = totalUsers.toLocaleString();
        document.getElementById('usersCount').textContent = totalUsers;
        
        document.getElementById('usersGrowth').textContent = usersThisMonth;
        
        document.getElementById('activeProfilesCount').textContent = activeProfiles.toLocaleString();
        document.getElementById('profilesPercentage').textContent = profilesPercentage + '%';
        
        document.getElementById('avgIncome').textContent = '$' + avgIncome.toFixed(2);
        document.getElementById('avgExpenses').textContent = '$' + avgExpenses.toFixed(2);
    }
    
    filterAndSortUsers() {
        // Apply search filter
        if (this.searchTerm.trim()) {
            this.filteredUsers = this.users.filter(user => 
                user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                (user.phone && user.phone.toLowerCase().includes(this.searchTerm.toLowerCase()))
            );
        } else {
            this.filteredUsers = [...this.users];
        }
        
        // Apply status filter
        if (this.currentFilter !== 'all') {
            this.filteredUsers = this.filteredUsers.filter(user => 
                user.profileStatus === this.currentFilter
            );
        }
        
        // Apply sorting
        this.sortUsers();
        
        // Reset to first page
        this.currentPage = 1;
        
        // Update UI
        this.updatePagination();
        this.renderUsersTable();
    }
    
    sortUsers() {
        switch (this.currentSort) {
            case 'newest':
                this.filteredUsers.sort((a, b) => {
                    const dateA = a.createdAt || new Date(0);
                    const dateB = b.createdAt || new Date(0);
                    return dateB - dateA;
                });
                break;
                
            case 'oldest':
                this.filteredUsers.sort((a, b) => {
                    const dateA = a.createdAt || new Date(0);
                    const dateB = b.createdAt || new Date(0);
                    return dateA - dateB;
                });
                break;
                
            case 'name':
                this.filteredUsers.sort((a, b) => 
                    a.name.localeCompare(b.name)
                );
                break;
                
            case 'income':
                this.filteredUsers.sort((a, b) => 
                    b.totalIncome - a.totalIncome
                );
                break;
        }
    }
    
    updatePagination() {
        this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage) || 1;
        this.currentPage = Math.max(1, Math.min(this.currentPage, this.totalPages));
        
        // Update UI
        document.getElementById('currentPage').textContent = this.currentPage;
        document.getElementById('totalPages').textContent = this.totalPages;
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, this.filteredUsers.length);
        
        document.getElementById('showingCount').textContent = Math.max(0, end - start);
        document.getElementById('totalCount').textContent = this.filteredUsers.length;
        
        // Update button states
        document.getElementById('prevPageBtn').disabled = this.currentPage === 1;
        document.getElementById('nextPageBtn').disabled = this.currentPage === this.totalPages;
    }
    
    renderUsersTable() {
        const tableBody = document.getElementById('usersTableBody');
        
        if (this.filteredUsers.length === 0) {
            tableBody.innerHTML = this.renderEmptyState();
            return;
        }
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, this.filteredUsers.length);
        const currentUsers = this.filteredUsers.slice(start, end);
        
        tableBody.innerHTML = currentUsers.map((user) => {
            const joinDate = user.createdAt;
            const joinDateStr = joinDate ? 
                joinDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                }) : 'N/A';
            
            // Create user ID display (shortened)
            const shortId = user.userId ? 
                user.userId.substring(0, 8) + (user.userId.length > 8 ? '...' : '') : 'N/A';
            
            return `
                <tr>
                    <td class="user-id" title="${user.userId || 'No ID'}">
                        ${shortId}
                    </td>
                    <td>
                        <strong>${this.escapeHtml(user.name)}</strong>
                    </td>
                    <td>${this.escapeHtml(user.email)}</td>
                    <td>${this.escapeHtml(user.phone)}</td>
                    <td>${joinDateStr}</td>
                    <td>
                        <span class="status-badge status-${user.profileStatus}">
                            ${user.profileStatus}
                        </span>
                    </td>
                    <td class="amount-positive">
                        $${user.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td class="amount-negative">
                        $${user.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" 
                                    title="View Details"
                                    onclick="usersManager.viewUserDetails('${this.escapeHtml(user.id)}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit-btn" 
                                    title="Edit User"
                                    onclick="usersManager.editUser('${this.escapeHtml(user.id)}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" 
                                    title="Delete User"
                                    onclick="usersManager.confirmDeleteUser('${this.escapeHtml(user.id)}', '${this.escapeHtml(user.name)}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    renderEmptyState() {
        return `
            <tr>
                <td colspan="9" class="empty-state">
                    <i class="fas fa-users"></i>
                    <h4>No users found</h4>
                    <p>${this.searchTerm ? 'Try a different search term' : 'No users available'}</p>
                    <button class="btn btn-primary" id="addFirstUserBtn">
                        <i class="fas fa-user-plus"></i>
                        Add First User
                    </button>
                </td>
            </tr>
        `;
    }
    
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePagination();
            this.renderUsersTable();
        }
    }
    
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePagination();
            this.renderUsersTable();
        }
    }
    
    showAddUserModal() {
        document.getElementById('addUserModal').classList.add('active');
        document.getElementById('addUserForm').reset();
    }
    
    hideAddUserModal() {
        document.getElementById('addUserModal').classList.remove('active');
    }
    
    showEditUserModal() {
        const editModal = document.getElementById('editUserModal');
        if (editModal) {
            editModal.classList.add('active');
        }
    }
    
    hideEditUserModal() {
        const editModal = document.getElementById('editUserModal');
        if (editModal) {
            editModal.classList.remove('active');
        }
    }
    
    showUserDetailsModal() {
        document.getElementById('userDetailsModal').classList.add('active');
    }
    
    hideUserDetailsModal() {
        document.getElementById('userDetailsModal').classList.remove('active');
    }
    
    async addNewUser() {
        if (this.isProcessing) return;
        
        try {
            const name = document.getElementById('newUserName').value.trim();
            const email = document.getElementById('newUserEmail').value.trim();
            const phone = document.getElementById('newUserPhone').value.trim();
            const password = document.getElementById('newUserPassword').value;
            const status = document.getElementById('newUserStatus').value;
            
            // Validate inputs
            const errors = this.validateUserData({ name, email, phone, password, status });
            if (errors.length > 0) {
                this.showMessage(errors.join(', '), 'error');
                return;
            }
            
            this.isProcessing = true;
            this.showMessage('Creating user...', 'info');
            
            // Create user in Firebase Auth
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;
            
            // Create user document in Firestore
            await this.db.collection('users').doc(userId).set({
                name: name,
                email: email,
                phone: phone || null,
                userId: userId,
                status: status,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: this.auth.currentUser.uid
            });
            
            // Create profile document if status is active
            if (status === 'active') {
                await this.db.collection('profiles').doc(userId).set({
                    userId: userId,
                    email: email,
                    displayName: name,
                    phone: phone || null,
                    currency: 'USD',
                    language: 'en',
                    country: 'US',
                    avatarUrl: 'default.png',
                    status: 'active',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Show success message
            this.showMessage(`User ${name} created successfully!`, 'success');
            
            // Close modal
            this.hideAddUserModal();
            
            // Refresh users list
            await this.loadUsersData();
            
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
                    errorMessage = 'Password is too weak (min 6 characters)';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'User creation is not enabled';
                    break;
                default:
                    errorMessage += error.message;
            }
            
            this.showMessage(errorMessage, 'error');
        } finally {
            this.isProcessing = false;
        }
    }
    
    validateUserData(data) {
        const errors = [];
        
        if (!data.name || data.name.length < 2) {
            errors.push('Name must be at least 2 characters');
        }
        
        if (!data.email || !this.isValidEmail(data.email)) {
            errors.push('Valid email is required');
        }
        
        if (!data.password || data.password.length < 6) {
            errors.push('Password must be at least 6 characters');
        }
        
        if (data.phone && !this.isValidPhone(data.phone)) {
            errors.push('Invalid phone number format');
        }
        
        return errors;
    }
    
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    isValidPhone(phone) {
        const re = /^[\+]?[1-9][\d\s\-\(\)\.]{8,}$/;
        return re.test(phone.replace(/\s/g, ''));
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async editUser(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) {
                this.showMessage('User not found', 'error');
                return;
            }
            
            // Create edit modal if doesn't exist
            let editModal = document.getElementById('editUserModal');
            if (!editModal) {
                editModal = document.createElement('div');
                editModal.id = 'editUserModal';
                editModal.className = 'modal';
                document.body.appendChild(editModal);
                
                // Close modal when clicking outside
                editModal.addEventListener('click', (e) => {
                    if (e.target === editModal) {
                        this.hideEditUserModal();
                    }
                });
            }
            
            editModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit User: ${this.escapeHtml(user.name)}</h3>
                        <button class="close-modal" id="closeEditUserModal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="editUserForm">
                            <input type="hidden" id="editUserId" value="${this.escapeHtml(user.id)}">
                            <input type="hidden" id="editUserUID" value="${this.escapeHtml(user.userId)}">
                            
                            <div class="form-group">
                                <label for="editUserName">
                                    <i class="fas fa-user"></i>
                                    Full Name *
                                </label>
                                <input type="text" id="editUserName" value="${this.escapeHtml(user.name)}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="editUserEmail">
                                    <i class="fas fa-envelope"></i>
                                    Email Address *
                                </label>
                                <input type="email" id="editUserEmail" value="${this.escapeHtml(user.email)}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="editUserPhone">
                                    <i class="fas fa-phone"></i>
                                    Phone Number
                                </label>
                                <input type="tel" id="editUserPhone" value="${this.escapeHtml(user.phone || '')}">
                            </div>
                            
                            <div class="form-group">
                                <label for="editUserStatus">
                                    <i class="fas fa-toggle-on"></i>
                                    Status
                                </label>
                                <select id="editUserStatus">
                                    <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="editUserRole">
                                    <i class="fas fa-user-tag"></i>
                                    Role
                                </label>
                                <select id="editUserRole">
                                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                                    <option value="premium" ${user.role === 'premium' ? 'selected' : ''}>Premium User</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="editUserPassword">
                                    <i class="fas fa-lock"></i>
                                    Reset Password (Leave blank to keep current)
                                </label>
                                <input type="password" id="editUserPassword" placeholder="Enter new password">
                                <small class="form-help">Minimum 6 characters</small>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" id="cancelEditUserBtn">
                                    Cancel
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i>
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            // Add event listeners
            setTimeout(() => {
                document.getElementById('closeEditUserModal').addEventListener('click', () => {
                    this.hideEditUserModal();
                });
                
                document.getElementById('cancelEditUserBtn').addEventListener('click', () => {
                    this.hideEditUserModal();
                });
                
                document.getElementById('editUserForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.updateUser();
                });
            }, 100);
            
            this.showEditUserModal();
            
        } catch (error) {
            console.error("Error preparing user edit:", error);
            this.showMessage('Error loading user data: ' + error.message, 'error');
        }
    }
    
    async updateUser() {
        if (this.isProcessing) return;
        
        try {
            const userId = document.getElementById('editUserId').value;
            const userUID = document.getElementById('editUserUID').value;
            const name = document.getElementById('editUserName').value.trim();
            const email = document.getElementById('editUserEmail').value.trim();
            const phone = document.getElementById('editUserPhone').value.trim();
            const status = document.getElementById('editUserStatus').value;
            const role = document.getElementById('editUserRole').value;
            const password = document.getElementById('editUserPassword').value;
            
            // Validate inputs
            if (!name || !email) {
                this.showMessage('Name and email are required', 'error');
                return;
            }
            
            if (password && password.length < 6) {
                this.showMessage('Password must be at least 6 characters', 'error');
                return;
            }
            
            this.isProcessing = true;
            this.showMessage('Updating user...', 'info');
            
            // Update data object
            const updateData = {
                name: name,
                email: email,
                phone: phone || null,
                status: status,
                role: role,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Update user in Firestore
            await this.db.collection('users').doc(userId).update(updateData);
            
            // Handle profile
            const profileRef = this.db.collection('profiles').doc(userUID);
            const profileDoc = await profileRef.get();
            
            if (status === 'active') {
                if (profileDoc.exists) {
                    await profileRef.update({
                        displayName: name,
                        email: email,
                        phone: phone || null,
                        status: 'active',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    await profileRef.set({
                        userId: userUID,
                        email: email,
                        displayName: name,
                        phone: phone || null,
                        currency: 'USD',
                        language: 'en',
                        country: 'US',
                        avatarUrl: 'default.png',
                        status: 'active',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            } else if (profileDoc.exists) {
                await profileRef.update({
                    status: 'inactive',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Show success message
            this.showMessage(`User ${name} updated successfully!`, 'success');
            
            // Close modal
            this.hideEditUserModal();
            
            // Refresh data
            await this.loadUsersData();
            
            // Close details modal if open
            this.hideUserDetailsModal();
            
        } catch (error) {
            console.error("Error updating user:", error);
            this.showMessage('Error updating user: ' + error.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    }
    
    confirmDeleteUser(userId, userName) {
        // Create confirmation modal
        const confirmModal = document.createElement('div');
        confirmModal.id = 'confirmDeleteModal';
        confirmModal.className = 'modal active';
        confirmModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Confirm Delete</h3>
                    <button class="close-modal" id="closeConfirmDeleteModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="delete-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>⚠️ Warning: This action cannot be undone!</h4>
                        <p>Are you sure you want to delete user <strong>"${this.escapeHtml(userName)}"</strong>?</p>
                        <p class="text-danger">This will permanently delete:</p>
                        <ul class="text-danger">
                            <li>User account (cannot login anymore)</li>
                            <li>User profile and settings</li>
                            <li>All income records</li>
                            <li>All expense records</li>
                        </ul>
                        
                        <div class="form-group">
                            <label for="confirmUserName">
                                Type the username to confirm: <strong>"${this.escapeHtml(userName)}"</strong>
                            </label>
                            <input type="text" id="confirmUserName" placeholder="Type username here" style="margin-top: 10px;">
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancelDeleteBtn">
                                Cancel
                            </button>
                            <button type="button" class="btn btn-danger" id="confirmDeleteBtn" disabled>
                                <i class="fas fa-trash"></i>
                                Delete Permanently
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmModal);
        
        // Add event listeners
        setTimeout(() => {
            const closeBtn = document.getElementById('closeConfirmDeleteModal');
            const cancelBtn = document.getElementById('cancelDeleteBtn');
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            const confirmInput = document.getElementById('confirmUserName');
            
            const closeModal = () => {
                confirmModal.remove();
            };
            
            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
            
            confirmInput.addEventListener('input', (e) => {
                confirmBtn.disabled = e.target.value !== userName;
            });
            
            confirmBtn.addEventListener('click', async () => {
                await this.deleteUser(userId);
                closeModal();
            });
            
            // Close modal when clicking outside
            confirmModal.addEventListener('click', (e) => {
                if (e.target === confirmModal) {
                    closeModal();
                }
            });
        }, 100);
    }
    
    async deleteUser(userId) {
        if (this.isProcessing) return;
        
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) {
                this.showMessage('User not found', 'error');
                return;
            }
            
            this.isProcessing = true;
            this.showMessage('Deleting user and all associated data...', 'info');
            
            // IMPORTANT: In a real app, use Cloud Functions to delete user from Auth
            // because client-side deletion requires admin privileges
            
            // Delete all related data from Firestore
            const batch = this.db.batch();
            
            // Delete user document
            batch.delete(this.db.collection('users').doc(userId));
            
            // Delete profile
            const profileRef = this.db.collection('profiles').doc(user.userId);
            batch.delete(profileRef);
            
            // Delete incomes
            const incomesSnapshot = await this.db.collection('incomes')
                .where('user_id', '==', user.userId)
                .get();
            
            incomesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Delete expenses
            const expensesSnapshot = await this.db.collection('expenses')
                .where('userId', '==', user.userId)
                .get();
            
            expensesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Commit batch delete
            await batch.commit();
            
            // Show success message
            this.showMessage(`User "${user.name}" and all associated data deleted successfully!`, 'success');
            
            // Note: User will still exist in Firebase Auth
            // You need Cloud Functions to delete from Auth
            
            // Refresh data
            await this.loadUsersData();
            
        } catch (error) {
            console.error("Error deleting user:", error);
            
            let errorMsg = 'Error deleting user: ';
            switch (error.code) {
                case 'permission-denied':
                    errorMsg = 'You do not have permission to delete users.';
                    break;
                default:
                    errorMsg += error.message;
            }
            
            this.showMessage(errorMsg, 'error');
        } finally {
            this.isProcessing = false;
        }
    }
    
    async viewUserDetails(userId) {
        try {
            // Find user in our data
            const user = this.users.find(u => u.id === userId);
            if (!user) {
                this.showMessage('User not found', 'error');
                return;
            }
            
            // Load additional user data
            const [incomesSnapshot, expensesSnapshot, profileSnapshot] = await Promise.all([
                this.db.collection('incomes')
                    .where('user_id', '==', user.userId)
                    .orderBy('date', 'desc')
                    .limit(10)
                    .get(),
                
                this.db.collection('expenses')
                    .where('userId', '==', user.userId)
                    .orderBy('date', 'desc')
                    .limit(10)
                    .get(),
                
                this.db.collection('profiles')
                    .doc(user.userId)
                    .get()
            ]);
            
            // Format data for display
            const incomes = incomesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            const expenses = expensesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            const profile = profileSnapshot.exists ? profileSnapshot.data() : null;
            
            // Create modal content
            const modalContent = this.createUserDetailsHTML(user, profile, incomes, expenses);
            
            // Update modal
            document.getElementById('userDetailsTitle').textContent = `User Details: ${user.name}`;
            document.getElementById('userDetailsContent').innerHTML = modalContent;
            
            // Show modal
            this.showUserDetailsModal();
            
            // Add event listeners to modal buttons
            setTimeout(() => {
                const editUserBtn = document.getElementById('editUserBtn');
                if (editUserBtn) {
                    editUserBtn.addEventListener('click', () => {
                        this.editUser(user.id);
                        this.hideUserDetailsModal();
                    });
                }
                
                const deleteUserBtn = document.getElementById('deleteUserBtn');
                if (deleteUserBtn) {
                    deleteUserBtn.addEventListener('click', () => {
                        this.confirmDeleteUser(user.id, user.name);
                        this.hideUserDetailsModal();
                    });
                }
                
                document.querySelectorAll('.view-all-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const type = e.target.dataset.type || e.target.parentElement.dataset.type;
                        window.open(`${type === 'income' ? 'incomes' : 'expenses'}.html?userId=${user.userId}`, '_blank');
                    });
                });
            }, 100);
            
        } catch (error) {
            console.error("Error viewing user details:", error);
            this.showMessage('Error loading user details: ' + error.message, 'error');
        }
    }
    
    createUserDetailsHTML(user, profile, incomes, expenses) {
        const joinDate = user.createdAt ? user.createdAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        }) : 'Unknown';
        
        const balance = user.totalIncome - user.totalExpenses;
        
        return `
            <div class="user-details-view">
                <!-- Basic Information -->
                <div class="details-section">
                    <h4>Basic Information</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Full Name</label>
                            <span>${this.escapeHtml(user.name)}</span>
                        </div>
                        <div class="info-item">
                            <label>Email</label>
                            <span>${this.escapeHtml(user.email)}</span>
                        </div>
                        <div class="info-item">
                            <label>Phone</label>
                            <span>${this.escapeHtml(user.phone || 'Not provided')}</span>
                        </div>
                        <div class="info-item">
                            <label>User ID</label>
                            <span class="user-id-full">${this.escapeHtml(user.userId)}</span>
                        </div>
                        <div class="info-item">
                            <label>Join Date</label>
                            <span>${joinDate}</span>
                        </div>
                        <div class="info-item">
                            <label>Profile Status</label>
                            <span class="status-badge status-${user.profileStatus}">
                                ${user.profileStatus}
                            </span>
                        </div>
                        <div class="info-item">
                            <label>Account Status</label>
                            <span class="status-badge status-${user.status || 'active'}">
                                ${user.status || 'active'}
                            </span>
                        </div>
                        <div class="info-item">
                            <label>Role</label>
                            <span class="role-badge">${user.role || 'user'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Profile Information -->
                ${profile ? `
                <div class="details-section">
                    <h4>Profile Settings</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Currency</label>
                            <span>${profile.currency || 'USD'}</span>
                        </div>
                        <div class="info-item">
                            <label>Language</label>
                            <span>${profile.language || 'English'}</span>
                        </div>
                        <div class="info-item">
                            <label>Country</label>
                            <span>${profile.country || 'Not set'}</span>
                        </div>
                        <div class="info-item">
                            <label>Profile Created</label>
                            <span>${profile.createdAt?.toDate().toLocaleDateString('en-US') || 'Unknown'}</span>
                        </div>
                        <div class="info-item">
                            <label>Last Updated</label>
                            <span>${profile.updatedAt?.toDate().toLocaleDateString('en-US') || 'Never'}</span>
                        </div>
                    </div>
                </div>
                ` : '<div class="details-section"><p class="no-profile">No profile created yet</p></div>'}
                
                <!-- Financial Summary -->
                <div class="details-section">
                    <h4>Financial Summary</h4>
                    <div class="financial-stats">
                        <div class="financial-stat">
                            <div class="stat-label">Total Income</div>
                            <div class="stat-value amount-positive">$${user.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                        <div class="financial-stat">
                            <div class="stat-label">Total Expenses</div>
                            <div class="stat-value amount-negative">$${user.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                        <div class="financial-stat">
                            <div class="stat-label">Balance</div>
                            <div class="stat-value ${balance >= 0 ? 'amount-positive' : 'amount-negative'}">
                                $${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Recent Transactions -->
                <div class="details-section">
                    <h4>Recent Transactions</h4>
                    
                    <div class="transaction-tabs">
                        <div class="tab">
                            <h5>Recent Incomes (${incomes.length})</h5>
                            ${incomes.length > 0 ? `
                            <div class="transaction-list">
                                ${incomes.map(income => {
                                    const date = income.date?.toDate();
                                    const dateStr = date ? date.toLocaleDateString('en-US') : 'Unknown';
                                    return `
                                    <div class="transaction-item">
                                        <div class="transaction-info">
                                            <div class="transaction-amount amount-positive">
                                                $${(income.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div class="transaction-details">
                                                <div class="transaction-description">
                                                    ${this.escapeHtml(income.description || 'No description')}
                                                </div>
                                                <div class="transaction-date">
                                                    ${dateStr}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    `;
                                }).join('')}
                            </div>
                            ` : '<p class="no-data">No income records found</p>'}
                            ${incomes.length > 0 ? `
                            <button class="btn btn-secondary btn-sm view-all-btn" data-type="income">
                                View All Incomes
                            </button>
                            ` : ''}
                        </div>
                        
                        <div class="tab">
                            <h5>Recent Expenses (${expenses.length})</h5>
                            ${expenses.length > 0 ? `
                            <div class="transaction-list">
                                ${expenses.map(expense => {
                                    const date = expense.date?.toDate();
                                    const dateStr = date ? date.toLocaleDateString('en-US') : 'Unknown';
                                    return `
                                    <div class="transaction-item">
                                        <div class="transaction-info">
                                            <div class="transaction-amount amount-negative">
                                                $${(expense.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                            <div class="transaction-details">
                                                <div class="transaction-description">
                                                    ${this.escapeHtml(expense.category || 'No category')}
                                                </div>
                                                <div class="transaction-date">
                                                    ${dateStr}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    `;
                                }).join('')}
                            </div>
                            ` : '<p class="no-data">No expense records found</p>'}
                            ${expenses.length > 0 ? `
                            <button class="btn btn-secondary btn-sm view-all-btn" data-type="expense">
                                View All Expenses
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="details-actions">
                    <button class="btn btn-primary" id="editUserBtn">
                        <i class="fas fa-edit"></i>
                        Edit User
                    </button>
                    <button class="btn btn-danger" id="deleteUserBtn">
                        <i class="fas fa-trash"></i>
                        Delete User
                    </button>
                </div>
            </div>
        `;
    }
    
    exportUsersData() {
        try {
            if (this.filteredUsers.length === 0) {
                this.showMessage('No data to export', 'warning');
                return;
            }
            
            // Prepare data for export
            const exportData = this.filteredUsers.map(user => ({
                'User ID': user.userId,
                'Name': user.name,
                'Email': user.email,
                'Phone': user.phone || 'N/A',
                'Join Date': user.createdAt ? user.createdAt.toISOString().split('T')[0] : 'N/A',
                'Profile Status': user.profileStatus,
                'Account Status': user.status || 'active',
                'Role': user.role || 'user',
                'Total Income': user.totalIncome,
                'Total Expenses': user.totalExpenses,
                'Balance': user.totalIncome - user.totalExpenses
            }));
            
            // Convert to CSV
            const headers = Object.keys(exportData[0] || {});
            const csv = [
                headers.join(','),
                ...exportData.map(row => 
                    headers.map(header => {
                        const cell = row[header];
                        return typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) ? 
                            `"${cell.replace(/"/g, '""')}"` : cell;
                    }).join(',')
                )
            ].join('\n');
            
            // Create download link
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showMessage(`Exported ${exportData.length} users successfully!`, 'success');
            
        } catch (error) {
            console.error("Error exporting data:", error);
            this.showMessage('Error exporting data: ' + error.message, 'error');
        }
    }
    
    showLoading(show) {
        const tableBody = document.getElementById('usersTableBody');
        if (show) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="loading-row">
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading users data...</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    cacheData(key, data) {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            sessionStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error caching data:', error);
        }
    }
    
    getCachedData(key) {
        try {
            const cached = sessionStorage.getItem(`cache_${key}`);
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            // Check if cache is valid (5 minutes)
            if (Date.now() - cacheData.timestamp > 5 * 60 * 1000) {
                sessionStorage.removeItem(`cache_${key}`);
                return null;
            }
            
            return cacheData.data;
        } catch (error) {
            console.error('Error getting cached data:', error);
            return null;
        }
    }
    
    showMessage(message, type = 'info') {
        // Remove existing messages of same type
        const existingMessages = document.querySelectorAll(`.message-${type}`);
        existingMessages.forEach(msg => {
            if (msg.textContent.includes(message)) {
                msg.remove();
            }
        });
        
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${this.getMessageIcon(type)}"></i>
            <span>${message}</span>
            <button class="message-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to page
        const container = document.querySelector('.main-content');
        if (container && container.firstChild) {
            container.insertBefore(messageDiv, container.firstChild);
        } else if (container) {
            container.appendChild(messageDiv);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    }
    
    getMessageIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            case 'info': return 'info-circle';
            default: return 'info-circle';
        }
    }
    
    showError(message) {
        const container = document.querySelector('.main-content');
        if (container) {
            const errorHTML = `
                <div style="text-align: center; padding: 50px; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 50px; margin-bottom: 20px;"></i>
                    <h2>⚠️ System Error</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> Reload Page
                    </button>
                </div>
            `;
            
            // Only replace if not already showing error
            if (!container.innerHTML.includes('System Error')) {
                container.innerHTML = errorHTML;
            }
        }
    }
}

// Initialize users manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.usersManager = new UsersManager();
});