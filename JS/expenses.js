// Expenses Management System
class ExpensesManager {
    constructor() {
        this.expenses = [];
        this.filteredExpenses = [];
        this.users = [];
        this.categories = [];
        this.subCategories = new Map(); // categoryId -> subcategories
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalPages = 1;
        this.selectedCategory = 'all';
        this.selectedSubCategory = 'all';
        this.selectedUser = 'all';
        this.dateFrom = null;
        this.dateTo = null;
        this.currentSort = 'date_desc';
        this.searchTerm = '';
        this.expensesTrendChart = null;
        this.categoryChart = null;
        this.comparisonChart = null;
        this.init();
    }

    async init() {
        console.log("🚀 Initializing Expenses Manager...");
        
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
        
        // Check permissions
        if (!authSystem.hasPermission('manageFinances') && !authSystem.hasPermission('manageUsers')) {
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
        
        // Add expense button
        document.getElementById('addExpenseBtn').addEventListener('click', () => {
            this.showAddExpenseModal();
        });
        
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.filterAndSortExpenses();
        });
        
        document.getElementById('clearSearchBtn').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            this.searchTerm = '';
            this.filterAndSortExpenses();
        });
        
        // Filter and sort
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.selectedCategory = e.target.value;
            this.updateSubCategoryFilter();
            this.filterAndSortExpenses();
        });
        
        document.getElementById('subCategoryFilter').addEventListener('change', (e) => {
            this.selectedSubCategory = e.target.value;
            this.filterAndSortExpenses();
        });
        
        document.getElementById('userFilter').addEventListener('change', (e) => {
            this.selectedUser = e.target.value;
            this.filterAndSortExpenses();
        });
        
        document.getElementById('dateFrom').addEventListener('change', (e) => {
            this.dateFrom = e.target.value ? new Date(e.target.value) : null;
            this.filterAndSortExpenses();
        });
        
        document.getElementById('dateTo').addEventListener('change', (e) => {
            this.dateTo = e.target.value ? new Date(e.target.value) : null;
            this.filterAndSortExpenses();
        });
        
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.filterAndSortExpenses();
        });
        
        // Chart period selectors
        document.getElementById('trendPeriod').addEventListener('change', (e) => {
            this.updateExpensesTrendChart(parseInt(e.target.value));
        });
        
        document.getElementById('categoryPeriod').addEventListener('change', (e) => {
            this.updateCategoryChart(e.target.value);
        });
        
        document.getElementById('comparisonPeriod').addEventListener('change', (e) => {
            this.updateComparisonChart(parseInt(e.target.value));
        });
        
        // Category change in add modal
        document.getElementById('expenseCategory').addEventListener('change', (e) => {
            this.updateSubCategories(e.target.value, 'add');
            this.updateCategoryIdField(e.target.value, 'add');
        });
        
        // Category change in edit modal
        document.getElementById('editExpenseCategory').addEventListener('change', (e) => {
            this.updateSubCategories(e.target.value, 'edit');
            this.updateCategoryIdField(e.target.value, 'edit');
        });
        
        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportExpensesData();
        });
        
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadInitialData();
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
            this.renderExpensesTable();
        });
        
        // Modal close buttons
        document.getElementById('closeAddExpenseModal').addEventListener('click', () => {
            this.hideAddExpenseModal();
        });
        
        document.getElementById('closeEditExpenseModal').addEventListener('click', () => {
            this.hideEditExpenseModal();
        });
        
        document.getElementById('closeExpenseDetailsModal').addEventListener('click', () => {
            this.hideExpenseDetailsModal();
        });
        
        document.getElementById('cancelAddExpenseBtn').addEventListener('click', () => {
            this.hideAddExpenseModal();
        });
        
        document.getElementById('cancelEditExpenseBtn').addEventListener('click', () => {
            this.hideEditExpenseModal();
        });
        
        // Add expense form
        document.getElementById('addExpenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addNewExpense();
        });
        
        // Edit expense form
        document.getElementById('editExpenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateExpense();
        });
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expenseDate').value = today;
        
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
    
    async loadInitialData() {
        try {
            // Show loading state
            this.showLoading(true);
            
            // Load all data in parallel
            await Promise.all([
                this.loadExpensesData(),
                this.loadUsersData(),
                this.loadCategoriesData()
            ]);
            
            // Build sub-categories map
            this.buildSubCategoriesMap();
            
            // Update statistics
            await this.updateStatistics();
            
            // Initialize charts
            this.initCharts();
            
            // Update filters
            this.updateCategoryFilter();
            this.updateSubCategoryFilter();
            
            // Filter and sort expenses
            this.filterAndSortExpenses();
            
            // Hide loading state
            this.showLoading(false);
            
        } catch (error) {
            console.error("❌ Error loading initial data:", error);
            this.showError("Error loading data: " + error.message);
            this.showLoading(false);
        }
    }
    
    async loadExpensesData() {
        try {
            const expensesSnapshot = await this.db.collection('expenses')
                .orderBy('date', 'desc')
                .limit(1000) // Limit to 1000 records for performance
                .get();
            
            this.expenses = [];
            
            expensesSnapshot.forEach(doc => {
                const expenseData = doc.data();
                const expense = {
                    id: doc.id,
                    ...expenseData,
                    // Add formatted dates
                    date: expenseData.date?.toDate(),
                    createdAt: expenseData.createdAt?.toDate(),
                    lastUpdated: expenseData.lastUpdated?.toDate()
                };
                
                this.expenses.push(expense);
            });
            
            console.log(`✅ Loaded ${this.expenses.length} expense records`);
            
        } catch (error) {
            console.error("Error loading expenses data:", error);
            throw error;
        }
    }
    
    async loadUsersData() {
        try {
            const usersSnapshot = await this.db.collection('users').get();
            this.users = [];
            
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                this.users.push({
                    id: doc.id,
                    userId: userData.userId || doc.id,
                    name: userData.name || 'Unknown User',
                    email: userData.email || ''
                });
            });
            
            // Populate user filter dropdown
            const userFilter = document.getElementById('userFilter');
            const addUserSelect = document.getElementById('expenseUser');
            const editUserSelect = document.getElementById('editExpenseUser');
            
            // Clear existing options except the first one
            while (userFilter.options.length > 1) userFilter.remove(1);
            while (addUserSelect.options.length > 1) addUserSelect.remove(1);
            while (editUserSelect.options.length > 1) editUserSelect.remove(1);
            
            // Add user options
            this.users.forEach(user => {
                const option = new Option(user.name, user.userId);
                const addOption = new Option(user.name, user.userId);
                const editOption = new Option(user.name, user.userId);
                
                userFilter.add(option);
                addUserSelect.add(addOption.cloneNode(true));
                editUserSelect.add(editOption.cloneNode(true));
            });
            
        } catch (error) {
            console.error("Error loading users data:", error);
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
            
            console.log(`✅ Loaded ${this.categories.length} categories`);
            
        } catch (error) {
            console.error("Error loading categories data:", error);
        }
    }
    
    buildSubCategoriesMap() {
        this.subCategories.clear();
        
        // Group expenses by category to extract sub-categories
        this.expenses.forEach(expense => {
            if (expense.categoryId && expense.subCategory) {
                if (!this.subCategories.has(expense.categoryId)) {
                    this.subCategories.set(expense.categoryId, new Set());
                }
                this.subCategories.get(expense.categoryId).add(expense.subCategory);
            }
        });
        
        // Also check categories collection for sub-categories
        this.categories.forEach(category => {
            if (category.parentId) {
                if (!this.subCategories.has(category.parentId)) {
                    this.subCategories.set(category.parentId, new Set());
                }
                this.subCategories.get(category.parentId).add(category.name || category.ar_name);
            }
        });
    }
    
    async updateStatistics() {
        const totalExpenses = this.expenses.length;
        let totalAmount = 0;
        let todayAmount = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Calculate category totals
        const categoryTotals = {};
        let topCategory = { name: '-', amount: 0 };
        
        this.expenses.forEach(expense => {
            const amount = expense.amount || 0;
            totalAmount += amount;
            
            // Check if expense is from today
            const expenseDate = expense.date;
            if (expenseDate && expenseDate >= today) {
                todayAmount += amount;
            }
            
            // Calculate category totals
            const categoryName = expense.category || 'Uncategorized';
            categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + amount;
            
            if (categoryTotals[categoryName] > topCategory.amount) {
                topCategory = { name: categoryName, amount: categoryTotals[categoryName] };
            }
        });
        
        const avgAmount = totalExpenses > 0 ? totalAmount / totalExpenses : 0;
        const categoryPercentage = totalAmount > 0 ? Math.round((topCategory.amount / totalAmount) * 100) : 0;
        
        // Calculate change (this month vs last month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        
        const thisMonthExpenses = this.expenses.filter(expense => {
            const expenseDate = expense.date;
            return expenseDate && expenseDate >= startOfMonth;
        });
        
        const lastMonthExpenses = this.expenses.filter(expense => {
            const expenseDate = expense.date;
            return expenseDate && expenseDate >= startOfLastMonth && expenseDate < startOfMonth;
        });
        
        const thisMonthTotal = thisMonthExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const lastMonthTotal = lastMonthExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        
        const change = lastMonthTotal > 0 ? 
            Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100) : 
            thisMonthTotal > 0 ? 100 : 0;
        
        // Update UI
        document.getElementById('totalExpensesAmount').textContent = '$' + totalAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        document.getElementById('avgExpenseAmount').textContent = '$' + avgAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        document.getElementById('totalTransactions').textContent = totalExpenses.toLocaleString();
        document.getElementById('expensesCount').textContent = totalExpenses;
        document.getElementById('todayTransactions').textContent = thisMonthExpenses.length;
        
        document.getElementById('topCategory').textContent = topCategory.name;
        document.getElementById('categoryPercentage').textContent = categoryPercentage + '%';
        
        document.getElementById('expensesChange').textContent = Math.abs(change) + '%';
        const changeElement = document.getElementById('expensesChange').parentElement;
        changeElement.className = change >= 0 ? 'stat-change negative' : 'stat-change positive';
        
    }
    
    updateCategoryFilter() {
        const categoryFilter = document.getElementById('categoryFilter');
        const addCategorySelect = document.getElementById('expenseCategory');
        const editCategorySelect = document.getElementById('editExpenseCategory');
        
        // Clear existing options except the first one
        while (categoryFilter.options.length > 1) categoryFilter.remove(1);
        while (addCategorySelect.options.length > 1) addCategorySelect.remove(1);
        while (editCategorySelect.options.length > 1) editCategorySelect.remove(1);
        
        // Get unique categories from expenses
        const uniqueCategories = new Set();
        this.expenses.forEach(expense => {
            if (expense.category) {
                uniqueCategories.add(expense.category);
            }
        });
        
        // Also add categories from categories collection
        this.categories.forEach(category => {
            if (category.name || category.ar_name) {
                uniqueCategories.add(category.name || category.ar_name);
            }
        });
        
        // Sort categories alphabetically
        const sortedCategories = Array.from(uniqueCategories).sort();
        
        // Add category options
        sortedCategories.forEach(category => {
            const option = new Option(category, category);
            const addOption = new Option(category, category);
            const editOption = new Option(category, category);
            
            categoryFilter.add(option);
            addCategorySelect.add(addOption.cloneNode(true));
            editCategorySelect.add(editOption.cloneNode(true));
        });
    }
    
    updateSubCategoryFilter() {
        const subCategoryFilter = document.getElementById('subCategoryFilter');
        
        // Clear existing options except the first one
        while (subCategoryFilter.options.length > 1) subCategoryFilter.remove(1);
        
        if (this.selectedCategory === 'all') {
            // If "All Categories" is selected, show all unique sub-categories
            const allSubCategories = new Set();
            
            this.expenses.forEach(expense => {
                if (expense.subCategory) {
                    allSubCategories.add(expense.subCategory);
                }
            });
            
            // Sort and add options
            Array.from(allSubCategories).sort().forEach(subCat => {
                subCategoryFilter.add(new Option(subCat, subCat));
            });
        } else {
            // Show sub-categories for the selected category
            const subCats = this.getSubCategoriesForCategory(this.selectedCategory);
            subCats.sort().forEach(subCat => {
                subCategoryFilter.add(new Option(subCat, subCat));
            });
        }
    }
    
    getSubCategoriesForCategory(categoryName) {
        const subCategories = new Set();
        
        // Find expenses with this category
        this.expenses.forEach(expense => {
            if (expense.category === categoryName && expense.subCategory) {
                subCategories.add(expense.subCategory);
            }
        });
        
        // Also check if we have this category in our categories map
        const category = this.categories.find(cat => 
            cat.name === categoryName || cat.ar_name === categoryName
        );
        
        if (category && category.cat_id && this.subCategories.has(category.cat_id)) {
            this.subCategories.get(category.cat_id).forEach(subCat => {
                subCategories.add(subCat);
            });
        }
        
        return Array.from(subCategories);
    }
    
    updateSubCategories(categoryName, formType) {
        const selectId = formType === 'add' ? 'expenseSubCategory' : 'editExpenseSubCategory';
        const selectElement = document.getElementById(selectId);
        
        // Clear existing options except the first one
        while (selectElement.options.length > 1) selectElement.remove(1);
        
        if (!categoryName) {
            selectElement.disabled = true;
            return;
        }
        
        selectElement.disabled = false;
        const subCategories = this.getSubCategoriesForCategory(categoryName);
        
        if (subCategories.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No sub-categories available';
            option.disabled = true;
            selectElement.add(option);
        } else {
            subCategories.sort().forEach(subCat => {
                selectElement.add(new Option(subCat, subCat));
            });
        }
    }
    
    updateCategoryIdField(categoryName, formType) {
        const fieldId = formType === 'add' ? 'expenseCategoryId' : 'editExpenseCategoryId';
        const fieldElement = document.getElementById(fieldId);
        
        if (!categoryName) {
            fieldElement.value = '';
            return;
        }
        
        // Find the category in our categories array
        const category = this.categories.find(cat => 
            cat.name === categoryName || cat.ar_name === categoryName
        );
        
        if (category && category.cat_id) {
            fieldElement.value = category.cat_id;
        } else {
            // Generate a category ID from the name
            const categoryId = categoryName.toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');
            fieldElement.value = categoryId;
        }
    }
    
    initCharts() {
        this.initExpensesTrendChart();
        this.initCategoryChart();
        this.initComparisonChart();
    }
    
    initExpensesTrendChart() {
        const ctx = document.getElementById('expensesTrendChart').getContext('2d');
        
        this.expensesTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Daily Expenses',
                    data: [],
                    borderColor: '#fa709a',
                    backgroundColor: 'rgba(250, 112, 154, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#fa709a',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `Expenses: $${context.parsed.y.toLocaleString(undefined, {
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
        
        this.updateExpensesTrendChart(30);
    }
    
    updateExpensesTrendChart(days) {
        if (!this.expensesTrendChart) return;
        
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        // Filter expenses for the selected period
        const periodExpenses = this.expenses.filter(expense => {
            const expenseDate = expense.date;
            return expenseDate && expenseDate >= startDate && expenseDate <= endDate;
        });
        
        // Group by day
        const dailyTotals = {};
        const labels = [];
        const data = [];
        
        // Initialize all days in the period
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            labels.push(label);
            dailyTotals[dateKey] = 0;
        }
        
        // Calculate daily totals
        periodExpenses.forEach(expense => {
            const expenseDate = expense.date;
            if (expenseDate) {
                const dateKey = expenseDate.toISOString().split('T')[0];
                if (dailyTotals[dateKey] !== undefined) {
                    dailyTotals[dateKey] += expense.amount || 0;
                }
            }
        });
        
        // Prepare data array in correct order
        Object.keys(dailyTotals).forEach(dateKey => {
            data.push(dailyTotals[dateKey]);
        });
        
        // Update chart
        this.expensesTrendChart.data.labels = labels;
        this.expensesTrendChart.data.datasets[0].data = data;
        this.expensesTrendChart.update();
    }
    
    initCategoryChart() {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        
        this.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ],
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
                            padding: 15,
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
        
        this.updateCategoryChart('30');
    }
    
    updateCategoryChart(period) {
        if (!this.categoryChart) return;
        
        let filteredExpenses = [...this.expenses];
        
        // Filter by period
        if (period !== 'all') {
            const days = parseInt(period);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            filteredExpenses = filteredExpenses.filter(expense => {
                const expenseDate = expense.date;
                return expenseDate && expenseDate >= startDate;
            });
        }
        
        // Calculate category totals
        const categoryTotals = {};
        
        filteredExpenses.forEach(expense => {
            const amount = expense.amount || 0;
            const category = expense.category || 'Uncategorized';
            categoryTotals[category] = (categoryTotals[category] || 0) + amount;
        });
        
        // Sort by amount (descending) and take top 8
        const sortedCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
        
        const labels = sortedCategories.map(item => item[0]);
        const data = sortedCategories.map(item => item[1]);
        
        // Update chart
        this.categoryChart.data.labels = labels;
        this.categoryChart.data.datasets[0].data = data;
        this.categoryChart.update();
    }
    
    initComparisonChart() {
        const ctx = document.getElementById('comparisonChart').getContext('2d');
        
        this.comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Income',
                        data: [],
                        backgroundColor: '#4facfe',
                        borderColor: '#4facfe',
                        borderWidth: 1
                    },
                    {
                        label: 'Expenses',
                        data: [],
                        backgroundColor: '#fa709a',
                        borderColor: '#fa709a',
                        borderWidth: 1
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
        
        this.updateComparisonChart(30);
    }
    
    async updateComparisonChart(days) {
        if (!this.comparisonChart) return;
        
        try {
            // Load incomes for comparison
            const incomesSnapshot = await this.db.collection('incomes')
                .where('date', '>=', new Date(Date.now() - days * 24 * 60 * 60 * 1000))
                .get();
            
            const incomes = [];
            incomesSnapshot.forEach(doc => {
                const incomeData = doc.data();
                incomes.push({
                    ...incomeData,
                    date: incomeData.date?.toDate()
                });
            });
            
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            // Group by week
            const weeklyIncomes = {};
            const weeklyExpenses = {};
            const labels = [];
            
            // Initialize weeks
            for (let i = Math.floor(days / 7) - 1; i >= 0; i--) {
                const weekStart = new Date();
                weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                
                const weekLabel = `Week ${Math.floor(days / 7) - i}`;
                labels.push(weekLabel);
                weeklyIncomes[weekLabel] = 0;
                weeklyExpenses[weekLabel] = 0;
            }
            
            // Calculate weekly incomes
            incomes.forEach(income => {
                const incomeDate = income.date;
                if (incomeDate) {
                    const weekNumber = this.getWeekNumber(incomeDate, startDate, days);
                    const weekLabel = `Week ${weekNumber}`;
                    if (weeklyIncomes[weekLabel] !== undefined) {
                        weeklyIncomes[weekLabel] += income.amount || 0;
                    }
                }
            });
            
            // Calculate weekly expenses
            this.expenses.forEach(expense => {
                const expenseDate = expense.date;
                if (expenseDate && expenseDate >= startDate) {
                    const weekNumber = this.getWeekNumber(expenseDate, startDate, days);
                    const weekLabel = `Week ${weekNumber}`;
                    if (weeklyExpenses[weekLabel] !== undefined) {
                        weeklyExpenses[weekLabel] += expense.amount || 0;
                    }
                }
            });
            
            // Prepare data
            const incomeData = labels.map(label => weeklyIncomes[label] || 0);
            const expenseData = labels.map(label => weeklyExpenses[label] || 0);
            
            // Update chart
            this.comparisonChart.data.labels = labels;
            this.comparisonChart.data.datasets[0].data = incomeData;
            this.comparisonChart.data.datasets[1].data = expenseData;
            this.comparisonChart.update();
            
        } catch (error) {
            console.error("Error updating comparison chart:", error);
        }
    }
    
    getWeekNumber(date, startDate, totalDays) {
        const diffTime = Math.abs(date - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(totalDays / 7);
        return Math.min(weeks - Math.floor(diffDays / 7), weeks);
    }
    
    filterAndSortExpenses() {
        // Start with all expenses
        this.filteredExpenses = [...this.expenses];
        
        // Apply search filter
        if (this.searchTerm.trim()) {
            this.filteredExpenses = this.filteredExpenses.filter(expense => {
                const description = expense.description || '';
                const category = expense.category || '';
                const subCategory = expense.subCategory || '';
                const userName = this.getUserName(expense.userId) || '';
                
                return description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                       category.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                       subCategory.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                       userName.toLowerCase().includes(this.searchTerm.toLowerCase());
            });
        }
        
        // Apply category filter
        if (this.selectedCategory !== 'all') {
            this.filteredExpenses = this.filteredExpenses.filter(expense => 
                expense.category === this.selectedCategory
            );
        }
        
        // Apply sub-category filter
        if (this.selectedSubCategory !== 'all') {
            this.filteredExpenses = this.filteredExpenses.filter(expense => 
                expense.subCategory === this.selectedSubCategory
            );
        }
        
        // Apply user filter
        if (this.selectedUser !== 'all') {
            this.filteredExpenses = this.filteredExpenses.filter(expense => 
                expense.userId === this.selectedUser
            );
        }
        
        // Apply date filters
        if (this.dateFrom) {
            this.filteredExpenses = this.filteredExpenses.filter(expense => {
                const expenseDate = expense.date;
                return expenseDate && expenseDate >= this.dateFrom;
            });
        }
        
        if (this.dateTo) {
            const endDate = new Date(this.dateTo);
            endDate.setHours(23, 59, 59, 999);
            
            this.filteredExpenses = this.filteredExpenses.filter(expense => {
                const expenseDate = expense.date;
                return expenseDate && expenseDate <= endDate;
            });
        }
        
        // Apply sorting
        this.sortExpenses();
        
        // Reset to first page
        this.currentPage = 1;
        
        // Update UI
        this.updatePagination();
        this.renderExpensesTable();
    }
    
    sortExpenses() {
        switch (this.currentSort) {
            case 'date_desc':
                this.filteredExpenses.sort((a, b) => {
                    const dateA = a.date || new Date(0);
                    const dateB = b.date || new Date(0);
                    return dateB - dateA;
                });
                break;
                
            case 'date_asc':
                this.filteredExpenses.sort((a, b) => {
                    const dateA = a.date || new Date(0);
                    const dateB = b.date || new Date(0);
                    return dateA - dateB;
                });
                break;
                
            case 'amount_desc':
                this.filteredExpenses.sort((a, b) => 
                    (b.amount || 0) - (a.amount || 0)
                );
                break;
                
            case 'amount_asc':
                this.filteredExpenses.sort((a, b) => 
                    (a.amount || 0) - (b.amount || 0)
                );
                break;
        }
    }
    
    getUserName(userId) {
        if (!userId) return 'Unknown User';
        
        const user = this.users.find(u => u.userId === userId);
        return user ? user.name : 'Unknown User';
    }
    
    updatePagination() {
        this.totalPages = Math.ceil(this.filteredExpenses.length / this.itemsPerPage);
        this.currentPage = Math.max(1, Math.min(this.currentPage, this.totalPages));
        
        // Update UI
        document.getElementById('currentPage').textContent = this.currentPage;
        document.getElementById('totalPages').textContent = this.totalPages;
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, this.filteredExpenses.length);
        
        document.getElementById('showingCount').textContent = (end - start);
        document.getElementById('totalCount').textContent = this.filteredExpenses.length;
        
        // Calculate total amount for current page
        const pageExpenses = this.filteredExpenses.slice(start, end);
        const pageTotal = pageExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        
        document.getElementById('tableTotalAmount').textContent = 
            `Total: $${pageTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
        
        // Update button states
        document.getElementById('prevPageBtn').disabled = this.currentPage === 1;
        document.getElementById('nextPageBtn').disabled = this.currentPage === this.totalPages;
    }
    
    renderExpensesTable() {
        const tableBody = document.getElementById('expensesTableBody');
        
        if (this.filteredExpenses.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <i class="fas fa-shopping-cart"></i>
                        <h4>No expense records found</h4>
                        <p>${this.searchTerm ? 'Try a different search term' : 'No expense records available'}</p>
                        <button class="btn btn-primary" id="addFirstExpenseBtn">
                            <i class="fas fa-plus-circle"></i>
                            Add First Expense
                        </button>
                    </td>
                </tr>
            `;
            
            // Add event listener to the button
            setTimeout(() => {
                const addFirstExpenseBtn = document.getElementById('addFirstExpenseBtn');
                if (addFirstExpenseBtn) {
                    addFirstExpenseBtn.addEventListener('click', () => {
                        this.showAddExpenseModal();
                    });
                }
            }, 100);
            
            return;
        }
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, this.filteredExpenses.length);
        const currentExpenses = this.filteredExpenses.slice(start, end);
        
        tableBody.innerHTML = currentExpenses.map((expense, index) => {
            const date = expense.date;
            const dateStr = date ? 
                date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                }) : 'N/A';
            
            const createdAt = expense.createdAt;
            const createdStr = createdAt ? 
                createdAt.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'N/A';
            
            const userName = this.getUserName(expense.userId);
            const categoryName = expense.category || 'Uncategorized';
            const subCategoryName = expense.subCategory || '';
            
            // Get user initials for avatar
            const initials = userName
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            
            // Check for high expense warning
            const isHighExpense = (expense.amount || 0) > 1000;
            const amountClass = isHighExpense ? 'amount-cell negative warning-high' : 'amount-cell negative';
            
            return `
                <tr data-expense-id="${expense.id}">
                    <td>
                        <strong>${dateStr}</strong>
                    </td>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar-small">${initials}</div>
                            <span>${userName}</span>
                        </div>
                    </td>
                    <td class="${amountClass}">
                        $${(expense.amount || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}
                    </td>
                    <td>
                        <div class="category-with-sub">
                            <span class="category-badge">${categoryName}</span>
                            ${subCategoryName ? `<span class="subcategory-badge">${subCategoryName}</span>` : ''}
                        </div>
                    </td>
                    <td>${subCategoryName || '-'}</td>
                    <td>${expense.description || 'No description'}</td>
                    <td>
                        <i class="fas fa-star favorite-star ${expense.isFavorite ? 'active' : ''}" 
                           onclick="expensesManager.toggleFavorite('${expense.id}', ${expense.isFavorite || false})">
                        </i>
                    </td>
                    <td>${createdStr}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" 
                                    title="View Details"
                                    onclick="expensesManager.viewExpenseDetails('${expense.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit-btn" 
                                    title="Edit Expense"
                                    onclick="expensesManager.editExpense('${expense.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" 
                                    title="Delete Expense"
                                    onclick="expensesManager.deleteExpense('${expense.id}')">
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
            this.renderExpensesTable();
        }
    }
    
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePagination();
            this.renderExpensesTable();
        }
    }
    
    showAddExpenseModal() {
        document.getElementById('addExpenseModal').classList.add('active');
        document.getElementById('addExpenseForm').reset();
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expenseDate').value = today;
        
        // Reset category fields
        document.getElementById('expenseCategoryId').value = '';
        document.getElementById('expenseSubCategory').disabled = true;
        document.getElementById('expenseSubCategory').innerHTML = '<option value="">Select Sub-Category</option>';
    }
    
    hideAddExpenseModal() {
        document.getElementById('addExpenseModal').classList.remove('active');
    }
    
    showEditExpenseModal() {
        document.getElementById('editExpenseModal').classList.add('active');
    }
    
    hideEditExpenseModal() {
        document.getElementById('editExpenseModal').classList.remove('active');
    }
    
    showExpenseDetailsModal() {
        document.getElementById('expenseDetailsModal').classList.add('active');
    }
    
    hideExpenseDetailsModal() {
        document.getElementById('expenseDetailsModal').classList.remove('active');
    }
    
    async addNewExpense() {
        try {
            const amount = parseFloat(document.getElementById('expenseAmount').value);
            const date = document.getElementById('expenseDate').value;
            const userId = document.getElementById('expenseUser').value;
            const category = document.getElementById('expenseCategory').value;
            const subCategory = document.getElementById('expenseSubCategory').value;
            const categoryId = document.getElementById('expenseCategoryId').value;
            const description = document.getElementById('expenseDescription').value;
            const isFavorite = document.getElementById('expenseFavorite').checked;
            
            // Validate inputs
            if (!amount || amount <= 0) {
                this.showMessage('Please enter a valid amount', 'error');
                return;
            }
            
            if (!date) {
                this.showMessage('Please select a date', 'error');
                return;
            }
            
            if (!userId) {
                this.showMessage('Please select a user', 'error');
                return;
            }
            
            if (!category) {
                this.showMessage('Please select a category', 'error');
                return;
            }
            
            if (!categoryId) {
                this.showMessage('Category ID is required', 'error');
                return;
            }
            
            // Get user name
            const user = this.users.find(u => u.userId === userId);
            const userName = user ? user.name : 'Unknown User';
            
            // Create expense object
            const expenseData = {
                amount: amount,
                date: new Date(date),
                userId: userId,
                userName: userName,
                category: category,
                subCategory: subCategory || '',
                categoryId: categoryId,
                subCategoryId: subCategory ? subCategory.toLowerCase().replace(/[^a-z0-9]+/g, '_') : '',
                description: description || '',
                isFavorite: isFavorite,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Add to Firestore
            const docRef = await this.db.collection('expenses').add(expenseData);
            
            // Show success message
            this.showMessage(`Expense of $${amount.toLocaleString()} added successfully!`, 'success');
            
            // Close modal
            this.hideAddExpenseModal();
            
            // Add the new expense to local array (for immediate UI update)
            const newExpense = {
                id: docRef.id,
                ...expenseData
            };
            
            this.expenses.unshift(newExpense);
            
            // Update sub-categories map
            if (category && subCategory) {
                if (!this.subCategories.has(categoryId)) {
                    this.subCategories.set(categoryId, new Set());
                }
                this.subCategories.get(categoryId).add(subCategory);
            }
            
            // Update statistics and UI
            await this.updateStatistics();
            this.filterAndSortExpenses();
            
            // Highlight new row
            this.highlightNewExpense(docRef.id);
            
        } catch (error) {
            console.error("Error adding expense:", error);
            this.showMessage('Error adding expense: ' + error.message, 'error');
        }
    }
    
    highlightNewExpense(expenseId) {
        const row = document.querySelector(`tr[data-expense-id="${expenseId}"]`);
        if (row) {
            row.classList.add('new-income');
            setTimeout(() => {
                row.classList.remove('new-income');
            }, 2000);
        }
    }
    
    async editExpense(expenseId) {
        try {
            const expense = this.expenses.find(exp => exp.id === expenseId);
            if (!expense) {
                this.showMessage('Expense record not found', 'error');
                return;
            }
            
            // Populate edit form
            document.getElementById('editExpenseId').value = expense.id;
            document.getElementById('editExpenseAmount').value = expense.amount || 0;
            
            // Format date for input field
            const date = expense.date;
            const dateStr = date ? date.toISOString().split('T')[0] : '';
            document.getElementById('editExpenseDate').value = dateStr;
            
            document.getElementById('editExpenseUser').value = expense.userId || '';
            document.getElementById('editExpenseCategory').value = expense.category || '';
            document.getElementById('editExpenseDescription').value = expense.description || '';
            document.getElementById('editExpenseFavorite').checked = expense.isFavorite || false;
            
            // Update category ID and sub-categories
            this.updateCategoryIdField(expense.category, 'edit');
            this.updateSubCategories(expense.category, 'edit');
            
            // Set sub-category if exists
            if (expense.subCategory) {
                setTimeout(() => {
                    document.getElementById('editExpenseSubCategory').value = expense.subCategory;
                }, 100);
            }
            
            // Show modal
            this.showEditExpenseModal();
            
        } catch (error) {
            console.error("Error preparing expense edit:", error);
            this.showMessage('Error loading expense data: ' + error.message, 'error');
        }
    }
    
    async updateExpense() {
        try {
            const expenseId = document.getElementById('editExpenseId').value;
            const amount = parseFloat(document.getElementById('editExpenseAmount').value);
            const date = document.getElementById('editExpenseDate').value;
            const userId = document.getElementById('editExpenseUser').value;
            const category = document.getElementById('editExpenseCategory').value;
            const subCategory = document.getElementById('editExpenseSubCategory').value;
            const categoryId = document.getElementById('editExpenseCategoryId').value;
            const description = document.getElementById('editExpenseDescription').value;
            const isFavorite = document.getElementById('editExpenseFavorite').checked;
            
            // Validate inputs
            if (!amount || amount <= 0) {
                this.showMessage('Please enter a valid amount', 'error');
                return;
            }
            
            if (!date) {
                this.showMessage('Please select a date', 'error');
                return;
            }
            
            if (!userId) {
                this.showMessage('Please select a user', 'error');
                return;
            }
            
            if (!category) {
                this.showMessage('Please select a category', 'error');
                return;
            }
            
            if (!categoryId) {
                this.showMessage('Category ID is required', 'error');
                return;
            }
            
            // Get user name
            const user = this.users.find(u => u.userId === userId);
            const userName = user ? user.name : 'Unknown User';
            
            // Update expense in Firestore
            await this.db.collection('expenses').doc(expenseId).update({
                amount: amount,
                date: new Date(date),
                userId: userId,
                userName: userName,
                category: category,
                subCategory: subCategory || '',
                categoryId: categoryId,
                subCategoryId: subCategory ? subCategory.toLowerCase().replace(/[^a-z0-9]+/g, '_') : '',
                description: description || '',
                isFavorite: isFavorite,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Show success message
            this.showMessage(`Expense updated successfully!`, 'success');
            
            // Close modal
            this.hideEditExpenseModal();
            
            // Update local data
            const expenseIndex = this.expenses.findIndex(exp => exp.id === expenseId);
            if (expenseIndex !== -1) {
                this.expenses[expenseIndex] = {
                    ...this.expenses[expenseIndex],
                    amount: amount,
                    date: new Date(date),
                    userId: userId,
                    userName: userName,
                    category: category,
                    subCategory: subCategory,
                    categoryId: categoryId,
                    description: description,
                    isFavorite: isFavorite,
                    lastUpdated: new Date()
                };
            }
            
            // Update sub-categories map
            if (category && subCategory) {
                if (!this.subCategories.has(categoryId)) {
                    this.subCategories.set(categoryId, new Set());
                }
                this.subCategories.get(categoryId).add(subCategory);
            }
            
            // Update statistics and UI
            await this.updateStatistics();
            this.filterAndSortExpenses();
            
        } catch (error) {
            console.error("Error updating expense:", error);
            this.showMessage('Error updating expense: ' + error.message, 'error');
        }
    }
    
    async viewExpenseDetails(expenseId) {
        try {
            const expense = this.expenses.find(exp => exp.id === expenseId);
            if (!expense) {
                this.showMessage('Expense record not found', 'error');
                return;
            }
            
            const userName = this.getUserName(expense.userId);
            const categoryName = expense.category || 'Uncategorized';
            const subCategoryName = expense.subCategory || 'None';
            const dateStr = expense.date ? 
                expense.date.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : 'Unknown date';
            
            const createdStr = expense.createdAt ? 
                expense.createdAt.toLocaleDateString('en-US', { 
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }) : 'Unknown';
            
            const updatedStr = expense.lastUpdated ? 
                expense.lastUpdated.toLocaleDateString('en-US', { 
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }) : 'Never';
            
            const modalContent = `
                <div class="income-details-view">
                    <div class="detail-row">
                        <span class="detail-label">Amount</span>
                        <span class="detail-value amount negative">
                            $${(expense.amount || 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Date</span>
                        <span class="detail-value">${dateStr}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">User</span>
                        <span class="detail-value">${userName}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Category</span>
                        <span class="detail-value">
                            <div class="category-with-sub">
                                <span class="category-badge">${categoryName}</span>
                                ${subCategoryName !== 'None' ? `<span class="subcategory-badge">${subCategoryName}</span>` : ''}
                            </div>
                        </span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Category ID</span>
                        <span class="detail-value" style="font-family: monospace; font-size: 0.85rem;">
                            ${expense.categoryId || 'N/A'}
                        </span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Sub-Category ID</span>
                        <span class="detail-value" style="font-family: monospace; font-size: 0.85rem;">
                            ${expense.subCategoryId || 'N/A'}
                        </span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Description</span>
                        <span class="detail-value">${expense.description || 'No description'}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Favorite</span>
                        <span class="detail-value">
                            <i class="fas fa-star ${expense.isFavorite ? 'active' : ''}"></i>
                            ${expense.isFavorite ? 'Yes' : 'No'}
                        </span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Created</span>
                        <span class="detail-value">${createdStr}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Last Updated</span>
                        <span class="detail-value">${updatedStr}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Record ID</span>
                        <span class="detail-value" style="font-family: monospace; font-size: 0.85rem;">
                            ${expense.id}
                        </span>
                    </div>
                    
                    <!-- Quick Stats -->
                    <div class="quick-stats">
                        <div class="quick-stat">
                            <div class="quick-stat-label">Daily Avg</div>
                            <div class="quick-stat-value negative">
                                $${this.calculateDailyAverage(userName).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </div>
                        </div>
                        
                        <div class="quick-stat">
                            <div class="quick-stat-label">Monthly Total</div>
                            <div class="quick-stat-value negative">
                                $${this.calculateMonthlyTotal(userName).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </div>
                        </div>
                        
                        <div class="quick-stat">
                            <div class="quick-stat-label">Category Rank</div>
                            <div class="quick-stat-value">
                                #${this.getCategoryRank(categoryName)}
                            </div>
                        </div>
                    </div>
                    
                    <div class="quick-actions-bar">
                        <button class="quick-action-btn" onclick="expensesManager.editExpense('${expense.id}')">
                            <i class="fas fa-edit"></i>
                            <span>Edit</span>
                        </button>
                        <button class="quick-action-btn" onclick="expensesManager.duplicateExpense('${expense.id}')">
                            <i class="fas fa-copy"></i>
                            <span>Duplicate</span>
                        </button>
                        <button class="quick-action-btn" onclick="expensesManager.toggleFavorite('${expense.id}', ${expense.isFavorite || false})">
                            <i class="fas fa-star"></i>
                            <span>${expense.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}</span>
                        </button>
                    </div>
                </div>
            `;
            
            // Update modal
            document.getElementById('expenseDetailsContent').innerHTML = modalContent;
            
            // Show modal
            this.showExpenseDetailsModal();
            
        } catch (error) {
            console.error("Error viewing expense details:", error);
            this.showMessage('Error loading expense details: ' + error.message, 'error');
        }
    }
    
    calculateDailyAverage(userName) {
        const userExpenses = this.expenses.filter(exp => 
            this.getUserName(exp.userId) === userName
        );
        
        if (userExpenses.length === 0) return 0;
        
        const totalAmount = userExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        return totalAmount / userExpenses.length;
    }
    
    calculateMonthlyTotal(userName) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const userExpenses = this.expenses.filter(exp => 
            this.getUserName(exp.userId) === userName &&
            exp.date && exp.date >= startOfMonth
        );
        
        return userExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    }
    
    getCategoryRank(categoryName) {
        const categoryTotals = {};
        
        this.expenses.forEach(expense => {
            const category = expense.category || 'Uncategorized';
            const amount = expense.amount || 0;
            categoryTotals[category] = (categoryTotals[category] || 0) + amount;
        });
        
        const sortedCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .map(item => item[0]);
        
        return sortedCategories.indexOf(categoryName) + 1;
    }
    
    async toggleFavorite(expenseId, currentFavorite) {
        try {
            const newFavorite = !currentFavorite;
            
            // Update in Firestore
            await this.db.collection('expenses').doc(expenseId).update({
                isFavorite: newFavorite,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update local data
            const expenseIndex = this.expenses.findIndex(exp => exp.id === expenseId);
            if (expenseIndex !== -1) {
                this.expenses[expenseIndex].isFavorite = newFavorite;
            }
            
            // Update UI
            this.filterAndSortExpenses();
            
            // Show message
            this.showMessage(`Expense ${newFavorite ? 'added to' : 'removed from'} favorites`, 'success');
            
            // Close details modal if open
            this.hideExpenseDetailsModal();
            
        } catch (error) {
            console.error("Error toggling favorite:", error);
            this.showMessage('Error updating favorite status: ' + error.message, 'error');
        }
    }
    
    async duplicateExpense(expenseId) {
        try {
            const expense = this.expenses.find(exp => exp.id === expenseId);
            if (!expense) {
                this.showMessage('Expense record not found', 'error');
                return;
            }
            
            // Create a duplicate with current date
            const duplicateData = {
                amount: expense.amount || 0,
                date: new Date(),
                userId: expense.userId,
                userName: expense.userName || 'Unknown User',
                category: expense.category || 'Uncategorized',
                subCategory: expense.subCategory || '',
                categoryId: expense.categoryId || '',
                subCategoryId: expense.subCategoryId || '',
                description: expense.description || '',
                isFavorite: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Add to Firestore
            const docRef = await this.db.collection('expenses').add(duplicateData);
            
            // Show success message
            this.showMessage(`Expense duplicated successfully!`, 'success');
            
            // Add to local array
            const newExpense = {
                id: docRef.id,
                ...duplicateData
            };
            
            this.expenses.unshift(newExpense);
            
            // Update sub-categories map
            if (duplicateData.category && duplicateData.subCategory) {
                if (!this.subCategories.has(duplicateData.categoryId)) {
                    this.subCategories.set(duplicateData.categoryId, new Set());
                }
                this.subCategories.get(duplicateData.categoryId).add(duplicateData.subCategory);
            }
            
            // Update statistics and UI
            await this.updateStatistics();
            this.filterAndSortExpenses();
            
            // Highlight new row
            this.highlightNewExpense(docRef.id);
            
        } catch (error) {
            console.error("Error duplicating expense:", error);
            this.showMessage('Error duplicating expense: ' + error.message, 'error');
        }
    }
    
    async deleteExpense(expenseId) {
        try {
            const expense = this.expenses.find(exp => exp.id === expenseId);
            if (!expense) {
                this.showMessage('Expense record not found', 'error');
                return;
            }
            
            const confirmMessage = `Are you sure you want to delete this expense record?\n\nAmount: $${(expense.amount || 0).toLocaleString()}\nDate: ${expense.date ? expense.date.toLocaleDateString() : 'Unknown'}\nUser: ${this.getUserName(expense.userId)}`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Delete from Firestore
            await this.db.collection('expenses').doc(expenseId).delete();
            
            // Remove from local array
            this.expenses = this.expenses.filter(exp => exp.id !== expenseId);
            
            // Show success message
            this.showMessage(`Expense record deleted successfully!`, 'success');
            
            // Update statistics and UI
            await this.updateStatistics();
            this.filterAndSortExpenses();
            
            // Close details modal if open
            this.hideExpenseDetailsModal();
            
        } catch (error) {
            console.error("Error deleting expense:", error);
            this.showMessage('Error deleting expense: ' + error.message, 'error');
        }
    }
    
    exportExpensesData() {
        try {
            // Prepare data for export
            const exportData = this.filteredExpenses.map(expense => ({
                'Date': expense.date ? expense.date.toISOString().split('T')[0] : 'N/A',
                'User': this.getUserName(expense.userId),
                'Amount': expense.amount || 0,
                'Category': expense.category || 'Uncategorized',
                'Sub-Category': expense.subCategory || '',
                'Category ID': expense.categoryId || '',
                'Sub-Category ID': expense.subCategoryId || '',
                'Description': expense.description || '',
                'Favorite': expense.isFavorite ? 'Yes' : 'No',
                'Created Date': expense.createdAt ? expense.createdAt.toISOString().split('T')[0] : 'N/A',
                'Last Updated': expense.lastUpdated ? expense.lastUpdated.toISOString().split('T')[0] : 'N/A'
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
            a.download = `expenses_export_${new Date().toISOString().split('T')[0]}.csv`;
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
        const tableBody = document.getElementById('expensesTableBody');
        if (show) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="loading-row">
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading expense data...</p>
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

// Initialize expenses manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.expensesManager = new ExpensesManager();
});