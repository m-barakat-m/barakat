// Dashboard Management System
class DashboardSystem {
    constructor() {
        this.user = null;
        this.permissions = {};
        this.charts = {};
        this.isLoading = false;
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
                this.loadRecentActivity(),
                this.loadChartsData(6)
            ]);
            
            // Update sidebar badges
            this.updateSidebarBadges();
            
            // Load notifications
            this.loadNotifications();
            
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
    
    async loadRecentActivity() {
        try {
            // Load recent users
            const usersSnapshot = await this.db.collection('users')
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
            
            const usersTable = document.getElementById('recentUsersTable');
            usersTable.innerHTML = usersSnapshot.docs.map(doc => {
                const user = doc.data();
                const date = user.createdAt?.toDate();
                const dateStr = date ? date.toLocaleDateString('en-US') : 'N/A';
                
                return `
                    <tr>
                        <td>${user.name || 'N/A'}</td>
                        <td>${user.email || 'N/A'}</td>
                        <td>${dateStr}</td>
                        <td>
                            <span style="padding: 4px 8px; border-radius: 12px; background: #c6f6d5; color: #22543d; font-size: 0.8rem;">
                                Active
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
            
            // Load recent incomes
            const incomesSnapshot = await this.db.collection('incomes')
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
                        <td>${userName}</td>
                        <td><strong>$${income.amount?.toLocaleString() || '0'}</strong></td>
                        <td>${income.description || 'No description'}</td>
                        <td>${dateStr}</td>
                    </tr>
                `;
            }).join('');
            
            // Load recent expenses
            const expensesSnapshot = await this.db.collection('expenses')
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
                        <td>${expense.userName || 'Unknown User'}</td>
                        <td><strong>$${expense.amount?.toLocaleString() || '0'}</strong></td>
                        <td>${expense.category || 'No category'}</td>
                        <td>${dateStr}</td>
                    </tr>
                `;
            }).join('');
            
        } catch (error) {
            console.error("Error loading recent activity:", error);
        }
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
                        intersect: false
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
                    message: `${newUsers.size} new user${newUsers.size > 1 ? 's' : ''} registered`
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
                    message: `${highValueIncomes.size} high-value income${highValueIncomes.size > 1 ? 's' : ''} recorded`
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
                    </div>
                `;
            } else {
                notificationsList.innerHTML = recentActivities.map(activity => `
                    <div class="notification-item">
                        <div class="notification-icon">
                            <i class="fas fa-${this.getNotificationIcon(activity.type)}"></i>
                        </div>
                        <div class="notification-content">
                            <p class="notification-message">${activity.message}</p>
                            <span class="notification-time">Just now</span>
                        </div>
                    </div>
                `).join('');
            }
            
        } catch (error) {
            console.error("Error loading notifications:", error);
        }
    }
    
    getNotificationIcon(type) {
        switch(type) {
            case 'new_user': return 'user-plus';
            case 'high_income': return 'money-bill-wave';
            default: return 'bell';
        }
    }
    
    toggleNotifications() {
        const panel = document.getElementById('notificationsPanel');
        panel.classList.toggle('show');
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
        alert("Report generation feature is under development. Coming soon!");
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

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardSystem = new DashboardSystem();
});