// Users Management System - COMPLETE VERSION
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
            this.showError("You don't have permission to access this page.");
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
        
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.filterAndSortUsers();
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
        
        document.getElementById('closeEditUserModal').addEventListener('click', () => {
            this.hideEditUserModal();
        });
        
        document.getElementById('cancelAddUserBtn').addEventListener('click', () => {
            this.hideAddUserModal();
        });
        
        document.getElementById('cancelEditUserBtn').addEventListener('click', () => {
            this.hideEditUserModal();
        });
        
        // Add user form
        document.getElementById('addUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addNewUser();
        });
        
        // Edit user form
        document.getElementById('editUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateUser();
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
        try {
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
                        totalIncome += income.amount || 0;
                    }
                });
                
                // Calculate total expenses for this user
                let totalExpenses = 0;
                expensesSnapshot.forEach(expenseDoc => {
                    const expense = expenseDoc.data();
                    if (expense.userId === userId) {
                        totalExpenses += expense.amount || 0;
                    }
                });
                
                // Create user object with all data
                const user = {
                    id: doc.id,
                    userId: userId,
                    name: userData.name || 'Unknown',
                    email: userData.email || 'No email',
                    phone: profile?.phone || userData.phone || 'N/A',
                    createdAt: userData.createdAt || null,
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
            
            // Hide loading state
            this.showLoading(false);
            
        } catch (error) {
            console.error("❌ Error loading users data:", error);
            this.showError("Error loading users data: " + error.message);
            this.showLoading(false);
        }
    }
    
    async updateStatistics() {
        const totalUsers = this.users.length;
        const activeProfiles = this.users.filter(user => user.hasProfile).length;
        
        // Calculate growth this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const usersThisMonth = this.users.filter(user => {
            const joinDate = user.createdAt?.toDate();
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
                (user.phone && user.phone.includes(this.searchTerm))
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
                    const dateA = a.createdAt?.toDate() || new Date(0);
                    const dateB = b.createdAt?.toDate() || new Date(0);
                    return dateB - dateA;
                });
                break;
                
            case 'oldest':
                this.filteredUsers.sort((a, b) => {
                    const dateA = a.createdAt?.toDate() || new Date(0);
                    const dateB = b.createdAt?.toDate() || new Date(0);
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
        this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
        this.currentPage = Math.max(1, Math.min(this.currentPage, this.totalPages));
        
        // Update UI
        document.getElementById('currentPage').textContent = this.currentPage;
        document.getElementById('totalPages').textContent = this.totalPages;
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, this.filteredUsers.length);
        
        document.getElementById('showingCount').textContent = (end - start);
        document.getElementById('totalCount').textContent = this.filteredUsers.length;
        
        // Update button states
        document.getElementById('prevPageBtn').disabled = this.currentPage === 1;
        document.getElementById('nextPageBtn').disabled = this.currentPage === this.totalPages;
    }
    
    renderUsersTable() {
        const tableBody = document.getElementById('usersTableBody');
        
        if (this.filteredUsers.length === 0) {
            tableBody.innerHTML = `
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
            
            // Add event listener to the button
            setTimeout(() => {
                const addFirstUserBtn = document.getElementById('addFirstUserBtn');
                if (addFirstUserBtn) {
                    addFirstUserBtn.addEventListener('click', () => {
                        this.showAddUserModal();
                    });
                }
            }, 100);
            
            return;
        }
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, this.filteredUsers.length);
        const currentUsers = this.filteredUsers.slice(start, end);
        
        tableBody.innerHTML = currentUsers.map((user, index) => {
            const joinDate = user.createdAt?.toDate();
            const joinDateStr = joinDate ? 
                joinDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                }) : 'N/A';
            
            // Create user ID display (shortened)
            const shortId = user.userId ? user.userId.substring(0, 8) + '...' : 'N/A';
            
            return `
                <tr>
                    <td class="user-id" title="${user.userId || 'No ID'}">
                        ${shortId}
                    </td>
                    <td>
                        <strong>${user.name}</strong>
                    </td>
                    <td>${user.email}</td>
                    <td>${user.phone}</td>
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
                                    onclick="usersManager.viewUserDetails('${user.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit-btn" 
                                    title="Edit User"
                                    onclick="usersManager.editUser('${user.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" 
                                    title="Delete User"
                                    onclick="usersManager.deleteUser('${user.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
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
        document.getElementById('editUserModal').classList.add('active');
    }
    
    hideEditUserModal() {
        document.getElementById('editUserModal').classList.remove('active');
    }
    
    showUserDetailsModal() {
        document.getElementById('userDetailsModal').classList.add('active');
    }
    
    hideUserDetailsModal() {
        document.getElementById('userDetailsModal').classList.remove('active');
    }
    
    async addNewUser() {
        try {
            const name = document.getElementById('newUserName').value;
            const email = document.getElementById('newUserEmail').value;
            const phone = document.getElementById('newUserPhone').value;
            const password = document.getElementById('newUserPassword').value;
            const status = document.getElementById('newUserStatus').value;
            
            // Validate inputs
            if (!name || !email || !password) {
                this.showMessage('Please fill in all required fields', 'error');
                return;
            }
            
            if (password.length < 6) {
                this.showMessage('Password must be at least 6 characters', 'error');
                return;
            }
            
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
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
                    errorMessage += 'Email already in use';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Invalid email address';
                    break;
                case 'auth/weak-password':
                    errorMessage += 'Password is too weak';
                    break;
                default:
                    errorMessage += error.message;
            }
            
            this.showMessage(errorMessage, 'error');
        }
    }
    
    // ========== NEW: COMPLETE EDIT USER FUNCTION ==========
    async editUser(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) {
                this.showMessage('User not found', 'error');
                return;
            }
            
            // Create and show edit modal
            const modalHTML = `
                <div class="modal-header">
                    <h3>Edit User: ${user.name}</h3>
                    <button class="close-modal" id="closeEditUserModal">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editUserForm">
                        <input type="hidden" id="editUserId" value="${user.id}">
                        <input type="hidden" id="editUserUID" value="${user.userId}">
                        
                        <div class="form-group">
                            <label for="editUserName">
                                <i class="fas fa-user"></i>
                                Full Name *
                            </label>
                            <input type="text" id="editUserName" value="${user.name}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="editUserEmail">
                                <i class="fas fa-envelope"></i>
                                Email Address *
                            </label>
                            <input type="email" id="editUserEmail" value="${user.email}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="editUserPhone">
                                <i class="fas fa-phone"></i>
                                Phone Number
                            </label>
                            <input type="tel" id="editUserPhone" value="${user.phone || ''}">
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
            `;
            
            // Create modal if doesn't exist
            let editModal = document.getElementById('editUserModal');
            if (!editModal) {
                editModal = document.createElement('div');
                editModal.id = 'editUserModal';
                editModal.className = 'modal';
                editModal.innerHTML = modalHTML;
                document.body.appendChild(editModal);
                
                // Add event listeners
                document.getElementById('closeEditUserModal').addEventListener('click', () => {
                    this.hideEditUserModal();
                });
                
                document.getElementById('cancelEditUserBtn').addEventListener('click', () => {
                    this.hideEditUserModal();
                });
                
                document.getElementById('editUserForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.updateUser();
                });
                
                // Close modal when clicking outside
                editModal.addEventListener('click', (e) => {
                    if (e.target === editModal) {
                        this.hideEditUserModal();
                    }
                });
            } else {
                editModal.innerHTML = modalHTML;
            }
            
            this.showEditUserModal();
            
        } catch (error) {
            console.error("Error preparing user edit:", error);
            this.showMessage('Error loading user data: ' + error.message, 'error');
        }
    }
    
    async updateUser() {
        try {
            const userId = document.getElementById('editUserId').value;
            const userUID = document.getElementById('editUserUID').value;
            const name = document.getElementById('editUserName').value;
            const email = document.getElementById('editUserEmail').value;
            const phone = document.getElementById('editUserPhone').value;
            const status = document.getElementById('editUserStatus').value;
            const role = document.getElementById('editUserRole').value;
            const password = document.getElementById('editUserPassword').value;
            
            // Validate inputs
            if (!name || !email) {
                this.showMessage('Name and email are required', 'error');
                return;
            }
            
            // Update data object
            const updateData = {
                name: name,
                email: email,
                phone: phone || null,
                status: status,
                role: role,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Check if email changed
            const currentUser = this.users.find(u => u.id === userId);
            if (currentUser.email !== email) {
                // Update email in Firebase Auth
                await this.auth.currentUser.updateEmail(email);
                
                // Update email in profile if exists
                const profileRef = this.db.collection('profiles').doc(userUID);
                const profileDoc = await profileRef.get();
                if (profileDoc.exists) {
                    await profileRef.update({
                        email: email,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            
            // Update password if provided
            if (password && password.length >= 6) {
                await this.auth.currentUser.updatePassword(password);
            }
            
            // Update user in Firestore
            await this.db.collection('users').doc(userId).update(updateData);
            
            // Handle profile status
            const profileRef = this.db.collection('profiles').doc(userUID);
            const profileDoc = await profileRef.get();
            
            if (status === 'active' && !profileDoc.exists) {
                // Create profile for activated user
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
            } else if (status === 'inactive' && profileDoc.exists) {
                // Deactivate profile
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
        }
    }
    
    // ========== NEW: COMPLETE DELETE USER FUNCTION ==========
    async deleteUser(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) {
                this.showMessage('User not found', 'error');
                return;
            }
            
            const confirmMessage = `
                Are you sure you want to delete the user "${user.name}"?
                
                This will permanently delete:
                • User account (cannot login anymore)
                • User profile and settings
                • All income records
                • All expense records
                
                This action cannot be undone!
            `;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Show loading
            this.showMessage('Deleting user and all associated data...', 'info');
            
            // Get admin user for re-authentication if needed
            const currentUser = this.auth.currentUser;
            
            try {
                // 1. Delete from Firebase Auth (requires recent login)
                try {
                    await this.auth.currentUser.delete();
                } catch (authError) {
                    if (authError.code === 'auth/requires-recent-login') {
                        // Re-authenticate admin user
                        const password = prompt('Please enter your admin password to confirm user deletion:');
                        if (!password) {
                            this.showMessage('Deletion cancelled. Password required.', 'warning');
                            return;
                        }
                        
                        const credential = firebase.auth.EmailAuthProvider.credential(
                            currentUser.email, 
                            password
                        );
                        
                        await currentUser.reauthenticateWithCredential(credential);
                        await firebase.auth().deleteUser(user.userId);
                    } else {
                        throw authError;
                    }
                }
                
                // 2. Delete all related data from Firestore in batch
                const batch = this.db.batch();
                
                // Delete user document
                batch.delete(this.db.collection('users').doc(userId));
                
                // Delete profile
                batch.delete(this.db.collection('profiles').doc(user.userId));
                
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
                
                // Refresh data
                await this.loadUsersData();
                
                // Close details modal if open
                this.hideUserDetailsModal();
                
            } catch (error) {
                console.error("Error in deletion process:", error);
                
                let errorMsg = 'Error deleting user: ';
                switch (error.code) {
                    case 'auth/wrong-password':
                        errorMsg = 'Incorrect admin password. Deletion cancelled.';
                        break;
                    case 'permission-denied':
                        errorMsg = 'You do not have permission to delete users.';
                        break;
                    default:
                        errorMsg += error.message;
                }
                
                this.showMessage(errorMsg, 'error');
            }
            
        } catch (error) {
            console.error("Error deleting user:", error);
            this.showMessage('Error deleting user: ' + error.message, 'error');
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
            const incomesSnapshot = await this.db.collection('incomes')
                .where('user_id', '==', user.userId)
                .orderBy('date', 'desc')
                .limit(10)
                .get();
            
            const expensesSnapshot = await this.db.collection('expenses')
                .where('userId', '==', user.userId)
                .orderBy('date', 'desc')
                .limit(10)
                .get();
            
            const profileSnapshot = await this.db.collection('profiles')
                .doc(user.userId)
                .get();
            
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
                // Edit profile button
                const editProfileBtn = document.getElementById('editProfileBtn');
                if (editProfileBtn) {
                    editProfileBtn.addEventListener('click', () => {
                        this.editUserProfile(user.id);
                    });
                }
                
                // Edit user button
                const editUserBtn = document.getElementById('editUserBtn');
                if (editUserBtn) {
                    editUserBtn.addEventListener('click', () => {
                        this.editUser(user.id);
                    });
                }
                
                // Reset password button
                const resetPasswordBtn = document.getElementById('resetPasswordBtn');
                if (resetPasswordBtn) {
                    resetPasswordBtn.addEventListener('click', () => {
                        this.resetUserPassword(user.id, user.email);
                    });
                }
                
                // Delete user button
                const deleteUserBtn = document.getElementById('deleteUserBtn');
                if (deleteUserBtn) {
                    deleteUserBtn.addEventListener('click', () => {
                        this.deleteUser(user.id);
                    });
                }
                
                // Toggle status button
                const toggleStatusBtn = document.getElementById('toggleStatusBtn');
                if (toggleStatusBtn) {
                    toggleStatusBtn.addEventListener('click', () => {
                        this.toggleUserStatus(user.id, user.profileStatus);
                    });
                }
                
                // View all transactions buttons
                document.querySelectorAll('.view-all-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const type = e.target.dataset.type;
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
        return `
            <div class="user-details-view">
                <!-- Basic Information -->
                <div class="details-section">
                    <h4>Basic Information</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Full Name</label>
                            <span>${user.name}</span>
                        </div>
                        <div class="info-item">
                            <label>Email</label>
                            <span>${user.email}</span>
                        </div>
                        <div class="info-item">
                            <label>Phone</label>
                            <span>${user.phone || 'Not provided'}</span>
                        </div>
                        <div class="info-item">
                            <label>User ID</label>
                            <span class="user-id-full">${user.userId}</span>
                        </div>
                        <div class="info-item">
                            <label>Join Date</label>
                            <span>${user.createdAt?.toDate().toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            }) || 'Unknown'}</span>
                        </div>
                        <div class="info-item">
                            <label>Status</label>
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
                            <label>Date Format</label>
                            <span>${profile.dateFormat || 'dd/MM/yyyy'}</span>
                        </div>
                        <div class="info-item">
                            <label>Last Updated</label>
                            <span>${profile.updatedAt?.toDate().toLocaleDateString('en-US') || 'Never'}</span>
                        </div>
                    </div>
                </div>
                ` : ''}
                
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
                            <div class="stat-value ${user.totalIncome - user.totalExpenses >= 0 ? 'amount-positive' : 'amount-negative'}">
                                $${(user.totalIncome - user.totalExpenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                ${incomes.map(income => `
                                <div class="transaction-item">
                                    <div class="transaction-info">
                                        <div class="transaction-amount amount-positive">
                                            $${income.amount?.toLocaleString() || '0'}
                                        </div>
                                        <div class="transaction-details">
                                            <div class="transaction-description">
                                                ${income.description || 'No description'}
                                            </div>
                                            <div class="transaction-date">
                                                ${income.date?.toDate().toLocaleDateString('en-US') || 'Unknown date'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                `).join('')}
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
                                ${expenses.map(expense => `
                                <div class="transaction-item">
                                    <div class="transaction-info">
                                        <div class="transaction-amount amount-negative">
                                            $${expense.amount?.toLocaleString() || '0'}
                                        </div>
                                        <div class="transaction-details">
                                            <div class="transaction-description">
                                                ${expense.category || 'No category'}
                                            </div>
                                            <div class="transaction-date">
                                                ${expense.date?.toDate().toLocaleDateString('en-US') || 'Unknown date'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                `).join('')}
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
                    <button class="btn btn-secondary" id="resetPasswordBtn">
                        <i class="fas fa-key"></i>
                        Reset Password
                    </button>
                    <button class="btn btn-warning" id="deleteUserBtn">
                        <i class="fas fa-trash"></i>
                        Delete User
                    </button>
                </div>
            </div>
        `;
    }
    
    async editUserProfile(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) {
                this.showMessage('User not found', 'error');
                return;
            }
            
            // Redirect to profiles page with user ID
            window.open(`profiles.html?userId=${user.userId}`, '_blank');
            
        } catch (error) {
            console.error("Error editing user profile:", error);
            this.showMessage('Error: ' + error.message, 'error');
        }
    }
    
    async resetUserPassword(userId, email) {
        try {
            const newPassword = prompt('Enter new password for ' + email + ' (min 6 characters):');
            
            if (!newPassword) {
                this.showMessage('Password reset cancelled', 'info');
                return;
            }
            
            if (newPassword.length < 6) {
                this.showMessage('Password must be at least 6 characters', 'error');
                return;
            }
            
            // Show loading
            this.showMessage('Resetting password...', 'info');
            
            // Get the user from Firebase Auth
            const userRecord = await this.auth.getUserByEmail(email);
            
            // Update password
            await this.auth.updateUser(userRecord.uid, {
                password: newPassword
            });
            
            this.showMessage(`Password reset successfully for ${email}`, 'success');
            
        } catch (error) {
            console.error("Error resetting password:", error);
            this.showMessage('Error resetting password: ' + error.message, 'error');
        }
    }
    
    async toggleUserStatus(userId, currentStatus) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) {
                this.showMessage('User not found', 'error');
                return;
            }
            
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            const confirmMessage = `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} ${user.name}?`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Update user status
            if (newStatus === 'active') {
                // Create profile if activating
                await this.db.collection('profiles').doc(user.userId).set({
                    userId: user.userId,
                    email: user.email,
                    displayName: user.name,
                    phone: user.phone || null,
                    currency: 'USD',
                    language: 'en',
                    country: 'US',
                    avatarUrl: 'default.png',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } else {
                // Remove profile if deactivating (or mark as inactive)
                await this.db.collection('profiles').doc(user.userId).update({
                    status: 'inactive',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Update user document
            await this.db.collection('users').doc(userId).update({
                status: newStatus === 'active' ? 'active' : 'inactive',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            this.showMessage(`User ${user.name} ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`, 'success');
            
            // Refresh data
            await this.loadUsersData();
            
            // Close details modal if open
            this.hideUserDetailsModal();
            
        } catch (error) {
            console.error("Error toggling user status:", error);
            this.showMessage('Error updating user status: ' + error.message, 'error');
        }
    }
    
    exportUsersData() {
        try {
            // Prepare data for export
            const exportData = this.filteredUsers.map(user => ({
                'User ID': user.userId,
                'Name': user.name,
                'Email': user.email,
                'Phone': user.phone || 'N/A',
                'Join Date': user.createdAt?.toDate().toISOString().split('T')[0] || 'N/A',
                'Status': user.profileStatus,
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
                        return typeof cell === 'string' && cell.includes(',') ? 
                            `"${cell}"` : cell;
                    }).join(',')
                )
            ].join('\n');
            
            // Create download link
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showMessage('Export completed successfully!', 'success');
            
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
    
    showMessage(message, type = 'info') {
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
        container.insertBefore(messageDiv, container.firstChild);
        
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
            container.innerHTML = `
                <div style="text-align: center; padding: 50px; color: var(--danger-color);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 50px; margin-bottom: 20px;"></i>
                    <h2>⚠️ System Error</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> Reload Page
                    </button>
                </div>
            `;
        }
    }
}

// Initialize users manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.usersManager = new UsersManager();
});
