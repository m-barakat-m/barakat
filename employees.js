// Employees Management System
class EmployeesManager {
    constructor() {
        this.employees = [];
        this.filteredEmployees = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.currentRoleFilter = 'all';
        this.currentStatusFilter = 'all';
        this.currentSort = 'newest';
        this.searchTerm = '';
        this.rolesChart = null;
        this.init();
    }

    async init() {
        console.log("🚀 Initializing Employees Manager...");
        
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
            
            // Load employees data
            await this.loadEmployeesData();
            
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
        
        // Check permissions - only admins and supervisor managers can manage employees
        if (!authSystem.hasPermission('manageEmployees')) {
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
        
        // Add employee button
        document.getElementById('addEmployeeBtn').addEventListener('click', () => {
            this.showAddEmployeeModal();
        });
        
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.filterAndSortEmployees();
        });
        
        document.getElementById('clearSearchBtn').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            this.searchTerm = '';
            this.filterAndSortEmployees();
        });
        
        // Filter and sort
        document.getElementById('roleFilter').addEventListener('change', (e) => {
            this.currentRoleFilter = e.target.value;
            this.filterAndSortEmployees();
        });
        
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.currentStatusFilter = e.target.value;
            this.filterAndSortEmployees();
        });
        
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.filterAndSortEmployees();
        });
        
        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportEmployeesData();
        });
        
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadEmployeesData();
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
            this.renderEmployeesTable();
        });
        
        // Chart type selector
        document.getElementById('chartType').addEventListener('change', (e) => {
            this.updateRolesChart(e.target.value);
        });
        
        // Password strength checker
        const passwordInput = document.getElementById('newEmployeePassword');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                this.checkPasswordStrength(e.target.value);
            });
        }
        
        // Role change listener for permission preview
        document.getElementById('newEmployeeRole').addEventListener('change', (e) => {
            this.showPermissionsPreview(e.target.value);
        });
        
        document.getElementById('editEmployeeRole').addEventListener('change', (e) => {
            this.showEditPermissionsPreview(e.target.value);
        });
        
        // Modal close buttons
        document.getElementById('closeAddEmployeeModal').addEventListener('click', () => {
            this.hideAddEmployeeModal();
        });
        
        document.getElementById('closeEditEmployeeModal').addEventListener('click', () => {
            this.hideEditEmployeeModal();
        });
        
        document.getElementById('closeEmployeeDetailsModal').addEventListener('click', () => {
            this.hideEmployeeDetailsModal();
        });
        
        document.getElementById('cancelAddEmployeeBtn').addEventListener('click', () => {
            this.hideAddEmployeeModal();
        });
        
        document.getElementById('cancelEditEmployeeBtn').addEventListener('click', () => {
            this.hideEditEmployeeModal();
        });
        
        // Add employee form
        document.getElementById('addEmployeeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addNewEmployee();
        });
        
        // Edit employee form
        document.getElementById('editEmployeeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateEmployee();
        });
        
        // Send password reset button
        document.getElementById('sendResetPasswordBtn').addEventListener('click', () => {
            const email = document.getElementById('resetPasswordEmail').value;
            this.sendPasswordResetEmail(email);
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
    
    async loadEmployeesData() {
        try {
            // Show loading state
            this.showLoading(true);
            
            // Load employees from Firestore
            const employeesSnapshot = await this.db.collection('employees').get();
            this.employees = [];
            
            // Get current user's ID to prevent self-modification
            const currentUserId = authSystem.currentUser?.id;
            
            employeesSnapshot.forEach(doc => {
                const employeeData = doc.data();
                const employee = {
                    id: doc.id,
                    ...employeeData,
                    // Add formatted dates
                    joinDate: employeeData.createdAt?.toDate(),
                    lastLogin: employeeData.lastLogin?.toDate(),
                    // Calculate if this is the current user
                    isCurrentUser: doc.id === currentUserId
                };
                
                this.employees.push(employee);
            });
            
            console.log(`✅ Loaded ${this.employees.length} employees`);
            
            // Update statistics
            await this.updateStatistics();
            
            // Initialize roles chart
            this.initRolesChart();
            
            // Filter and sort employees
            this.filterAndSortEmployees();
            
            // Hide loading state
            this.showLoading(false);
            
        } catch (error) {
            console.error("❌ Error loading employees data:", error);
            this.showError("Error loading employees data: " + error.message);
            this.showLoading(false);
        }
    }
    
    async updateStatistics() {
        const totalEmployees = this.employees.length;
        const activeEmployees = this.employees.filter(emp => emp.status === 'active').length;
        
        // Calculate growth this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const employeesThisMonth = this.employees.filter(employee => {
            const joinDate = employee.joinDate;
            return joinDate && joinDate >= startOfMonth;
        }).length;
        
        // Calculate role distribution
        const roleCounts = {};
        this.employees.forEach(employee => {
            const role = employee.role || 'Unknown';
            roleCounts[role] = (roleCounts[role] || 0) + 1;
        });
        
        const uniqueRoles = Object.keys(roleCounts).length;
        const topRole = Object.keys(roleCounts).reduce((a, b) => 
            roleCounts[a] > roleCounts[b] ? a : b, 'None'
        );
        
        // Calculate recent employees (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentEmployees = this.employees.filter(employee => {
            const joinDate = employee.joinDate;
            return joinDate && joinDate >= thirtyDaysAgo;
        }).length;
        
        const activePercentage = totalEmployees > 0 ? 
            Math.round((activeEmployees / totalEmployees) * 100) : 0;
        
        // Update UI
        document.getElementById('totalEmployeesCount').textContent = totalEmployees.toLocaleString();
        document.getElementById('employeesCount').textContent = totalEmployees;
        document.getElementById('employeesGrowth').textContent = employeesThisMonth;
        
        document.getElementById('activeEmployeesCount').textContent = activeEmployees.toLocaleString();
        document.getElementById('activePercentage').textContent = activePercentage + '%';
        
        document.getElementById('uniqueRolesCount').textContent = uniqueRoles;
        document.getElementById('topRole').textContent = topRole;
        
        document.getElementById('recentEmployeesCount').textContent = recentEmployees;
    }
    
    initRolesChart() {
        const ctx = document.getElementById('rolesChart').getContext('2d');
        
        // Calculate role distribution
        const roleCounts = {};
        this.employees.forEach(employee => {
            const role = employee.role || 'Unknown';
            roleCounts[role] = (roleCounts[role] || 0) + 1;
        });
        
        const roles = Object.keys(roleCounts);
        const counts = Object.values(roleCounts);
        
        // Define colors for each role
        const roleColors = {
            'Admin': '#667eea',
            'Supervisor Manager': '#f093fb',
            'Customer Service Manager': '#4facfe',
            'Supervisor': '#43e97b',
            'Customer Service': '#fa709a',
            'Monitor': '#8E2DE2',
            'Unknown': '#a0aec0'
        };
        
        const backgroundColors = roles.map(role => roleColors[role] || '#a0aec0');
        
        this.rolesChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: roles,
                datasets: [{
                    data: counts,
                    backgroundColor: backgroundColors,
                    borderWidth: 1,
                    borderColor: 'white'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    updateRolesChart(chartType) {
        if (!this.rolesChart) return;
        
        this.rolesChart.destroy();
        const ctx = document.getElementById('rolesChart').getContext('2d');
        
        // Calculate role distribution
        const roleCounts = {};
        this.employees.forEach(employee => {
            const role = employee.role || 'Unknown';
            roleCounts[role] = (roleCounts[role] || 0) + 1;
        });
        
        const roles = Object.keys(roleCounts);
        const counts = Object.values(roleCounts);
        
        // Define colors for each role
        const roleColors = {
            'Admin': '#667eea',
            'Supervisor Manager': '#f093fb',
            'Customer Service Manager': '#4facfe',
            'Supervisor': '#43e97b',
            'Customer Service': '#fa709a',
            'Monitor': '#8E2DE2',
            'Unknown': '#a0aec0'
        };
        
        const backgroundColors = roles.map(role => roleColors[role] || '#a0aec0');
        
        this.rolesChart = new Chart(ctx, {
            type: chartType,
            data: {
                labels: roles,
                datasets: [{
                    data: counts,
                    backgroundColor: backgroundColors,
                    borderWidth: 1,
                    borderColor: 'white'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: chartType === 'bar' ? {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                } : undefined
            }
        });
    }
    
    filterAndSortEmployees() {
        // Apply search filter
        if (this.searchTerm.trim()) {
            this.filteredEmployees = this.employees.filter(employee => 
                employee.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                employee.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                (employee.phone && employee.phone.includes(this.searchTerm))
            );
        } else {
            this.filteredEmployees = [...this.employees];
        }
        
        // Apply role filter
        if (this.currentRoleFilter !== 'all') {
            this.filteredEmployees = this.filteredEmployees.filter(employee => 
                employee.role === this.currentRoleFilter
            );
        }
        
        // Apply status filter
        if (this.currentStatusFilter !== 'all') {
            this.filteredEmployees = this.filteredEmployees.filter(employee => 
                employee.status === this.currentStatusFilter
            );
        }
        
        // Apply sorting
        this.sortEmployees();
        
        // Reset to first page
        this.currentPage = 1;
        
        // Update UI
        this.updatePagination();
        this.renderEmployeesTable();
    }
    
    sortEmployees() {
        switch (this.currentSort) {
            case 'newest':
                this.filteredEmployees.sort((a, b) => {
                    const dateA = a.joinDate || new Date(0);
                    const dateB = b.joinDate || new Date(0);
                    return dateB - dateA;
                });
                break;
                
            case 'oldest':
                this.filteredEmployees.sort((a, b) => {
                    const dateA = a.joinDate || new Date(0);
                    const dateB = b.joinDate || new Date(0);
                    return dateA - dateB;
                });
                break;
                
            case 'name':
                this.filteredEmployees.sort((a, b) => 
                    a.name.localeCompare(b.name)
                );
                break;
                
            case 'role':
                this.filteredEmployees.sort((a, b) => 
                    (a.role || '').localeCompare(b.role || '')
                );
                break;
        }
    }
    
    updatePagination() {
        this.totalPages = Math.ceil(this.filteredEmployees.length / this.itemsPerPage);
        this.currentPage = Math.max(1, Math.min(this.currentPage, this.totalPages));
        
        // Update UI
        document.getElementById('currentPage').textContent = this.currentPage;
        document.getElementById('totalPages').textContent = this.totalPages;
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, this.filteredEmployees.length);
        
        document.getElementById('showingCount').textContent = (end - start);
        document.getElementById('totalCount').textContent = this.filteredEmployees.length;
        
        // Update button states
        document.getElementById('prevPageBtn').disabled = this.currentPage === 1;
        document.getElementById('nextPageBtn').disabled = this.currentPage === this.totalPages;
    }
    
    renderEmployeesTable() {
        const tableBody = document.getElementById('employeesTableBody');
        
        if (this.filteredEmployees.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-user-tie"></i>
                        <h4>No employees found</h4>
                        <p>${this.searchTerm ? 'Try a different search term' : 'No employees available'}</p>
                        <button class="btn btn-primary" id="addFirstEmployeeBtn">
                            <i class="fas fa-user-plus"></i>
                            Add First Employee
                        </button>
                    </td>
                </tr>
            `;
            
            // Add event listener to the button
            setTimeout(() => {
                const addFirstEmployeeBtn = document.getElementById('addFirstEmployeeBtn');
                if (addFirstEmployeeBtn) {
                    addFirstEmployeeBtn.addEventListener('click', () => {
                        this.showAddEmployeeModal();
                    });
                }
            }, 100);
            
            return;
        }
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, this.filteredEmployees.length);
        const currentEmployees = this.filteredEmployees.slice(start, end);
        
        tableBody.innerHTML = currentEmployees.map((employee, index) => {
            const joinDate = employee.joinDate;
            const joinDateStr = joinDate ? 
                joinDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                }) : 'N/A';
            
            const lastLoginStr = employee.lastLogin ? 
                employee.lastLogin.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'Never';
            
            // Get role badge class
            const roleClass = this.getRoleBadgeClass(employee.role);
            
            return `
                <tr>
                    <td>
                        <strong>${employee.name}</strong>
                        ${employee.isCurrentUser ? '<span style="color: var(--primary-color); margin-left: 5px;">(You)</span>' : ''}
                    </td>
                    <td>${employee.email}</td>
                    <td>${employee.phone || 'N/A'}</td>
                    <td>
                        <span class="role-badge ${roleClass}">
                            ${employee.role || 'Unknown'}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge status-${employee.status || 'active'}">
                            ${employee.status || 'active'}
                        </span>
                    </td>
                    <td>${joinDateStr}</td>
                    <td>${lastLoginStr}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" 
                                    title="View Details"
                                    onclick="employeesManager.viewEmployeeDetails('${employee.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit-btn" 
                                    title="Edit Employee"
                                    onclick="employeesManager.editEmployee('${employee.id}')"
                                    ${employee.isCurrentUser ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" 
                                    title="Delete Employee"
                                    onclick="employeesManager.deleteEmployee('${employee.id}')"
                                    ${employee.isCurrentUser ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    getRoleBadgeClass(role) {
        switch(role) {
            case 'Admin': return 'role-admin';
            case 'Supervisor Manager': return 'role-supervisor-manager';
            case 'Customer Service Manager': return 'role-customer-service-manager';
            case 'Supervisor': return 'role-supervisor';
            case 'Customer Service': return 'role-customer-service';
            case 'Monitor': return 'role-monitor';
            default: return 'role-admin';
        }
    }
    
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePagination();
            this.renderEmployeesTable();
        }
    }
    
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePagination();
            this.renderEmployeesTable();
        }
    }
    
    showAddEmployeeModal() {
        document.getElementById('addEmployeeModal').classList.add('active');
        document.getElementById('addEmployeeForm').reset();
        document.getElementById('passwordStrength').textContent = 'Strength: Weak';
        document.getElementById('passwordStrength').className = 'password-strength weak';
        this.showPermissionsPreview('Admin'); // Default to Admin role
    }
    
    hideAddEmployeeModal() {
        document.getElementById('addEmployeeModal').classList.remove('active');
    }
    
    showEditEmployeeModal() {
        document.getElementById('editEmployeeModal').classList.add('active');
    }
    
    hideEditEmployeeModal() {
        document.getElementById('editEmployeeModal').classList.remove('active');
    }
    
    showEmployeeDetailsModal() {
        document.getElementById('employeeDetailsModal').classList.add('active');
    }
    
    hideEmployeeDetailsModal() {
        document.getElementById('employeeDetailsModal').classList.remove('active');
    }
    
    checkPasswordStrength(password) {
        let strength = 0;
        const strengthElement = document.getElementById('passwordStrength');
        
        if (!password) {
            strengthElement.textContent = 'Strength: Weak';
            strengthElement.className = 'password-strength weak';
            return;
        }
        
        // Length check
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        
        // Complexity checks
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        // Determine strength level
        if (strength <= 2) {
            strengthElement.textContent = 'Strength: Weak';
            strengthElement.className = 'password-strength weak';
        } else if (strength <= 4) {
            strengthElement.textContent = 'Strength: Medium';
            strengthElement.className = 'password-strength medium';
        } else {
            strengthElement.textContent = 'Strength: Strong';
            strengthElement.className = 'password-strength strong';
        }
    }
    
    showPermissionsPreview(role) {
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

        const permissions = permissionsMap[role] || { view: false };
        const container = document.getElementById('permissionsPreview');
        
        const permissionsHTML = Object.entries(permissions).map(([key, value]) => `
            <div class="permission-item">
                <i class="fas fa-${value ? 'check' : 'times'}"></i>
                <span>${this.formatPermissionName(key)}</span>
            </div>
        `).join('');
        
        container.innerHTML = permissionsHTML;
    }
    
    showEditPermissionsPreview(role) {
        this.showPermissionsPreview(role);
        const container = document.getElementById('editPermissionsPreview');
        const previewContainer = document.getElementById('permissionsPreview').innerHTML;
        container.innerHTML = previewContainer;
    }
    
    formatPermissionName(permission) {
        const names = {
            'view': 'View Data',
            'edit': 'Edit Data',
            'delete': 'Delete Data',
            'manage': 'Manage System',
            'manageEmployees': 'Manage Employees',
            'manageUsers': 'Manage Users',
            'manageFinances': 'Manage Finances',
            'viewReports': 'View Reports'
        };
        return names[permission] || permission;
    }
    
    async addNewEmployee() {
        try {
            const name = document.getElementById('newEmployeeName').value;
            const email = document.getElementById('newEmployeeEmail').value;
            const phone = document.getElementById('newEmployeePhone').value;
            const role = document.getElementById('newEmployeeRole').value;
            const password = document.getElementById('newEmployeePassword').value;
            const status = document.getElementById('newEmployeeStatus').value;
            
            // Validate inputs
            if (!name || !email || !phone || !role || !password || !status) {
                this.showMessage('Please fill in all required fields', 'error');
                return;
            }
            
            if (password.length < 6) {
                this.showMessage('Password must be at least 6 characters', 'error');
                return;
            }
            
            // Check if email already exists in employees collection
            const existingEmployee = await this.db.collection('employees')
                .where('email', '==', email)
                .get();
            
            if (!existingEmployee.empty) {
                this.showMessage('An employee with this email already exists', 'error');
                return;
            }
            
            // Create user in Firebase Auth
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;
            
            // Create employee document in Firestore
            await this.db.collection('employees').doc(userId).set({
                name: name,
                email: email,
                phone: phone,
                role: role,
                status: status,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: null
            });
            
            // Show success message
            this.showMessage(`Employee ${name} created successfully!`, 'success');
            
            // Close modal
            this.hideAddEmployeeModal();
            
            // Refresh employees list
            await this.loadEmployeesData();
            
        } catch (error) {
            console.error("Error adding employee:", error);
            
            let errorMessage = 'Error creating employee: ';
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
    
    async editEmployee(employeeId) {
        try {
            const employee = this.employees.find(emp => emp.id === employeeId);
            if (!employee) {
                this.showMessage('Employee not found', 'error');
                return;
            }
            
            // Don't allow editing of own account from here
            if (employee.isCurrentUser) {
                this.showMessage('You cannot edit your own account from here. Use profile settings instead.', 'warning');
                return;
            }
            
            // Populate edit form
            document.getElementById('editEmployeeId').value = employee.id;
            document.getElementById('editEmployeeName').value = employee.name || '';
            document.getElementById('editEmployeeEmail').value = employee.email || '';
            document.getElementById('editEmployeePhone').value = employee.phone || '';
            document.getElementById('editEmployeeRole').value = employee.role || '';
            document.getElementById('editEmployeeStatus').value = employee.status || 'active';
            document.getElementById('resetPasswordEmail').value = employee.email || '';
            
            // Show permissions preview
            this.showEditPermissionsPreview(employee.role);
            
            // Update modal title
            document.getElementById('editEmployeeTitle').textContent = `Edit Employee: ${employee.name}`;
            
            // Show modal
            this.showEditEmployeeModal();
            
        } catch (error) {
            console.error("Error preparing employee edit:", error);
            this.showMessage('Error loading employee data: ' + error.message, 'error');
        }
    }
    
    async updateEmployee() {
        try {
            const employeeId = document.getElementById('editEmployeeId').value;
            const name = document.getElementById('editEmployeeName').value;
            const email = document.getElementById('editEmployeeEmail').value;
            const phone = document.getElementById('editEmployeePhone').value;
            const role = document.getElementById('editEmployeeRole').value;
            const status = document.getElementById('editEmployeeStatus').value;
            
            // Validate inputs
            if (!name || !email || !phone || !role || !status) {
                this.showMessage('Please fill in all required fields', 'error');
                return;
            }
            
            // Find the employee
            const employee = this.employees.find(emp => emp.id === employeeId);
            if (!employee) {
                this.showMessage('Employee not found', 'error');
                return;
            }
            
            // Check if email is being changed and if it already exists
            if (email !== employee.email) {
                const existingEmployee = await this.db.collection('employees')
                    .where('email', '==', email)
                    .get();
                
                if (!existingEmployee.empty) {
                    this.showMessage('An employee with this email already exists', 'error');
                    return;
                }
            }
            
            // Update employee document in Firestore
            await this.db.collection('employees').doc(employeeId).update({
                name: name,
                email: email,
                phone: phone,
                role: role,
                status: status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // If email changed, update in Auth (this requires admin privileges)
            if (email !== employee.email) {
                // Note: In production, you would need to use Admin SDK for this
                // For now, we'll just update the Firestore document
                this.showMessage('Note: Email update in authentication system requires Admin SDK', 'info');
            }
            
            // Show success message
            this.showMessage(`Employee ${name} updated successfully!`, 'success');
            
            // Close modal
            this.hideEditEmployeeModal();
            
            // Refresh employees list
            await this.loadEmployeesData();
            
        } catch (error) {
            console.error("Error updating employee:", error);
            this.showMessage('Error updating employee: ' + error.message, 'error');
        }
    }
    
    async sendPasswordResetEmail(email) {
        try {
            // In a real app, you would use Firebase Admin SDK to send reset email
            // For demo purposes, we'll simulate the process
            
            this.showMessage(`Password reset email sent to ${email}`, 'success');
            
            // In production, you would use:
            // await this.auth.sendPasswordResetEmail(email);
            
        } catch (error) {
            console.error("Error sending password reset email:", error);
            this.showMessage('Error sending password reset email: ' + error.message, 'error');
        }
    }
    
    async viewEmployeeDetails(employeeId) {
        try {
            const employee = this.employees.find(emp => emp.id === employeeId);
            if (!employee) {
                this.showMessage('Employee not found', 'error');
                return;
            }
            
            // Get employee activity (login history, etc.)
            // For now, we'll create mock activity data
            const mockActivities = [
                {
                    type: 'login',
                    title: 'Successful Login',
                    description: 'Logged in from web dashboard',
                    time: employee.lastLogin || new Date()
                },
                {
                    type: 'update',
                    title: 'Profile Updated',
                    description: 'Updated personal information',
                    time: new Date(Date.now() - 86400000) // 1 day ago
                },
                {
                    type: 'password',
                    title: 'Password Changed',
                    description: 'Changed account password',
                    time: new Date(Date.now() - 172800000) // 2 days ago
                }
            ];
            
            // Create modal content
            const modalContent = this.createEmployeeDetailsHTML(employee, mockActivities);
            
            // Update modal
            document.getElementById('employeeDetailsTitle').textContent = `Employee Details: ${employee.name}`;
            document.getElementById('employeeDetailsContent').innerHTML = modalContent;
            
            // Show modal
            this.showEmployeeDetailsModal();
            
        } catch (error) {
            console.error("Error viewing employee details:", error);
            this.showMessage('Error loading employee details: ' + error.message, 'error');
        }
    }
    
    createEmployeeDetailsHTML(employee, activities) {
        const joinDateStr = employee.joinDate ? 
            employee.joinDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }) : 'Unknown';
        
        const lastLoginStr = employee.lastLogin ? 
            employee.lastLogin.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'Never';
        
        // Get initials for avatar
        const initials = employee.name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        
        return `
            <div class="employee-details-view">
                <!-- Avatar and Basic Info -->
                <div class="employee-avatar">
                    ${initials}
                </div>
                
                <div class="employee-basic-info">
                    <h2 class="employee-name">${employee.name}</h2>
                    <div class="employee-email">${employee.email}</div>
                    <div class="employee-phone">${employee.phone || 'No phone'}</div>
                    <div class="employee-role">
                        <span class="role-badge ${this.getRoleBadgeClass(employee.role)}">
                            ${employee.role || 'Unknown Role'}
                        </span>
                    </div>
                </div>
                
                <!-- Employee Stats -->
                <div class="employee-stats">
                    <div class="employee-stat">
                        <div class="employee-stat-label">Status</div>
                        <div class="employee-stat-value">
                            <span class="status-badge status-${employee.status || 'active'}">
                                ${employee.status || 'active'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="employee-stat">
                        <div class="employee-stat-label">Join Date</div>
                        <div class="employee-stat-value">${joinDateStr}</div>
                    </div>
                    
                    <div class="employee-stat">
                        <div class="employee-stat-label">Last Login</div>
                        <div class="employee-stat-value">${lastLoginStr}</div>
                    </div>
                    
                    <div class="employee-stat">
                        <div class="employee-stat-label">Account Type</div>
                        <div class="employee-stat-value">Employee</div>
                    </div>
                </div>
                
                <!-- Permissions Section -->
                <div class="permissions-section">
                    <h4>Permissions</h4>
                    <div class="permissions-grid">
                        ${this.createPermissionsHTML(employee.role)}
                    </div>
                </div>
                
                <!-- Activity Timeline -->
                <div class="activity-timeline">
                    <h4>Recent Activity</h4>
                    ${activities.map(activity => `
                        <div class="timeline-item">
                            <div class="timeline-icon">
                                <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                            </div>
                            <div class="timeline-content">
                                <div class="timeline-title">${activity.title}</div>
                                <div class="timeline-description">${activity.description}</div>
                                <div class="timeline-time">
                                    ${activity.time.toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Action Buttons -->
                <div class="details-actions">
                    <button class="btn btn-primary" onclick="employeesManager.editEmployee('${employee.id}')"
                            ${employee.isCurrentUser ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        <i class="fas fa-edit"></i>
                        Edit Employee
                    </button>
                    <button class="btn btn-secondary" onclick="employeesManager.sendPasswordResetEmail('${employee.email}')">
                        <i class="fas fa-key"></i>
                        Reset Password
                    </button>
                    <button class="btn ${employee.status === 'active' ? 'btn-warning' : 'btn-primary'}" 
                            onclick="employeesManager.toggleEmployeeStatus('${employee.id}', '${employee.status}')"
                            ${employee.isCurrentUser ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        <i class="fas fa-toggle-${employee.status === 'active' ? 'off' : 'on'}"></i>
                        ${employee.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                </div>
            </div>
        `;
    }
    
    createPermissionsHTML(role) {
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

        const permissions = permissionsMap[role] || { view: false };
        
        return Object.entries(permissions).map(([key, value]) => `
            <div class="permission-item">
                <i class="fas fa-${value ? 'check' : 'times'}"></i>
                <span>${this.formatPermissionName(key)}</span>
            </div>
        `).join('');
    }
    
    getActivityIcon(activityType) {
        switch(activityType) {
            case 'login': return 'sign-in-alt';
            case 'update': return 'edit';
            case 'password': return 'key';
            default: return 'bell';
        }
    }
    
    async toggleEmployeeStatus(employeeId, currentStatus) {
        try {
            const employee = this.employees.find(emp => emp.id === employeeId);
            if (!employee) {
                this.showMessage('Employee not found', 'error');
                return;
            }
            
            // Don't allow deactivating own account
            if (employee.isCurrentUser) {
                this.showMessage('You cannot deactivate your own account', 'warning');
                return;
            }
            
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            const confirmMessage = `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} ${employee.name}?`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Update employee status
            await this.db.collection('employees').doc(employeeId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            this.showMessage(`Employee ${employee.name} ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`, 'success');
            
            // Refresh data
            await this.loadEmployeesData();
            
            // Close details modal if open
            this.hideEmployeeDetailsModal();
            
        } catch (error) {
            console.error("Error toggling employee status:", error);
            this.showMessage('Error updating employee status: ' + error.message, 'error');
        }
    }
    
    async deleteEmployee(employeeId) {
        try {
            const employee = this.employees.find(emp => emp.id === employeeId);
            if (!employee) {
                this.showMessage('Employee not found', 'error');
                return;
            }
            
            // Don't allow deleting own account
            if (employee.isCurrentUser) {
                this.showMessage('You cannot delete your own account', 'warning');
                return;
            }
            
            const confirmMessage = `Are you sure you want to delete ${employee.name}? This action cannot be undone.\n\nThis will permanently delete their employee account and access to the dashboard.`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // In a real application, you would:
            // 1. Delete from Firebase Auth
            // 2. Delete from Firestore
            
            // For demo purposes, we'll just show a message
            this.showMessage(`Employee ${employee.name} deleted successfully!`, 'success');
            
            // In production, implement actual deletion:
            /*
            // Delete from Auth (requires Admin SDK)
            // Delete from Firestore
            await this.db.collection('employees').doc(employeeId).delete();
            */
            
            // Refresh data
            await this.loadEmployeesData();
            
        } catch (error) {
            console.error("Error deleting employee:", error);
            this.showMessage('Error deleting employee: ' + error.message, 'error');
        }
    }
    
    exportEmployeesData() {
        try {
            // Prepare data for export
            const exportData = this.filteredEmployees.map(employee => ({
                'Name': employee.name,
                'Email': employee.email,
                'Phone': employee.phone || 'N/A',
                'Role': employee.role || 'Unknown',
                'Status': employee.status || 'active',
                'Join Date': employee.joinDate?.toISOString().split('T')[0] || 'N/A',
                'Last Login': employee.lastLogin?.toISOString().split('T')[0] || 'Never'
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
            a.download = `employees_export_${new Date().toISOString().split('T')[0]}.csv`;
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
        const tableBody = document.getElementById('employeesTableBody');
        if (show) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-row">
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading employees data...</p>
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

// Initialize employees manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.employeesManager = new EmployeesManager();
});