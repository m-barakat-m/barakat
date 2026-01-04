// Dashboard Management System - COMPLETE VERSION WITH ALL UPDATES
class DashboardSystem {
    // في dashboard.js داخل class DashboardSystem
    incomeUpdated() {
        console.log("📈 Income data updated - refreshing dashboard");
        // Refresh income statistics
        this.loadIncomesStatistics();
        // Refresh charts
        this.loadChartsData(6);
        // Refresh recent activity
        this.loadRecentActivity();
        // Refresh insights
        this.generateSmartInsights();
        
        // Show notification
        this.showMessage('Income data updated', 'info');
    }
    constructor() {
        this.user = null;
        this.permissions = {};
        this.charts = {};
        this.isLoading = false;
        this.realTimeListeners = [];
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes cache
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
        
        // New quick action buttons
        document.getElementById('manageBudgetsBtn').addEventListener('click', () => {
            window.location.href = 'budgets.html';
        });
        
        document.getElementById('manageGoalsBtn').addEventListener('click', () => {
            window.location.href = 'goals.html';
        });
        
        document.getElementById('viewNotificationsBtn').addEventListener('click', () => {
            window.location.href = 'notifications.html';
        });
        
        document.getElementById('generateReportBtn').addEventListener('click', () => {
            this.generateReport();
        });
        
        document.getElementById('systemSettingsBtn').addEventListener('click', () => {
            window.location.href = 'preferences.html';
        });
        
        // Refresh insights button
        document.getElementById('refreshInsightsBtn').addEventListener('click', () => {
            this.generateSmartInsights();
        });
        
        // Add refresh button if not exists
        if (!document.getElementById('toggleRealTimeBtn')) {
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'toggleRealTimeBtn';
            refreshBtn.className = 'btn btn-secondary';
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Real-time';
            document.querySelector('.nav-controls').appendChild(refreshBtn);
            refreshBtn.addEventListener('click', () => {
                this.toggleRealTimeUpdates();
            });
        }
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
            const date = new Date(parseInt(lastLogin));
            document.getElementById('lastLoginTime').textContent = 
                date.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
        } else {
            localStorage.setItem('lastLogin', Date.now());
            document.getElementById('lastLoginTime').textContent = 'Just now';
        }
    }
    
    async loadDashboardData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading(true);
        
        try {
            // Try to load cached data first
            const cachedStats = this.getCachedData('dashboard_stats');
            if (cachedStats) {
                this.updateStatsUI(cachedStats);
                this.showMessage('Loaded cached data', 'info');
            }
            
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
            
            // Generate smart insights
            this.generateSmartInsights();
            
            // Show real-time indicator
            this.showRealTimeIndicator(true);
            
        } catch (error) {
            console.error("❌ Error loading dashboard data:", error);
            this.showMessage("Error loading data: " + error.message, 'error');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
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
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            const usersThisMonth = snapshot.docs.filter(doc => {
                const userData = doc.data();
                const createdAt = userData.createdAt?.toDate();
                return createdAt && createdAt >= startOfMonth;
            }).length;
            
            const usersLastMonth = snapshot.docs.filter(doc => {
                const userData = doc.data();
                const createdAt = userData.createdAt?.toDate();
                return createdAt && createdAt >= lastMonth && createdAt < startOfMonth;
            }).length;
            
            const change = usersLastMonth > 0 ? 
                Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100) : 
                usersThisMonth > 0 ? 100 : 0;
            
            // Cache data
            const stats = {
                totalUsers,
                activeUsers,
                change,
                usersThisMonth
            };
            this.cacheData('users_stats', stats);
            
            // Update UI
            document.getElementById('statTotalUsers').textContent = totalUsers.toLocaleString();
            document.getElementById('usersCount').textContent = totalUsers;
            document.getElementById('usersChange').textContent = change + '%';
            
        } catch (error) {
            console.error("Error loading users statistics:", error);
            // Try cached data
            const cached = this.getCachedData('users_stats');
            if (cached) {
                document.getElementById('statTotalUsers').textContent = cached.totalUsers.toLocaleString();
                document.getElementById('usersChange').textContent = cached.change + '%';
            }
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
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            
            snapshot.forEach(doc => {
                const income = doc.data();
                const amount = Number(income.amount) || 0;
                totalIncome += amount;
                
                const incomeDate = income.date?.toDate();
                if (incomeDate && incomeDate >= startOfMonth) {
                    thisMonthIncome += amount;
                }
            });
            
            // Calculate monthly change
            let lastMonthIncome = 0;
            const lastMonthQuery = await this.db.collection('incomes')
                .where('date', '>=', startOfLastMonth)
                .where('date', '<=', endOfLastMonth)
                .get();
            
            lastMonthQuery.forEach(doc => {
                lastMonthIncome += Number(doc.data().amount) || 0;
            });
            
            const change = lastMonthIncome > 0 ? 
                Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100) : 
                thisMonthIncome > 0 ? 100 : 0;
            
            document.getElementById('statTotalIncome').textContent = '$' + totalIncome.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
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
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            
            snapshot.forEach(doc => {
                const expense = doc.data();
                const amount = Number(expense.amount) || 0;
                totalExpenses += amount;
                
                const expenseDate = expense.date?.toDate();
                if (expenseDate && expenseDate >= startOfMonth) {
                    thisMonthExpenses += amount;
                }
            });
            
            // Calculate monthly change
            let lastMonthExpenses = 0;
            const lastMonthQuery = await this.db.collection('expenses')
                .where('date', '>=', startOfLastMonth)
                .where('date', '<=', endOfLastMonth)
                .get();
            
            lastMonthQuery.forEach(doc => {
                lastMonthExpenses += Number(doc.data().amount) || 0;
            });
            
            const change = lastMonthExpenses > 0 ? 
                Math.round(((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100) : 
                thisMonthExpenses > 0 ? 100 : 0;
            
            document.getElementById('statTotalExpenses').textContent = '$' + totalExpenses.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            document.getElementById('expensesCount').textContent = snapshot.size;
            document.getElementById('expensesChange').textContent = Math.abs(change) + '%';
            
            // Add appropriate class
            const changeElement = document.getElementById('expensesChange').parentElement;
            changeElement.className = change <= 0 ? 'stat-change positive' : 'stat-change negative';
            changeElement.querySelector('i').className = change <= 0 ? 'fas fa-arrow-down' : 'fas fa-arrow-up';
            
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
            
            // Cache for later use
            this.cacheData('profiles_stats', { totalProfiles });
            
        } catch (error) {
            console.error("Error loading profiles statistics:", error);
        }
    }
    
    async loadRecentActivity() {
        try {
            // Load recent users (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            // Load users
            await this.loadRecentUsers(sevenDaysAgo);
            
            // Load incomes
            await this.loadRecentIncomes(sevenDaysAgo);
            
            // Load expenses
            await this.loadRecentExpenses(sevenDaysAgo);
            
        } catch (error) {
            console.error("Error loading recent activity:", error);
            this.showActivityError();
        }
    }
    
    async loadRecentUsers(sevenDaysAgo) {
        try {
            const usersSnapshot = await this.db.collection('users')
                .where('createdAt', '>=', sevenDaysAgo)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
            
            const usersTable = document.getElementById('recentUsersTable');
            
            if (usersSnapshot.empty) {
                usersTable.innerHTML = this.createEmptyState('fas fa-users', 'No new users in the last 7 days');
                return;
            }
            
            // Get profiles to check status
            const profilesSnapshot = await this.db.collection('profiles').get();
            const profileIds = new Set();
            profilesSnapshot.forEach(doc => profileIds.add(doc.id));
            
            usersTable.innerHTML = usersSnapshot.docs.map(doc => {
                const user = doc.data();
                const date = user.createdAt?.toDate();
                const dateStr = date ? date.toLocaleDateString('en-US') : 'N/A';
                
                // Check if user has profile
                const hasProfile = profileIds.has(doc.id);
                const statusText = hasProfile ? 'Active' : 'Pending';
                const statusClass = hasProfile ? 'active' : 'pending';
                
                return `
                    <tr>
                        <td>
                            <div class="user-cell-small">
                                <div class="user-avatar-tiny">${user.name?.charAt(0) || 'U'}</div>
                                <span>${this.escapeHtml(user.name || 'N/A')}</span>
                            </div>
                        </td>
                        <td>${this.escapeHtml(user.email || 'N/A')}</td>
                        <td>${dateStr}</td>
                        <td>
                            <span class="status-badge status-${statusClass}">
                                ${statusText}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
            
        } catch (error) {
            console.error("Error loading recent users:", error);
            document.getElementById('recentUsersTable').innerHTML = this.createErrorState();
        }
    }
    
    async loadRecentIncomes(sevenDaysAgo) {
        try {
            const incomesSnapshot = await this.db.collection('incomes')
                .where('date', '>=', sevenDaysAgo)
                .orderBy('date', 'desc')
                .limit(5)
                .get();
            
            const incomesTable = document.getElementById('recentIncomesTable');
            
            if (incomesSnapshot.empty) {
                incomesTable.innerHTML = this.createEmptyState('fas fa-money-bill-wave', 'No income records in the last 7 days');
                return;
            }
            
            incomesTable.innerHTML = incomesSnapshot.docs.map(doc => {
                const income = doc.data();
                const date = income.date?.toDate();
                const dateStr = date ? date.toLocaleDateString('en-US') : 'N/A';
                
                return `
                    <tr>
                        <td>
                            <div class="user-cell-small">
                                <span>${this.escapeHtml(income.userName || 'Unknown User')}</span>
                            </div>
                        </td>
                        <td class="amount-positive">
                            <strong>$${(Number(income.amount) || 0).toLocaleString(undefined, { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                            })}</strong>
                        </td>
                        <td>${this.escapeHtml(income.description || 'No description')}</td>
                        <td>${dateStr}</td>
                    </tr>
                `;
            }).join('');
            
        } catch (error) {
            console.error("Error loading recent incomes:", error);
            document.getElementById('recentIncomesTable').innerHTML = this.createErrorState();
        }
    }
    
    async loadRecentExpenses(sevenDaysAgo) {
        try {
            const expensesSnapshot = await this.db.collection('expenses')
                .where('date', '>=', sevenDaysAgo)
                .orderBy('date', 'desc')
                .limit(5)
                .get();
            
            const expensesTable = document.getElementById('recentExpensesTable');
            
            if (expensesSnapshot.empty) {
                expensesTable.innerHTML = this.createEmptyState('fas fa-shopping-cart', 'No expense records in the last 7 days');
                return;
            }
            
            expensesTable.innerHTML = expensesSnapshot.docs.map(doc => {
                const expense = doc.data();
                const date = expense.date?.toDate();
                const dateStr = date ? date.toLocaleDateString('en-US') : 'N/A';
                
                return `
                    <tr>
                        <td>
                            <div class="user-cell-small">
                                <span>${this.escapeHtml(expense.userName || 'Unknown User')}</span>
                            </div>
                        </td>
                        <td class="amount-negative">
                            <strong>$${(Number(expense.amount) || 0).toLocaleString(undefined, { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                            })}</strong>
                        </td>
                        <td>${this.escapeHtml(expense.category || 'No category')}</td>
                        <td>${dateStr}</td>
                    </tr>
                `;
            }).join('');
            
        } catch (error) {
            console.error("Error loading recent expenses:", error);
            document.getElementById('recentExpensesTable').innerHTML = this.createErrorState();
        }
    }
    
    createEmptyState(icon, message) {
        return `
            <tr>
                <td colspan="4" class="no-data">
                    <i class="${icon}"></i>
                    <p>${message}</p>
                </td>
            </tr>
        `;
    }
    
    createErrorState() {
        return `
            <tr>
                <td colspan="4" class="error-data">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading data</p>
                    <button class="btn btn-sm btn-secondary" onclick="dashboardSystem.loadRecentActivity()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
    
    showActivityError() {
        const errorHTML = this.createErrorState();
        document.getElementById('recentUsersTable').innerHTML = errorHTML;
        document.getElementById('recentIncomesTable').innerHTML = errorHTML;
        document.getElementById('recentExpensesTable').innerHTML = errorHTML;
    }
    
    async checkUserHasProfile(userId) {
        try {
            const profile = await this.db.collection('profiles').doc(userId).get();
            return profile.exists;
        } catch (error) {
            console.error("Error checking profile:", error);
            return false;
        }
    }
    
    initCharts() {
        // Income vs Expenses Chart
        const incomeExpensesCtx = document.getElementById('incomeExpensesChart');
        if (!incomeExpensesCtx) {
            console.error("Income expenses chart canvas not found");
            return;
        }
        
        this.charts.incomeExpenses = new Chart(incomeExpensesCtx.getContext('2d'), {
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
                                return `${context.dataset.label}: $${context.parsed.y.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}`;
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
        const expenseCategoriesCtx = document.getElementById('expenseCategoriesChart');
        if (expenseCategoriesCtx) {
            this.charts.expenseCategories = new Chart(expenseCategoriesCtx.getContext('2d'), {
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
                                    return `${label}: $${value.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    
    async loadChartsData(months = 6) {
        try {
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
            
            // Get data for the specified period
            const [incomesSnapshot, expensesSnapshot] = await Promise.all([
                this.db.collection('incomes')
                    .where('date', '>=', startDate)
                    .get(),
                this.db.collection('expenses')
                    .where('date', '>=', startDate)
                    .get()
            ]);
            
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
                        monthlyData[monthKey].income += Number(income.amount) || 0;
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
                        monthlyData[monthKey].expenses += Number(expense.amount) || 0;
                    }
                }
            });
            
            // Update income vs expenses chart
            if (this.charts.incomeExpenses) {
                this.charts.incomeExpenses.data.labels = monthNames;
                this.charts.incomeExpenses.data.datasets[0].data = monthNames.map(m => monthlyData[m].income);
                this.charts.incomeExpenses.data.datasets[1].data = monthNames.map(m => monthlyData[m].expenses);
                this.charts.incomeExpenses.update();
            }
            
            // Calculate expense categories
            const categoryTotals = {};
            expensesSnapshot.forEach(doc => {
                const expense = doc.data();
                const category = expense.category || 'Uncategorized';
                categoryTotals[category] = (categoryTotals[category] || 0) + (Number(expense.amount) || 0);
            });
            
            // Sort categories by total
            const sortedCategories = Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6);
            
            // Update expense categories chart
            if (this.charts.expenseCategories) {
                this.charts.expenseCategories.data.labels = sortedCategories.map(c => c[0]);
                this.charts.expenseCategories.data.datasets[0].data = sortedCategories.map(c => c[1]);
                this.charts.expenseCategories.update();
            }
            
        } catch (error) {
            console.error("Error loading charts data:", error);
        }
    }
    
    updateSidebarBadges() {
        // Badges are already updated in individual statistic functions
    }
    
    async loadNotifications() {
        try {
            // Load notifications count for badge
            const notificationsSnapshot = await this.db.collection('notifications')
                .where('readAt', '==', null)
                .get();
            
            const unreadCount = notificationsSnapshot.size;
            
            // Update notification count in navbar
            document.getElementById('notificationCount').textContent = unreadCount;
            document.getElementById('dashboardNotificationCount').textContent = unreadCount;
            
        } catch (error) {
            console.error("Error loading notifications:", error);
        }
    }
    
    markNotificationAsRead(notificationType) {
        const notifications = document.querySelectorAll('.notification-item');
        if (notifications.length > 0) {
            notifications[0].remove();
        }
        
        // Update notification count
        const currentCount = parseInt(document.getElementById('notificationCount').textContent);
        if (currentCount > 0) {
            document.getElementById('notificationCount').textContent = currentCount - 1;
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
    
    // ========== SMART INSIGHTS ==========
    
    generateSmartInsights() {
        try {
            const insightsGrid = document.getElementById('insightsGrid');
            
            // Analyze data to produce insights
            const insights = this.analyzeFinancialData();
            
            insightsGrid.innerHTML = insights.map(insight => `
                <div class="insight-card">
                    <div class="insight-header">
                        <div class="insight-icon">
                            <i class="fas fa-${insight.icon}"></i>
                        </div>
                        <div>
                            <h4>${insight.title}</h4>
                            <span class="insight-tag ${insight.tagClass}">${insight.tag}</span>
                        </div>
                    </div>
                    <div class="insight-content">
                        <p>${insight.description}</p>
                    </div>
                    <div class="insight-actions">
                        <button class="btn btn-sm btn-primary" onclick="${insight.action}">
                            ${insight.actionText}
                        </button>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error("Error generating insights:", error);
        }
    }
    
    analyzeFinancialData() {
        const insights = [];
        
        // Analyze spending trends
        const spendingTrend = this.calculateSpendingTrend();
        if (spendingTrend) {
            insights.push({
                icon: 'chart-line',
                title: 'Spending Trend',
                tag: spendingTrend.change > 0 ? `+${spendingTrend.change}%` : `${spendingTrend.change}%`,
                tagClass: spendingTrend.change > 0 ? 'negative' : 'positive',
                description: `Your spending ${spendingTrend.change > 0 ? 'increased' : 'decreased'} by ${Math.abs(spendingTrend.change)}% compared to last month. ${spendingTrend.highestCategory ? spendingTrend.highestCategory + ' expenses saw the ' + (spendingTrend.change > 0 ? 'highest increase' : 'largest decrease') + '.' : ''}`,
                action: "window.location.href='expenses.html'",
                actionText: 'View Details'
            });
        }
        
        // Identify savings opportunities
        const savingsOpportunity = this.identifySavingsOpportunity();
        if (savingsOpportunity) {
            insights.push({
                icon: 'piggy-bank',
                title: 'Savings Opportunity',
                tag: 'Potential',
                tagClass: 'warning',
                description: `You could save $${savingsOpportunity.amount}/month by reducing ${savingsOpportunity.categories.join(' and ')} expenses by ${savingsOpportunity.reduction}%.`,
                action: "window.location.href='budgets.html'",
                actionText: 'Set Budget'
            });
        }
        
        // Analyze goal progress
        const goalProgress = this.analyzeGoalProgress();
        if (goalProgress) {
            insights.push({
                icon: 'bullseye',
                title: 'Goal Progress',
                tag: `${goalProgress.progress}%`,
                tagClass: goalProgress.progress >= 70 ? 'success' : goalProgress.progress >= 40 ? 'warning' : 'info',
                description: `You're ${goalProgress.progress}% towards your ${goalProgress.goalName}. At this rate, you'll reach it in ${goalProgress.monthsRemaining} months.`,
                action: "window.location.href='goals.html'",
                actionText: 'View Goals'
            });
        }
        
        // Check budget alerts
        const budgetAlerts = this.checkBudgetAlerts();
        if (budgetAlerts.length > 0) {
            insights.push({
                icon: 'exclamation-triangle',
                title: 'Budget Alert',
                tag: `${budgetAlerts.length} categories`,
                tagClass: 'danger',
                description: `${budgetAlerts.length} budget ${budgetAlerts.length === 1 ? 'category is' : 'categories are'} nearing or exceeding limits.`,
                action: "window.location.href='budgets.html'",
                actionText: 'Review Budgets'
            });
        }
        
        // Check for high-value transactions
        const highValueTransactions = this.checkHighValueTransactions();
        if (highValueTransactions.length > 0) {
            insights.push({
                icon: 'money-bill-wave',
                title: 'Large Transactions',
                tag: `${highValueTransactions.length} found`,
                tagClass: 'info',
                description: `Found ${highValueTransactions.length} high-value transaction${highValueTransactions.length === 1 ? '' : 's'} this month.`,
                action: "window.location.href='expenses.html?filter=high'",
                actionText: 'Review Transactions'
            });
        }
        
        return insights.slice(0, 3); // Limit to 3 insights
    }
    
    calculateSpendingTrend() {
        try {
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            
            // In a real app, you would fetch actual data from Firebase
            // For now, return sample data
            return {
                change: 12,
                highestCategory: 'Food',
                categories: ['Food', 'Entertainment', 'Shopping']
            };
            
        } catch (error) {
            console.error("Error calculating spending trend:", error);
            return null;
        }
    }
    
    identifySavingsOpportunity() {
        try {
            // Analyze spending patterns to identify savings opportunities
            return {
                amount: 150,
                categories: ['Entertainment', 'Dining Out'],
                reduction: 20
            };
            
        } catch (error) {
            console.error("Error identifying savings opportunity:", error);
            return null;
        }
    }
    
    analyzeGoalProgress() {
        try {
            // Analyze goal progress
            return {
                goalName: 'emergency fund',
                progress: 65,
                monthsRemaining: 3,
                currentAmount: 6500,
                targetAmount: 10000
            };
            
        } catch (error) {
            console.error("Error analyzing goal progress:", error);
            return null;
        }
    }
    
    checkBudgetAlerts() {
        try {
            // Check for budget alerts
            return [
                { category: 'Shopping', usage: 95 },
                { category: 'Entertainment', usage: 110 }
            ];
            
        } catch (error) {
            console.error("Error checking budget alerts:", error);
            return [];
        }
    }
    
    checkHighValueTransactions() {
        try {
            // Check for high-value transactions
            return [
                { amount: 1200, category: 'Electronics' },
                { amount: 850, category: 'Travel' }
            ];
            
        } catch (error) {
            console.error("Error checking high-value transactions:", error);
            return [];
        }
    }
    
    // ========== REAL-TIME UPDATES ==========
    
    startRealTimeUpdates() {
        this.setupRealTimeListeners();
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
            }, (error) => {
                console.error("Real-time users listener error:", error);
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
            }, (error) => {
                console.error("Real-time incomes listener error:", error);
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
            }, (error) => {
                console.error("Real-time expenses listener error:", error);
            });
        this.realTimeListeners.push(expensesListener);
        
        // Listen for new notifications
        const notificationsListener = this.db.collection('notifications')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        this.handleNewNotification(change.doc.data());
                    }
                });
            }, (error) => {
                console.error("Real-time notifications listener error:", error);
            });
        this.realTimeListeners.push(notificationsListener);
    }
    
    handleNewUser(userData) {
        this.showRealTimeNotification(`New user registered: ${userData.name || userData.email}`);
        
        // Reload users statistics
        this.loadUsersStatistics();
        
        // Add to recent users table if active tab
        if (document.querySelector('#recent-users').classList.contains('active')) {
            this.addToRecentUsersTable(userData);
        }
        
        // Update smart insights
        this.generateSmartInsights();
    }
    
    handleNewIncome(incomeData) {
        const amount = Number(incomeData.amount) || 0;
        
        if (amount >= 5000) {
            this.showRealTimeNotification(`High-value income: $${amount.toLocaleString()}`);
        }
        
        // Reload income statistics
        this.loadIncomesStatistics();
        
        // Add to recent incomes table if active tab
        if (document.querySelector('#recent-incomes').classList.contains('active')) {
            this.addToRecentIncomesTable(incomeData);
        }
        
        // Update charts
        this.loadChartsData(6);
        
        // Update smart insights
        this.generateSmartInsights();
    }
    
    handleNewExpense(expenseData) {
        const amount = Number(expenseData.amount) || 0;
        
        if (amount >= 1000) {
            this.showRealTimeNotification(`Large expense: $${amount.toLocaleString()}`);
        }
        
        // Reload expense statistics
        this.loadExpensesStatistics();
        
        // Add to recent expenses table if active tab
        if (document.querySelector('#recent-expenses').classList.contains('active')) {
            this.addToRecentExpensesTable(expenseData);
        }
        
        // Update charts
        this.loadChartsData(6);
        
        // Update smart insights
        this.generateSmartInsights();
    }
    
    handleNewNotification(notificationData) {
        this.showRealTimeNotification(`New notification: ${notificationData.title || 'Alert'}`);
        
        // Update notification count
        this.loadNotifications();
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
                        <span>${this.escapeHtml(userData.name || 'N/A')}</span>
                    </div>
                </td>
                <td>${this.escapeHtml(userData.email || 'N/A')}</td>
                <td>${dateStr}</td>
                <td>
                    <span class="status-badge status-pending">
                        Pending
                    </span>
                </td>
            </tr>
        `;
        
        // Check if table is showing empty state
        if (table.querySelector('.no-data')) {
            table.innerHTML = newRow;
        } else {
            // Insert at top
            const firstRow = table.querySelector('tr');
            if (firstRow) {
                table.insertAdjacentHTML('afterbegin', newRow);
            } else {
                table.innerHTML = newRow;
            }
            
            // Limit to 5 rows
            const rows = table.querySelectorAll('tr');
            if (rows.length > 5) {
                rows[rows.length - 1].remove();
            }
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
                        <span>${this.escapeHtml(incomeData.userName || 'Unknown User')}</span>
                    </div>
                </td>
                <td class="amount-positive">
                    <strong>$${(Number(incomeData.amount) || 0).toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    })}</strong>
                </td>
                <td>${this.escapeHtml(incomeData.description || 'No description')}</td>
                <td>${dateStr}</td>
            </tr>
        `;
        
        if (table.querySelector('.no-data')) {
            table.innerHTML = newRow;
        } else {
            const firstRow = table.querySelector('tr');
            if (firstRow) {
                table.insertAdjacentHTML('afterbegin', newRow);
            } else {
                table.innerHTML = newRow;
            }
            
            const rows = table.querySelectorAll('tr');
            if (rows.length > 5) {
                rows[rows.length - 1].remove();
            }
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
                        <span>${this.escapeHtml(expenseData.userName || 'Unknown User')}</span>
                    </div>
                </td>
                <td class="amount-negative">
                    <strong>$${(Number(expenseData.amount) || 0).toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    })}</strong>
                </td>
                <td>${this.escapeHtml(expenseData.category || 'No category')}</td>
                <td>${dateStr}</td>
            </tr>
        `;
        
        if (table.querySelector('.no-data')) {
            table.innerHTML = newRow;
        } else {
            const firstRow = table.querySelector('tr');
            if (firstRow) {
                table.insertAdjacentHTML('afterbegin', newRow);
            } else {
                table.innerHTML = newRow;
            }
            
            const rows = table.querySelectorAll('tr');
            if (rows.length > 5) {
                rows[rows.length - 1].remove();
            }
        }
    }
    
    showRealTimeNotification(message) {
        // Check if notification already exists
        const existingNotifications = document.querySelectorAll('.real-time-notification');
        for (const notif of existingNotifications) {
            if (notif.textContent.includes(message)) {
                return;
            }
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'real-time-notification';
        notification.innerHTML = `
            <i class="fas fa-sync-alt"></i>
            <span>${this.escapeHtml(message)}</span>
            <button class="close-notification" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to page
        const container = document.querySelector('.main-content');
        if (container) {
            const firstChild = container.firstChild;
            if (firstChild) {
                container.insertBefore(notification, firstChild);
            } else {
                container.appendChild(notification);
            }
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    showRealTimeIndicator(show) {
        const indicator = document.getElementById('toggleRealTimeBtn');
        if (indicator) {
            if (show) {
                indicator.classList.add('active');
                indicator.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Real-time';
            } else {
                indicator.classList.remove('active');
                indicator.innerHTML = '<i class="fas fa-sync-alt"></i> Real-time';
            }
        }
    }
    
    toggleRealTimeUpdates() {
        const isActive = document.getElementById('toggleRealTimeBtn')?.classList.contains('active');
        
        if (isActive) {
            this.stopRealTimeUpdates();
            this.showRealTimeIndicator(false);
            this.showMessage('Real-time updates disabled', 'warning');
        } else {
            this.startRealTimeUpdates();
            this.showRealTimeIndicator(true);
            this.showMessage('Real-time updates enabled', 'success');
        }
    }
    
    stopRealTimeUpdates() {
        this.realTimeListeners.forEach(unsubscribe => {
            try {
                unsubscribe();
            } catch (error) {
                console.error("Error unsubscribing listener:", error);
            }
        });
        this.realTimeListeners = [];
    }
    
    // ========== HELPER METHODS ==========
    
    showLoading(show) {
        const loadingElements = document.querySelectorAll('.loading-row, .loading-state');
        loadingElements.forEach(element => {
            element.style.display = show ? 'flex' : 'none';
        });
        
        // Show/hide loading overlay
        let overlay = document.getElementById('loadingOverlay');
        if (show) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'loadingOverlay';
                overlay.className = 'loading-overlay';
                overlay.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                document.body.appendChild(overlay);
            }
            overlay.style.display = 'flex';
        } else if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    showMessage(message, type = 'info') {
        // Remove duplicate messages
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
            <span>${this.escapeHtml(message)}</span>
            <button class="message-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to page
        const container = document.querySelector('.main-content');
        if (container) {
            const firstChild = container.firstChild;
            if (firstChild) {
                container.insertBefore(messageDiv, firstChild);
            } else {
                container.appendChild(messageDiv);
            }
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
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showError(message) {
        const container = document.querySelector('.main-content');
        if (container && !container.innerHTML.includes('System Error')) {
            const errorHTML = `
                <div class="error-container">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>⚠️ System Error</h2>
                    <p>${this.escapeHtml(message)}</p>
                    <div class="error-actions">
                        <button onclick="location.reload()" class="btn btn-primary">
                            <i class="fas fa-redo"></i> Reload Page
                        </button>
                        <button onclick="authSystem.logout()" class="btn btn-secondary">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            `;
            
            // Add error container without removing existing content
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = errorHTML;
            container.appendChild(errorDiv.firstElementChild);
        }
    }
    
    cacheData(key, data) {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            localStorage.setItem(`dashboard_${key}`, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error caching data:', error);
        }
    }
    
    getCachedData(key) {
        try {
            const cached = localStorage.getItem(`dashboard_${key}`);
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            // Check if cache is still valid
            if (Date.now() - cacheData.timestamp > this.cacheDuration) {
                localStorage.removeItem(`dashboard_${key}`);
                return null;
            }
            
            return cacheData.data;
        } catch (error) {
            console.error('Error getting cached data:', error);
            return null;
        }
    }
    
    updateStatsUI(stats) {
        // Update UI with cached stats
        if (stats.totalUsers !== undefined) {
            document.getElementById('statTotalUsers').textContent = stats.totalUsers.toLocaleString();
        }
        // Add more stat updates as needed
    }
    
    generateReport() {
        try {
            // Collect current data
            const reportData = {
                generatedAt: new Date().toISOString(),
                generatedBy: this.user?.name || 'System',
                statistics: {
                    totalUsers: document.getElementById('statTotalUsers').textContent,
                    totalEmployees: document.getElementById('statTotalEmployees').textContent,
                    totalIncome: document.getElementById('statTotalIncome').textContent,
                    totalExpenses: document.getElementById('statTotalExpenses').textContent
                },
                insights: this.analyzeFinancialData()
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
        
        // Ctrl + B for budgets
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            window.location.href = 'budgets.html';
        }
        
        // Ctrl + G for goals
        if (e.ctrlKey && e.key === 'g') {
            e.preventDefault();
            window.location.href = 'goals.html';
        }
        
        // Ctrl + N for notifications
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            window.location.href = 'notifications.html';
        }
        
        // Ctrl + L for logout
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            authSystem.logout();
        }
        
        // Esc to close modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal.active');
            modals.forEach(modal => {
                modal.classList.remove('active');
            });
            document.getElementById('notificationsPanel')?.classList.remove('show');
        }
    });
});