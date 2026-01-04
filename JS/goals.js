// Financial Goals Management System
class GoalManager {
    constructor() {
        this.goals = [];
        this.goalsChart = null;
        this.selectedFilter = 'all';
        this.selectedSort = 'priority';
        this.init();
    }

    async init() {
        console.log("🚀 Initializing Goal Manager...");
        
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
        
        // Add goal button
        document.getElementById('addGoalBtn').addEventListener('click', () => {
            this.showAddGoalModal();
        });
        
        // Filter and sort
        document.getElementById('goalFilter').addEventListener('change', (e) => {
            this.selectedFilter = e.target.value;
            this.updateGoalsChart();
            this.updateGoalsGrid();
        });
        
        document.getElementById('sortGoals').addEventListener('change', (e) => {
            this.selectedSort = e.target.value;
            this.sortGoals();
            this.updateGoalsGrid();
        });
        
        // Export button
        document.getElementById('exportGoalsBtn').addEventListener('click', () => {
            this.exportGoals();
        });
        
        // Modal close buttons
        document.getElementById('closeAddGoalModal').addEventListener('click', () => {
            this.hideAddGoalModal();
        });
        
        document.getElementById('closeEditGoalModal').addEventListener('click', () => {
            this.hideEditGoalModal();
        });
        
        document.getElementById('cancelAddGoalBtn').addEventListener('click', () => {
            this.hideAddGoalModal();
        });
        
        document.getElementById('cancelEditGoalBtn').addEventListener('click', () => {
            this.hideEditGoalModal();
        });
        
        // Forms
        document.getElementById('addGoalForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addGoal();
        });
        
