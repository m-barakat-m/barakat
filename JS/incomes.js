// Incomes Management System - ENHANCED VERSION
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
        this.realTimeUnsubscribe = null;
        this.lastDocument = null;
        this.hasMoreData = true;
        this.sessionTimer = null;
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
            
            // Setup session timeout
            this.setupSessionTimeout();
            
            // Load initial data with real-time updates
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
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchTerm = e.target.value;
                this.filterAndSortIncomes();
            }, 300); // Debounce 300ms
        });
        
        document.getElementById('clearSearchBtn').addEventListener('click', () => {
            searchInput.value = '';
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
            this.reloadAllData();
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
            this.lastDocument = null;
            this.hasMoreData = true;
            this.loadIncomesData(true); // Reload with new page size
        });
        
        // Load more button (infinite scroll alternative)
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'loadMoreBtn';
        loadMoreBtn.className = 'btn btn-secondary';
        loadMoreBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Load More';
        loadMoreBtn.style.display = 'none';
        document.querySelector('.pagination').appendChild(loadMoreBtn);
        loadMoreBtn.addEventListener('click', () => {
            this.loadMoreData();
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
        
        // Auto-save form data
        this.setupAutoSave();
        
        // Setup real-time toggle button
        const realTimeBtn = document.createElement('button');
        realTimeBtn.id = 'realTimeToggleBtn';
        realTimeBtn.className = 'btn btn-secondary';
        realTimeBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Real-time: ON';
        realTimeBtn.title = 'Toggle real-time updates';
        document.querySelector('.filter-controls').appendChild(realTimeBtn);
        realTimeBtn.addEventListener('click', () => {
            this.toggleRealTimeUpdates();
        });
    }
    
    setupSessionTimeout() {
        // Reset timer on user activity
        const events = ['mousemove', 'keypress', 'click', 'scroll'];
        const resetTimer = () => {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = setTimeout(() => {
                this.showSessionTimeoutWarning();
            }, 25 * 60 * 1000); // 25 minutes
        };
        
        events.forEach(event => {
            document.addEventListener(event, resetTimer);
        });
        
        resetTimer(); // Start timer
    }
    
    showSessionTimeoutWarning() {
        if (confirm('Your session will expire in 5 minutes due to inactivity. Click OK to stay logged in.')) {
            // Reset session
            authSystem.resetSession();
            this.setupSessionTimeout();
        } else {
            authSystem.logout();
        }
    }
    
    setupAutoSave() {
        const form = document.getElementById('addIncomeForm');
        const fields = form.querySelectorAll('input, select, textarea');
        const storageKey = 'income_form_draft';
        
        // Load saved data
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                Object.keys(data).forEach(key => {
                    const field = form.querySelector(`[name="${key}"]`);
                    if (field) {
                        field.value = data[key];
                    }
                });
                
                if (Object.keys(data).length > 0) {
                    this.showMessage('Loaded auto-saved form data', 'info');
                }
            } catch (e) {
                console.error('Error loading auto-saved data:', e);
            }
        }
        
        // Auto-save on input
        fields.forEach(field => {
            field.addEventListener('input', () => {
                const formData = {};
                fields.forEach(f => {
                    if (f.name) {
                        formData[f.name] = f.value;
                    }
                });
                localStorage.setItem(storageKey, JSON.stringify(formData));
            });
        });
        
        // Clear on successful submission
        form.addEventListener('submit', () => {
            localStorage.removeItem(storageKey);
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
            
            // Load static data first
            await Promise.all([
                this.loadUsersData(),
                this.loadCategoriesData()
            ]);
            
            // Load incomes with real-time updates
            await this.loadIncomesData(true);
            
            // Initialize charts
            this.initCharts();
            
            // Start real-time updates
            this.startRealTimeUpdates();
            
            // Hide loading state
            this.showLoading(false);
            
        } catch (error) {
            console.error("❌ Error loading initial data:", error);
            this.showError("Error loading data: " + error.message);
            this.showLoading(false);
        }
    }
    
    async reloadAllData() {
        try {
            this.showLoading(true);
            this.showMessage('Refreshing data...', 'info');
            
            // Stop real-time updates temporarily
            this.stopRealTimeUpdates();
            
            // Clear cache
            this.incomes = [];
            this.lastDocument = null;
            this.hasMoreData = true;
            
            // Reload all data
            await Promise.all([
                this.loadUsersData(true),
                this.loadCategoriesData(true),
                this.loadIncomesData(true, true)
            ]);
            
            // Restart real-time updates
            this.startRealTimeUpdates();
            
            this.showMessage('Data refreshed successfully!', 'success');
            
        } catch (error) {
            console.error("Error reloading data:", error);
            this.showMessage('Error refreshing data: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadIncomesData(initialLoad = true, forceRefresh = false) {
        try {
            // Clear existing data if force refresh
            if (forceRefresh) {
                this.incomes = [];
                this.filteredIncomes = [];
                this.lastDocument = null;
                this.hasMoreData = true;
            }
            
            let query = this.db.collection('incomes')
                .orderBy('date', 'desc');
            
            // For pagination, start after last document
            if (this.lastDocument && !initialLoad) {
                query = query.startAfter(this.lastDocument);
            }
            
            query = query.limit(this.itemsPerPage * 2); // Load extra for filtering
            
            const incomesSnapshot = await query.get();
            
            if (incomesSnapshot.empty) {
                this.hasMoreData = false;
                if (initialLoad) {
                    this.renderIncomesTable();
                }
                return;
            }
            
            // Store last document for pagination
            this.lastDocument = incomesSnapshot.docs[incomesSnapshot.docs.length - 1];
            
            // Check if we have more data
            this.hasMoreData = incomesSnapshot.docs.length >= (this.itemsPerPage * 2);
            
            // Process new incomes
            incomesSnapshot.forEach(doc => {
                const incomeData = doc.data();
                const income = {
                    id: doc.id,
                    ...incomeData,
                    date: incomeData.date?.toDate(),
                    createdAt: incomeData.created_at?.toDate() || incomeData.createdAt?.toDate(),
                    updatedAt: incomeData.updated_at?.toDate()
                };
                
                // Check if income already exists (for updates)
                const existingIndex = this.incomes.findIndex(inc => inc.id === doc.id);
                if (existingIndex >= 0) {
                    this.incomes[existingIndex] = income;
                } else {
                    this.incomes.push(income);
                }
            });
            
            console.log(`✅ Loaded ${this.incomes.length} income records`);
            
            // Update statistics
            await this.updateStatistics();
            
            // Filter and sort
            this.filterAndSortIncomes();
            
            // Show/hide load more button
            document.getElementById('loadMoreBtn').style.display = 
                this.hasMoreData && !this.searchTerm && this.selectedCategory === 'all' && 
                this.selectedUser === 'all' && !this.dateFrom && !this.dateTo ? 'block' : 'none';
            
        } catch (error) {
            console.error("Error loading incomes data:", error);
            throw error;
        }
    }
    
    async loadMoreData() {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        
        try {
            await this.loadIncomesData(false);
        } catch (error) {
            console.error("Error loading more data:", error);
            this.showMessage('Error loading more data: ' + error.message, 'error');
        } finally {
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Load More';
        }
    }
    
    startRealTimeUpdates() {
        // Stop existing listener
        if (this.realTimeUnsubscribe) {
            this.realTimeUnsubscribe();
        }
        
        // Start new real-time listener
        this.realTimeUnsubscribe = this.db.collection('incomes')
            .orderBy('date', 'desc')
            .limit(50) // Limit real-time updates
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    const incomeData = change.doc.data();
                    const income = {
                        id: change.doc.id,
                        ...incomeData,
                        date: incomeData.date?.toDate(),
                        createdAt: incomeData.created_at?.toDate() || incomeData.createdAt?.toDate(),
                        updatedAt: incomeData.updated_at?.toDate()
                    };
                    
                    if (change.type === 'added') {
                        this.handleNewIncome(income);
                    } else if (change.type === 'modified') {
                        this.handleUpdatedIncome(income);
                    } else if (change.type === 'removed') {
                        this.handleDeletedIncome(change.doc.id);
                    }
                });
                
                // Update real-time button status
                this.updateRealTimeButton(true);
            }, (error) => {
                console.error("Real-time listener error:", error);
                this.updateRealTimeButton(false);
                this.showMessage('Real-time updates disconnected', 'warning');
            });
        
        console.log("✅ Real-time updates enabled");
    }
    
    stopRealTimeUpdates() {
        if (this.realTimeUnsubscribe) {
            this.realTimeUnsubscribe();
            this.realTimeUnsubscribe = null;
            console.log("❌ Real-time updates disabled");
        }
        this.updateRealTimeButton(false);
    }
    
    toggleRealTimeUpdates() {
        const btn = document.getElementById('realTimeToggleBtn');
        const isEnabled = this.realTimeUnsubscribe !== null;
        
        if (isEnabled) {
            this.stopRealTimeUpdates();
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Real-time: OFF';
            this.showMessage('Real-time updates disabled', 'warning');
        } else {
            this.startRealTimeUpdates();
            btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Real-time: ON';
            this.showMessage('Real-time updates enabled', 'success');
        }
    }
    
    updateRealTimeButton(enabled) {
        const btn = document.getElementById('realTimeToggleBtn');
        if (btn) {
            if (enabled) {
                btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Real-time: ON';
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-success');
            } else {
                btn.innerHTML = '<i class="fas fa-sync-alt"></i> Real-time: OFF';
                btn.classList.remove('btn-success');
                btn.classList.add('btn-secondary');
            }
        }
    }
    
    handleNewIncome(income) {
        // Check if income already exists
        const exists = this.incomes.some(inc => inc.id === income.id);
        if (!exists) {
            // Add to beginning of array
            this.incomes.unshift(income);
            
            // Update UI
            this.filterAndSortIncomes();
            this.updateStatistics();
            
            // Show notification for high-value incomes
            if (income.amount >= 1000) {
                this.showRealTimeNotification(`New high-value income: $${income.amount.toLocaleString()}`);
            }
        }
    }
    
    handleUpdatedIncome(income) {
        const index = this.incomes.findIndex(inc => inc.id === income.id);
        if (index >= 0) {
            this.incomes[index] = income;
            this.filterAndSortIncomes();
            this.updateStatistics();
        }
    }
    
    handleDeletedIncome(incomeId) {
        this.incomes = this.incomes.filter(inc => inc.id !== incomeId);
        this.filteredIncomes = this.filteredIncomes.filter(inc => inc.id !== incomeId);
        this.renderIncomesTable();
        this.updateStatistics();
    }
    
    showRealTimeNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'real-time-notification';
        notification.innerHTML = `
            <i class="fas fa-bell"></i>
            <span>${message}</span>
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
    
    async loadUsersData(forceRefresh = false) {
        try {
            // Try cache first
            if (!forceRefresh) {
                const cached = this.getCachedData('users');
                if (cached) {
                    this.users = cached;
                    this.populateUserDropdowns();
                    return;
                }
            }
            
            const usersSnapshot = await this.db.collection('users')
                .orderBy('name')
                .get();
            
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
            
            // Cache users
            this.cacheData('users', this.users, 5); // 5 minutes cache
            
            // Populate dropdowns
            this.populateUserDropdowns();
            
        } catch (error) {
            console.error("Error loading users data:", error);
        }
    }
    
    async loadCategoriesData(forceRefresh = false) {
        try {
            // Try cache first
            if (!forceRefresh) {
                const cached = this.getCachedData('categories');
                if (cached) {
                    this.categories = cached;
                    this.populateCategoryDropdowns();
                    return;
                }
            }
            
            const categoriesSnapshot = await this.db.collection('income_categories')
                .orderBy('name')
                .get();
            
            this.categories = [];
            
            categoriesSnapshot.forEach(doc => {
                const categoryData = doc.data();
                this.categories.push({
                    id: doc.id,
                    ...categoryData
                });
            });
            
            // Cache categories
            this.cacheData('categories', this.categories, 10); // 10 minutes cache
            
            // Populate dropdowns
            this.populateCategoryDropdowns();
            
        } catch (error) {
            console.error("Error loading categories data:", error);
        }
    }
    
    populateUserDropdowns() {
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
    }
    
    populateCategoryDropdowns() {
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
    }
    
    cacheData(key, data, minutes = 5) {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                expires: Date.now() + (minutes * 60 * 1000)
            };
            localStorage.setItem(`income_cache_${key}`, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Error caching data:', error);
        }
    }
    
    getCachedData(key) {
        try {
            const cached = localStorage.getItem(`income_cache_${key}`);
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            
            // Check if cache is expired
            if (Date.now() > cacheData.expires) {
                localStorage.removeItem(`income_cache_${key}`);
                return null;
            }
            
            return cacheData.data;
        } catch (error) {
            console.error('Error getting cached data:', error);
            return null;
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
        document.getElementById('totalIncomeAmount').textContent = this.formatCurrency(totalAmount);
        document.getElementById('avgIncomeAmount').textContent = this.formatCurrency(avgAmount);
        document.getElementById('totalTransactions').textContent = totalIncomes.toLocaleString();
        document.getElementById('incomesCount').textContent = totalIncomes;
        document.getElementById('todayTransactions').textContent = thisMonthIncomes.length;
        document.getElementById('topCategory').textContent = topCategory.name;
        document.getElementById('categoryPercentage').textContent = categoryPercentage + '%';
        document.getElementById('incomeGrowth').textContent = growth + '%';
        
        const growthElement = document.getElementById('incomeGrowth').parentElement;
        growthElement.className = growth >= 0 ? 'stat-change positive' : 'stat-change negative';
        
        // Notify dashboard system about update
        if (window.dashboardSystem) {
            window.dashboardSystem.incomeUpdated();
        }
    }
    
    formatCurrency(amount) {
        return '$' + amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    // ... [بقية الدوال تبقى كما هي مع تعديلات طفيفة] ...
    // initCharts, updateIncomeTrendChart, initCategoryChart, updateCategoryChart
    // filterAndSortIncomes, sortIncomes, getUserName, getCategoryName
    // updatePagination, renderIncomesTable, prevPage, nextPage
    // showAddIncomeModal, hideAddIncomeModal, showEditIncomeModal, hideEditIncomeModal
    // showIncomeDetailsModal, hideIncomeDetailsModal, addNewIncome, highlightNewIncome
    // editIncome, updateIncome, viewIncomeDetails, toggleFavorite, duplicateIncome
    // deleteIncome, exportIncomesData, showLoading, showMessage, getMessageIcon, showError
    
    // إضافة دالة لتحديث البيانات في الداشبورد
    incomeUpdated() {
        // يمكن إضافة منطق إضافي هنا إذا لزم
        console.log('Income data updated - notifying dashboard');
    }
    
    // Cleanup on page unload
    cleanup() {
        this.stopRealTimeUpdates();
        clearTimeout(this.sessionTimer);
        if (this.incomeTrendChart) {
            this.incomeTrendChart.destroy();
        }
        if (this.categoryChart) {
            this.categoryChart.destroy();
        }
    }
}

// Initialize incomes manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.incomesManager = new IncomesManager();
});

// Cleanup before page unload
window.addEventListener('beforeunload', () => {
    if (window.incomesManager) {
        window.incomesManager.cleanup();
    }
});

// Export for use in dashboard
window.IncomesManager = IncomesManager;