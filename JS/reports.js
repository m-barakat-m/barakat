// reports.js - النسخة الكاملة المحدثة
class ReportsManager {
    constructor() {
        this.reports = [];
        this.scheduledReports = [];
        this.filteredReports = [];
        this.currentFilter = 'all';
        this.currentChartPeriod = 'monthly';
        this.init();
    }

    async init() {
        console.log("🚀 Initializing Reports Manager...");
        
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
            
            // Setup real-time listener
            this.setupRealtimeListener();
            
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
        
        // Generate report button
        document.getElementById('generateReportBtn').addEventListener('click', () => {
            this.showGenerateReportModal();
        });
        
        // Report type filter
        document.getElementById('reportTypeFilter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.filterReports();
        });
        
        // Chart period selector
        document.getElementById('chartPeriod').addEventListener('change', (e) => {
            this.currentChartPeriod = e.target.value;
            this.updateCharts();
        });
        
        // Add schedule button
        document.getElementById('addScheduleBtn').addEventListener('click', () => {
            this.showScheduleModal();
        });
        
        // Export options
        document.querySelectorAll('.export-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.closest('.export-option').dataset.format;
                this.exportReports(format);
            });
        });
        
        // Modal close buttons
        document.getElementById('closeGenerateReportModal').addEventListener('click', () => {
            this.hideGenerateReportModal();
        });
        
        document.getElementById('closeReportPreviewModal').addEventListener('click', () => {
            this.hideReportPreviewModal();
        });
        
        // Generate report form
        document.getElementById('generateReportForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateNewReport();
        });
        
        document.getElementById('cancelGenerateReportBtn').addEventListener('click', () => {
            this.hideGenerateReportModal();
        });
        
        // Schedule report checkbox
        document.getElementById('scheduleReport').addEventListener('change', (e) => {
            document.getElementById('scheduleOptions').style.display = 
                e.target.checked ? 'block' : 'none';
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
    
    async loadInitialData() {
        try {
            // Show loading state
            this.showLoading(true);
            
            // Load all data in parallel
            await Promise.all([
                this.loadReportsData(),
                this.loadScheduledReports(),
                this.loadReportStatistics()
            ]);
            
            // Update charts
            this.initCharts();
            
            // Update statistics
            this.updateStatistics();
            
            // Filter reports
            this.filterReports();
            
            // Hide loading state
            this.showLoading(false);
            
        } catch (error) {
            console.error("❌ Error loading initial data:", error);
            this.showError("Error loading data: " + error.message);
            this.showLoading(false);
        }
    }
    
    async loadReportsData() {
        try {
            const reportsSnapshot = await this.db.collection('reports')
                .orderBy('generatedAt', 'desc')
                .limit(100)
                .get();
            
            this.reports = [];
            
            reportsSnapshot.forEach(doc => {
                const reportData = doc.data();
                const report = {
                    id: doc.id,
                    ...reportData,
                    generatedAt: reportData.generatedAt?.toDate(),
                    dateFrom: reportData.dateFrom?.toDate(),
                    dateTo: reportData.dateTo?.toDate()
                };
                
                this.reports.push(report);
            });
            
            console.log(`✅ Loaded ${this.reports.length} reports`);
            
        } catch (error) {
            console.error("Error loading reports data:", error);
            throw error;
        }
    }
    
    async loadScheduledReports() {
        try {
            const scheduledSnapshot = await this.db.collection('scheduled_reports')
                .orderBy('nextRun', 'asc')
                .limit(20)
                .get();
            
            this.scheduledReports = [];
            
            scheduledSnapshot.forEach(doc => {
                const scheduledData = doc.data();
                this.scheduledReports.push({
                    id: doc.id,
                    ...scheduledData,
                    nextRun: scheduledData.nextRun?.toDate(),
                    lastRun: scheduledData.lastRun?.toDate()
                });
            });
            
            console.log(`✅ Loaded ${this.scheduledReports.length} scheduled reports`);
            
            // Update UI
            this.updateScheduledReportsList();
            
        } catch (error) {
            console.error("Error loading scheduled reports:", error);
        }
    }
    
    async loadReportStatistics() {
        try {
            // Calculate total size
            let totalSize = 0;
            this.reports.forEach(report => {
                totalSize += report.size || 0;
            });
            
            const avgSize = this.reports.length > 0 ? 
                Math.round(totalSize / this.reports.length) : 0;
            
            // Find most viewed report
            let mostViewed = { title: '-', views: 0 };
            this.reports.forEach(report => {
                if (report.views > mostViewed.views) {
                    mostViewed = { title: report.title, views: report.views };
                }
            });
            
            // Calculate this month reports
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const thisMonthCount = this.reports.filter(report => 
                report.generatedAt && report.generatedAt >= startOfMonth
            ).length;
            
            // Find last generated report
            const lastReport = this.reports.length > 0 ? 
                this.reports[0] : null;
            
            // Update UI
            document.getElementById('totalReports').textContent = this.reports.length;
            document.getElementById('thisMonthReports').textContent = thisMonthCount;
            document.getElementById('mostViewedReport').textContent = 
                mostViewed.title.length > 15 ? 
                mostViewed.title.substring(0, 15) + '...' : mostViewed.title;
            document.getElementById('viewCount').textContent = mostViewed.views;
            
            document.getElementById('lastReportDate').textContent = lastReport ? 
                lastReport.generatedAt.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                }) : '-';
            document.getElementById('lastReportBy').textContent = lastReport ? 
                lastReport.generatedBy?.split(' ')[0] || 'System' : '-';
            
            document.getElementById('avgReportSize').textContent = 
                this.formatFileSize(avgSize);
            
        } catch (error) {
            console.error("Error loading report statistics:", error);
        }
    }
    
    updateScheduledReportsList() {
        const scheduledList = document.getElementById('scheduledList');
        
        if (this.scheduledReports.length === 0) {
            scheduledList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-alt"></i>
                    <h4>No Scheduled Reports</h4>
                    <p>Add your first scheduled report</p>
                </div>
            `;
            return;
        }
        
        scheduledList.innerHTML = this.scheduledReports.map(scheduled => {
            const nextRunStr = scheduled.nextRun ? 
                scheduled.nextRun.toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'Not scheduled';
            
            const frequencyMap = {
                'daily': 'Every day',
                'weekly': 'Every week',
                'monthly': 'Every month',
                'quarterly': 'Every quarter',
                'yearly': 'Every year'
            };
            
            return `
                <div class="scheduled-item" data-schedule-id="${scheduled.id}">
                    <div class="scheduled-info">
                        <h4>${scheduled.title || 'Untitled Report'}</h4>
                        <p>${frequencyMap[scheduled.frequency] || scheduled.frequency} • ${scheduled.format.toUpperCase()}</p>
                        <small>Next: ${nextRunStr}</small>
                    </div>
                    <div class="scheduled-actions">
                        <button class="btn btn-sm btn-secondary" onclick="reportsManager.editSchedule('${scheduled.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="reportsManager.deleteSchedule('${scheduled.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    initCharts() {
        // Reports Trend Chart
        const trendCtx = document.getElementById('reportsTrendChart');
        if (!trendCtx) return;
        
        this.charts = {
            trend: new Chart(trendCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Reports Generated',
                        data: [],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            }),
            
            type: new Chart(document.getElementById('reportsTypeChart').getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                            '#9966FF', '#FF9F40', '#8AC926', '#1982C4'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            })
        };
        
        // Update charts with data
        this.updateCharts();
    }
    
    updateCharts() {
        if (!this.charts || this.reports.length === 0) return;
        
        // Update trend chart based on period
        const trendData = this.getTrendData(this.currentChartPeriod);
        this.charts.trend.data.labels = trendData.labels;
        this.charts.trend.data.datasets[0].data = trendData.data;
        this.charts.trend.update();
        
        // Update type distribution chart
        const typeData = this.getTypeDistributionData();
        this.charts.type.data.labels = typeData.labels;
        this.charts.type.data.datasets[0].data = typeData.data;
        this.charts.type.update();
    }
    
    getTrendData(period) {
        const now = new Date();
        let labels = [];
        let data = [];
        
        switch (period) {
            case 'monthly':
                for (let i = 5; i >= 0; i--) {
                    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
                    
                    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                    
                    const count = this.reports.filter(report => 
                        report.generatedAt && 
                        report.generatedAt >= startOfMonth && 
                        report.generatedAt <= endOfMonth
                    ).length;
                    
                    data.push(count);
                }
                break;
                
            case 'quarterly':
                for (let i = 3; i >= 0; i--) {
                    const quarter = Math.floor((now.getMonth() - (i * 3)) / 3);
                    const year = now.getFullYear();
                    labels.push(`Q${quarter + 1} ${year}`);
                    
                    // Simplified for demo - in production, calculate actual quarterly counts
                    data.push(Math.floor(Math.random() * 5) + 1);
                }
                break;
                
            case 'yearly':
                for (let i = 4; i >= 0; i--) {
                    const year = now.getFullYear() - i;
                    labels.push(year.toString());
                    
                    const count = this.reports.filter(report => 
                        report.generatedAt && 
                        report.generatedAt.getFullYear() === year
                    ).length;
                    
                    data.push(count);
                }
                break;
        }
        
        return { labels, data };
    }
    
    getTypeDistributionData() {
        const typeCounts = {};
        this.reports.forEach(report => {
            const type = report.type || 'other';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        
        const labels = Object.keys(typeCounts);
        const data = Object.values(typeCounts);
        
        return { labels, data };
    }
    
    filterReports() {
        const reportsGrid = document.getElementById('reportsGrid');
        
        if (this.reports.length === 0) {
            reportsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h4>No Reports Found</h4>
                    <p>${this.currentFilter !== 'all' ? 'Try a different filter' : 'Generate your first report'}</p>
                </div>
            `;
            return;
        }
        
        let filtered = this.reports;
        if (this.currentFilter !== 'all') {
            filtered = this.reports.filter(report => 
                report.type === this.currentFilter
            );
        }
        
        reportsGrid.innerHTML = filtered.map(report => {
            const dateStr = report.generatedAt ? 
                report.generatedAt.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                }) : 'N/A';
            
            const sizeStr = this.formatFileSize(report.size || 0);
            const typeIcon = this.getReportTypeIcon(report.type);
            
            return `
                <div class="report-card" data-report-id="${report.id}">
                    <div class="report-card-header">
                        <div class="report-icon">
                            <i class="${typeIcon}"></i>
                        </div>
                        <div class="report-title">
                            <h4>${report.title || 'Untitled Report'}</h4>
                            <span class="report-type">${report.type || 'general'}</span>
                        </div>
                        <div class="report-actions">
                            <button class="action-btn" onclick="reportsManager.previewReport('${report.id}')" title="Preview">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn" onclick="reportsManager.downloadReport('${report.id}')" title="Download">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    </div>
                    <div class="report-card-body">
                        <p>${report.description || 'No description available'}</p>
                        <div class="report-meta">
                            <span><i class="fas fa-calendar"></i> ${dateStr}</span>
                            <span><i class="fas fa-user"></i> ${report.generatedBy || 'System'}</span>
                            <span><i class="fas fa-file"></i> ${sizeStr}</span>
                            <span><i class="fas fa-eye"></i> ${report.views || 0} views</span>
                        </div>
                    </div>
                    <div class="report-card-footer">
                        <span class="report-format">${report.format?.toUpperCase() || 'PDF'}</span>
                        <button class="btn btn-sm btn-primary" onclick="reportsManager.regenerateReport('${report.id}')">
                            <i class="fas fa-redo"></i> Regenerate
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    getReportTypeIcon(type) {
        const icons = {
            'monthly': 'fas fa-calendar-alt',
            'budget': 'fas fa-chart-pie',
            'income': 'fas fa-money-bill-wave',
            'expense': 'fas fa-shopping-cart',
            'goal': 'fas fa-bullseye',
            'comparison': 'fas fa-exchange-alt',
            'custom': 'fas fa-cog'
        };
        
        return icons[type] || 'fas fa-file-alt';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async generateNewReport() {
        try {
            const reportName = document.getElementById('reportName').value;
            const reportType = document.getElementById('reportType').value;
            const reportFormat = document.getElementById('reportFormat').value;
            const dateFrom = document.getElementById('dateFrom').value;
            const dateTo = document.getElementById('dateTo').value;
            const description = document.getElementById('reportDescription').value;
            
            // Validate inputs
            if (!reportName || !reportType || !reportFormat || !dateFrom || !dateTo) {
                this.showMessage('Please fill in all required fields', 'error');
                return;
            }
            
            if (new Date(dateFrom) > new Date(dateTo)) {
                this.showMessage('From date cannot be after To date', 'error');
                return;
            }
            
            // Get filters
            const includeIncomes = document.getElementById('includeIncomes').checked;
            const includeExpenses = document.getElementById('includeExpenses').checked;
            const includeBudgets = document.getElementById('includeBudgets').checked;
            const includeGoals = document.getElementById('includeGoals').checked;
            const includeCharts = document.getElementById('includeCharts').checked;
            const includeDetails = document.getElementById('includeDetails').checked;
            
            // Get current user
            const user = this.auth.currentUser;
            const employeeDoc = await this.db.collection('employees').doc(user.uid).get();
            const employeeData = employeeDoc.data();
            
            // Show generating message
            this.showMessage('Generating report... This may take a moment.', 'info');
            
            // Collect report data
            const reportData = await this.collectReportData({
                dateFrom: new Date(dateFrom),
                dateTo: new Date(dateTo),
                includeIncomes,
                includeExpenses,
                includeBudgets,
                includeGoals
            });
            
            // Create report document
            const reportDoc = {
                title: reportName,
                type: reportType,
                format: reportFormat,
                description: description,
                dateFrom: new Date(dateFrom),
                dateTo: new Date(dateTo),
                generatedBy: employeeData.name || user.email,
                generatedByUserId: user.uid,
                generatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                filters: {
                    includeIncomes,
                    includeExpenses,
                    includeBudgets,
                    includeGoals,
                    includeCharts,
                    includeDetails
                },
                data: reportData,
                size: JSON.stringify(reportData).length,
                views: 0,
                downloadCount: 0
            };
            
            // Check if scheduled
            const isScheduled = document.getElementById('scheduleReport').checked;
            if (isScheduled) {
                const frequency = document.getElementById('scheduleFrequency').value;
                const scheduleDay = parseInt(document.getElementById('scheduleDay').value) || 1;
                
                reportDoc.schedule = {
                    frequency,
                    scheduleDay,
                    isActive: true
                };
                
                // Add to scheduled reports
                await this.createScheduledReport(reportDoc);
            }
            
            // Save report to Firestore
            const reportRef = await this.db.collection('reports').add(reportDoc);
            
            // Generate and download file
            const fileContent = this.generateFileContent(reportData, reportFormat);
            this.downloadFile(fileContent, reportName, reportFormat);
            
            // Update UI
            this.showMessage(`Report "${reportName}" generated successfully!`, 'success');
            this.hideGenerateReportModal();
            
            // Reload reports
            await this.loadReportsData();
            this.filterReports();
            this.updateStatistics();
            this.updateCharts();
            
        } catch (error) {
            console.error("Error generating report:", error);
            this.showMessage('Error generating report: ' + error.message, 'error');
        }
    }
    
    async collectReportData(params) {
        const data = {
            summary: {},
            incomes: [],
            expenses: [],
            budgets: [],
            goals: []
        };
        
        const { dateFrom, dateTo, includeIncomes, includeExpenses, includeBudgets, includeGoals } = params;
        
        // Collect incomes
        if (includeIncomes) {
            const incomesSnapshot = await this.db.collection('incomes')
                .where('date', '>=', dateFrom)
                .where('date', '<=', dateTo)
                .get();
            
            data.incomes = incomesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate()
            }));
            
            data.summary.totalIncome = data.incomes.reduce((sum, income) => 
                sum + (Number(income.amount) || 0), 0);
        }
        
        // Collect expenses
        if (includeExpenses) {
            const expensesSnapshot = await this.db.collection('expenses')
                .where('date', '>=', dateFrom)
                .where('date', '<=', dateTo)
                .get();
            
            data.expenses = expensesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate()
            }));
            
            data.summary.totalExpenses = data.expenses.reduce((sum, expense) => 
                sum + (Number(expense.amount) || 0), 0);
        }
        
        // Calculate net balance
        data.summary.netBalance = (data.summary.totalIncome || 0) - (data.summary.totalExpenses || 0);
        
        // Collect budgets
        if (includeBudgets) {
            const budgetsSnapshot = await this.db.collection('budgets').get();
            data.budgets = budgetsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }
        
        // Collect goals
        if (includeGoals) {
            const goalsSnapshot = await this.db.collection('goals').get();
            data.goals = goalsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }
        
        // Add timestamp
        data.generatedAt = new Date().toISOString();
        data.period = {
            from: dateFrom.toISOString(),
            to: dateTo.toISOString()
        };
        
        return data;
    }
    
    generateFileContent(data, format) {
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
                
            case 'csv':
                return this.convertToCSV(data);
                
            case 'excel':
                // For Excel, we'll create a CSV with BOM for Excel compatibility
                return '\ufeff' + this.convertToCSV(data);
                
            case 'pdf':
            default:
                // For PDF, return HTML that could be converted
                return this.generateHTMLReport(data);
        }
    }
    
    convertToCSV(data) {
        // Convert summary to CSV
        const summaryRows = [
            ['Report Summary'],
            ['Total Income', `$${data.summary.totalIncome || 0}`],
            ['Total Expenses', `$${data.summary.totalExpenses || 0}`],
            ['Net Balance', `$${data.summary.netBalance || 0}`],
            [''],
            ['Incomes', data.incomes.length],
            ['Expenses', data.expenses.length],
            ['Budgets', data.budgets.length],
            ['Goals', data.goals.length],
            [''],
            ['Generated At', data.generatedAt],
            ['Period From', data.period.from],
            ['Period To', data.period.to]
        ];
        
        // Convert incomes to CSV
        const incomeRows = [['INCOMES'], ['Date', 'Amount', 'Description', 'Category']];
        data.incomes.forEach(income => {
            incomeRows.push([
                income.date?.toISOString().split('T')[0] || '',
                `$${income.amount || 0}`,
                income.description || '',
                income.category || ''
            ]);
        });
        
        // Convert expenses to CSV
        const expenseRows = [['EXPENSES'], ['Date', 'Amount', 'Description', 'Category']];
        data.expenses.forEach(expense => {
            expenseRows.push([
                expense.date?.toISOString().split('T')[0] || '',
                `$${expense.amount || 0}`,
                expense.description || '',
                expense.category || ''
            ]);
        });
        
        // Combine all sections
        const allRows = [...summaryRows, [''], ...incomeRows, [''], ...expenseRows];
        
        return allRows.map(row => row.join(',')).join('\n');
    }
    
    generateHTMLReport(data) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${data.summary.title || 'Financial Report'}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    h1 { color: #333; }
                    .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background: #667eea; color: white; }
                </style>
            </head>
            <body>
                <h1>Financial Report</h1>
                <div class="summary">
                    <h2>Summary</h2>
                    <p><strong>Total Income:</strong> $${data.summary.totalIncome || 0}</p>
                    <p><strong>Total Expenses:</strong> $${data.summary.totalExpenses || 0}</p>
                    <p><strong>Net Balance:</strong> $${data.summary.netBalance || 0}</p>
                    <p><strong>Generated:</strong> ${new Date(data.generatedAt).toLocaleString()}</p>
                </div>
                
                ${data.incomes.length > 0 ? `
                <h2>Incomes (${data.incomes.length})</h2>
                <table>
                    <tr><th>Date</th><th>Amount</th><th>Description</th></tr>
                    ${data.incomes.map(income => `
                        <tr>
                            <td>${income.date?.toISOString().split('T')[0] || ''}</td>
                            <td>$${income.amount || 0}</td>
                            <td>${income.description || ''}</td>
                        </tr>
                    `).join('')}
                </table>
                ` : ''}
                
                ${data.expenses.length > 0 ? `
                <h2>Expenses (${data.expenses.length})</h2>
                <table>
                    <tr><th>Date</th><th>Amount</th><th>Description</th><th>Category</th></tr>
                    ${data.expenses.map(expense => `
                        <tr>
                            <td>${expense.date?.toISOString().split('T')[0] || ''}</td>
                            <td>$${expense.amount || 0}</td>
                            <td>${expense.description || ''}</td>
                            <td>${expense.category || ''}</td>
                        </tr>
                    `).join('')}
                </table>
                ` : ''}
            </body>
            </html>
        `;
    }
    
    downloadFile(content, filename, format) {
        let mimeType, extension;
        
        switch (format) {
            case 'json':
                mimeType = 'application/json';
                extension = 'json';
                break;
            case 'csv':
                mimeType = 'text/csv';
                extension = 'csv';
                break;
            case 'excel':
                mimeType = 'application/vnd.ms-excel';
                extension = 'xls';
                break;
            case 'pdf':
                mimeType = 'text/html'; // For demo, in production would be 'application/pdf'
                extension = 'html';
                break;
            default:
                mimeType = 'text/plain';
                extension = 'txt';
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename.replace(/[^a-z0-9]/gi, '_')}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
    
    async previewReport(reportId) {
        try {
            const report = this.reports.find(r => r.id === reportId);
            if (!report) {
                this.showMessage('Report not found', 'error');
                return;
            }
            
            // Increment view count
            await this.db.collection('reports').doc(reportId).update({
                views: firebase.firestore.FieldValue.increment(1)
            });
            
            report.views = (report.views || 0) + 1;
            this.updateStatistics();
            
            // Show preview
            const previewContent = document.getElementById('reportPreviewContent');
            previewContent.innerHTML = this.generatePreviewHTML(report);
            
            document.getElementById('reportPreviewModal').classList.add('active');
            
        } catch (error) {
            console.error("Error previewing report:", error);
            this.showMessage('Error previewing report: ' + error.message, 'error');
        }
    }
    
    generatePreviewHTML(report) {
        const dateStr = report.generatedAt ? 
            report.generatedAt.toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'N/A';
        
        const periodStr = report.dateFrom && report.dateTo ? 
            `${report.dateFrom.toLocaleDateString()} - ${report.dateTo.toLocaleDateString()}` : 
            'N/A';
        
        return `
            <div class="report-preview">
                <div class="report-preview-header">
                    <h2>${report.title || 'Untitled Report'}</h2>
                    <div class="report-meta">
                        <span><i class="fas fa-calendar"></i> ${dateStr}</span>
                        <span><i class="fas fa-user"></i> ${report.generatedBy || 'System'}</span>
                        <span><i class="fas fa-chart-pie"></i> ${report.type || 'general'}</span>
                        <span><i class="fas fa-file"></i> ${report.format?.toUpperCase() || 'PDF'}</span>
                    </div>
                </div>
                
                <div class="report-preview-description">
                    <h4>Description</h4>
                    <p>${report.description || 'No description available'}</p>
                </div>
                
                <div class="report-preview-details">
                    <div class="detail-section">
                        <h4><i class="fas fa-cog"></i> Report Settings</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Report Type:</span>
                                <span class="detail-value">${report.type || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Format:</span>
                                <span class="detail-value">${report.format?.toUpperCase() || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Period:</span>
                                <span class="detail-value">${periodStr}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">File Size:</span>
                                <span class="detail-value">${this.formatFileSize(report.size || 0)}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${report.filters ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-filter"></i> Included Data</h4>
                        <div class="filter-tags">
                            ${report.filters.includeIncomes ? '<span class="filter-tag active">Incomes</span>' : ''}
                            ${report.filters.includeExpenses ? '<span class="filter-tag active">Expenses</span>' : ''}
                            ${report.filters.includeBudgets ? '<span class="filter-tag active">Budgets</span>' : ''}
                            ${report.filters.includeGoals ? '<span class="filter-tag active">Goals</span>' : ''}
                            ${report.filters.includeCharts ? '<span class="filter-tag active">Charts</span>' : ''}
                            ${report.filters.includeDetails ? '<span class="filter-tag active">Details</span>' : ''}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${report.data?.summary ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-chart-bar"></i> Summary</h4>
                        <div class="summary-stats">
                            <div class="stat-box">
                                <span class="stat-label">Total Income</span>
                                <span class="stat-value positive">$${report.data.summary.totalIncome || 0}</span>
                            </div>
                            <div class="stat-box">
                                <span class="stat-label">Total Expenses</span>
                                <span class="stat-value negative">$${report.data.summary.totalExpenses || 0}</span>
                            </div>
                            <div class="stat-box">
                                <span class="stat-label">Net Balance</span>
                                <span class="stat-value ${(report.data.summary.netBalance || 0) >= 0 ? 'positive' : 'negative'}">
                                    $${report.data.summary.netBalance || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="report-preview-actions">
                    <button class="btn btn-primary" onclick="reportsManager.downloadReport('${report.id}')">
                        <i class="fas fa-download"></i> Download Report
                    </button>
                    <button class="btn btn-secondary" onclick="reportsManager.regenerateReport('${report.id}')">
                        <i class="fas fa-redo"></i> Regenerate
                    </button>
                </div>
            </div>
        `;
    }
    
    async downloadReport(reportId) {
        try {
            const report = this.reports.find(r => r.id === reportId);
            if (!report) {
                this.showMessage('Report not found', 'error');
                return;
            }
            
            // Increment download count
            await this.db.collection('reports').doc(reportId).update({
                downloadCount: firebase.firestore.FieldValue.increment(1)
            });
            
            // Generate file content
            const fileContent = this.generateFileContent(report.data, report.format);
            this.downloadFile(fileContent, report.title, report.format);
            
            this.showMessage('Report downloaded successfully!', 'success');
            
        } catch (error) {
            console.error("Error downloading report:", error);
            this.showMessage('Error downloading report: ' + error.message, 'error');
        }
    }
    
    async regenerateReport(reportId) {
        try {
            const report = this.reports.find(r => r.id === reportId);
            if (!report) {
                this.showMessage('Report not found', 'error');
                return;
            }
            
            // Create new report with same settings
            const newReport = {
                ...report,
                id: null, // Will generate new ID
                generatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                views: 0,
                downloadCount: 0
            };
            
            // Remove original ID and dates
            delete newReport.id;
            
            // Save new report
            const newReportRef = await this.db.collection('reports').add(newReport);
            
            this.showMessage('Report regenerated successfully!', 'success');
            
            // Reload reports
            await this.loadReportsData();
            this.filterReports();
            
        } catch (error) {
            console.error("Error regenerating report:", error);
            this.showMessage('Error regenerating report: ' + error.message, 'error');
        }
    }
    
    async createScheduledReport(reportData) {
        try {
            const scheduleData = {
                title: reportData.title,
                type: reportData.type,
                format: reportData.format,
                frequency: reportData.schedule.frequency,
                scheduleDay: reportData.schedule.scheduleDay,
                filters: reportData.filters,
                isActive: true,
                createdBy: reportData.generatedByUserId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                nextRun: this.calculateNextRun(
                    reportData.schedule.frequency,
                    reportData.schedule.scheduleDay
                ),
                lastRun: null
            };
            
            await this.db.collection('scheduled_reports').add(scheduleData);
            
        } catch (error) {
            console.error("Error creating scheduled report:", error);
        }
    }
    
    calculateNextRun(frequency, day) {
        const now = new Date();
        const nextRun = new Date(now);
        
        switch (frequency) {
            case 'daily':
                nextRun.setDate(nextRun.getDate() + 1);
                break;
            case 'weekly':
                nextRun.setDate(nextRun.getDate() + 7);
                break;
            case 'monthly':
                nextRun.setMonth(nextRun.getMonth() + 1);
                nextRun.setDate(day || 1);
                break;
            case 'quarterly':
                nextRun.setMonth(nextRun.getMonth() + 3);
                nextRun.setDate(day || 1);
                break;
            case 'yearly':
                nextRun.setFullYear(nextRun.getFullYear() + 1);
                nextRun.setMonth(0);
                nextRun.setDate(day || 1);
                break;
        }
        
        // Set to 8:00 AM
        nextRun.setHours(8, 0, 0, 0);
        
        return nextRun;
    }
    
    async editSchedule(scheduleId) {
        // Implementation for editing schedule
        this.showMessage('Edit schedule functionality coming soon', 'info');
    }
    
    async deleteSchedule(scheduleId) {
        try {
            if (!confirm('Are you sure you want to delete this scheduled report?')) {
                return;
            }
            
            await this.db.collection('scheduled_reports').doc(scheduleId).delete();
            
            // Remove from local array
            this.scheduledReports = this.scheduledReports.filter(s => s.id !== scheduleId);
            
            // Update UI
            this.updateScheduledReportsList();
            
            this.showMessage('Scheduled report deleted successfully!', 'success');
            
        } catch (error) {
            console.error("Error deleting schedule:", error);
            this.showMessage('Error deleting schedule: ' + error.message, 'error');
        }
    }
    
    async exportReports(format) {
        try {
            if (this.reports.length === 0) {
                this.showMessage('No reports to export', 'warning');
                return;
            }
            
            const exportData = this.reports.map(report => ({
                'Title': report.title || '',
                'Type': report.type || '',
                'Format': report.format || '',
                'Generated By': report.generatedBy || '',
                'Generated At': report.generatedAt?.toISOString() || '',
                'Size (bytes)': report.size || 0,
                'Views': report.views || 0,
                'Downloads': report.downloadCount || 0,
                'Description': report.description || ''
            }));
            
            let content, mimeType, extension;
            
            switch (format) {
                case 'json':
                    content = JSON.stringify(exportData, null, 2);
                    mimeType = 'application/json';
                    extension = 'json';
                    break;
                    
                case 'excel':
                case 'csv':
                    const headers = Object.keys(exportData[0]);
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
                    
                    content = format === 'excel' ? '\ufeff' + csv : csv;
                    mimeType = format === 'excel' ? 
                        'application/vnd.ms-excel' : 'text/csv';
                    extension = format === 'excel' ? 'xls' : 'csv';
                    break;
                    
                default:
                    this.showMessage('Unsupported export format', 'error');
                    return;
            }
            
            const blob = new Blob([content], { type: mimeType });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reports_export_${new Date().toISOString().split('T')[0]}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showMessage(`Reports exported as ${format.toUpperCase()} successfully!`, 'success');
            
        } catch (error) {
            console.error("Error exporting reports:", error);
            this.showMessage('Error exporting reports: ' + error.message, 'error');
        }
    }
    
    setupRealtimeListener() {
        // Listen for new reports
        this.db.collection('reports')
            .orderBy('generatedAt', 'desc')
            .limit(1)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        this.handleNewReport(change.doc.data());
                    }
                });
            });
        
        // Listen for scheduled reports
        this.db.collection('scheduled_reports')
            .orderBy('nextRun', 'asc')
            .limit(1)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added' || change.type === 'modified') {
                        this.loadScheduledReports();
                    }
                });
            });
    }
    
    handleNewReport(reportData) {
        // Check if report already exists in local array
        const exists = this.reports.some(r => 
            r.id === reportData.id || 
            (r.title === reportData.title && r.generatedAt?.getTime() === reportData.generatedAt?.toDate()?.getTime())
        );
        
        if (!exists) {
            const newReport = {
                id: 'temp-' + Date.now(),
                ...reportData,
                generatedAt: reportData.generatedAt?.toDate()
            };
            
            this.reports.unshift(newReport);
            
            // Update statistics
            this.updateStatistics();
            
            // Update charts
            this.updateCharts();
            
            // Update list
            this.filterReports();
            
            // Show notification
            this.showRealTimeNotification(`New report generated: ${newReport.title}`);
        }
    }
    
    showRealTimeNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'real-time-notification';
        notification.innerHTML = `
            <i class="fas fa-file-alt"></i>
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
    
    showGenerateReportModal() {
        // Set default dates (last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        
        document.getElementById('dateFrom').value = thirtyDaysAgo.toISOString().split('T')[0];
        document.getElementById('dateTo').value = now.toISOString().split('T')[0];
        
        // Show modal
        document.getElementById('generateReportModal').classList.add('active');
    }
    
    hideGenerateReportModal() {
        document.getElementById('generateReportModal').classList.remove('active');
    }
    
    hideReportPreviewModal() {
        document.getElementById('reportPreviewModal').classList.remove('active');
    }
    
    showScheduleModal() {
        // Implementation for showing schedule modal
        this.showMessage('Schedule report functionality coming soon', 'info');
    }
    
    showLoading(show) {
        const reportsGrid = document.getElementById('reportsGrid');
        if (show) {
            reportsGrid.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading reports...</p>
                </div>
            `;
        }
    }
    
    updateStatistics() {
        // Recalculate statistics
        this.loadReportStatistics();
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

// Initialize reports manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.reportsManager = new ReportsManager();
});