// Dashboard Management System - COMPLETE VERSION
class DashboardSystem {
    constructor() {
        this.user = null;
        this.permissions = {};
        this.charts = {};
        this.isLoading = false;
        this.realTimeListeners = [];
        this.init();
    }

    async init() {
        console.log("🚀 Initializing Dashboard System...");
        
        // Check Firebase
        if (typeof firebase === 'undefined') {
            this.showError("Firebase is not loaded. Please refresh the page.");
            return;
        }
        
        try {
            // Initialize Firebase
            let app;
            if (!firebase.apps.length) {
                app = firebase.initializeApp(firebaseConfig);
                console.log("✅ Firebase initialized");
            } else {
                app = firebase.app();
            }
            
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            // Setup event listeners
            this.setupEvents();
            
            // Check authentication
            this.checkAuth();
            
            // Initialize charts
            this.initCharts();
            
        } catch (error) {
            console.error("❌ System initialization error:", error);
            this.showError("System error: " + error.message);
        }
    }
    
    setupEvents() {
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            authSystem.logout();
        });
        
        // Notifications button
        document.getElementById('notificationsBtn').addEventListener('click', () => {
            this.toggleNotifications();
        });
        
        // Close notifications
        document.getElementById('closeNotificationsBtn').addEventListener('click', () => {
            this.closeNotifications();
        });
        
        // Chart period selector
        document.getElementById('chartPeriod').addEventListener('change', (e) => {
            this.loadChartsData(parseInt(e.target.value));
        });
        
        // Activity tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchActivityTab(e.target.dataset.tab);
            });
        });
        
        // Refresh activity button
        document.getElementById('refreshActivityBtn').addEventListener('click', () => {
            this.loadRecentActivity();
        });
        
        // Quick action buttons
        document.getElementById('addUserBtn').addEventListener('click', () => {
            window.location.href = 'users.html?action=add';
        });
        
        document.getElementById('addEmployeeBtn').addEventListener('click', () => {
            window.location.href = 'employees.html?action=add';
        });
        
        document.getElementById('addIncomeBtn').addEventListener('click', () => {
            window.location.href = 'incomes.html?action=add';
        });
        
        document.getElementById('addExpenseBtn').addEventListener('click', () => {
            window.location.href = 'expenses.html?action=add';
        });
        
        document.getElementById('generateReportBtn').addEventListener('click', () => {
            this.generateReport();
        });
        
        document.getElementById('systemSettingsBtn').addEventListener('click', () => {
            window.location.href = 'preferences.html';
        });
        
        // Real-time toggle
        document.getElementById('toggleRealTimeBtn').addEventListener('click', () => {
            this.toggleRealTimeUpdates();
        });
    }
    
    async checkAuth() {
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log("✅ User authenticated:", user.email);
                await this.loadUserData(user.uid);
            } else {
                console.log("❌ Not authenticated, redirecting...");
                window.location.href = 'index.html';
            }
        });
    }
    
    async loadUserData(userId) {
        try {
            const doc = await this.db.collection('employees').doc(userId).get();
            
            if (doc.exists) {
                this.user = doc.data();
                this.user.id = doc.id;
                
                // Update UI with user info
                this.updateUserInterface();
                
                // Load all dashboard data
                await this.loadDashboardData();
                
                // Start real-time updates
                this.startRealTimeUpdates();
                
            } else {
                console.error("❌ Employee data not found");
                this.showError("Employee data not found. Please contact support.");
                await this.auth.signOut();
            }
        } catch (error) {
            console.error("❌ Error loading user data:", error);
            this.showError("Error loading user data: " + error.message);
        }
    }
    
    updateUserInterface() {
        // Update user name and role
        document.getElementById('userName').textContent = this.user.name || this.user.email;
        document.getElementById('userRole').textContent = this.user.role || 'User';
        document.getElementById('greetingName').textContent = this.user.name?.split(' ')[0] || 'Admin';
        
        // Update last login time
        const lastLogin = localStorage.getItem('lastLogin');
        if (lastLogin) {
            const date = new Date(lastLogin);
            document.getElementById('lastLoginTime').textContent = 
                date.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
        }
        
        // Update permissions-based UI
        this.updatePermissionsUI();
    }
    
    updatePermissionsUI() {
        // Show/hide buttons based on permissions
        const addUserBtn = document.getElementById('addUserBtn');
        const addEmployeeBtn = document.getElementById('addEmployeeBtn');
        const generateReportBtn = document.getElementById('generateReportBtn');
        const systemSettingsBtn = document.getElementById('systemSettingsBtn');
        
        if (addUserBtn) {
            addUserBtn.style.display = authSystem.hasPermission('manageUsers') ? 'block' : 'none';
        }
        
        if (addEmployeeBtn) {
            addEmployeeBtn.style.display = authSystem.hasPermission('manageEmployees') ? 'block' : 'none';
        }
        
        if (generateReportBtn) {
            generateReportBtn.style.display = authSystem.hasPermission('viewReports') ? 'block' : 'none';
        }
        
        if (systemSettingsBtn) {
            systemSettingsBtn.style.display = authSystem.hasPermission('manage') ? 'block' : 'none';
        }
    }
    
    async loadDashboardData() {
        this.isLoading = true;
        
        try {
            // Load all statistics in parallel
            await Promise.all([
                this.loadUsersStatistics(),
                this.loadEmployeesStatistics(),
                this.loadIncomesStatistics(),
                this.loadExpensesStatistics(),
                this.loadCategoriesStatistics(),
                this.loadProfilesStatistics(),
                this.loadRecentActivity(),
                this.loadChartsData(6)
            ]);
            
            // Update sidebar badges
            this.updateSidebarBadges();
            
            // Load notifications
            this.loadNotifications();
            
            // Show real-time indicator
            this.showRealTimeIndicator(true);
            
        } catch (error) {
            console.error("❌ Error loading dashboard data:", error);
            this.showError("Error loading data: " + error.message);
        } finally {
            this.isLoading = false;
        }
    }
    
    async loadUsersStatistics() {
        try {
            const snapshot = await this.db.collection('users').get();
            const totalUsers = snapshot.size;
            
            // Calculate active users (users with profiles)
            const profilesSnapshot = await this.db.collection('profiles').get();
            const activeUsers = profilesSnapshot.size;
            
            // Calculate monthly change
            const now = new Date();
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            const usersThisMonth = snapshot.docs.filter(doc => {
                const createdAt = doc.data().createdAt?.toDate();
                return createdAt && createdAt >= lastMonth;
            }).length;
            
            const change = totalUsers > 0 ? Math.round((usersThisMonth / totalUsers) * 100) : 0;
            
            // Update UI
            document.getElementById('statTotalUsers').textContent = totalUsers;
            document.getElementById('usersCount').textContent = totalUsers;
            document.getElementById('usersChange').textContent = change + '%';
            
        } catch (error) {
            console.error("Error loading users statistics:", error);
        }
    }
    
    async loadEmployeesStatistics() {
        try {
            const snapshot = await this.db.collection('employees').get();
            const totalEmployees = snapshot.size;
            const activeEmployees = snapshot.docs.filter(doc => 
                doc.data().status === 'active'
            ).length;
            
            document.getElementById('statTotalEmployees').textContent = totalEmployees;
            document.getElementById('employeesCount').textContent = totalEmployees;
            document.getElementById('activeEmployees').textContent = activeEmployees;
            
        } catch (error) {
            console.error("Error loading employees statistics:", error);
        }
    }
    
    async loadIncomesStatistics() {
        try {
            const snapshot = await this.db.collection('incomes').get();
            let totalIncome = 0;
            let thisMonthIncome = 0;
            
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            
            snapshot.forEach(doc => {
                const income = doc.data();
                totalIncome += income.amount || 0;
                
                const incomeDate = income.date?.toDate();
                if (incomeDate && incomeDate >= startOfMonth) {
                    thisMonthIncome += income.amount || 0;
                }
            });
            
            // Calculate monthly change (simplified)
            const lastMonthSnapshot = await this.db.collection('incomes')
                .where('date', '>=', startOfLastMonth)
                .where('date', '<', startOfMonth)
                .get();
            
            let lastMonthIncome = 0;
            lastMonthSnapshot.forEach(doc => {
                lastMonthIncome += doc.data().amount || 0;
            });
            
            const change = lastMonthIncome > 0 ? 
                Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100) : 
                thisMonthIncome > 0 ? 100 : 0;
            
            document.getElementById('statTotalIncome').textContent = '$' + totalIncome.toLocaleString();
            document.getElementById('incomesCount').textContent = snapshot.size;
            document.getElementById('incomeChange').textContent = change + '%';
            
        } catch (error) {
            console.error("Error loading incomes statistics:", error);
        }
    }
    
    async loadExpensesStatistics() {
        try {
            const snapshot = await this.db.collection('expenses').get();
            let totalExpenses = 0;
            let thisMonthExpenses = 0;
            
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            
            snapshot.forEach(doc => {
                const expense = doc.data();
                totalExpenses += expense.amount || 0;
                
                const expenseDate = expense.date?.toDate();
                if (expenseDate && expenseDate >= startOfMonth) {
                    thisMonthExpenses += expense.amount || 0;
                }
            });
            
            // Calculate monthly change
            const lastMonthSnapshot = await this.db.collection('expenses')
                .where('date', '>=', startOfLastMonth)
                .where('date', '<', startOfMonth)
                .get();
            
            let lastMonthExpenses = 0;
            lastMonthSnapshot.forEach(doc => {
                lastMonthExpenses += doc.data().amount || 0;
            });
            
            const change = lastMonthExpenses > 0 ? 
                Math.round(((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100) : 
                thisMonthExpenses > 0 ? 100 : 0;
            
            document.getElementById('statTotalExpenses').textContent = '$' + totalExpenses.toLocaleString();
            document.getElementById('expensesCount').textContent = snapshot.size;
            document.getElementById('expensesChange').textContent = Math.abs(change) + '%';
            
            // Add negative class if expenses increased
            const changeElement = document.getElementById('expensesChange').parentElement;
            changeElement.className = change < 0 ? 'stat-change positive' : 'stat-change negative';
            
        } catch (error) {
            console.error("Error loading expenses statistics:", error);
        }
    }
    
    async loadCategoriesStatistics() {
        try {
            const categoriesSnapshot = await this.db.collection('categories').get();
            const incomeCategoriesSnapshot = await this.db.collection('income_categories').get();
            
            document.getElementById('categoriesCount').textContent = categoriesSnapshot.size;
            document.getElementById('incomeCategoriesCount').textContent = incomeCategoriesSnapshot.size;
            
        } catch (error) {
            console.error("Error loading categories statistics:", error);
        }
    }
    
    async loadProfilesStatistics() {
        try {
            const profilesSnapshot = await this.db.collection('profiles').get();
            const totalProfiles = profilesSnapshot.size;
            
            // Calculate profiles with complete info
            let completeProfiles = 0;
            profilesSnapshot.forEach(doc => {
                const profile = doc.data();
                // Simple completion check - has at least 5 fields filled
                const filledFields = [
                    profile.displayName,
                    profile.email,
                    profile.phone,
                    profile.country,
                    profile.currency,
                    profile.language
                ].filter(field => field && field !== '').length;
                
                if (filledFields >= 5) {
                    completeProfiles++;
                }
            });
            
            const completionRate = totalProfiles > 0 ? 
                Math.round((completeProfiles / totalProfiles) * 100) : 0;
            
            // You can display this in a new stat card or update existing UI
            
        } catch (error) {
            console.error("Error loading profiles statistics:", error);
        }
    }
    
    async loadRecentActivity() {
        try {
            // Load recent users (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const usersSnapshot = await this.db.collection('users')
                .where('createdAt', '>=', sevenDaysAgo)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
            
            const usersTable = document.getElementById('recentUsersTable');
            usersTable.innerHTML = usersSnapshot.docs.map(doc => {
                const user = doc.data();
                const date = user.createdAt?.toDate();
                const dateStr = date ? date.toLocaleDateString('en-US') : 'N/A';
                
                // Get user status (check if has profile)
                const hasProfile = this.checkUserHasProfile(doc.id);
                const statusText = hasProfile ? 'Active' : 'Pending';
                const statusClass = hasProfile ? 'active' : 'pending';
                
                return `
                    <tr>
                        <td>
                            <div class="user-cell-small">
                                <div class="user-avatar-tiny">${user.name?.charAt(0) || 'U'}</div>
                                <span>${user.name || 'N/A'}</span>
                            </div>
                        </td>
                        <td>${user.email || 'N/A'}</td>
                        <td>${dateStr}</td>
                        <td>
                            <span class="status-badge status-${statusClass}">
                                ${statusText}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
            
            if (usersSnapshot.empty) {
                usersTable.innerHTML = `
                    <tr>
                        <td colspan="4" class="no-data">
                            <i class="fas fa-users"></i>
                            <p>No new users in the last 7 days</p>
                        </td>
                    </tr>
                `;
            }
            
            // Load recent incomes (last 7 days)
            const incomesSnapshot = await this.db.collection('incomes')
                .where('date', '>=', sevenDaysAgo)
                .orderBy('date', 'desc')
                .limit(5)
                .get();
            
            const incomesTable = document.getElementById('recentIncomesTable');
            incomesTable.innerHTML = incomesSnapshot.docs.map(doc => {
                const income = doc.data();
                const date = income.date?.toDate();
                const dateStr = date ? date.toLocaleDateString('en-US') : 'N/A';
                
                // Get user name
                const userName = income.userName || 'Unknown User';
                
                return `
                    <tr>
                        <td>
                            <div class="user-cell-small">
                                <span>${userName}</span>
                            </div>
                        </td>
                        <td class="amount-positive">
                            <strong>$${(income.amount || 0).toLocaleString(undefined, { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                            })}</strong>
                        </td>
                        <td>${income.description || 'No description'}</td>
                        <td>${dateStr}</td>
                    </tr>
                `;
            }).join('');
            
            if (incomesSnapshot.empty) {
                incomesTable.innerHTML = `
                    <tr>
                        <td colspan="4" class="no-data">
                            <i class="fas fa-money-bill-wave"></i>
                            <p>No income records in the last 7 days</p>
                        </td>
                    </tr>
                `;
            }
            
            // Load recent expenses (last 7 days)
            const expensesSnapshot = await this.db.collection('expenses')
                .where('date', '>=', sevenDaysAgo)
                .orderBy('date', 'desc')
                .limit(5)
                .get();
            
            const expensesTable = document.getElementById('recentExpensesTable');
            expensesTable.innerHTML = expensesSnapshot.docs.map(doc => {
                const expense = doc.data();
                const date = expense.date?.toDate();
                const dateStr = date ? date.toLocaleDateString('en-US') : 'N/A';
                
                return `
                    <tr>
                        <td>
                            <div class="user-cell-small">
                                <span>${expense.userName || 'Unknown User'}</span>
                            </div>
                        </td>
                        <td class="amount-negative">
                            <strong>$${(expense.amount || 0).toLocaleString(undefined, { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                            })}</strong>
                        </td>
                        <td>${expense.category || 'No category'}</td>
                        <td>${dateStr}</td>
                    </tr>
                `;
            }).join('');
            
            if (expensesSnapshot.empty) {
                expensesTable.innerHTML = `
                    <tr>
                        <td colspan="4" class="no-data">
                            <i class="fas fa-shopping-cart"></i>
                            <p>No expense records in the last 7 days</p>
                        </td>
                    </tr>
                `;
            }
            
        } catch (error) {
            console.error("Error loading recent activity:", error);
            // Show error in tables
            const errorHTML = `
                <tr>
                    <td colspan="4" class="error-data">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading data</p>
                    </td>
                </tr>
            `;
            
            document.getElementById('recentUsersTable').innerHTML = errorHTML;
            document.getElementById('recentIncomesTable').innerHTML = errorHTML;
            document.getElementById('recentExpensesTable').innerHTML = errorHTML;
        }
    }
    
    checkUserHasProfile(userId) {
        // This would need to check profiles collection
        // For now, return true for demo
        return true;
    }
    
    initCharts() {
        // Income vs Expenses Chart
        const incomeExpensesCtx = document.getElementById('incomeExpensesChart').getContext('2d');
        this.charts.incomeExpenses = new Chart(incomeExpensesCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Income',
                        data: [],
                        borderColor: '#4facfe',
                        backgroundColor: 'rgba(79, 172, 254, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Expenses',
                        data: [],
                        borderColor: '#43e97b',
                        backgroundColor: 'rgba(67, 233, 123, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
        
        // Expense Categories Chart
        const expenseCategoriesCtx = document.getElementById('expenseCategoriesChart').getContext('2d');
        this.charts.expenseCategories = new Chart(expenseCategoriesCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: $${value.toLocaleString()} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    async loadChartsData(months = 6) {
        try {
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
            
            // Get data for the specified period
            const incomesSnapshot = await this.db.collection('incomes')
                .where('date', '>=', startDate)
                .get();
            
            const expensesSnapshot = await this.db.collection('expenses')
                .where('date', '>=', startDate)
                .get();
            
            // Process monthly data
            const monthlyData = {};
            const monthNames = [];
            
            for (let i = months - 1; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthKey = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                monthNames.push(monthKey);
                monthlyData[monthKey] = { income: 0, expenses: 0 };
            }
            
            // Calculate monthly income
            incomesSnapshot.forEach(doc => {
                const income = doc.data();
                const date = income.date?.toDate();
                if (date) {
                    const monthKey = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                    if (monthlyData[monthKey]) {
                        monthlyData[monthKey].income += income.amount || 0;
                    }
                }
            });
            
            // Calculate monthly expenses
            expensesSnapshot.forEach(doc => {
                const expense = doc.data();
                const date = expense.date?.toDate();
                if (date) {
                    const monthKey = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                    if (monthlyData[monthKey]) {
                        monthlyData[monthKey].expenses += expense.amount || 0;
                    }
                }
            });
            
            // Update income vs expenses chart
            this.charts.incomeExpenses.data.labels = monthNames;
            this.charts.incomeExpenses.data.datasets[0].data = monthNames.map(m => monthlyData[m].income);
            this.charts.incomeExpenses.data.datasets[1].data = monthNames.map(m => monthlyData[m].expenses);
            this.charts.incomeExpenses.update();
            
            // Calculate expense categories
            const categoryTotals = {};
            expensesSnapshot.forEach(doc => {
                const expense = doc.data();
                const category = expense.category || 'Uncategorized';
                categoryTotals[category] = (categoryTotals[category] || 0) + (expense.amount || 0);
            });
            
            // Sort categories by total
            const sortedCategories = Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6);
            
            // Update expense categories chart
            this.charts.expenseCategories.data.labels = sortedCategories.map(c => c[0]);
            this.charts.expenseCategories.data.datasets[0].data = sortedCategories.map(c => c[1]);
            this.charts.expenseCategories.update();
            
        } catch (error) {
            console.error("Error loading charts data:", error);
        }
    }
    
    updateSidebarBadges() {
        // Badges are already updated in individual statistic functions
    }
    
    async loadNotifications() {
        try {
            // Get recent system activities for notifications
            const recentActivities = [];
            
            // Check for new users in last 24 hours
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            const newUsers = await this.db.collection('users')
                .where('createdAt', '>=', yesterday)
                .get();
            
            if (newUsers.size > 0) {
                recentActivities.push({
                    type: 'new_user',
                    count: newUsers.size,
                    message: `${newUsers.size} new user${newUsers.size > 1 ? 's' : ''} registered`,
                    time: 'Just now',
                    icon: 'user-plus',
                    color: 'success'
                });
            }
            
            // Check for high-value transactions
            const highValueIncomes = await this.db.collection('incomes')
                .where('amount', '>=', 10000)
                .where('date', '>=', yesterday)
                .get();
            
            if (highValueIncomes.size > 0) {
                recentActivities.push({
                    type: 'high_income',
                    count: highValueIncomes.size,
                    message: `${highValueIncomes.size} high-value income${highValueIncomes.size > 1 ? 's' : ''} recorded`,
                    time: 'Today',
                    icon: 'money-bill-wave',
                    color: 'warning'
                });
            }
            
            // Check for incomplete profiles
            const profilesSnapshot = await this.db.collection('profiles').get();
            const incompleteProfiles = profilesSnapshot.docs.filter(doc => {
                const profile = doc.data();
                const filledFields = [
                    profile.displayName,
                    profile.email,
                    profile.phone,
                    profile.country
                ].filter(field => field && field !== '').length;
                return filledFields < 3;
            }).length;
            
            if (incompleteProfiles > 0) {
                recentActivities.push({
                    type: 'incomplete_profile',
                    count: incompleteProfiles,
                    message: `${incompleteProfiles} profile${incompleteProfiles > 1 ? 's' : ''} need completion`,
                    time: 'Needs attention',
                    icon: 'exclamation-triangle',
                    color: 'danger'
                });
            }
            
            // Update notification count
            const totalNotifications = recentActivities.length;
            document.getElementById('notificationCount').textContent = totalNotifications;
            
            // Update notifications list
            const notificationsList = document.getElementById('notificationsList');
            
            if (totalNotifications === 0) {
                notificationsList.innerHTML = `
                    <div class="notification-empty">
                        <i class="fas fa-bell-slash"></i>
                        <p>No notifications yet</p>
                        <small>All systems are running smoothly</small>
                    </div>
                `;
            } else {
                notificationsList.innerHTML = recentActivities.map(activity => `
                    <div class="notification-item notification-${activity.color}">
                        <div class="notification-icon">
                            <i class="fas fa-${activity.icon}"></i>
                        </div>
                        <div class="notification-content">
                            <p class="notification-message">${activity.message}</p>
                            <span class="notification-time">${activity.time}</span>
                        </div>
                        <button class="notification-action" onclick="dashboardSystem.markNotificationAsRead('${activity.type}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('');
            }
            
        } catch (error) {
            console.error("Error loading notifications:", error);
        }
    }
    
    markNotificationAsRead(notificationType) {
        // Remove notification from UI
        const notificationElement = document.querySelector(`.notification-item`);
        if (notificationElement) {
            notificationElement.remove();
        }
        
        // Update notification count
        const currentCount = parseInt(document.getElementById('notificationCount').textContent);
        if (currentCount > 0) {
            document.getElementById('notificationCount').textContent = currentCount - 1;
        }
        
        // Show message
        this.showMessage('Notification marked as read', 'success');
    }
    
    toggleNotifications() {
        const panel = document.getElementById('notificationsPanel');
        panel.classList.toggle('show');
        
        // Mark all as read when opening
        if (panel.classList.contains('show')) {
            this.markAllNotificationsAsRead();
        }
    }
    
    markAllNotificationsAsRead() {
        document.getElementById('notificationCount').textContent = '0';
        this.showMessage('All notifications marked as read', 'success');
    }
    
    closeNotifications() {
        document.getElementById('notificationsPanel').classList.remove('show');
    }
    
    switchActivityTab(tabId) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabId) {
                btn.classList.add('active');
            }
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.id === tabId) {
                content.classList.add('active');
            }
        });
    }
    
    generateReport() {
        try {
            // Create a comprehensive report
            const reportData = {
                generatedAt: new Date().toISOString(),
                generatedBy: this.user?.name || 'System',
                statistics: {
                    totalUsers: document.getElementById('statTotalUsers').textContent,
                    totalEmployees: document.getElementById('statTotalEmployees').textContent,
                    totalIncome: document.getElementById('statTotalIncome').textContent,
                    totalExpenses: document.getElementById('statTotalExpenses').textContent
                },
                recentActivity: {
                    users: this.getRecentUsersData(),
                    incomes: this.getRecentIncomesData(),
                    expenses: this.getRecentExpensesData()
                }
            };
            
            // Convert to JSON
            const reportJSON = JSON.stringify(reportData, null, 2);
            
            // Create download link
            const blob = new Blob([reportJSON], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard_report_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showMessage('Report generated and downloaded successfully!', 'success');
            
        } catch (error) {
            console.error("Error generating report:", error);
            this.showMessage('Error generating report: ' + error.message, 'error');
        }
    }
    
    getRecentUsersData() {
        const rows = document.querySelectorAll('#recentUsersTable tr');
        const data = [];
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                data.push({
                    name: cells[0].textContent,
                    email: cells[1].textContent,
                    joinDate: cells[2].textContent,
                    status: cells[3].textContent
                });
            }
        });
        
        return data;
    }
    
    getRecentIncomesData() {
        const rows = document.querySelectorAll('#recentIncomesTable tr');
        const data = [];
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                data.push({
                    user: cells[0].textContent,
                    amount: cells[1].textContent,
                    description: cells[2].textContent,
                    date: cells[3].textContent
                });
            }
        });
        
        return data;
    }
    
    getRecentExpensesData() {
        const rows = document.querySelectorAll('#recentExpensesTable tr');
        const data = [];
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                data.push({
                    user: cells[0].textContent,
                    amount: cells[1].textContent,
                    category: cells[2].textContent,
                    date: cells[3].textContent
                });
            }
        });
        
        return data;
    }
    
    // ========== REAL-TIME UPDATES ==========
    
    startRealTimeUpdates() {
        // Start listening for real-time changes
        this.setupRealTimeListeners();
        
        // Show real-time indicator
        this.showRealTimeIndicator(true);
    }
    
    setupRealTimeListeners() {
        // Listen for new users
        const usersListener = this.db.collection('users')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        this.handleNewUser(change.doc.data());
                    }
                });
            });
        this.realTimeListeners.push(usersListener);
        
        // Listen for new incomes
        const incomesListener = this.db.collection('incomes')
            .orderBy('date', 'desc')
            .limit(1)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        this.handleNewIncome(change.doc.data());
                    }
                });
            });
        this.realTimeListeners.push(incomesListener);
        
        // Listen for new expenses
        const expensesListener = this.db.collection('expenses')
            .orderBy('date', 'desc')
            .limit(1)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        this.handleNewExpense(change.doc.data());
                    }
                });
            });
        this.realTimeListeners.push(expensesListener);
    }
    
    handleNewUser(userData) {
        // Update users count
        const currentCount = parseInt(document.getElementById('statTotalUsers').textContent);
        document.getElementById('statTotalUsers').textContent = currentCount + 1;
        document.getElementById('usersCount').textContent = currentCount + 1;
        
        // Add to recent users table if active tab
        if (document.querySelector('#recent-users').classList.contains('active')) {
            this.addToRecentUsersTable(userData);
        }
        
        // Show notification
        this.showRealTimeNotification('New user registered: ' + (userData.name || userData.email));
    }
    
    handleNewIncome(incomeData) {
        // Update income statistics
        const currentIncome = document.getElementById('statTotalIncome').textContent;
        const newAmount = incomeData.amount || 0;
        // Parse and update total income (simplified)
        
        // Add to recent incomes table if active tab
        if (document.querySelector('#recent-incomes').classList.contains('active')) {
            this.addToRecentIncomesTable(incomeData);
        }
        
        // Show notification for high-value income
        if (newAmount >= 5000) {
            this.showRealTimeNotification(`High-value income: $${newAmount.toLocaleString()}`);
        }
    }
    
    handleNewExpense(expenseData) {
        // Update expenses statistics
        const newAmount = expenseData.amount || 0;
        
        // Add to recent expenses table if active tab
        if (document.querySelector('#recent-expenses').classList.contains('active')) {
            this.addToRecentExpensesTable(expenseData);
        }
    }
    
    addToRecentUsersTable(userData) {
        const table = document.getElementById('recentUsersTable');
        const date = userData.createdAt?.toDate();
        const dateStr = date ? date.toLocaleDateString('en-US') : 'N/A';
        
        const newRow = `
            <tr class="new-row">
                <td>
                    <div class="user-cell-small">
                        <div class="user-avatar-tiny">${userData.name?.charAt(0) || 'U'}</div>
                        <span>${userData.name || 'N/A'}</span>
                    </div>
                </td>
                <td>${userData.email || 'N/A'}</td>
                <td>${dateStr}</td>
                <td>
                    <span class="status-badge status-pending">
                        Pending
                    </span>
                </td>
            </tr>
        `;
        
        // Add to top of table
        if (table.querySelector('.no-data')) {
            table.innerHTML = newRow;
        } else {
            table.innerHTML = newRow + table.innerHTML;
        }
        
        // Limit to 5 rows
        const rows = table.querySelectorAll('tr');
        if (rows.length > 5) {
            rows[rows.length - 1].remove();
        }
    }
    
    addToRecentIncomesTable(incomeData) {
        const table = document.getElementById('recentIncomesTable');
        const date = incomeData.date?.toDate();
        const dateStr = date ? date.toLocaleDateString('en-US') : 'N/A';
        
        const newRow = `
            <tr class="new-row">
                <td>
                    <div class="user-cell-small">
                        <span>${incomeData.userName || 'Unknown User'}</span>
                    </div>
                </td>
                <td class="amount-positive">
                    <strong>$${(incomeData.amount || 0).toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    })}</strong>
                </td>
                <td>${incomeData.description || 'No description'}</td>
                <td>${dateStr}</td>
            </tr>
        `;
        
        // Add to top of table
        if (table.querySelector('.no-data')) {
            table.innerHTML = newRow;
        } else {
            table.innerHTML = newRow + table.innerHTML;
        }
        
        // Limit to 5 rows
        const rows = table.querySelectorAll('tr');
        if (rows.length > 5) {
            rows[rows.length - 1].remove();
        }
    }
    
    addToRecentExpensesTable(expenseData) {
        const table = document.getElementById('recentExpensesTable');
        const date = expenseData.date?.toDate();
        const dateStr = date ? date.toLocaleDateString('en-US') : 'N/A';
        
        const newRow = `
            <tr class="new-row">
                <td>
                    <div class="user-cell-small">
                        <span>${expenseData.userName || 'Unknown User'}</span>
                    </div>
                </td>
                <td class="amount-negative">
                    <strong>$${(expenseData.amount || 0).toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    })}</strong>
                </td>
                <td>${expenseData.category || 'No category'}</td>
                <td>${dateStr}</td>
            </tr>
        `;
        
        // Add to top of table
        if (table.querySelector('.no-data')) {
            table.innerHTML = newRow;
        } else {
            table.innerHTML = newRow + table.innerHTML;
        }
        
        // Limit to 5 rows
        const rows = table.querySelectorAll('tr');
        if (rows.length > 5) {
            rows[rows.length - 1].remove();
        }
    }
    
    showRealTimeNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'real-time-notification';
        notification.innerHTML = `
            <i class="fas fa-sync-alt"></i>
            <span>${message}</span>
            <button class="close-notification" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to page
        const container = document.querySelector('.main-content');
        const firstChild = container.firstChild;
        if (firstChild) {
            container.insertBefore(notification, firstChild);
        } else {
            container.appendChild(notification);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    showRealTimeIndicator(show) {
        // Add or remove real-time indicator from stat cards
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            if (show) {
                card.classList.add('real-time-active');
            } else {
                card.classList.remove('real-time-active');
            }
        });
    }
    
    toggleRealTimeUpdates() {
        const isActive = document.querySelector('.stat-card.real-time-active');
        
        if (isActive) {
            // Stop real-time updates
            this.stopRealTimeUpdates();
            this.showRealTimeIndicator(false);
            this.showMessage('Real-time updates disabled', 'warning');
        } else {
            // Start real-time updates
            this.startRealTimeUpdates();
            this.showRealTimeIndicator(true);
            this.showMessage('Real-time updates enabled', 'success');
        }
    }
    
    stopRealTimeUpdates() {
        // Unsubscribe all listeners
        this.realTimeListeners.forEach(unsubscribe => unsubscribe());
        this.realTimeListeners = [];
    }
    
    // ========== HELPER METHODS ==========
    
    showLoading(show) {
        const loadingElements = document.querySelectorAll('.loading-row, .loading-state');
        loadingElements.forEach(element => {
            element.style.display = show ? 'block' : 'none';
        });
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
        const firstChild = container.firstChild;
        if (firstChild) {
            container.insertBefore(messageDiv, firstChild);
        } else {
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
            container.innerHTML = `
                <div style="text-align: center; padding: 50px; color: var(--danger-color);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 50px; margin-bottom: 20px;"></i>
                    <h2>⚠️ System Error</h2>
                    <p>${message}</p>
                    <div style="margin-top: 30px;">
                        <button onclick="location.reload()" class="btn btn-primary" style="margin-right: 10px;">
                            <i class="fas fa-redo"></i> Reload Page
                        </button>
                        <button onclick="authSystem.logout()" class="btn btn-secondary">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    // ========== SYSTEM UTILITIES ==========
    
    async clearCache() {
        try {
            localStorage.clear();
            sessionStorage.clear();
            this.showMessage('Cache cleared successfully', 'success');
            
            // Refresh dashboard data
            await this.loadDashboardData();
            
        } catch (error) {
            console.error("Error clearing cache:", error);
            this.showMessage('Error clearing cache: ' + error.message, 'error');
        }
    }
    
    async backupDatabase() {
        try {
            // Show loading
            this.showMessage('Creating database backup...', 'info');
            
            // Get all collections data
            const collections = ['users', 'employees', 'profiles', 'incomes', 'expenses', 'categories', 'income_categories'];
            const backupData = {
                timestamp: new Date().toISOString(),
                generatedBy: this.user?.name || 'System',
                collections: {}
            };
            
            // Fetch data from each collection
            for (const collection of collections) {
                const snapshot = await this.db.collection(collection).get();
                backupData.collections[collection] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }
            
            // Convert to JSON
            const backupJSON = JSON.stringify(backupData, null, 2);
            
            // Create download link
            const blob = new Blob([backupJSON], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `database_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showMessage('Database backup created and downloaded successfully!', 'success');
            
        } catch (error) {
            console.error("Error creating backup:", error);
            this.showMessage('Error creating backup: ' + error.message, 'error');
        }
    }
    
    async systemHealthCheck() {
        try {
            // Check Firebase connection
            const firebaseHealthy = await this.checkFirebaseHealth();
            
            // Check database collections
            const collectionsHealthy = await this.checkCollectionsHealth();
            
            // Check user authentication
            const authHealthy = this.auth.currentUser !== null;
            
            // Show health status
            if (firebaseHealthy && collectionsHealthy && authHealthy) {
                this.showMessage('System health: All systems operational ✅', 'success');
            } else {
                this.showMessage('System health: Some issues detected ⚠️', 'warning');
            }
            
        } catch (error) {
            console.error("Error in health check:", error);
            this.showMessage('Health check failed: ' + error.message, 'error');
        }
    }
    
    async checkFirebaseHealth() {
        try {
            // Simple Firebase health check
            await this.db.collection('users').limit(1).get();
            return true;
        } catch (error) {
            return false;
        }
    }
    
    async checkCollectionsHealth() {
        const requiredCollections = ['users', 'employees', 'profiles'];
        let allHealthy = true;
        
        for (const collection of requiredCollections) {
            try {
                await this.db.collection(collection).limit(1).get();
            } catch (error) {
                console.error(`Collection ${collection} error:`, error);
                allHealthy = false;
            }
        }
        
        return allHealthy;
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardSystem = new DashboardSystem();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl + R to refresh
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            window.dashboardSystem.loadDashboardData();
        }
        
        // Ctrl + D for dashboard
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            window.location.href = 'dashboard.html';
        }
        
        // Ctrl + U for users
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            window.location.href = 'users.html';
        }
        
        // Ctrl + L for logout
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            authSystem.logout();
        }
    });
});