        document.getElementById('editGoalForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateGoal();
        });
        
        // Set default dates
        const today = new Date();
        const sixMonthsLater = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());
        
        document.getElementById('startDate').value = today.toISOString().split('T')[0];
        document.getElementById('targetDate').value = sixMonthsLater.toISOString().split('T')[0];
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
            
            // Load goals data
            await this.loadGoalsData();
            
            // Update statistics
            this.updateOverviewStatistics();
            
            // Initialize chart
            this.initGoalsChart();
            
            // Update goals grid
            this.updateGoalsGrid();
            
            // Hide loading state
            this.showLoading(false);
            
        } catch (error) {
            console.error("❌ Error loading initial data:", error);
            this.showError("Error loading data: " + error.message);
            this.showLoading(false);
        }
    }
    
    async loadGoalsData() {
        try {
            const goalsSnapshot = await this.db.collection('goals')
                .orderBy('createdAt', 'desc')
                .get();
            
            this.goals = [];
            
            goalsSnapshot.forEach(doc => {
                const goalData = doc.data();
                const goal = {
                    id: doc.id,
                    ...goalData,
                    startDate: goalData.startDate?.toDate(),
                    targetDate: goalData.targetDate?.toDate(),
                    createdAt: goalData.createdAt?.toDate(),
                    updatedAt: goalData.updatedAt?.toDate()
                };
                
                this.goals.push(goal);
            });
            
            console.log(`✅ Loaded ${this.goals.length} goals`);
            
            // Update badges
            document.getElementById('goalsCount').textContent = this.goals.length;
            
        } catch (error) {
            console.error("Error loading goals data:", error);
            throw error;
        }
    }
    
    updateOverviewStatistics() {
        const totalGoals = this.goals.length;
        const completedGoals = this.goals.filter(goal => this.calculateProgress(goal) >= 100).length;
        
        // Calculate total target and saved amounts
        let totalTarget = 0;
        let totalSaved = 0;
        let totalProgress = 0;
        
        this.goals.forEach(goal => {
            totalTarget += goal.targetAmount || 0;
            totalSaved += goal.currentAmount || 0;
            totalProgress += this.calculateProgress(goal);
        });
        
        const avgProgress = totalGoals > 0 ? totalProgress / totalGoals : 0;
        
        // Count on-track goals (progress >= expected based on time)
        const onTrackGoals = this.goals.filter(goal => {
            const progress = this.calculateProgress(goal);
            const expectedProgress = this.calculateExpectedProgress(goal);
            return progress >= expectedProgress;
        }).length;
        
        // Find next deadline
        let nextDeadline = null;
        let daysRemaining = null;
        
        const activeGoals = this.goals.filter(goal => {
            const progress = this.calculateProgress(goal);
            return progress < 100 && goal.targetDate;
        });
        
        if (activeGoals.length > 0) {
            const now = new Date();
            const sortedByDeadline = activeGoals.sort((a, b) => {
                return (a.targetDate?.getTime() || Infinity) - (b.targetDate?.getTime() || Infinity);
            });
            
            nextDeadline = sortedByDeadline[0].targetDate;
            if (nextDeadline) {
                const diffTime = nextDeadline.getTime() - now.getTime();
                daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        }
        
        // Update UI
        document.getElementById('totalGoalsCount').textContent = totalGoals;
        document.getElementById('completedGoals').textContent = completedGoals;
        
        document.getElementById('totalTargetAmount').textContent = 
            `$${totalTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        document.getElementById('totalSaved').textContent = 
            `$${totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        document.getElementById('avgProgress').textContent = `${avgProgress.toFixed(1)}%`;
        document.getElementById('onTrackGoals').textContent = onTrackGoals;
        
        if (nextDeadline) {
            document.getElementById('nextDeadline').textContent = 
                nextDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            document.getElementById('daysRemaining').textContent = daysRemaining;
        } else {
            document.getElementById('nextDeadline').textContent = '-';
            document.getElementById('daysRemaining').textContent = '-';
        }
    }
    
    calculateProgress(goal) {
        const targetAmount = goal.targetAmount || 0;
        const currentAmount = goal.currentAmount || 0;
        
        if (targetAmount <= 0) return 0;
        return Math.min(100, (currentAmount / targetAmount) * 100);
    }
    
    calculateExpectedProgress(goal) {
        if (!goal.startDate || !goal.targetDate) return 0;
        
        const now = new Date();
        const totalTime = goal.targetDate.getTime() - goal.startDate.getTime();
        const elapsedTime = now.getTime() - goal.startDate.getTime();
        
        if (totalTime <= 0) return 100;
        if (elapsedTime <= 0) return 0;
        if (elapsedTime >= totalTime) return 100;
        
        return (elapsedTime / totalTime) * 100;
    }
    
    initGoalsChart() {
        const ctx = document.getElementById('goalsChart').getContext('2d');
        
        this.goalsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Progress %',
                        data: [],
                        backgroundColor: '#4facfe',
                        borderColor: '#4facfe',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Expected %',
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
                                return `${context.dataset.label}: ${context.raw.toFixed(1)}%`;
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
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
        
        this.updateGoalsChart();
    }
    
    updateGoalsChart() {
        if (!this.goalsChart) return;
        
        const filteredGoals = this.getFilteredGoals();
        const sortedGoals = filteredGoals.sort((a, b) => {
            const progressA = this.calculateProgress(a);
            const progressB = this.calculateProgress(b);
            return progressB - progressA;
        }).slice(0, 8); // Top 8 goals
        
        const labels = sortedGoals.map(goal => {
            const title = goal.title || 'Untitled Goal';
            return title.length > 15 ? title.substring(0, 15) + '...' : title;
        });
        
        const progressData = sortedGoals.map(goal => this.calculateProgress(goal));
        const expectedData = sortedGoals.map(goal => this.calculateExpectedProgress(goal));
        
        this.goalsChart.data.labels = labels;
        this.goalsChart.data.datasets[0].data = progressData;
        this.goalsChart.data.datasets[1].data = expectedData;
        this.goalsChart.update();
    }
    
    getFilteredGoals() {
        switch (this.selectedFilter) {
            case 'active':
                return this.goals.filter(goal => this.calculateProgress(goal) < 100);
                
            case 'savings':
                return this.goals.filter(goal => goal.type === 'savings');
                
            case 'debt':
                return this.goals.filter(goal => goal.type === 'debt');
                
            default:
                return this.goals;
        }
    }
    
    sortGoals() {
        switch (this.selectedSort) {
            case 'priority':
                const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
                this.goals.sort((a, b) => {
                    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
                });
                break;
                
            case 'deadline':
                this.goals.sort((a, b) => {
                    const dateA = a.targetDate?.getTime() || Infinity;
                    const dateB = b.targetDate?.getTime() || Infinity;
                    return dateA - dateB;
                });
                break;
                
            case 'progress':
                this.goals.sort((a, b) => {
                    const progressA = this.calculateProgress(a);
                    const progressB = this.calculateProgress(b);
                    return progressB - progressA;
                });
                break;
                
            case 'amount':
                this.goals.sort((a, b) => {
                    return (b.targetAmount || 0) - (a.targetAmount || 0);
                });
                break;
        }
    }
    
    updateGoalsGrid() {
        const goalsGrid = document.getElementById('goalsGrid');
        const filteredGoals = this.getFilteredGoals();
        
        if (filteredGoals.length === 0) {
            goalsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bullseye"></i>
                    <h4>No goals found</h4>
                    <p>${this.selectedFilter !== 'all' ? 'Try a different filter' : 'Create your first financial goal'}</p>
                    <button class="btn btn-primary" id="createFirstGoalBtn">
                        <i class="fas fa-plus-circle"></i>
                        Create First Goal
                    </button>
                </div>
            `;
            
            document.getElementById('createFirstGoalBtn').addEventListener('click', () => {
                this.showAddGoalModal();
            });
            
            return;
        }
        
        goalsGrid.innerHTML = filteredGoals.map(goal => {
            const progress = this.calculateProgress(goal);
            const expected = this.calculateExpectedProgress(goal);
            const remaining = Math.max(0, (goal.targetAmount || 0) - (goal.currentAmount || 0));
            
            // Determine status
            let status = 'on-track';
            if (progress >= 100) {
                status = 'completed';
            } else if (progress < expected - 10) {
                status = 'behind';
            } else if (progress > expected + 10) {
                status = 'ahead';
            }
            
            // Get status text and color
            let statusText = 'On Track';
            let statusColor = 'success';
            
            if (status === 'completed') {
                statusText = 'Completed';
                statusColor = 'primary';
            } else if (status === 'behind') {
                statusText = 'Behind';
                statusColor = 'danger';
            } else if (status === 'ahead') {
                statusText = 'Ahead';
                statusColor = 'warning';
            }
            
            // Calculate days remaining
            let daysRemaining = 'N/A';
            if (goal.targetDate) {
                const now = new Date();
                const diffTime = goal.targetDate.getTime() - now.getTime();
                const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                daysRemaining = days > 0 ? `${days} days` : 'Overdue';
            }
            
            // Get icon based on goal type
            const iconClass = this.getGoalIconClass(goal.type);
            const icon = this.getGoalIcon(goal.type);
            
            // Calculate circumference for progress circle
            const radius = 40;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (progress / 100) * circumference;
            
            return `
                <div class="goal-card" data-goal-id="${goal.id}">
                    <div class="goal-card-header">
                        <div>
                            <h4>${goal.title || 'Untitled Goal'}</h4>
                            <span class="status-badge status-${statusColor}">${statusText}</span>
                        </div>
                        <div class="goal-actions-menu">
                            <button class="action-btn" onclick="goalManager.editGoal('${goal.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" onclick="goalManager.deleteGoal('${goal.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="goal-type">
                        <div class="goal-icon ${iconClass}">
                            <i class="${icon}"></i>
                        </div>
                        <div>
                            <small>${this.formatGoalType(goal.type)} Goal</small>
                            <div class="priority-badge priority-${goal.priority || 'medium'}">
                                ${goal.priority || 'medium'} priority
                            </div>
                        </div>
                    </div>
                    
                    <div class="goal-progress-circle">
                        <svg width="100" height="100">
                            <circle cx="50" cy="50" r="${radius}" 
                                    class="progress-bg" 
                                    stroke-width="8" 
                                    fill="none" />
                            <circle cx="50" cy="50" r="${radius}" 
                                    class="progress-fill" 
                                    stroke-width="8" 
                                    fill="none"
                                    stroke-dasharray="${circumference}"
                                    stroke-dashoffset="${offset}"
                                    transform="rotate(-90 50 50)" />
                        </svg>
                        <div class="goal-progress-text">
                            <div class="goal-progress-value">${progress.toFixed(1)}%</div>
                            <div class="goal-progress-label">Complete</div>
                        </div>
                    </div>
                    
                    <div class="goal-amounts">
                        <div class="amount-row">
                            <span class="amount-label">Target</span>
                            <span class="amount-value target">
                                $${(goal.targetAmount || 0).toLocaleString(undefined, { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                })}
                            </span>
                        </div>
                        <div class="amount-row">
                            <span class="amount-label">Saved</span>
                            <span class="amount-value saved">
                                $${(goal.currentAmount || 0).toLocaleString(undefined, { 
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
                    
                    <div class="goal-timeline">
                        <div class="timeline-info">
                            <div>
                                <small>Start</small>
                                <div>${goal.startDate ? goal.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}</div>
                            </div>
                            <div>
                                <small>Target</small>
                                <div>${goal.targetDate ? goal.targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}</div>
                            </div>
                            <div>
                                <small>Remaining</small>
                                <div>${daysRemaining}</div>
                            </div>
                        </div>
                    </div>
                    
                    ${goal.description ? `
                        <div class="goal-description">
                            <p>${goal.description}</p>
                        </div>
                    ` : ''}
                    
                    <div class="goal-actions">
                        <button class="btn btn-sm btn-secondary" onclick="goalManager.updateProgress('${goal.id}')">
                            <i class="fas fa-plus"></i> Add Progress
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="goalManager.viewGoalDetails('${goal.id}')">
                            <i class="fas fa-chart-line"></i> Details
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    getGoalIcon(type) {
        const iconMap = {
            'savings': 'fas fa-piggy-bank',
            'debt': 'fas fa-credit-card',
            'investment': 'fas fa-chart-line',
            'purchase': 'fas fa-shopping-bag',
            'education': 'fas fa-graduation-cap',
            'other': 'fas fa-bullseye'
        };
        
        return iconMap[type] || 'fas fa-bullseye';
    }
    
    getGoalIconClass(type) {
        return type || 'savings';
    }
    
    formatGoalType(type) {
        const typeMap = {
            'savings': 'Savings',
            'debt': 'Debt Reduction',
            'investment': 'Investment',
            'purchase': 'Purchase',
            'education': 'Education',
            'other': 'Other'
        };
        
        return typeMap[type] || 'Financial';
    }
    
    showAddGoalModal() {
        document.getElementById('addGoalModal').classList.add('active');
        document.getElementById('addGoalForm').reset();
        
        // Set default dates
        const today = new Date();
        const sixMonthsLater = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate());
        
        document.getElementById('startDate').value = today.toISOString().split('T')[0];
        document.getElementById('targetDate').value = sixMonthsLater.toISOString().split('T')[0];
    }
    
    hideAddGoalModal() {
        document.getElementById('addGoalModal').classList.remove('active');
    }
    
    showEditGoalModal() {
        document.getElementById('editGoalModal').classList.add('active');
    }
    
    hideEditGoalModal() {
        document.getElementById('editGoalModal').classList.remove('active');
    }
    
    async addGoal() {
        try {
            const title = document.getElementById('goalTitle').value;
            const type = document.getElementById('goalType').value;
            const priority = document.getElementById('goalPriority').value;
            const targetAmount = parseFloat(document.getElementById('targetAmount').value);
            const currentAmount = parseFloat(document.getElementById('currentAmount').value) || 0;
            const startDate = document.getElementById('startDate').value;
            const targetDate = document.getElementById('targetDate').value;
            const description = document.getElementById('goalDescription').value;
            const enableNotifications = document.getElementById('goalNotifications').checked;
            
            // Validate inputs
            if (!title.trim()) {
                this.showMessage('Please enter a goal title', 'error');
                return;
            }
            
            if (!type) {
                this.showMessage('Please select a goal type', 'error');
                return;
            }
            
            if (!targetAmount || targetAmount <= 0) {
                this.showMessage('Please enter a valid target amount', 'error');
                return;
            }
            
            if (currentAmount < 0) {
                this.showMessage('Current amount cannot be negative', 'error');
                return;
            }
            
            if (!startDate) {
                this.showMessage('Please select a start date', 'error');
                return;
            }
            
            if (!targetDate) {
                this.showMessage('Please select a target date', 'error');
                return;
            }
            
            if (new Date(targetDate) <= new Date(startDate)) {
                this.showMessage('Target date must be after start date', 'error');
                return;
            }
            
            // Create goal object
            const goalData = {
                title: title.trim(),
                type: type,
                priority: priority,
                targetAmount: targetAmount,
                currentAmount: currentAmount,
                startDate: new Date(startDate),
                targetDate: new Date(targetDate),
                description: description.trim(),
                enableNotifications: enableNotifications,
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Add to Firestore
            const docRef = await this.db.collection('goals').add(goalData);
            
            // Show success message
            this.showMessage(`Goal "${title}" created successfully!`, 'success');
            
            // Close modal
            this.hideAddGoalModal();
            
            // Add to local array
            const newGoal = {
                id: docRef.id,
                ...goalData
            };
            
            this.goals.unshift(newGoal);
            
            // Update UI
            this.updateOverviewStatistics();
            this.updateGoalsChart();
            this.updateGoalsGrid();
            
        } catch (error) {
            console.error("Error adding goal:", error);
            this.showMessage('Error creating goal: ' + error.message, 'error');
        }
    }
    
    async editGoal(goalId) {
        try {
            const goal = this.goals.find(g => g.id === goalId);
            if (!goal) {
                this.showMessage('Goal not found', 'error');
                return;
            }
            
            // Populate edit form
            document.getElementById('editGoalId').value = goal.id;
            document.getElementById('editGoalTitle').value = goal.title || '';
            document.getElementById('editGoalType').value = goal.type || 'savings';
            document.getElementById('editGoalPriority').value = goal.priority || 'medium';
            document.getElementById('editTargetAmount').value = goal.targetAmount || 0;
            document.getElementById('editCurrentAmount').value = goal.currentAmount || 0;
            document.getElementById('editGoalDescription').value = goal.description || '';
            document.getElementById('editGoalNotifications').checked = goal.enableNotifications || false;
            
            // Format dates
            document.getElementById('editStartDate').value = goal.startDate ? 
                goal.startDate.toISOString().split('T')[0] : '';
            document.getElementById('editTargetDate').value = goal.targetDate ? 
                goal.targetDate.toISOString().split('T')[0] : '';
            
            // Show modal
            this.showEditGoalModal();
            
        } catch (error) {
            console.error("Error preparing goal edit:", error);
            this.showMessage('Error loading goal data: ' + error.message, 'error');
        }
    }
    
    async updateGoal() {
        try {
            const goalId = document.getElementById('editGoalId').value;
            const title = document.getElementById('editGoalTitle').value;
            const type = document.getElementById('editGoalType').value;
            const priority = document.getElementById('editGoalPriority').value;
            const targetAmount = parseFloat(document.getElementById('editTargetAmount').value);
            const currentAmount = parseFloat(document.getElementById('editCurrentAmount').value);
            const startDate = document.getElementById('editStartDate').value;
            const targetDate = document.getElementById('editTargetDate').value;
            const description = document.getElementById('editGoalDescription').value;
            const enableNotifications = document.getElementById('editGoalNotifications').checked;
            
            // Validate inputs
            if (!title.trim()) {
                this.showMessage('Please enter a goal title', 'error');
                return;
            }
            
            if (!targetAmount || targetAmount <= 0) {
                this.showMessage('Please enter a valid target amount', 'error');
                return;
            }
            
            if (currentAmount < 0) {
                this.showMessage('Current amount cannot be negative', 'error');
                return;
            }
            
            if (!startDate) {
                this.showMessage('Please select a start date', 'error');
                return;
            }
            
            if (!targetDate) {
                this.showMessage('Please select a target date', 'error');
                return;
            }
            
            // Update goal in Firestore
            await this.db.collection('goals').doc(goalId).update({
                title: title.trim(),
                type: type,
                priority: priority,
                targetAmount: targetAmount,
                currentAmount: currentAmount,
                startDate: new Date(startDate),
                targetDate: new Date(targetDate),
                description: description.trim(),
                enableNotifications: enableNotifications,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Show success message
            this.showMessage(`Goal updated successfully!`, 'success');
            
            // Close modal
            this.hideEditGoalModal();
            
            // Update local data
            const goalIndex = this.goals.findIndex(g => g.id === goalId);
            if (goalIndex !== -1) {
                this.goals[goalIndex] = {
                    ...this.goals[goalIndex],
                    title: title.trim(),
                    type: type,
                    priority: priority,
                    targetAmount: targetAmount,
                    currentAmount: currentAmount,
                    startDate: new Date(startDate),
                    targetDate: new Date(targetDate),
                    description: description.trim(),
                    enableNotifications: enableNotifications,
                    updatedAt: new Date()
                };
            }
            
            // Update UI
            this.updateOverviewStatistics();
            this.updateGoalsChart();
            this.updateGoalsGrid();
            
        } catch (error) {
            console.error("Error updating goal:", error);
            this.showMessage('Error updating goal: ' + error.message, 'error');
        }
    }
    
    async deleteGoal(goalId) {
        try {
            const goal = this.goals.find(g => g.id === goalId);
            if (!goal) {
                this.showMessage('Goal not found', 'error');
                return;
            }
            
            const confirmMessage = `Are you sure you want to delete the goal "${goal.title}"?`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Delete from Firestore
            await this.db.collection('goals').doc(goalId).delete();
            
            // Remove from local array
            this.goals = this.goals.filter(g => g.id !== goalId);
            
            // Show success message
            this.showMessage(`Goal deleted successfully!`, 'success');
            
            // Update UI
            this.updateOverviewStatistics();
            this.updateGoalsChart();
            this.updateGoalsGrid();
            
        } catch (error) {
            console.error("Error deleting goal:", error);
            this.showMessage('Error deleting goal: ' + error.message, 'error');
        }
    }
    
    async updateProgress(goalId) {
        try {
            const goal = this.goals.find(g => g.id === goalId);
            if (!goal) {
                this.showMessage('Goal not found', 'error');
                return;
            }
            
            const currentAmount = parseFloat(prompt(
                `Update current amount for "${goal.title}"\nTarget: $${(goal.targetAmount || 0).toLocaleString()}\nCurrent: $${(goal.currentAmount || 0).toLocaleString()}`,
                goal.currentAmount || 0
            ));
            
            if (isNaN(currentAmount) || currentAmount < 0) {
                this.showMessage('Please enter a valid amount', 'error');
                return;
            }
            
            // Update in Firestore
            await this.db.collection('goals').doc(goalId).update({
                currentAmount: currentAmount,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update local data
            const goalIndex = this.goals.findIndex(g => g.id === goalId);
            if (goalIndex !== -1) {
                this.goals[goalIndex].currentAmount = currentAmount;
                this.goals[goalIndex].updatedAt = new Date();
            }
            
            // Show success message
            this.showMessage(`Progress updated to $${currentAmount.toLocaleString()}!`, 'success');
            
            // Update UI
            this.updateOverviewStatistics();
            this.updateGoalsChart();
            this.updateGoalsGrid();
            
        } catch (error) {
            console.error("Error updating progress:", error);
            this.showMessage('Error updating progress: ' + error.message, 'error');
        }
    }
    
    useTemplate(templateType) {
        const templates = {
            'emergency': {
                title: 'Emergency Fund',
                type: 'savings',
                targetAmount: 10000,
                description: 'Save 3-6 months of living expenses for emergencies'
            },
            'debt': {
                title: 'Become Debt Free',
                type: 'debt',
                targetAmount: 5000,
                description: 'Pay off all credit card debt'
            },
            'vacation': {
                title: 'Dream Vacation',
                type: 'savings',
                targetAmount: 3000,
                description: 'Save for a dream vacation'
            }
        };
        
        const template = templates[templateType];
        if (!template) return;
        
        // Set form values
        document.getElementById('goalTitle').value = template.title;
        document.getElementById('goalType').value = template.type;
        document.getElementById('targetAmount').value = template.targetAmount;
        document.getElementById('goalDescription').value = template.description;
        
        // Show modal if not already open
        if (!document.getElementById('addGoalModal').classList.contains('active')) {
            this.showAddGoalModal();
        }
        
        this.showMessage(`Template "${template.title}" loaded`, 'info');
    }
    
    exportGoals() {
        try {
            const exportData = this.goals.map(goal => {
                const progress = this.calculateProgress(goal);
                const expected = this.calculateExpectedProgress(goal);
                const remaining = Math.max(0, (goal.targetAmount || 0) - (goal.currentAmount || 0));
                
                // Calculate days remaining
                let daysRemaining = 'N/A';
                if (goal.targetDate) {
                    const now = new Date();
                    const diffTime = goal.targetDate.getTime() - now.getTime();
                    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    daysRemaining = days > 0 ? days.toString() : 'Overdue';
                }
                
                return {
                    'Title': goal.title || 'N/A',
                    'Type': this.formatGoalType(goal.type),
                    'Priority': goal.priority || 'medium',
                    'Target Amount': goal.targetAmount || 0,
                    'Current Amount': goal.currentAmount || 0,
                    'Remaining Amount': remaining,
                    'Progress %': progress.toFixed(2),
                    'Expected Progress %': expected.toFixed(2),
                    'Status': progress >= 100 ? 'Completed' : expected > progress ? 'Behind' : 'On Track',
                    'Start Date': goal.startDate ? goal.startDate.toISOString().split('T')[0] : 'N/A',
                    'Target Date': goal.targetDate ? goal.targetDate.toISOString().split('T')[0] : 'N/A',
                    'Days Remaining': daysRemaining,
                    'Description': goal.description || '',
                    'Created': goal.createdAt ? goal.createdAt.toISOString().split('T')[0] : 'N/A'
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
            a.download = `goals_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showMessage('Goals exported successfully!', 'success');
            
        } catch (error) {
            console.error("Error exporting goals:", error);
            this.showMessage('Error exporting data: ' + error.message, 'error');
        }
    }
    
    showLoading(show) {
        const goalsGrid = document.getElementById('goalsGrid');
        if (show && goalsGrid.innerHTML.includes('loading-state')) {
            return; // Already showing loading
        }
        
        if (show) {
            goalsGrid.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading goals data...</p>
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

// Initialize goal manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.goalManager = new GoalManager();
});