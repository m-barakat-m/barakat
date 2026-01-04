// Budget Management System
class BudgetManager {
    constructor() {
        this.budgets = [];
        this.categories = [];
        this.expenses = [];
        this.budgetChart = null;
        this.selectedPeriod = 'current';
        this.selectedFilter = 'all';
        this.init();
    }

    async init() {
        console.log("🚀 Initializing Budget Manager...");
        
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
            
            // Load initial data
            await this.loadInitialData();
            
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
        
        // Create budget button
        document.getElementById('addBudgetBtn').addEventListener('click', () => {
            this.showCreateBudgetModal();
        });
        
        // Quick budget button
        document.getElementById('quickBudgetBtn').addEventListener('click', () => {
            this.generateQuickBudget();
        });
        
        // Period selector
        document.getElementById('budgetPeriod').addEventListener('change', (e) => {
            this.selectedPeriod = e.target.value;
            this.updateBudgetChart();
            this.updateBudgetCards();
        });
        
        // Category filter
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.selectedFilter = e.target.value;
            this.filterBudgetCards();
        });
        
        // Export button
        document.getElementById('exportBudgetsBtn').addEventListener('click', () => {
            this.exportBudgets();
        });
        
        // Mark all as read
        document.getElementById('markAllReadBtn').addEventListener('click', () => {
            this.markAllAlertsAsRead();
        });
        
        // Modal close buttons
        document.getElementById('closeCreateBudgetModal').addEventListener('click', () => {
            this.hideCreateBudgetModal();
        });
        
        document.getElementById('closeEditBudgetModal').addEventListener('click', () => {
            this.hideEditBudgetModal();
        });
        
        document.getElementById('cancelCreateBudgetBtn').addEventListener('click', () => {
            this.hideCreateBudgetModal();
        });
        
        document.getElementById('cancelEditBudgetBtn').addEventListener('click', () => {
            this.hideEditBudgetModal();
        });
        
        // Forms
        document.getElementById('createBudgetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createBudget();
        });
        
        document.getElementById('editBudgetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateBudget();
        });
        
        // Set default dates
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        document.getElementById('budgetStartDate').value = firstDay.toISOString().split('T')[0];
        document.getElementById('budgetEndDate').value = lastDay.toISOString().split('T')[0];
    }
    
    updateUserInfo() {
        const user = authSystem.currentUser;
        if (user) {
            document.getElementById('userName').textContent = user.name || user.email;
            document.getElementById('userRole').textContent = user.role || 'User';
        }
    }
    
    async loadInitialData() {
        try {
            // Show loading state
            this.showLoading(true);
            
            // Load all data in parallel
            await Promise.all([
                this.loadBudgetsData(),
                this.loadCategoriesData(),
                this.loadExpensesData()
            ]);
            
            // Update statistics
            this.updateOverviewStatistics();
            
            // Initialize chart
            this.initBudgetChart();
            
            // Update budget cards
            this.updateBudgetCards();
            
            // Update alerts
            this.updateBudgetAlerts();
            
            // Generate recommendations
            this.generateRecommendations();
            
            // Hide loading state
            this.showLoading(false);
            
        } catch (error) {
            console.error("❌ Error loading initial data:", error);
            this.showError("Error loading data: " + error.message);
            this.showLoading(false);
        }
    }
    
    async loadBudgetsData() {
        try {
            const budgetsSnapshot = await this.db.collection('budgets')
                .orderBy('createdAt', 'desc')
                .get();
            
            this.budgets = [];
            
            budgetsSnapshot.forEach(doc => {
                const budgetData = doc.data();
                const budget = {
                    id: doc.id,
                    ...budgetData,
                    startDate: budgetData.startDate?.toDate(),
                    endDate: budgetData.endDate?.toDate(),
                    createdAt: budgetData.createdAt?.toDate(),
                    updatedAt: budgetData.updatedAt?.toDate()
                };
                
                this.budgets.push(budget);
            });
            
            console.log(`✅ Loaded ${this.budgets.length} budgets`);
            
        } catch (error) {
            console.error("Error loading budgets data:", error);
            throw error;
        }
    }
    
    async loadCategoriesData() {
        try {
            const categoriesSnapshot = await this.db.collection('categories').get();
            this.categories = [];
            
            categoriesSnapshot.forEach(doc => {
                const categoryData = doc.data();
                this.categories.push({
                    id: doc.id,
                    ...categoryData
                });
            });
            
            // Populate category dropdowns
            this.populateCategoryDropdowns();
            
        } catch (error) {
            console.error("Error loading categories data:", error);
        }
    }
    
    async loadExpensesData() {
        try {
            const expensesSnapshot = await this.db.collection('expenses')
                .where('date', '>=', new Date(new Date().getFullYear(), new Date().getMonth(), 1))
                .get();
            
            this.expenses = [];
            
            expensesSnapshot.forEach(doc => {
                const expenseData = doc.data();
                this.expenses.push({
                    id: doc.id,
                    ...expenseData,
                    date: expenseData.date?.toDate()
                });
            });
            
        } catch (error) {
            console.error("Error loading expenses data:", error);
        }
    }
    
    populateCategoryDropdowns() {
        const categorySelects = [
            'budgetCategory',
            'editBudgetCategory'
        ];
        
        categorySelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            // Clear existing options except the first one
            while (select.options.length > 1) select.remove(1);
            
            // Add category options
            this.categories.forEach(category => {
                const categoryName = category.name || category.ar_name;
                if (categoryName) {
                    select.add(new Option(categoryName, categoryName));
                }
            });
        });
    }
    
    updateOverviewStatistics() {
        // Calculate total budget
        const totalBudget = this.budgets.reduce((sum, budget) => sum + (budget.amount || 0), 0);
        
        // Calculate total spent this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const totalSpent = this.expenses.reduce((sum, expense) => {
            const expenseDate = expense.date;
            if (expenseDate && expenseDate >= startOfMonth) {
                return sum + (expense.amount || 0);
            }
            return sum;
        }, 0);
        
        // Calculate usage percentage
        const usagePercentage = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;
        
        // Count active budgets
        const activeBudgets = this.budgets.filter(budget => {
            const today = new Date();
            const startDate = budget.startDate || new Date(0);
            const endDate = budget.endDate || new Date(today.getFullYear() + 1, 0, 1);
            return today >= startDate && today <= endDate;
        }).length;
        
        // Count budgets over limit
        const overBudgetCount = this.budgets.filter(budget => {
            const budgetSpent = this.calculateBudgetSpent(budget.category);
            return budgetSpent > (budget.amount || 0);
        }).length;
        
        // Calculate monthly savings (income - expenses)
        const monthlyIncome = 5000; // This should come from incomes data
        const monthlySavings = monthlyIncome - totalSpent;
        const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
        
        // Calculate budget health score (100 - average overage percentage)
        let healthScore = 100;
        if (this.budgets.length > 0) {
            let totalOverage = 0;
            this.budgets.forEach(budget => {
                const budgetSpent = this.calculateBudgetSpent(budget.category);
                const budgetAmount = budget.amount || 0;
                if (budgetSpent > budgetAmount) {
                    const overage = ((budgetSpent - budgetAmount) / budgetAmount) * 100;
                    totalOverage += Math.min(overage, 100);
                }
            });
            const averageOverage = totalOverage / this.budgets.length;
            healthScore = Math.max(0, 100 - averageOverage);
        }
        
        // Update UI
        document.getElementById('totalBudgetAmount').textContent = 
            `$${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        document.getElementById('totalBudgetProgress').style.width = `${usagePercentage}%`;
        document.getElementById('totalBudgetUsed').textContent = 
            `$${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} used`;
        
        document.getElementById('activeBudgetsCount').textContent = activeBudgets;
        document.getElementById('overBudgetCount').textContent = overBudgetCount;
        
        document.getElementById('monthlySavings').textContent = 
            `$${monthlySavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('savingsRate').textContent = `${savingsRate.toFixed(1)}%`;
        
        document.getElementById('budgetHealthScore').textContent = `${healthScore.toFixed(0)}%`;
        document.getElementById('healthStatus').textContent = 
            healthScore >= 80 ? 'Healthy' : healthScore >= 50 ? 'Moderate' : 'Needs Attention';
        
        const healthIndicator = document.querySelector('.status-indicator');
        healthIndicator.className = 'status-indicator ' + 
            (healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'warning' : 'danger');
        
        // Update badges
        document.getElementById('budgetsCount').textContent = this.budgets.length;
    }
    
    calculateBudgetSpent(category) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        return this.expenses.reduce((sum, expense) => {
            const expenseDate = expense.date;
            if (expenseDate && expenseDate >= startOfMonth && expense.category === category) {
                return sum + (expense.amount || 0);
            }
            return sum;
        }, 0);
    }
    
    initBudgetChart() {
        const ctx = document.getElementById('budgetChart').getContext('2d');
        
        this.budgetChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Budget',
                        data: [],
                        backgroundColor: '#4facfe',
                        borderColor: '#4facfe',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Actual',
                        data: [],
                        backgroundColor: '#fa709a',
                        borderColor: '#fa709a',
                        borderWidth: 1,
                        borderRadius: 4
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
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: $${context.raw.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
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
        
        this.updateBudgetChart();
    }
    
    updateBudgetChart() {
        if (!this.budgetChart) return;
        
        // Filter budgets based on selected period
        const filteredBudgets = this.getFilteredBudgets();
        
        // Get top 8 categories
        const categories = [...new Set(filteredBudgets.map(b => b.category))].slice(0, 8);
        
        const budgetData = [];
        const actualData = [];
        
        categories.forEach(category => {
            const budget = filteredBudgets.find(b => b.category === category);
            const budgetAmount = budget ? budget.amount : 0;
            const actualAmount = this.calculateBudgetSpent(category);
            
            budgetData.push(budgetAmount);
            actualData.push(actualAmount);
        });
        
        this.budgetChart.data.labels = categories;
        this.budgetChart.data.datasets[0].data = budgetData;
        this.budgetChart.data.datasets[1].data = actualData;
        this.budgetChart.update();
    }
    
    getFilteredBudgets() {
        const now = new Date();
        
        switch (this.selectedPeriod) {
            case 'current':
                return this.budgets.filter(budget => {
                    const startDate = budget.startDate || new Date(0);
                    const endDate = budget.endDate || new Date(now.getFullYear() + 1, 0, 1);
                    return now >= startDate && now <= endDate;
                });
                
            case 'last':
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                return this.budgets.filter(budget => {
                    const startDate = budget.startDate;
                    return startDate && startDate >= lastMonth && startDate <= endOfLastMonth;
                });
                
            default:
                return this.budgets;
        }
    }
    
    updateBudgetCards() {
        const budgetsGrid = document.getElementById('budgetsGrid');
        const filteredBudgets = this.getFilteredBudgets();
        
        if (filteredBudgets.length === 0) {
            budgetsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie"></i>
                    <h4>No budgets found</h4>
                    <p>Create your first budget to start tracking expenses</p>
                    <button class="btn btn-primary" id="createFirstBudgetBtn">
                        <i class="fas fa-plus-circle"></i>
                        Create First Budget
                    </button>
                </div>
            `;
            
            document.getElementById('createFirstBudgetBtn').addEventListener('click', () => {
                this.showCreateBudgetModal();
            });
            
            return;
        }
        
        budgetsGrid.innerHTML = filteredBudgets.map(budget => {
            const spent = this.calculateBudgetSpent(budget.category);
            const remaining = Math.max(0, (budget.amount || 0) - spent);
            const percentage = budget.amount > 0 ? Math.min(100, (spent / budget.amount) * 100) : 0;
            
            // Determine status
            let status = 'healthy';
            if (percentage >= 100) {
                status = 'danger';
            } else if (percentage >= 80) {
                status = 'warning';
            }
            
            // Get icon class based on category
            const iconClass = this.getCategoryIconClass(budget.category);
            
            return `
                <div class="budget-card ${status}" data-budget-id="${budget.id}">
                    <div class="budget-card-header">
                        <div class="budget-category">
                            <div class="category-icon ${iconClass}">
                                <i class="${this.getCategoryIcon(budget.category)}"></i>
                            </div>
                            <div>
                                <h4>${budget.category || 'Uncategorized'}</h4>
                                <small>${budget.periodType || 'Monthly'} Budget</small>
                            </div>
                        </div>
                        <div class="budget-actions-menu">
                            <button class="action-btn" onclick="budgetManager.editBudget('${budget.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" onclick="budgetManager.deleteBudget('${budget.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="budget-amounts">
                        <div class="amount-row">
                            <span class="amount-label">Budget</span>
                            <span class="amount-value budget">
                                $${(budget.amount || 0).toLocaleString(undefined, { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                })}
                            </span>
                        </div>
                        <div class="amount-row">
                            <span class="amount-label">Spent</span>
                            <span class="amount-value spent">
                                $${spent.toLocaleString(undefined, { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                })}
                            </span>
                        </div>
                        <div class="amount-row">
                            <span class="amount-label">Remaining</span>
                            <span class="amount-value remaining">
                                $${remaining.toLocaleString(undefined, { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                })}
                            </span>
                        </div>
                    </div>
                    
                    <div class="budget-progress">
                        <div class="progress-info">
                            <span>Usage</span>
                            <span class="progress-percentage">${percentage.toFixed(1)}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                    
                    <div class="budget-period">
                        <small>
                            ${budget.startDate ? budget.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'} 
                            - 
                            ${budget.endDate ? budget.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No end date'}
                        </small>
                    </div>
                    
                    <div class="budget-actions">
                        <button class="btn btn-sm btn-secondary" onclick="budgetManager.viewBudgetDetails('${budget.id}')">
                            <i class="fas fa-chart-bar"></i> Details
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="budgetManager.adjustBudget('${budget.id}')">
                            <i class="fas fa-adjust"></i> Adjust
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    getCategoryIcon(category) {
        const iconMap = {
            'Food': 'fas fa-utensils',
            'Transportation': 'fas fa-car',
            'Shopping': 'fas fa-shopping-bag',
            'Entertainment': 'fas fa-film',
            'Utilities': 'fas fa-bolt',
            'Health': 'fas fa-heartbeat',
            'Education': 'fas fa-graduation-cap',
            'Housing': 'fas fa-home',
            'Travel': 'fas fa-plane',
            'Other': 'fas fa-ellipsis-h'
        };
        
        return iconMap[category] || 'fas fa-tag';
    }
    
    getCategoryIconClass(category) {
        const classMap = {
            'Food': 'food',
            'Transportation': 'transport',
            'Shopping': 'shopping',
            'Entertainment': 'entertainment',
            'Utilities': 'utilities',
            'Health': 'health',
            'Education': 'education'
        };
        
        return classMap[category] || 'other';
    }
    
    filterBudgetCards() {
        const budgetCards = document.querySelectorAll('.budget-card');
        
        budgetCards.forEach(card => {
            const budgetId = card.dataset.budgetId;
            const budget = this.budgets.find(b => b.id === budgetId);
            
            if (!budget) return;
            
            const spent = this.calculateBudgetSpent(budget.category);
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            
            let shouldShow = true;
            
            switch (this.selectedFilter) {
                case 'active':
                    const today = new Date();
                    const startDate = budget.startDate || new Date(0);
                    const endDate = budget.endDate || new Date(today.getFullYear() + 1, 0, 1);
                    shouldShow = today >= startDate && today <= endDate;
                    break;
                    
                case 'over':
                    shouldShow = percentage >= 100;
                    break;
                    
                case 'near':
                    shouldShow = percentage >= 80 && percentage < 100;
                    break;
            }
            
            card.style.display = shouldShow ? 'block' : 'none';
        });
    }
    
    updateBudgetAlerts() {
        const alertsContainer = document.getElementById('budgetAlertsContainer');
        const alerts = this.generateBudgetAlerts();
        
        if (alerts.length === 0) {
            alertsContainer.innerHTML = `
                <div class="alert-item info">
                    <i class="fas fa-info-circle"></i>
                    <div class="alert-content">
                        <p>No budget alerts at the moment</p>
                        <small>All budgets are within limits</small>
                    </div>
                </div>
            `;
            return;
        }
        
        alertsContainer.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <i class="fas fa-${alert.icon}"></i>
                <div class="alert-content">
                    <p>${alert.message}</p>
                    <small>${alert.details}</small>
                </div>
                <button class="btn btn-sm btn-secondary" onclick="budgetManager.dismissAlert('${alert.id}')">
                    Dismiss
                </button>
            </div>
        `).join('');
    }
    
    generateBudgetAlerts() {
        const alerts = [];
        const today = new Date();
        
        // Check for budgets nearing or exceeding limits
        this.budgets.forEach(budget => {
            const spent = this.calculateBudgetSpent(budget.category);
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            
            if (percentage >= 100) {
                alerts.push({
                    id: budget.id,
                    type: 'danger',
                    icon: 'exclamation-triangle',
                    message: `Budget exceeded: ${budget.category}`,
                    details: `Spent $${spent.toLocaleString()} of $${budget.amount.toLocaleString()} budget`
                });
            } else if (percentage >= 90) {
                alerts.push({
                    id: budget.id,
                    type: 'warning',
                    icon: 'exclamation-circle',
                    message: `Budget nearing limit: ${budget.category}`,
                    details: `At ${percentage.toFixed(1)}% of budget`
                });
            }
        });
        
        // Check for expired budgets
        this.budgets.forEach(budget => {
            if (budget.endDate && budget.endDate < today) {
                alerts.push({
                    id: budget.id + '_expired',
                    type: 'info',
                    icon: 'calendar-times',
                    message: `Budget expired: ${budget.category}`,
                    details: `Ended on ${budget.endDate.toLocaleDateString()}`
                });
            }
        });
        
        return alerts.slice(0, 5); // Limit to 5 alerts
    }
    
    generateRecommendations() {
        const recommendationsGrid = document.getElementById('recommendationsGrid');
        const recommendations = this.generateSmartRecommendations();
        
        recommendationsGrid.innerHTML = recommendations.map(rec => `
            <div class="recommendation-card">
                <div class="recommendation-icon">
                    <i class="fas fa-${rec.icon}"></i>
                </div>
                <div class="recommendation-content">
                    <h4>${rec.title}</h4>
                    <p>${rec.description}</p>
                </div>
                <button class="btn btn-sm btn-primary" onclick="${rec.action}">
                    ${rec.actionText}
                </button>
            </div>
        `).join('');
    }
    
    generateSmartRecommendations() {
        const recommendations = [];
        
        // Analyze spending patterns
        const categorySpending = {};
        this.expenses.forEach(expense => {
            if (expense.category) {
                categorySpending[expense.category] = (categorySpending[expense.category] || 0) + (expense.amount || 0);
            }
        });
        
        // Find highest spending category
        let highestCategory = '';
        let highestAmount = 0;
        Object.entries(categorySpending).forEach(([category, amount]) => {
            if (amount > highestAmount) {
                highestAmount = amount;
                highestCategory = category;
            }
        });
        
        if (highestCategory) {
            recommendations.push({
                icon: 'chart-line',
                title: 'High spending detected',
                description: `Your ${highestCategory.toLowerCase()} expenses are higher than other categories this month.`,
                action: 'budgetManager.analyzeSpending()',
                actionText: 'Analyze'
            });
        }
        
        // Check for potential savings
        const totalSpent = Object.values(categorySpending).reduce((a, b) => a + b, 0);
        if (totalSpent > 0) {
            recommendations.push({
                icon: 'piggy-bank',
                title: 'Potential savings',
                description: 'Based on your spending patterns, you could save up to 15% by optimizing your expenses.',
                action: 'budgetManager.showSavingsTips()',
                actionText: 'View Tips'
            });
        }
        
        // Add budget optimization recommendation
        if (this.budgets.length > 0) {
            recommendations.push({
                icon: 'magic',
                title: 'Optimize budgets',
                description: 'Review and adjust your budgets based on actual spending patterns.',
                action: 'budgetManager.optimizeBudgets()',
                actionText: 'Optimize'
            });
        }
        
        return recommendations;
    }
    
    showCreateBudgetModal() {
        document.getElementById('createBudgetModal').classList.add('active');
        
        // Set default dates
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        document.getElementById('budgetStartDate').value = firstDay.toISOString().split('T')[0];
        document.getElementById('budgetEndDate').value = lastDay.toISOString().split('T')[0];
    }
    
    hideCreateBudgetModal() {
        document.getElementById('createBudgetModal').classList.remove('active');
    }
    
    showEditBudgetModal() {
        document.getElementById('editBudgetModal').classList.add('active');
    }
    
    hideEditBudgetModal() {
        document.getElementById('editBudgetModal').classList.remove('active');
    }
    
    async createBudget() {
        try {
            const category = document.getElementById('budgetCategory').value;
            const amount = parseFloat(document.getElementById('budgetAmount').value);
            const periodType = document.getElementById('budgetPeriodType').value;
            const startDate = document.getElementById('budgetStartDate').value;
            const endDate = document.getElementById('budgetEndDate').value;
            const description = document.getElementById('budgetDescription').value;
            const enableNotifications = document.getElementById('budgetNotifications').checked;
            const notificationThreshold = document.getElementById('notificationThreshold').value;
            const color = document.getElementById('budgetColor').value;
            
            // Validate inputs
            if (!category) {
                this.showMessage('Please select a category', 'error');
                return;
            }
            
            if (!amount || amount <= 0) {
                this.showMessage('Please enter a valid budget amount', 'error');
                return;
            }
            
            if (!startDate) {
                this.showMessage('Please select a start date', 'error');
                return;
            }
            
            // Create budget object
            const budgetData = {
                category: category,
                amount: amount,
                periodType: periodType,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                description: description || '',
                enableNotifications: enableNotifications,
                notificationThreshold: parseInt(notificationThreshold),
                color: color,
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Add to Firestore
            const docRef = await this.db.collection('budgets').add(budgetData);
            
            // Show success message
            this.showMessage(`Budget for ${category} created successfully!`, 'success');
            
            // Close modal
            this.hideCreateBudgetModal();
            
            // Add to local array
            const newBudget = {
                id: docRef.id,
                ...budgetData
            };
            
            this.budgets.unshift(newBudget);
            
            // Update UI
            this.updateOverviewStatistics();
            this.updateBudgetCards();
            this.updateBudgetAlerts();
            
        } catch (error) {
            console.error("Error creating budget:", error);
            this.showMessage('Error creating budget: ' + error.message, 'error');
        }
    }
    
    async editBudget(budgetId) {
        try {
            const budget = this.budgets.find(b => b.id === budgetId);
            if (!budget) {
                this.showMessage('Budget not found', 'error');
                return;
            }
            
            // Populate edit form
            document.getElementById('editBudgetId').value = budget.id;
            document.getElementById('editBudgetCategory').value = budget.category || '';
            document.getElementById('editBudgetAmount').value = budget.amount || 0;
            document.getElementById('editBudgetPeriodType').value = budget.periodType || 'monthly';
            document.getElementById('editBudgetDescription').value = budget.description || '';
            document.getElementById('editBudgetNotifications').checked = budget.enableNotifications || false;
            document.getElementById('editNotificationThreshold').value = budget.notificationThreshold || 80;
            document.getElementById('editBudgetColor').value = budget.color || '#4facfe';
            
            // Format dates
            const startDate = budget.startDate;
            const endDate = budget.endDate;
            
            document.getElementById('editBudgetStartDate').value = startDate ? 
                startDate.toISOString().split('T')[0] : '';
            document.getElementById('editBudgetEndDate').value = endDate ? 
                endDate.toISOString().split('T')[0] : '';
            
            // Show modal
            this.showEditBudgetModal();
            
        } catch (error) {
            console.error("Error preparing budget edit:", error);
            this.showMessage('Error loading budget data: ' + error.message, 'error');
        }
    }
    
    async updateBudget() {
        try {
            const budgetId = document.getElementById('editBudgetId').value;
            const amount = parseFloat(document.getElementById('editBudgetAmount').value);
            const periodType = document.getElementById('editBudgetPeriodType').value;
            const startDate = document.getElementById('editBudgetStartDate').value;
            const endDate = document.getElementById('editBudgetEndDate').value;
            const description = document.getElementById('editBudgetDescription').value;
            const enableNotifications = document.getElementById('editBudgetNotifications').checked;
            const notificationThreshold = document.getElementById('editNotificationThreshold').value;
            const color = document.getElementById('editBudgetColor').value;
            
            // Validate inputs
            if (!amount || amount <= 0) {
                this.showMessage('Please enter a valid budget amount', 'error');
                return;
            }
            
            if (!startDate) {
                this.showMessage('Please select a start date', 'error');
                return;
            }
            
            // Update budget in Firestore
            await this.db.collection('budgets').doc(budgetId).update({
                amount: amount,
                periodType: periodType,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                description: description || '',
                enableNotifications: enableNotifications,
                notificationThreshold: parseInt(notificationThreshold),
                color: color,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Show success message
            this.showMessage(`Budget updated successfully!`, 'success');
            
            // Close modal
            this.hideEditBudgetModal();
            
            // Update local data
            const budgetIndex = this.budgets.findIndex(b => b.id === budgetId);
            if (budgetIndex !== -1) {
                this.budgets[budgetIndex] = {
                    ...this.budgets[budgetIndex],
                    amount: amount,
                    periodType: periodType,
                    startDate: new Date(startDate),
                    endDate: endDate ? new Date(endDate) : null,
                    description: description,
                    enableNotifications: enableNotifications,
                    notificationThreshold: parseInt(notificationThreshold),
                    color: color,
                    updatedAt: new Date()
                };
            }
            
            // Update UI
            this.updateOverviewStatistics();
            this.updateBudgetCards();
            this.updateBudgetAlerts();
            
        } catch (error) {
            console.error("Error updating budget:", error);
            this.showMessage('Error updating budget: ' + error.message, 'error');
        }
    }
    
    async deleteBudget(budgetId) {
        try {
            const budget = this.budgets.find(b => b.id === budgetId);
            if (!budget) {
                this.showMessage('Budget not found', 'error');
                return;
            }
            
            const confirmMessage = `Are you sure you want to delete the budget for ${budget.category}?`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Delete from Firestore
            await this.db.collection('budgets').doc(budgetId).delete();
            
            // Remove from local array
            this.budgets = this.budgets.filter(b => b.id !== budgetId);
            
            // Show success message
            this.showMessage(`Budget deleted successfully!`, 'success');
            
            // Update UI
            this.updateOverviewStatistics();
            this.updateBudgetCards();
            this.updateBudgetAlerts();
            
        } catch (error) {
            console.error("Error deleting budget:", error);
            this.showMessage('Error deleting budget: ' + error.message, 'error');
        }
    }
    
    async generateQuickBudget() {
        try {
            // Analyze past spending to suggest budgets
            const categoryAverages = this.calculateCategoryAverages();
            const suggestions = [];
            
            Object.entries(categoryAverages).forEach(([category, average]) => {
                // Suggest budget based on average spending
                const suggestedBudget = Math.ceil(average * 1.1); // 10% above average
                
                suggestions.push({
                    category: category,
                    amount: suggestedBudget,
                    periodType: 'monthly',
                    description: `Auto-generated based on average spending of $${average.toLocaleString()}`
                });
            });
            
            // Show suggestions modal
            this.showQuickBudgetSuggestions(suggestions);
            
        } catch (error) {
            console.error("Error generating quick budget:", error);
            this.showMessage('Error generating budget suggestions: ' + error.message, 'error');
        }
    }
    
    calculateCategoryAverages() {
        const categoryTotals = {};
        const categoryCounts = {};
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        
        // Calculate averages from last 3 months
        this.expenses.forEach(expense => {
            const expenseDate = expense.date;
            if (expenseDate && expenseDate >= threeMonthsAgo && expense.category) {
                categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + (expense.amount || 0);
                categoryCounts[expense.category] = (categoryCounts[expense.category] || 0) + 1;
            }
        });
        
        // Calculate averages
        const averages = {};
        Object.keys(categoryTotals).forEach(category => {
            const total = categoryTotals[category];
            const count = categoryCounts[category];
            averages[category] = count > 0 ? total / count : 0;
        });
        
        return averages;
    }
    
    showQuickBudgetSuggestions(suggestions) {
        // Create modal for suggestions
        const modalHTML = `
            <div class="modal active" id="quickBudgetModal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>Quick Budget Suggestions</h3>
                        <button class="close-modal" onclick="document.getElementById('quickBudgetModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Based on your spending patterns, here are suggested budgets:</p>
                        
                        <div class="suggestions-list">
                            ${suggestions.map(suggestion => `
                                <div class="suggestion-item">
                                    <div class="suggestion-content">
                                        <h4>${suggestion.category}</h4>
                                        <p>$${suggestion.amount.toLocaleString(undefined, { 
                                            minimumFractionDigits: 2, 
                                            maximumFractionDigits: 2 
                                        })} per month</p>
                                        <small>${suggestion.description}</small>
                                    </div>
                                    <button class="btn btn-sm btn-primary" 
                                            onclick="budgetManager.createBudgetFromSuggestion('${suggestion.category}', ${suggestion.amount})">
                                        Apply
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="modal-actions">
                            <button class="btn btn-secondary" onclick="document.getElementById('quickBudgetModal').remove()">
                                Cancel
                            </button>
                            <button class="btn btn-primary" onclick="budgetManager.applyAllSuggestions()">
                                Apply All
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    async createBudgetFromSuggestion(category, amount) {
        try {
            const budgetData = {
                category: category,
                amount: amount,
                periodType: 'monthly',
                startDate: new Date(),
                endDate: null,
                description: 'Auto-generated from quick budget',
                enableNotifications: true,
                notificationThreshold: 80,
                color: '#4facfe',
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Add to Firestore
            await this.db.collection('budgets').add(budgetData);
            
            // Add to local array
            this.budgets.push({
                ...budgetData,
                id: 'temp-' + Date.now()
            });
            
            // Update UI
            this.updateOverviewStatistics();
            this.updateBudgetCards();
            
            this.showMessage(`Budget for ${category} created!`, 'success');
            
        } catch (error) {
            console.error("Error creating budget from suggestion:", error);
            this.showMessage('Error creating budget: ' + error.message, 'error');
        }
    }
    
    exportBudgets() {
        try {
            const exportData = this.budgets.map(budget => {
                const spent = this.calculateBudgetSpent(budget.category);
                const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
                
                return {
                    'Category': budget.category || 'N/A',
                    'Budget Amount': budget.amount || 0,
                    'Amount Spent': spent,
                    'Remaining': Math.max(0, (budget.amount || 0) - spent),
                    'Usage Percentage': percentage.toFixed(2) + '%',
                    'Period Type': budget.periodType || 'N/A',
                    'Start Date': budget.startDate ? budget.startDate.toISOString().split('T')[0] : 'N/A',
                    'End Date': budget.endDate ? budget.endDate.toISOString().split('T')[0] : 'N/A',
                    'Status': percentage >= 100 ? 'Over Budget' : percentage >= 80 ? 'Near Limit' : 'Within Budget',
                    'Description': budget.description || '',
                    'Created': budget.createdAt ? budget.createdAt.toISOString().split('T')[0] : 'N/A'
                };
            });
            
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
            a.download = `budgets_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showMessage('Budgets exported successfully!', 'success');
            
        } catch (error) {
            console.error("Error exporting budgets:", error);
            this.showMessage('Error exporting data: ' + error.message, 'error');
        }
    }
    
    markAllAlertsAsRead() {
        const alertsContainer = document.getElementById('budgetAlertsContainer');
        alertsContainer.innerHTML = `
            <div class="alert-item success">
                <i class="fas fa-check-circle"></i>
                <div class="alert-content">
                    <p>All alerts marked as read</p>
                    <small>You'll be notified of new alerts</small>
                </div>
            </div>
        `;
        
        this.showMessage('All alerts marked as read', 'success');
    }
    
    analyzeSpending() {
        // Implement spending analysis
        this.showMessage('Opening spending analysis...', 'info');
        // In a real app, this would open a detailed analysis page
    }
    
    showSavingsTips() {
        // Implement savings tips
        const tips = [
            "Review subscription services you no longer use",
            "Cook at home instead of eating out",
            "Use public transportation when possible",
            "Shop with a list to avoid impulse purchases",
            "Compare prices before making major purchases"
        ];
        
        const tipsHTML = tips.map(tip => `<li>${tip}</li>`).join('');
        
        const modalHTML = `
            <div class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Savings Tips</h3>
                        <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Here are some tips to help you save money:</p>
                        <ul style="margin: 15px 0; padding-left: 20px;">
                            ${tipsHTML}
                        </ul>
                        <div class="modal-actions">
                            <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    optimizeBudgets() {
        this.showMessage('Optimizing budgets based on your spending patterns...', 'info');
        this.generateQuickBudget();
    }
    
    showLoading(show) {
        const budgetsGrid = document.getElementById('budgetsGrid');
        if (show && budgetsGrid.innerHTML.includes('loading-state')) {
            return; // Already showing loading
        }
        
        if (show) {
            budgetsGrid.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading budget data...</p>
                </div>
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

// Initialize budget manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.budgetManager = new BudgetManager();
});