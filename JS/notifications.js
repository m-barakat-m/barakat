// notifications.js - النسخة الكاملة المحدثة
class NotificationsManager {
    constructor() {
        this.notifications = [];
        this.filteredNotifications = [];
        this.settings = {};
        this.preferences = {};
        this.currentFilter = 'all';
        this.currentSort = 'newest';
        this.init();
    }

    async init() {
        console.log("🚀 Initializing Notifications Manager...");
        
        // Load settings and preferences first
        await this.loadSettings();
        await this.loadPreferences();
        
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
            
            // Setup real-time listener for new notifications
            this.setupRealtimeListener();
            
            // Setup automatic notifications
            this.setupAutomaticNotifications();
            
        } catch (error) {
            console.error("❌ System initialization error:", error);
            this.showError("System error: " + error.message);
        }
    }
    
    async loadSettings() {
        try {
            const settings = localStorage.getItem('notificationSettings');
            this.settings = settings ? JSON.parse(settings) : this.getDefaultSettings();
        } catch (error) {
            this.settings = this.getDefaultSettings();
        }
    }
    
    async loadPreferences() {
        try {
            const preferences = localStorage.getItem('notificationPreferences');
            this.preferences = preferences ? JSON.parse(preferences) : this.getDefaultPreferences();
        } catch (error) {
            this.preferences = this.getDefaultPreferences();
        }
    }
    
    getDefaultSettings() {
        return {
            budgetThreshold: 80,
            transactionThreshold: 1000,
            quietStart: '22:00',
            quietEnd: '08:00',
            email: '',
            emailDailySummary: false,
            emailWeeklyReport: false,
            emailUrgentAlerts: true,
            notificationSound: true,
            desktopNotifications: false,
            pushNotifications: false
        };
    }
    
    getDefaultPreferences() {
        return {
            prefBudgetAlerts: true,
            prefGoalUpdates: true,
            prefLargeTransactions: true,
            prefMonthlyReports: true,
            prefSystemUpdates: true,
            prefEmailNotifications: false
        };
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
        
        // Filter tags
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                this.filterNotifications(e.target.dataset.filter);
            });
        });
        
        // Sort selector
        document.getElementById('sortNotifications').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.sortNotifications();
            this.updateNotificationsList();
        });
        
        // Action buttons
        document.getElementById('markAllReadBtn').addEventListener('click', () => {
            this.markAllAsRead();
        });
        
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllNotifications();
        });
        
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettingsModal();
        });
        
        // Modal close buttons
        document.getElementById('closeSettingsModal').addEventListener('click', () => {
            this.hideSettingsModal();
        });
        
        document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
            this.hideSettingsModal();
        });
        
        // Settings form
        document.getElementById('settingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
        
        // Preference toggles
        const preferenceIds = [
            'prefBudgetAlerts',
            'prefGoalUpdates',
            'prefLargeTransactions',
            'prefMonthlyReports',
            'prefSystemUpdates',
            'prefEmailNotifications'
        ];
        
        preferenceIds.forEach(id => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.checked = this.preferences[id] || false;
                toggle.addEventListener('change', (e) => {
                    this.savePreference(id, e.target.checked);
                });
            }
        });
        
        // Enable/disable notifications based on quiet hours
        this.setupQuietHoursCheck();
    }
    
    setupQuietHoursCheck() {
        // Check quiet hours every minute
        setInterval(() => {
            this.checkQuietHours();
        }, 60000);
        
        // Initial check
        this.checkQuietHours();
    }
    
    checkQuietHours() {
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                           now.getMinutes().toString().padStart(2, '0');
        
        const quietStart = this.settings.quietStart || '22:00';
        const quietEnd = this.settings.quietEnd || '08:00';
        
        const isQuietHours = this.isTimeBetween(currentTime, quietStart, quietEnd);
        
        // Update UI indicator
        const indicator = document.getElementById('quietHoursIndicator');
        if (!indicator) {
            const newIndicator = document.createElement('div');
            newIndicator.id = 'quietHoursIndicator';
            newIndicator.className = `quiet-hours-indicator ${isQuietHours ? 'active' : ''}`;
            newIndicator.innerHTML = `
                <i class="fas fa-volume-mute"></i>
                <span>Quiet Hours ${isQuietHours ? 'Active' : 'Inactive'}</span>
            `;
            document.querySelector('.nav-controls').prepend(newIndicator);
        } else {
            indicator.className = `quiet-hours-indicator ${isQuietHours ? 'active' : ''}`;
            indicator.querySelector('span').textContent = 
                `Quiet Hours ${isQuietHours ? 'Active' : 'Inactive'}`;
        }
    }
    
    isTimeBetween(time, start, end) {
        const current = this.timeToMinutes(time);
        const startMinutes = this.timeToMinutes(start);
        const endMinutes = this.timeToMinutes(end);
        
        if (startMinutes <= endMinutes) {
            return current >= startMinutes && current < endMinutes;
        } else {
            return current >= startMinutes || current < endMinutes;
        }
    }
    
    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
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
            
            // Load notifications data
            await this.loadNotificationsData();
            
            // Check for new notifications from other systems
            await this.checkForSystemNotifications();
            
            // Update statistics
            this.updateStatistics();
            
            // Filter and sort notifications
            this.filterNotifications('all');
            
            // Hide loading state
            this.showLoading(false);
            
        } catch (error) {
            console.error("❌ Error loading initial data:", error);
            this.showError("Error loading data: " + error.message);
            this.showLoading(false);
        }
    }
    
    async loadNotificationsData() {
        try {
            const user = this.auth.currentUser;
            if (!user) return;
            
            const notificationsSnapshot = await this.db.collection('notifications')
                .where('userId', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .limit(200)
                .get();
            
            this.notifications = [];
            
            notificationsSnapshot.forEach(doc => {
                const notificationData = doc.data();
                const notification = {
                    id: doc.id,
                    ...notificationData,
                    createdAt: notificationData.createdAt?.toDate(),
                    readAt: notificationData.readAt?.toDate(),
                    expiresAt: notificationData.expiresAt?.toDate()
                };
                
                // Check if notification is expired
                if (notification.expiresAt && new Date() > notification.expiresAt) {
                    this.deleteExpiredNotification(doc.id);
                    return;
                }
                
                this.notifications.push(notification);
            });
            
            console.log(`✅ Loaded ${this.notifications.length} notifications`);
            
        } catch (error) {
            console.error("Error loading notifications data:", error);
            throw error;
        }
    }
    
    async deleteExpiredNotification(notificationId) {
        try {
            await this.db.collection('notifications').doc(notificationId).delete();
        } catch (error) {
            console.error("Error deleting expired notification:", error);
        }
    }
    
    async checkForSystemNotifications() {
        try {
            // Check for budget notifications
            if (this.preferences.prefBudgetAlerts) {
                await this.checkBudgetNotifications();
            }
            
            // Check for goal notifications
            if (this.preferences.prefGoalUpdates) {
                await this.checkGoalNotifications();
            }
            
            // Check for transaction notifications
            if (this.preferences.prefLargeTransactions) {
                await this.checkTransactionNotifications();
            }
            
            // Check for monthly report notifications
            if (this.preferences.prefMonthlyReports) {
                await this.checkMonthlyReportNotification();
            }
            
        } catch (error) {
            console.error("Error checking system notifications:", error);
        }
    }
    
    async checkBudgetNotifications() {
        try {
            const user = this.auth.currentUser;
            if (!user) return;
            
            // Get user's budgets
            const budgetsSnapshot = await this.db.collection('budgets')
                .where('userId', '==', user.uid)
                .get();
            
            if (budgetsSnapshot.empty) return;
            
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            // Get expenses for current month
            const expensesSnapshot = await this.db.collection('expenses')
                .where('userId', '==', user.uid)
                .where('date', '>=', startOfMonth)
                .get();
            
            // Calculate spending per category
            const categorySpending = {};
            expensesSnapshot.forEach(doc => {
                const expense = doc.data();
                const category = expense.categoryId;
                const amount = Number(expense.amount) || 0;
                
                if (category) {
                    categorySpending[category] = (categorySpending[category] || 0) + amount;
                }
            });
            
            // Check each budget
            budgetsSnapshot.forEach(async doc => {
                const budget = doc.data();
                const spending = categorySpending[budget.categoryId] || 0;
                const usagePercentage = budget.amount > 0 ? 
                    (spending / budget.amount) * 100 : 0;
                
                // Check if we need to create a notification
                const threshold = this.settings.budgetThreshold || 80;
                
                if (usagePercentage >= threshold && usagePercentage < 100) {
                    // Check if notification already exists
                    const existingNotification = await this.db.collection('notifications')
                        .where('userId', '==', user.uid)
                        .where('type', '==', 'budget')
                        .where('budgetId', '==', doc.id)
                        .where('subtype', '==', 'threshold')
                        .where('createdAt', '>=', startOfMonth)
                        .limit(1)
                        .get();
                    
                    if (existingNotification.empty) {
                        // Create budget threshold notification
                        await this.createBudgetNotification(
                            user.uid,
                            doc.id,
                            budget.categoryName || 'Unknown Category',
                            usagePercentage,
                            spending,
                            budget.amount,
                            'threshold'
                        );
                    }
                }
                
                if (usagePercentage >= 100) {
                    // Check if notification already exists
                    const existingNotification = await this.db.collection('notifications')
                        .where('userId', '==', user.uid)
                        .where('type', '==', 'budget')
                        .where('budgetId', '==', doc.id)
                        .where('subtype', '==', 'exceeded')
                        .where('createdAt', '>=', startOfMonth)
                        .limit(1)
                        .get();
                    
                    if (existingNotification.empty) {
                        // Create budget exceeded notification
                        await this.createBudgetNotification(
                            user.uid,
                            doc.id,
                            budget.categoryName || 'Unknown Category',
                            usagePercentage,
                            spending,
                            budget.amount,
                            'exceeded'
                        );
                    }
                }
            });
            
        } catch (error) {
            console.error("Error checking budget notifications:", error);
        }
    }
    
    async createBudgetNotification(userId, budgetId, categoryName, percentage, spent, limit, subtype) {
        try {
            const priority = subtype === 'exceeded' ? 'high' : 'medium';
            
            const notificationData = {
                userId: userId,
                type: 'budget',
                subtype: subtype,
                budgetId: budgetId,
                title: `Budget ${subtype === 'exceeded' ? 'Exceeded' : 'Alert'}: ${categoryName}`,
                message: subtype === 'exceeded' ? 
                    `You've exceeded your ${categoryName} budget (${percentage.toFixed(1)}%). Spent: $${spent.toFixed(2)} of $${limit.toFixed(2)}` :
                    `Your ${categoryName} budget is ${percentage.toFixed(1)}% used. Spent: $${spent.toFixed(2)} of $${limit.toFixed(2)}`,
                priority: priority,
                readAt: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                actions: ['view_budget'],
                metadata: {
                    categoryName: categoryName,
                    percentage: percentage,
                    spent: spent,
                    limit: limit
                }
            };
            
            await this.db.collection('notifications').add(notificationData);
            
            console.log(`✅ Created budget notification: ${categoryName} - ${percentage.toFixed(1)}%`);
            
        } catch (error) {
            console.error("Error creating budget notification:", error);
        }
    }
    
    async checkGoalNotifications() {
        try {
            const user = this.auth.currentUser;
            if (!user) return;
            
            // Get user's goals
            const goalsSnapshot = await this.db.collection('goals')
                .where('userId', '==', user.uid)
                .where('status', 'in', ['active', 'completed'])
                .get();
            
            if (goalsSnapshot.empty) return;
            
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            
            goalsSnapshot.forEach(async doc => {
                const goal = doc.data();
                
                // Check for goal completion
                if (goal.status === 'completed') {
                    // Check if completion notification already exists
                    const existingNotification = await this.db.collection('notifications')
                        .where('userId', '==', user.uid)
                        .where('type', '==', 'goal')
                        .where('goalId', '==', doc.id)
                        .where('subtype', '==', 'completed')
                        .limit(1)
                        .get();
                    
                    if (existingNotification.empty) {
                        await this.createGoalNotification(
                            user.uid,
                            doc.id,
                            goal.title,
                            'completed',
                            goal.currentAmount,
                            goal.targetAmount
                        );
                    }
                }
                
                // Check for goal progress (every 25%)
                if (goal.status === 'active' && goal.currentAmount && goal.targetAmount) {
                    const progress = (goal.currentAmount / goal.targetAmount) * 100;
                    const progressMilestones = [25, 50, 75];
                    
                    for (const milestone of progressMilestones) {
                        if (progress >= milestone && progress < milestone + 25) {
                            // Check if milestone notification already exists
                            const existingNotification = await this.db.collection('notifications')
                                .where('userId', '==', user.uid)
                                .where('type', '==', 'goal')
                                .where('goalId', '==', doc.id)
                                .where('subtype', '==', `progress_${milestone}`)
                                .where('createdAt', '>=', thirtyDaysAgo)
                                .limit(1)
                                .get();
                            
                            if (existingNotification.empty) {
                                await this.createGoalNotification(
                                    user.uid,
                                    doc.id,
                                    goal.title,
                                    `progress_${milestone}`,
                                    goal.currentAmount,
                                    goal.targetAmount,
                                    milestone
                                );
                                break;
                            }
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error("Error checking goal notifications:", error);
        }
    }
    
    async createGoalNotification(userId, goalId, goalTitle, subtype, currentAmount, targetAmount, milestone = null) {
        try {
            let title, message, priority = 'medium';
            
            switch (subtype) {
                case 'completed':
                    title = `🎉 Goal Completed: ${goalTitle}`;
                    message = `Congratulations! You've reached your goal of $${targetAmount}`;
                    priority = 'high';
                    break;
                    
                case 'progress_25':
                    title = `Goal Progress: ${goalTitle}`;
                    message = `You're 25% towards your goal ($${currentAmount} of $${targetAmount})`;
                    break;
                    
                case 'progress_50':
                    title = `Goal Progress: ${goalTitle}`;
                    message = `Halfway there! You've reached 50% of your goal ($${currentAmount} of $${targetAmount})`;
                    break;
                    
                case 'progress_75':
                    title = `Goal Progress: ${goalTitle}`;
                    message = `Almost there! You're 75% towards your goal ($${currentAmount} of $${targetAmount})`;
                    priority = 'high';
                    break;
                    
                default:
                    title = `Goal Update: ${goalTitle}`;
                    message = `Your goal progress: $${currentAmount} of $${targetAmount}`;
            }
            
            const notificationData = {
                userId: userId,
                type: 'goal',
                subtype: subtype,
                goalId: goalId,
                title: title,
                message: message,
                priority: priority,
                readAt: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                actions: ['view_goal'],
                metadata: {
                    goalTitle: goalTitle,
                    currentAmount: currentAmount,
                    targetAmount: targetAmount,
                    milestone: milestone,
                    progress: (currentAmount / targetAmount) * 100
                }
            };
            
            await this.db.collection('notifications').add(notificationData);
            
            console.log(`✅ Created goal notification: ${goalTitle} - ${subtype}`);
            
        } catch (error) {
            console.error("Error creating goal notification:", error);
        }
    }
    
    async checkTransactionNotifications() {
        try {
            const user = this.auth.currentUser;
            if (!user) return;
            
            const threshold = this.settings.transactionThreshold || 1000;
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            // Check for large expenses
            const largeExpenses = await this.db.collection('expenses')
                .where('userId', '==', user.uid)
                .where('amount', '>=', threshold)
                .where('date', '>=', sevenDaysAgo)
                .get();
            
            largeExpenses.forEach(async doc => {
                const expense = doc.data();
                const amount = Number(expense.amount) || 0;
                
                // Check if notification already exists
                const existingNotification = await this.db.collection('notifications')
                    .where('userId', '==', user.uid)
                    .where('type', '==', 'expense')
                    .where('expenseId', '==', doc.id)
                    .where('subtype', '==', 'large_transaction')
                    .limit(1)
                    .get();
                
                if (existingNotification.empty) {
                    await this.createTransactionNotification(
                        user.uid,
                        doc.id,
                        'expense',
                        amount,
                        expense.description || 'Large Expense',
                        expense.category || 'Uncategorized'
                    );
                }
            });
            
            // Check for large incomes
            const largeIncomes = await this.db.collection('incomes')
                .where('user_id', '==', user.uid)
                .where('amount', '>=', threshold)
                .where('date', '>=', sevenDaysAgo)
                .get();
            
            largeIncomes.forEach(async doc => {
                const income = doc.data();
                const amount = Number(income.amount) || 0;
                
                // Check if notification already exists
                const existingNotification = await this.db.collection('notifications')
                    .where('userId', '==', user.uid)
                    .where('type', '==', 'income')
                    .where('incomeId', '==', doc.id)
                    .where('subtype', '==', 'large_transaction')
                    .limit(1)
                    .get();
                
                if (existingNotification.empty) {
                    await this.createTransactionNotification(
                        user.uid,
                        doc.id,
                        'income',
                        amount,
                        income.description || 'Large Income',
                        income.category || 'Uncategorized'
                    );
                }
            });
            
        } catch (error) {
            console.error("Error checking transaction notifications:", error);
        }
    }
    
    async createTransactionNotification(userId, transactionId, type, amount, description, category) {
        try {
            const notificationData = {
                userId: userId,
                type: type,
                subtype: 'large_transaction',
                transactionId: transactionId,
                title: `💰 Large ${type === 'income' ? 'Income' : 'Expense'} Detected`,
                message: `$${amount.toFixed(2)} ${type === 'income' ? 'income' : 'expense'} in ${category}: ${description}`,
                priority: 'medium',
                readAt: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
                actions: [`view_${type}`],
                metadata: {
                    amount: amount,
                    description: description,
                    category: category,
                    type: type
                }
            };
            
            await this.db.collection('notifications').add(notificationData);
            
            console.log(`✅ Created transaction notification: $${amount} ${type}`);
            
        } catch (error) {
            console.error("Error creating transaction notification:", error);
        }
    }
    
    async checkMonthlyReportNotification() {
        try {
            const user = this.auth.currentUser;
            if (!user) return;
            
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            // Check if monthly report notification already exists for this month
            const existingNotification = await this.db.collection('notifications')
                .where('userId', '==', user.uid)
                .where('type', '==', 'system')
                .where('subtype', '==', 'monthly_report')
                .where('createdAt', '>=', firstDayOfMonth)
                .limit(1)
                .get();
            
            if (existingNotification.empty && now.getDate() >= 28) {
                // Create monthly report reminder (only after 28th of month)
                await this.createMonthlyReportNotification(user.uid);
            }
            
        } catch (error) {
            console.error("Error checking monthly report notification:", error);
        }
    }
    
    async createMonthlyReportNotification(userId) {
        try {
            const now = new Date();
            const monthName = now.toLocaleDateString('en-US', { month: 'long' });
            const year = now.getFullYear();
            
            const notificationData = {
                userId: userId,
                type: 'system',
                subtype: 'monthly_report',
                title: `📊 ${monthName} ${year} Report Ready`,
                message: 'Your monthly financial summary is ready to view. Review your spending and income trends.',
                priority: 'low',
                readAt: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(now.getFullYear(), now.getMonth() + 1, 1), // End of month
                actions: ['generate_report'],
                metadata: {
                    month: monthName,
                    year: year,
                    reportType: 'monthly_summary'
                }
            };
            
            await this.db.collection('notifications').add(notificationData);
            
            console.log(`✅ Created monthly report notification for ${monthName} ${year}`);
            
        } catch (error) {
            console.error("Error creating monthly report notification:", error);
        }
    }
    
    setupAutomaticNotifications() {
        // Check for notifications every 5 minutes
        setInterval(async () => {
            await this.checkForSystemNotifications();
        }, 5 * 60 * 1000);
        
        // Check for budget notifications every hour
        setInterval(async () => {
            if (this.preferences.prefBudgetAlerts) {
                await this.checkBudgetNotifications();
            }
        }, 60 * 60 * 1000);
        
        // Check for goal notifications every 2 hours
        setInterval(async () => {
            if (this.preferences.prefGoalUpdates) {
                await this.checkGoalNotifications();
            }
        }, 2 * 60 * 60 * 1000);
        
        // Check for transaction notifications every 30 minutes
        setInterval(async () => {
            if (this.preferences.prefLargeTransactions) {
                await this.checkTransactionNotifications();
            }
        }, 30 * 60 * 1000);
    }
    
    setupRealtimeListener() {
        // Listen for new notifications
        this.db.collection('notifications')
            .where('userId', '==', this.auth.currentUser?.uid)
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
    }
    
    handleNewNotification(notificationData) {
        // Check if notification already exists in local array
        const exists = this.notifications.some(n => 
            n.id === notificationData.id || 
            (n.title === notificationData.title && n.createdAt?.getTime() === notificationData.createdAt?.toDate()?.getTime())
        );
        
        if (!exists) {
            const newNotification = {
                id: 'temp-' + Date.now(),
                ...notificationData,
                createdAt: notificationData.createdAt?.toDate()
            };
            
            this.notifications.unshift(newNotification);
            
            // Update statistics
            this.updateStatistics();
            
            // Update list if on current filter
            if (this.shouldShowNotification(newNotification)) {
                this.updateNotificationsList();
                
                // Show desktop notification if permission granted and preferences allow
                if (this.shouldShowDesktopNotification(newNotification)) {
                    this.showDesktopNotification(newNotification);
                }
                
                // Play notification sound if enabled
                if (this.settings.notificationSound !== false) {
                    this.playNotificationSound();
                }
            }
        }
    }
    
    shouldShowNotification(notification) {
        switch (this.currentFilter) {
            case 'all':
                return true;
            case 'unread':
                return !notification.readAt;
            case 'budget':
                return notification.type === 'budget';
            case 'goal':
                return notification.type === 'goal';
            case 'expense':
                return notification.type === 'expense';
            case 'income':
                return notification.type === 'income';
            case 'system':
                return notification.type === 'system';
            default:
                return true;
        }
    }
    
    shouldShowDesktopNotification(notification) {
        // Check if desktop notifications are enabled in settings
        if (!this.settings.desktopNotifications) return false;
        
        // Check if quiet hours are active
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                           now.getMinutes().toString().padStart(2, '0');
        const isQuietHours = this.isTimeBetween(
            currentTime, 
            this.settings.quietStart || '22:00', 
            this.settings.quietEnd || '08:00'
        );
        
        if (isQuietHours) return false;
        
        // Check notification priority
        if (notification.priority === 'low') return false;
        
        // Check user preferences for this notification type
        switch (notification.type) {
            case 'budget':
                return this.preferences.prefBudgetAlerts !== false;
            case 'goal':
                return this.preferences.prefGoalUpdates !== false;
            case 'expense':
            case 'income':
                return this.preferences.prefLargeTransactions !== false;
            case 'system':
                return this.preferences.prefSystemUpdates !== false;
            default:
                return true;
        }
    }
    
    showDesktopNotification(notification) {
        if (!("Notification" in window)) {
            return;
        }
        
        if (Notification.permission === "granted") {
            const notif = new Notification("Money Manager", {
                body: notification.message || notification.title,
                icon: "logo_app_96.png",
                tag: notification.id,
                requireInteraction: notification.priority === 'high'
            });
            
            notif.onclick = () => {
                window.focus();
                // Mark as read when clicked
                if (notification.id.startsWith('temp-')) {
                    // Find the actual notification
                    const actualNotification = this.notifications.find(n => 
                        n.title === notification.title && 
                        n.createdAt?.getTime() === notification.createdAt?.getTime()
                    );
                    if (actualNotification) {
                        this.markAsRead(actualNotification.id);
                    }
                } else {
                    this.markAsRead(notification.id);
                }
            };
            
            // Auto-close after 10 seconds for low priority, 30 seconds for medium, never for high
            if (notification.priority !== 'high') {
                setTimeout(() => notif.close(), 
                    notification.priority === 'low' ? 10000 : 30000);
            }
            
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    this.showDesktopNotification(notification);
                }
            });
        }
    }
    
    playNotificationSound() {
        try {
            // Create a simple notification sound using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
            
        } catch (error) {
            console.error("Error playing notification sound:", error);
        }
    }
    
    updateStatistics() {
        const totalNotifications = this.notifications.length;
        const unreadCount = this.notifications.filter(n => !n.readAt).length;
        
        // Count today's notifications
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCount = this.notifications.filter(n => 
            n.createdAt && n.createdAt >= today
        ).length;
        
        // Count by type
        const budgetAlerts = this.notifications.filter(n => n.type === 'budget').length;
        const criticalBudgetAlerts = this.notifications.filter(n => 
            n.type === 'budget' && n.priority === 'high'
        ).length;
        
        const goalUpdates = this.notifications.filter(n => n.type === 'goal').length;
        const completedGoals = this.notifications.filter(n => 
            n.type === 'goal' && n.subtype === 'completed'
        ).length;
        
        // Update UI
        document.getElementById('totalNotifications').textContent = totalNotifications;
        document.getElementById('unreadCount').textContent = unreadCount;
        document.getElementById('todayNotifications').textContent = todayCount;
        document.getElementById('budgetAlertsCount').textContent = budgetAlerts;
        document.getElementById('criticalBudgetAlerts').textContent = criticalBudgetAlerts;
        document.getElementById('goalUpdatesCount').textContent = goalUpdates;
        document.getElementById('completedGoals').textContent = completedGoals;
        
        // Update badge
        document.getElementById('notificationsCount').textContent = unreadCount;
    }
    
    filterNotifications(filter) {
        this.currentFilter = filter;
        
        // Update filter tags
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.remove('active');
            if (tag.dataset.filter === filter) {
                tag.classList.add('active');
            }
        });
        
        // Filter notifications
        this.filteredNotifications = this.notifications.filter(notification => {
            switch (filter) {
                case 'all':
                    return true;
                case 'unread':
                    return !notification.readAt;
                case 'budget':
                    return notification.type === 'budget';
                case 'goal':
                    return notification.type === 'goal';
                case 'expense':
                    return notification.type === 'expense';
                case 'income':
                    return notification.type === 'income';
                case 'system':
                    return notification.type === 'system';
                default:
                    return true;
            }
        });
        
        // Sort notifications
        this.sortNotifications();
        
        // Update list
        this.updateNotificationsList();
    }
    
    sortNotifications() {
        switch (this.currentSort) {
            case 'newest':
                this.filteredNotifications.sort((a, b) => {
                    const dateA = a.createdAt || new Date(0);
                    const dateB = b.createdAt || new Date(0);
                    return dateB - dateA;
                });
                break;
                
            case 'oldest':
                this.filteredNotifications.sort((a, b) => {
                    const dateA = a.createdAt || new Date(0);
                    const dateB = b.createdAt || new Date(0);
                    return dateA - dateB;
                });
                break;
                
            case 'priority':
                const priorityOrder = { 'critical': 5, 'high': 4, 'medium': 3, 'low': 2, 'info': 1 };
                this.filteredNotifications.sort((a, b) => {
                    const priorityA = priorityOrder[a.priority] || 0;
                    const priorityB = priorityOrder[b.priority] || 0;
                    return priorityB - priorityA;
                });
                break;
        }
    }
    
    updateNotificationsList() {
        const notificationsList = document.getElementById('notificationsList');
        
        if (this.filteredNotifications.length === 0) {
            notificationsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell-slash"></i>
                    <h4>No notifications found</h4>
                    <p>${this.currentFilter !== 'all' ? 'Try a different filter' : 'You\'re all caught up!'}</p>
                </div>
            `;
            return;
        }
        
        notificationsList.innerHTML = this.filteredNotifications.map(notification => {
            const isUnread = !notification.readAt;
            const timeAgo = this.getTimeAgo(notification.createdAt);
            
            // Get icon based on type and priority
            const iconInfo = this.getNotificationIcon(notification);
            
            // Get action text
            const actionText = this.getActionText(notification);
            
            // Format metadata if available
            let metadataHTML = '';
            if (notification.metadata) {
                metadataHTML = this.formatMetadata(notification.metadata);
            }
            
            return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" data-notification-id="${notification.id}">
                    <div class="notification-icon ${iconInfo.class}">
                        <i class="${iconInfo.icon}"></i>
                    </div>
                    <div class="notification-content">
                        <h4>${notification.title || 'Notification'}</h4>
                        <p>${notification.message || notification.description || 'No message'}</p>
                        
                        ${metadataHTML ? `<div class="notification-metadata">${metadataHTML}</div>` : ''}
                        
                        ${notification.details ? `<small>${notification.details}</small>` : ''}
                        
                        ${actionText ? `
                            <div class="notification-actions">
                                <button class="btn btn-sm btn-primary" onclick="notificationsManager.handleNotificationAction('${notification.id}')">
                                    ${actionText}
                                </button>
                            </div>
                        ` : ''}
                        
                        <div class="notification-meta">
                            <span class="notification-time">${timeAgo}</span>
                            ${notification.priority === 'high' ? `
                                <span class="priority-badge priority-high">High Priority</span>
                            ` : ''}
                            ${notification.priority === 'critical' ? `
                                <span class="priority-badge priority-critical">Critical</span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="notification-actions-right">
                        ${isUnread ? `
                            <button class="action-btn" onclick="notificationsManager.markAsRead('${notification.id}')" 
                                    title="Mark as read">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        <button class="action-btn" onclick="notificationsManager.deleteNotification('${notification.id}')" 
                                title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    formatMetadata(metadata) {
        let html = '';
        
        if (metadata.percentage !== undefined) {
            html += `<span class="metadata-tag">${metadata.percentage.toFixed(1)}%</span>`;
        }
        
        if (metadata.amount !== undefined) {
            html += `<span class="metadata-tag">$${metadata.amount.toFixed(2)}</span>`;
        }
        
        if (metadata.category) {
            html += `<span class="metadata-tag">${metadata.category}</span>`;
        }
        
        if (metadata.progress !== undefined) {
            html += `<span class="metadata-tag">${metadata.progress.toFixed(1)}% complete</span>`;
        }
        
        return html ? `<div class="metadata-tags">${html}</div>` : '';
    }
    
    getNotificationIcon(notification) {
        const icons = {
            'budget': {
                icon: 'fas fa-chart-pie',
                class: notification.priority === 'high' ? 'danger' : 'warning'
            },
            'goal': {
                icon: 'fas fa-bullseye',
                class: notification.subtype === 'completed' ? 'success' : 'info'
            },
            'expense': {
                icon: 'fas fa-shopping-cart',
                class: 'danger'
            },
            'income': {
                icon: 'fas fa-money-bill-wave',
                class: 'success'
            },
            'system': {
                icon: 'fas fa-cog',
                class: 'info'
            }
        };
        
        const defaultIcon = {
            icon: 'fas fa-bell',
            class: 'info'
        };
        
        return icons[notification.type] || defaultIcon;
    }
    
    getActionText(notification) {
        const actions = {
            'budget': 'View Budget',
            'goal': 'View Goal',
            'expense': 'View Expense',
            'income': 'View Income',
            'system': 'View Report',
            'view_budget': 'View Budget',
            'view_goal': 'View Goal',
            'view_expense': 'View Expense',
            'view_income': 'View Income',
            'generate_report': 'Generate Report'
        };
        
        if (notification.actions && notification.actions.length > 0) {
            return actions[notification.actions[0]] || 'View Details';
        }
        
        return actions[notification.type] || null;
    }
    
    getTimeAgo(date) {
        if (!date) return 'Just now';
        
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffDay > 7) {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
        } else if (diffDay > 0) {
            return diffDay === 1 ? 'Yesterday' : `${diffDay} days ago`;
        } else if (diffHour > 0) {
            return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
        } else if (diffMin > 0) {
            return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }
    
    async markAsRead(notificationId) {
        try {
            // If it's a temporary ID (from real-time), find the actual notification
            if (notificationId.startsWith('temp-')) {
                // Find by title and time (simplified approach)
                const notification = this.notifications.find(n => 
                    n.id === notificationId || 
                    (n.id.startsWith('temp-') && n.createdAt?.getTime() === this.notifications.find(n2 => n2.id === notificationId)?.createdAt?.getTime())
                );
                
                if (notification) {
                    notification.readAt = new Date();
                    this.updateStatistics();
                    this.updateNotificationsList();
                }
                return;
            }
            
            // Update in Firestore
            await this.db.collection('notifications').doc(notificationId).update({
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update local data
            const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
            if (notificationIndex !== -1) {
                this.notifications[notificationIndex].readAt = new Date();
            }
            
            // Update UI
            this.updateStatistics();
            this.updateNotificationsList();
            
            this.showMessage('Notification marked as read', 'success');
            
        } catch (error) {
            console.error("Error marking notification as read:", error);
            // If Firestore update fails, still update UI locally
            const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
            if (notificationIndex !== -1) {
                this.notifications[notificationIndex].readAt = new Date();
                this.updateStatistics();
                this.updateNotificationsList();
            }
        }
    }
    
    async markAllAsRead() {
        try {
            // Get all unread notifications
            const unreadNotifications = this.notifications.filter(n => !n.readAt);
            
            if (unreadNotifications.length === 0) {
                this.showMessage('No unread notifications', 'info');
                return;
            }
            
            // Batch update in Firestore
            const batch = this.db.batch();
            unreadNotifications.forEach(notification => {
                if (!notification.id.startsWith('temp-')) {
                    const notificationRef = this.db.collection('notifications').doc(notification.id);
                    batch.update(notificationRef, {
                        readAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });
            
            await batch.commit();
            
            // Update local data
            this.notifications.forEach(notification => {
                if (!notification.readAt) {
                    notification.readAt = new Date();
                }
            });
            
            // Update UI
            this.updateStatistics();
            this.updateNotificationsList();
            
            this.showMessage(`Marked ${unreadNotifications.length} notifications as read`, 'success');
            
        } catch (error) {
            console.error("Error marking all as read:", error);
            this.showMessage('Error marking notifications as read: ' + error.message, 'error');
        }
    }
    
    async deleteNotification(notificationId) {
        try {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (!notification) {
                this.showMessage('Notification not found', 'error');
                return;
            }
            
            if (!confirm('Are you sure you want to delete this notification?')) {
                return;
            }
            
            // If it's not a temporary ID, delete from Firestore
            if (!notificationId.startsWith('temp-')) {
                await this.db.collection('notifications').doc(notificationId).delete();
            }
            
            // Remove from local array
            this.notifications = this.notifications.filter(n => n.id !== notificationId);
            
            // Update UI
            this.updateStatistics();
            this.filterNotifications(this.currentFilter);
            
            this.showMessage('Notification deleted', 'success');
            
        } catch (error) {
            console.error("Error deleting notification:", error);
            this.showMessage('Error deleting notification: ' + error.message, 'error');
        }
    }
    
    async clearAllNotifications() {
        try {
            if (this.notifications.length === 0) {
                this.showMessage('No notifications to clear', 'info');
                return;
            }
            
            if (!confirm('Are you sure you want to clear all notifications? This action cannot be undone.')) {
                return;
            }
            
            // Get all notification IDs (excluding temporary ones)
            const notificationIds = this.notifications
                .map(n => n.id)
                .filter(id => !id.startsWith('temp-'));
            
            // Batch delete in Firestore
            const batch = this.db.batch();
            notificationIds.forEach(id => {
                const notificationRef = this.db.collection('notifications').doc(id);
                batch.delete(notificationRef);
            });
            
            await batch.commit();
            
            // Clear local array
            this.notifications = [];
            
            // Update UI
            this.updateStatistics();
            this.updateNotificationsList();
            
            this.showMessage('All notifications cleared', 'success');
            
        } catch (error) {
            console.error("Error clearing all notifications:", error);
            this.showMessage('Error clearing notifications: ' + error.message, 'error');
        }
    }
    
    handleNotificationAction(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) return;
        
        // Mark as read first
        this.markAsRead(notificationId);
        
        // Navigate based on notification type or action
        const action = notification.actions?.[0] || notification.type;
        
        switch (action) {
            case 'budget':
            case 'view_budget':
                window.location.href = 'budgets.html';
                break;
            case 'goal':
            case 'view_goal':
                window.location.href = 'goals.html';
                break;
            case 'expense':
            case 'view_expense':
                window.location.href = 'expenses.html';
                break;
            case 'income':
            case 'view_income':
                window.location.href = 'incomes.html';
                break;
            case 'system':
            case 'generate_report':
                window.location.href = 'reports.html';
                break;
            default:
                // No action
                break;
        }
    }
    
    showSettingsModal() {
        // Load current settings
        this.loadCurrentSettings();
        
        document.getElementById('settingsModal').classList.add('active');
    }
    
    hideSettingsModal() {
        document.getElementById('settingsModal').classList.remove('active');
    }
    
    loadCurrentSettings() {
        // Set form values from loaded settings
        document.getElementById('budgetThreshold').value = this.settings.budgetThreshold || 80;
        document.getElementById('transactionThreshold').value = this.settings.transactionThreshold || 1000;
        document.getElementById('quietStart').value = this.settings.quietStart || '22:00';
        document.getElementById('quietEnd').value = this.settings.quietEnd || '08:00';
        document.getElementById('notificationEmail').value = this.settings.email || '';
        document.getElementById('emailDailySummary').checked = this.settings.emailDailySummary || false;
        document.getElementById('emailWeeklyReport').checked = this.settings.emailWeeklyReport || false;
        document.getElementById('emailUrgentAlerts').checked = this.settings.emailUrgentAlerts || true;
        
        // Add notification sound toggle
        let soundToggle = document.getElementById('notificationSound');
        if (!soundToggle) {
            const soundSection = document.querySelector('#settingsForm .form-group:nth-child(3)');
            if (soundSection) {
                soundSection.innerHTML += `
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="notificationSound" ${this.settings.notificationSound !== false ? 'checked' : ''}>
                            <i class="fas fa-volume-up"></i>
                            Notification Sound
                        </label>
                    </div>
                `;
                soundToggle = document.getElementById('notificationSound');
            }
        } else {
            soundToggle.checked = this.settings.notificationSound !== false;
        }
        
        // Add desktop notifications toggle
        let desktopToggle = document.getElementById('desktopNotifications');
        if (!desktopToggle) {
            const desktopSection = document.querySelector('#settingsForm .form-group:nth-child(3)');
            if (desktopSection) {
                desktopSection.innerHTML += `
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="desktopNotifications" ${this.settings.desktopNotifications ? 'checked' : ''}>
                            <i class="fas fa-desktop"></i>
                            Desktop Notifications
                        </label>
                    </div>
                `;
                desktopToggle = document.getElementById('desktopNotifications');
            }
        } else {
            desktopToggle.checked = this.settings.desktopNotifications || false;
        }
    }
    
    async saveSettings() {
        try {
            const settings = {
                budgetThreshold: parseInt(document.getElementById('budgetThreshold').value) || 80,
                transactionThreshold: parseInt(document.getElementById('transactionThreshold').value) || 1000,
                quietStart: document.getElementById('quietStart').value,
                quietEnd: document.getElementById('quietEnd').value,
                email: document.getElementById('notificationEmail').value,
                emailDailySummary: document.getElementById('emailDailySummary').checked,
                emailWeeklyReport: document.getElementById('emailWeeklyReport').checked,
                emailUrgentAlerts: document.getElementById('emailUrgentAlerts').checked,
                notificationSound: document.getElementById('notificationSound')?.checked !== false,
                desktopNotifications: document.getElementById('desktopNotifications')?.checked || false,
                updatedAt: new Date().toISOString()
            };
            
            // Validate settings
            if (settings.budgetThreshold < 50 || settings.budgetThreshold > 100) {
                this.showMessage('Budget threshold must be between 50% and 100%', 'error');
                return;
            }
            
            if (settings.transactionThreshold < 0) {
                this.showMessage('Transaction threshold must be positive', 'error');
                return;
            }
            
            // Save to localStorage
            localStorage.setItem('notificationSettings', JSON.stringify(settings));
            this.settings = settings;
            
            // Save to Firestore if user is logged in
            const user = this.auth.currentUser;
            if (user) {
                await this.db.collection('user_settings').doc(user.uid).set({
                    notificationSettings: settings,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
            
            // Request desktop notification permission if enabled
            if (settings.desktopNotifications && Notification.permission === 'default') {
                Notification.requestPermission();
            }
            
            // Close modal
            this.hideSettingsModal();
            
            // Update quiet hours indicator
            this.checkQuietHours();
            
            this.showMessage('Notification settings saved successfully!', 'success');
            
        } catch (error) {
            console.error("Error saving settings:", error);
            this.showMessage('Error saving settings: ' + error.message, 'error');
        }
    }
    
    async savePreference(preferenceId, enabled) {
        try {
            this.preferences[preferenceId] = enabled;
            
            localStorage.setItem('notificationPreferences', JSON.stringify(this.preferences));
            
            // Save to Firestore if user is logged in
            const user = this.auth.currentUser;
            if (user) {
                await this.db.collection('user_settings').doc(user.uid).set({
                    notificationPreferences: this.preferences,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
            
            // If enabling budget alerts, check immediately
            if (preferenceId === 'prefBudgetAlerts' && enabled) {
                await this.checkBudgetNotifications();
            }
            
            // If enabling goal updates, check immediately
            if (preferenceId === 'prefGoalUpdates' && enabled) {
                await this.checkGoalNotifications();
            }
            
            this.showMessage('Preference updated', 'success');
            
        } catch (error) {
            console.error("Error saving preference:", error);
        }
    }
    
    showLoading(show) {
        const notificationsList = document.getElementById('notificationsList');
        if (show) {
            notificationsList.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading notifications...</p>
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

// Initialize notifications manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.notificationsManager = new NotificationsManager();
});