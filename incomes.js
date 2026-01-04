// Incomes Management System
class IncomesManager {
    constructor() {
        this.incomes = [];
        this.filteredIncomes = [];
        this.users = [];
        this.categories = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalPages = 1;
        this.selectedCategory = 'all';
        this.selectedUser = 'all';
        this.dateFrom = null;
        this.dateTo = null;
        this.currentSort = 'date_desc';
        this.searchTerm = '';
        this.incomeTrendChart = null;
        this.categoryChart = null;
        this.selectedIncomes = new Set();
        this.init();
    }

    async init() {
        console.log("🚀 Initializing Incomes Manager...");
        
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
        
        // Add income button
        document.getElementById('addIncomeBtn').addEventListener('click', () => {
            this.showAddIncomeModal();
        });
        
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.filterAndSortIncomes();
        });
        
        document.getElementById('clearSearchBtn').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            this.searchTerm = '';
            this.filterAndSortIncomes();
        });
        
        // Filter and sort
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.selectedCategory = e.target.value;
            this.filterAndSortIncomes();
        });
        
        document.getElementById('userFilter').addEventListener('change', (e) => {
            this.selectedUser = e.target.value;
            this.filterAndSortIncomes();
        });
        
        document.getElementById('dateFrom').addEventListener('change', (e) => {
            this.dateFrom = e.target.value ? new Date(e.target.value) : null;
            this.filterAndSortIncomes();
        });
        
        document.getElementById('dateTo').addEventListener('change', (e) => {
            this.dateTo = e.target.value ? new Date(e.target.value) : null;
            this.filterAndSortIncomes();
        });
        
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.filterAndSortIncomes();
        });
        
        // Chart period selectors
        document.getElementById('trendPeriod').addEventListener('change', (e) => {
            this.updateIncomeTrendChart(parseInt(e.target.value));
        });
        
        document.getElementById('categoryPeriod').addEventListener('change', (e) => {
            this.updateCategoryChart(e.target.value);
        });
        
        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportIncomesData();
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
            this.renderIncomesTable();
        });
        
        // Modal close buttons
        document.getElementById('closeAddIncomeModal').addEventListener('click', () => {
            this.hideAddIncomeModal();
        });
        
        document.getElementById('closeEditIncomeModal').addEventListener('click', () => {
            this.hideEditIncomeModal();
        });
        
        document.getElementById('closeIncomeDetailsModal').addEventListener('click', () => {
            this.hideIncomeDetailsModal();
        });
        
        document.getElementById('cancelAddIncomeBtn').addEventListener('click', () => {
            this.hideAddIncomeModal();
        });
        
        document.getElementById('cancelEditIncomeBtn').addEventListener('click', () => {
            this.hideEditIncomeModal();
        });
        
        // Add income form
        document.getElementById('addIncomeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addNewIncome();
        });
        
        // Edit income form
        document.getElementById('editIncomeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateIncome();
        });
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('incomeDate').value = today;
        
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
                this.loadIncomesData(),
                this.loadUsersData(),
                this.loadCategoriesData()
            ]);
            
            // Update statistics
            await this.updateStatistics();
            
            // Initialize charts
            this.initCharts();
            
            // Filter and sort incomes
            this.filterAndSortIncomes();
            
            // Hide loading state
            this.showLoading(false);
            
        } catch (error) {
            console.error("❌ Error loading initial data:", error);
            this.showError("Error loading data: " + error.message);
            this.showLoading(false);
        }
    }
    
    async loadIncomesData() {
        try {
            const incomesSnapshot = await this.db.collection('incomes')
                .orderBy('date', 'desc')
                .limit(1000) // Limit to 1000 records for performance
                .get();
            
            this.incomes = [];
            
            incomesSnapshot.forEach(doc => {
                const incomeData = doc.data();
                const income = {
                    id: doc.id,
                    ...incomeData,
                    // Add formatted dates
                    date: incomeData.date?.toDate(),
                    createdAt: incomeData.created_at?.toDate() || incomeData.createdAt?.toDate(),
                    updatedAt: incomeData.updated_at?.toDate()
                };
                
                this.incomes.push(income);
            });
            
            console.log(`✅ Loaded ${this.incomes.length} income records`);
            
        } catch (error) {
            console.error("Error loading incomes data:", error);
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
            const addUserSelect = document.getElementById('incomeUser');
            const editUserSelect = document.getElementById('editIncomeUser');
            
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
            const categoriesSnapshot = await this.db.collection('income_categories').get();
            this.categories = [];
            
            categoriesSnapshot.forEach(doc => {
                const categoryData = doc.data();
                this.categories.push({
                    id: doc.id,
                    ...categoryData
                });
            });
            
            // Populate category filter dropdown
            const categoryFilter = document.getElementById('categoryFilter');
            const addCategorySelect = document.getElementById('incomeCategory');
            const editCategorySelect = document.getElementById('editIncomeCategory');
            
            // Clear existing options except the first one
            while (categoryFilter.options.length > 1) categoryFilter.remove(1);
            while (addCategorySelect.options.length > 1) addCategorySelect.remove(1);
            while (editCategorySelect.options.length > 1) editCategorySelect.remove(1);
            
            // Add category options
            this.categories.forEach(category => {
                const option = new Option(category.name || category.ar_name, category.cat_id);
                const addOption = new Option(category.name || category.ar_name, category.cat_id);
                const editOption = new Option(category.name || category.ar_name, category.cat_id);
                
                categoryFilter.add(option);
                addCategorySelect.add(addOption.cloneNode(true));
                editCategorySelect.add(editOption.cloneNode(true));
            });
            
        } catch (error) {
            console.error("Error loading categories data:", error);
        }
    }
    
    async updateStatistics() {
        const totalIncomes = this.incomes.length;
        let totalAmount = 0;
        let todayAmount = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Calculate category totals
        const categoryTotals = {};
        let topCategory = { name: '-', amount: 0 };
        
        this.incomes.forEach(income => {
            const amount = income.amount || 0;
            totalAmount += amount;
            
            // Check if income is from today
            const incomeDate = income.date;
            if (incomeDate && incomeDate >= today) {
                todayAmount += amount;
            }
            
            // Calculate category totals
            const categoryId = income.main_cat_income_id;
            if (categoryId) {
                const category = this.categories.find(cat => cat.id === categoryId);
                const categoryName = category ? (category.name || category.ar_name) : 'Unknown';
                categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + amount;
                
                if (categoryTotals[categoryName] > topCategory.amount) {
                    topCategory = { name: categoryName, amount: categoryTotals[categoryName] };
                }
            }
        });
        
        const avgAmount = totalIncomes > 0 ? totalAmount / totalIncomes : 0;
        const categoryPercentage = totalAmount > 0 ? Math.round((topCategory.amount / totalAmount) * 100) : 0;
        
        // Calculate growth (this month vs last month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        
        const thisMonthIncomes = this.incomes.filter(income => {
            const incomeDate = income.date;
            return incomeDate && incomeDate >= startOfMonth;
        });
        
        const lastMonthIncomes = this.incomes.filter(income => {
            const incomeDate = income.date;
            return incomeDate && incomeDate >= startOfLastMonth && incomeDate < startOfMonth;
        });
        
        const thisMonthTotal = thisMonthIncomes.reduce((sum, income) => sum + (income.amount || 0), 0);
        const lastMonthTotal = lastMonthIncomes.reduce((sum, income) => sum + (income.amount || 0), 0);
        
        const growth = lastMonthTotal > 0 ? 
            Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100) : 
            thisMonthTotal > 0 ? 100 : 0;
        
        // Update UI
        document.getElementById('totalIncomeAmount').textContent = '$' + totalAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        document.getElementById('avgIncomeAmount').textContent = '$' + avgAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        document.getElementById('totalTransactions').textContent = totalIncomes.toLocaleString();
        document.getElementById('incomesCount').textContent = totalIncomes;
        document.getElementById('todayTransactions').textContent = thisMonthIncomes.length;
        
        document.getElementById('topCategory').textContent = topCategory.name;
        document.getElementById('categoryPercentage').textContent = categoryPercentage + '%';
        
        document.getElementById('incomeGrowth').textContent = growth + '%';
        const growthElement = document.getElementById('incomeGrowth').parentElement;
        growthElement.className = growth >= 0 ? 'stat-change positive' : 'stat-change negative';
        
    }
    
    initCharts() {
        this.initIncomeTrendChart();
        this.initCategoryChart();
    }
    
    initIncomeTrendChart() {
        const ctx = document.getElementById('incomeTrendChart').getContext('2d');
        
        this.incomeTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Daily Income',
                    data: [],
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79, 172, 254, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4facfe',
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
                                return `Income: $${context.parsed.y.toLocaleString(undefined, {
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
        
        this.updateIncomeTrendChart(30);
    }
    
    updateIncomeTrendChart(days) {
        if (!this.incomeTrendChart) return;
        
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        // Filter incomes for the selected period
        const periodIncomes = this.incomes.filter(income => {
            const incomeDate = income.date;
            return incomeDate && incomeDate >= startDate && incomeDate <= endDate;
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
        periodIncomes.forEach(income => {
            const incomeDate = income.date;
            if (incomeDate) {
                const dateKey = incomeDate.toISOString().split('T')[0];
                if (dailyTotals[dateKey] !== undefined) {
                    dailyTotals[dateKey] += income.amount || 0;
                }
            }
        });
        
        // Prepare data array in correct order
        Object.keys(dailyTotals).forEach(dateKey => {
            data.push(dailyTotals[dateKey]);
        });
        
        // Update chart
        this.incomeTrendChart.data.labels = labels;
        this.incomeTrendChart.data.datasets[0].data = data;
        this.incomeTrendChart.update();
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
        
        let filteredIncomes = [...this.incomes];
        
        // Filter by period
        if (period !== 'all') {
            const days = parseInt(period);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            filteredIncomes = filteredIncomes.filter(income => {
                const incomeDate = income.date;
                return incomeDate && incomeDate >= startDate;
            });
        }
        
        // Calculate category totals
        const categoryTotals = {};
        
        filteredIncomes.forEach(income => {
            const amount = income.amount || 0;
            const categoryId = income.main_cat_income_id;
            
            if (categoryId) {
                const category = this.categories.find(cat => cat.id === categoryId);
                const categoryName = category ? (category.name || category.ar_name) : 'Unknown';
                categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + amount;
            } else {
                categoryTotals['Uncategorized'] = (categoryTotals['Uncategorized'] || 0) + amount;
            }
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
    
    filterAndSortIncomes() {
        // Start with all incomes
        this.filteredIncomes = [...this.incomes];
        
        // Apply search filter
        if (this.searchTerm.trim()) {
            this.filteredIncomes = this.filteredIncomes.filter(income => {
                const description = income.description || '';
                const categoryId = income.main_cat_income_id || '';
                const category = this.categories.find(cat => cat.id === categoryId);
                const categoryName = category ? (category.name || category.ar_name || '') : '';
                const userName = this.getUserName(income.user_id) || '';
                
                return description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                       categoryName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                       userName.toLowerCase().includes(this.searchTerm.toLowerCase());
            });
        }
        
        // Apply category filter
        if (this.selectedCategory !== 'all') {
            this.filteredIncomes = this.filteredIncomes.filter(income => 
                income.main_cat_income_id === this.selectedCategory
            );
        }
        
        // Apply user filter
        if (this.selectedUser !== 'all') {
            this.filteredIncomes = this.filteredIncomes.filter(income => 
                income.user_id === this.selectedUser
            );
        }
        
        // Apply date filters
        if (this.dateFrom) {
            this.filteredIncomes = this.filteredIncomes.filter(income => {
                const incomeDate = income.date;
                return incomeDate && incomeDate >= this.dateFrom;
            });
        }
        
        if (this.dateTo) {
            const endDate = new Date(this.dateTo);
            endDate.setHours(23, 59, 59, 999);
            
            this.filteredIncomes = this.filteredIncomes.filter(income => {
                const incomeDate = income.date;
                return incomeDate && incomeDate <= endDate;
            });
        }
        
        // Apply sorting
        this.sortIncomes();
        
        // Reset to first page
        this.currentPage = 1;
        
        // Update UI
        this.updatePagination();
        this.renderIncomesTable();
    }
    
    sortIncomes() {
        switch (this.currentSort) {
            case 'date_desc':
                this.filteredIncomes.sort((a, b) => {
                    const dateA = a.date || new Date(0);
                    const dateB = b.date || new Date(0);
                    return dateB - dateA;
                });
                break;
                
            case 'date_asc':
                this.filteredIncomes.sort((a, b) => {
                    const dateA = a.date || new Date(0);
                    const dateB = b.date || new Date(0);
                    return dateA - dateB;
                });
                break;
                
            case 'amount_desc':
                this.filteredIncomes.sort((a, b) => 
                    (b.amount || 0) - (a.amount || 0)
                );
                break;
                
            case 'amount_asc':
                this.filteredIncomes.sort((a, b) => 
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
    
    getCategoryName(categoryId) {
        if (!categoryId) return 'Uncategorized';
        
        const category = this.categories.find(cat => cat.id === categoryId);
        return category ? (category.name || category.ar_name) : 'Unknown Category';
    }
    
    updatePagination() {
        this.totalPages = Math.ceil(this.filteredIncomes.length / this.itemsPerPage);
        this.currentPage = Math.max(1, Math.min(this.currentPage, this.totalPages));
        
        // Update UI
        document.getElementById('currentPage').textContent = this.currentPage;
        document.getElementById('totalPages').textContent = this.totalPages;
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, this.filteredIncomes.length);
        
        document.getElementById('showingCount').textContent = (end - start);
        document.getElementById('totalCount').textContent = this.filteredIncomes.length;
        
        // Calculate total amount for current page
        const pageIncomes = this.filteredIncomes.slice(start, end);
        const pageTotal = pageIncomes.reduce((sum, income) => sum + (income.amount || 0), 0);
        
        document.getElementById('tableTotalAmount').textContent = 
            `Total: $${pageTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`;
        
        // Update button states
        document.getElementById('prevPageBtn').disabled = this.currentPage === 1;
        document.getElementById('nextPageBtn').disabled = this.currentPage === this.totalPages;
    }
    
    renderIncomesTable() {
        const tableBody = document.getElementById('incomesTableBody');
        
        if (this.filteredIncomes.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-money-bill-wave"></i>
                        <h4>No income records found</h4>
                        <p>${this.searchTerm ? 'Try a different search term' : 'No income records available'}</p>
                        <button class="btn btn-primary" id="addFirstIncomeBtn">
                            <i class="fas fa-plus-circle"></i>
                            Add First Income
                        </button>
                    </td>
                </tr>
            `;
            
            // Add event listener to the button
            setTimeout(() => {
                const addFirstIncomeBtn = document.getElementById('addFirstIncomeBtn');
                if (addFirstIncomeBtn) {
                    addFirstIncomeBtn.addEventListener('click', () => {
                        this.showAddIncomeModal();
                    });
                }
            }, 100);
            
            return;
        }
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, this.filteredIncomes.length);
        const currentIncomes = this.filteredIncomes.slice(start, end);
        
        tableBody.innerHTML = currentIncomes.map((income, index) => {
            const date = income.date;
            const dateStr = date ? 
                date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                }) : 'N/A';
            
            const createdAt = income.createdAt;
            const createdStr = createdAt ? 
                createdAt.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'N/A';
            
            const userName = this.getUserName(income.user_id);
            const categoryName = this.getCategoryName(income.main_cat_income_id);
            
            // Get user initials for avatar
            const initials = userName
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            
            return `
                <tr data-income-id="${income.id}">
                    <td>
                        <strong>${dateStr}</strong>
                    </td>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar-small">${initials}</div>
                            <span>${userName}</span>
                        </div>
                    </td>
                    <td class="amount-cell positive">
                        $${(income.amount || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}
                    </td>
                    <td>
                        <span class="category-badge">${categoryName}</span>
                    </td>
                    <td>${income.description || 'No description'}</td>
                    <td>
                        <i class="fas fa-star favorite-star ${income.isFavorite ? 'active' : ''}" 
                           onclick="incomesManager.toggleFavorite('${income.id}', ${income.isFavorite || false})">
                        </i>
                    </td>
                    <td>${createdStr}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" 
                                    title="View Details"
                                    onclick="incomesManager.viewIncomeDetails('${income.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit-btn" 
                                    title="Edit Income"
                                    onclick="incomesManager.editIncome('${income.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" 
                                    title="Delete Income"
                                    onclick="incomesManager.deleteIncome('${income.id}')">
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
            this.renderIncomesTable();
        }
    }
    
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePagination();
            this.renderIncomesTable();
        }
    }
    
    showAddIncomeModal() {
        document.getElementById('addIncomeModal').classList.add('active');
        document.getElementById('addIncomeForm').reset();
        
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('incomeDate').value = today;
    }
    
    hideAddIncomeModal() {
        document.getElementById('addIncomeModal').classList.remove('active');
    }
    
    showEditIncomeModal() {
        document.getElementById('editIncomeModal').classList.add('active');
    }
    
    hideEditIncomeModal() {
        document.getElementById('editIncomeModal').classList.remove('active');
    }
    
    showIncomeDetailsModal() {
        document.getElementById('incomeDetailsModal').classList.add('active');
    }
    
    hideIncomeDetailsModal() {
        document.getElementById('incomeDetailsModal').classList.remove('active');
    }
    
    async addNewIncome() {
        try {
            const amount = parseFloat(document.getElementById('incomeAmount').value);
            const date = document.getElementById('incomeDate').value;
            const userId = document.getElementById('incomeUser').value;
            const categoryId = document.getElementById('incomeCategory').value;
            const description = document.getElementById('incomeDescription').value;
            const isFavorite = document.getElementById('incomeFavorite').checked;
            
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
            
            if (!categoryId) {
                this.showMessage('Please select a category', 'error');
                return;
            }
            
            // Get user name
            const user = this.users.find(u => u.userId === userId);
            const userName = user ? user.name : 'Unknown User';
            
            // Create income object
            const incomeData = {
                amount: amount,
                date: new Date(date),
                user_id: userId,
                userName: userName,
                main_cat_income_id: categoryId,
                description: description || '',
                isFavorite: isFavorite,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Add to Firestore
            const docRef = await this.db.collection('incomes').add(incomeData);
            
            // Show success message
            this.showMessage(`Income of $${amount.toLocaleString()} added successfully!`, 'success');
            
            // Close modal
            this.hideAddIncomeModal();
            
            // Add the new income to local array (for immediate UI update)
            const newIncome = {
                id: docRef.id,
                ...incomeData
            };
            
            this.incomes.unshift(newIncome);
            
            // Update statistics and UI
            await this.updateStatistics();
            this.filterAndSortIncomes();
            
            // Highlight new row
            this.highlightNewIncome(docRef.id);
            
        } catch (error) {
            console.error("Error adding income:", error);
            this.showMessage('Error adding income: ' + error.message, 'error');
        }
    }
    
    highlightNewIncome(incomeId) {
        const row = document.querySelector(`tr[data-income-id="${incomeId}"]`);
        if (row) {
            row.classList.add('new-income');
            setTimeout(() => {
                row.classList.remove('new-income');
            }, 2000);
        }
    }
    
    async editIncome(incomeId) {
        try {
            const income = this.incomes.find(inc => inc.id === incomeId);
            if (!income) {
                this.showMessage('Income record not found', 'error');
                return;
            }
            
            // Populate edit form
            document.getElementById('editIncomeId').value = income.id;
            document.getElementById('editIncomeAmount').value = income.amount || 0;
            
            // Format date for input field
            const date = income.date;
            const dateStr = date ? date.toISOString().split('T')[0] : '';
            document.getElementById('editIncomeDate').value = dateStr;
            
            document.getElementById('editIncomeUser').value = income.user_id || '';
            document.getElementById('editIncomeCategory').value = income.main_cat_income_id || '';
            document.getElementById('editIncomeDescription').value = income.description || '';
            document.getElementById('editIncomeFavorite').checked = income.isFavorite || false;
            
            // Show modal
            this.showEditIncomeModal();
            
        } catch (error) {
            console.error("Error preparing income edit:", error);
            this.showMessage('Error loading income data: ' + error.message, 'error');
        }
    }
    
    async updateIncome() {
        try {
            const incomeId = document.getElementById('editIncomeId').value;
            const amount = parseFloat(document.getElementById('editIncomeAmount').value);
            const date = document.getElementById('editIncomeDate').value;
            const userId = document.getElementById('editIncomeUser').value;
            const categoryId = document.getElementById('editIncomeCategory').value;
            const description = document.getElementById('editIncomeDescription').value;
            const isFavorite = document.getElementById('editIncomeFavorite').checked;
            
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
            
            if (!categoryId) {
                this.showMessage('Please select a category', 'error');
                return;
            }
            
            // Get user name
            const user = this.users.find(u => u.userId === userId);
            const userName = user ? user.name : 'Unknown User';
            
            // Update income in Firestore
            await this.db.collection('incomes').doc(incomeId).update({
                amount: amount,
                date: new Date(date),
                user_id: userId,
                userName: userName,
                main_cat_income_id: categoryId,
                description: description || '',
                isFavorite: isFavorite,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Show success message
            this.showMessage(`Income updated successfully!`, 'success');
            
            // Close modal
            this.hideEditIncomeModal();
            
            // Update local data
            const incomeIndex = this.incomes.findIndex(inc => inc.id === incomeId);
            if (incomeIndex !== -1) {
                this.incomes[incomeIndex] = {
                    ...this.incomes[incomeIndex],
                    amount: amount,
                    date: new Date(date),
                    user_id: userId,
                    userName: userName,
                    main_cat_income_id: categoryId,
                    description: description,
                    isFavorite: isFavorite,
                    updatedAt: new Date()
                };
            }
            
            // Update statistics and UI
            await this.updateStatistics();
            this.filterAndSortIncomes();
            
        } catch (error) {
            console.error("Error updating income:", error);
            this.showMessage('Error updating income: ' + error.message, 'error');
        }
    }
    
    async viewIncomeDetails(incomeId) {
        try {
            const income = this.incomes.find(inc => inc.id === incomeId);
            if (!income) {
                this.showMessage('Income record not found', 'error');
                return;
            }
            
            const userName = this.getUserName(income.user_id);
            const categoryName = this.getCategoryName(income.main_cat_income_id);
            const dateStr = income.date ? 
                income.date.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : 'Unknown date';
            
            const createdStr = income.createdAt ? 
                income.createdAt.toLocaleDateString('en-US', { 
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }) : 'Unknown';
            
            const updatedStr = income.updatedAt ? 
                income.updatedAt.toLocaleDateString('en-US', { 
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
                        <span class="detail-value amount">
                            $${(income.amount || 0).toLocaleString(undefined, {
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
                        <span class="detail-value">${categoryName}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Description</span>
                        <span class="detail-value">${income.description || 'No description'}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Favorite</span>
                        <span class="detail-value">
                            <i class="fas fa-star ${income.isFavorite ? 'active' : ''}"></i>
                            ${income.isFavorite ? 'Yes' : 'No'}
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
                            ${income.id}
                        </span>
                    </div>
                    
                    <div class="quick-actions-bar">
                        <button class="quick-action-btn" onclick="incomesManager.editIncome('${income.id}')">
                            <i class="fas fa-edit"></i>
                            <span>Edit</span>
                        </button>
                        <button class="quick-action-btn" onclick="incomesManager.duplicateIncome('${income.id}')">
                            <i class="fas fa-copy"></i>
                            <span>Duplicate</span>
                        </button>
                        <button class="quick-action-btn" onclick="incomesManager.toggleFavorite('${income.id}', ${income.isFavorite || false})">
                            <i class="fas fa-star"></i>
                            <span>${income.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}</span>
                        </button>
                    </div>
                </div>
            `;
            
            // Update modal
            document.getElementById('incomeDetailsContent').innerHTML = modalContent;
            
            // Show modal
            this.showIncomeDetailsModal();
            
        } catch (error) {
            console.error("Error viewing income details:", error);
            this.showMessage('Error loading income details: ' + error.message, 'error');
        }
    }
    
    async toggleFavorite(incomeId, currentFavorite) {
        try {
            const newFavorite = !currentFavorite;
            
            // Update in Firestore
            await this.db.collection('incomes').doc(incomeId).update({
                isFavorite: newFavorite,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update local data
            const incomeIndex = this.incomes.findIndex(inc => inc.id === incomeId);
            if (incomeIndex !== -1) {
                this.incomes[incomeIndex].isFavorite = newFavorite;
            }
            
            // Update UI
            this.filterAndSortIncomes();
            
            // Show message
            this.showMessage(`Income ${newFavorite ? 'added to' : 'removed from'} favorites`, 'success');
            
            // Close details modal if open
            this.hideIncomeDetailsModal();
            
        } catch (error) {
            console.error("Error toggling favorite:", error);
            this.showMessage('Error updating favorite status: ' + error.message, 'error');
        }
    }
    
    async duplicateIncome(incomeId) {
        try {
            const income = this.incomes.find(inc => inc.id === incomeId);
            if (!income) {
                this.showMessage('Income record not found', 'error');
                return;
            }
            
            // Create a duplicate with current date
            const duplicateData = {
                amount: income.amount || 0,
                date: new Date(),
                user_id: income.user_id,
                userName: income.userName || 'Unknown User',
                main_cat_income_id: income.main_cat_income_id,
                description: income.description || '',
                isFavorite: false,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Add to Firestore
            const docRef = await this.db.collection('incomes').add(duplicateData);
            
            // Show success message
            this.showMessage(`Income duplicated successfully!`, 'success');
            
            // Add to local array
            const newIncome = {
                id: docRef.id,
                ...duplicateData
            };
            
            this.incomes.unshift(newIncome);
            
            // Update statistics and UI
            await this.updateStatistics();
            this.filterAndSortIncomes();
            
            // Highlight new row
            this.highlightNewIncome(docRef.id);
            
        } catch (error) {
            console.error("Error duplicating income:", error);
            this.showMessage('Error duplicating income: ' + error.message, 'error');
        }
    }
    
    async deleteIncome(incomeId) {
        try {
            const income = this.incomes.find(inc => inc.id === incomeId);
            if (!income) {
                this.showMessage('Income record not found', 'error');
                return;
            }
            
            const confirmMessage = `Are you sure you want to delete this income record?\n\nAmount: $${(income.amount || 0).toLocaleString()}\nDate: ${income.date ? income.date.toLocaleDateString() : 'Unknown'}\nUser: ${this.getUserName(income.user_id)}`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Delete from Firestore
            await this.db.collection('incomes').doc(incomeId).delete();
            
            // Remove from local array
            this.incomes = this.incomes.filter(inc => inc.id !== incomeId);
            
            // Show success message
            this.showMessage(`Income record deleted successfully!`, 'success');
            
            // Update statistics and UI
            await this.updateStatistics();
            this.filterAndSortIncomes();
            
            // Close details modal if open
            this.hideIncomeDetailsModal();
            
        } catch (error) {
            console.error("Error deleting income:", error);
            this.showMessage('Error deleting income: ' + error.message, 'error');
        }
    }
    
    exportIncomesData() {
        try {
            // Prepare data for export
            const exportData = this.filteredIncomes.map(income => ({
                'Date': income.date ? income.date.toISOString().split('T')[0] : 'N/A',
                'User': this.getUserName(income.user_id),
                'Amount': income.amount || 0,
                'Category': this.getCategoryName(income.main_cat_income_id),
                'Description': income.description || '',
                'Favorite': income.isFavorite ? 'Yes' : 'No',
                'Created Date': income.createdAt ? income.createdAt.toISOString().split('T')[0] : 'N/A',
                'Last Updated': income.updatedAt ? income.updatedAt.toISOString().split('T')[0] : 'N/A'
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
            a.download = `incomes_export_${new Date().toISOString().split('T')[0]}.csv`;
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
        const tableBody = document.getElementById('incomesTableBody');
        if (show) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-row">
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading income data...</p>
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

// Initialize incomes manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.incomesManager = new IncomesManager();
});