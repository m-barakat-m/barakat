// لوحة التحكم الرئيسية
class Dashboard {
    constructor() {
        this.auth = new AuthSystem();
        this.db = new FirestoreManager();
        this.currentAction = null;
        this.selectedUserId = null;
        
        // تهيئة Firebase
        firebase.initializeApp(firebaseConfig);
        
        // التحقق من المصادقة
        this.checkAuth();
        this.initialize();
    }

    // التحقق من تسجيل الدخول
    async checkAuth() {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                await this.auth.loadUserData(user.uid);
                this.updateUI();
                this.loadData();
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    // تهيئة النظام
    initialize() {
        this.setupEventListeners();
        this.applyPermissions();
    }

    // إعداد معالجات الأحداث
    setupEventListeners() {
        // تسجيل الخروج
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.auth.logout();
        });

        // البحث
        let searchTimeout;
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchUsers(e.target.value);
            }, 300);
        });

        // تحديث البيانات
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
        });

        // إضافة مستخدم
        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.openUserModal('add');
        });

        // إغلاق النافذة
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal();
        });

        // نموذج المستخدم
        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });

        // نافذة التأكيد
        document.getElementById('cancelConfirm').addEventListener('click', () => {
            this.closeConfirmModal();
        });
    }

    // تطبيق الصلاحيات
    applyPermissions() {
        const addUserBtn = document.getElementById('addUserBtn');
        
        if (this.auth.hasPermission('edit')) {
            addUserBtn.style.display = 'flex';
        } else {
            addUserBtn.style.display = 'none';
        }
    }

    // تحديث واجهة المستخدم
    updateUI() {
        document.getElementById('userName').textContent = this.auth.currentUser.name;
        document.getElementById('userRole').textContent = this.auth.userRole;
    }

    // تحميل البيانات
    async loadData() {
        this.showLoading(true);
        
        try {
            const users = await this.db.getAppUsers();
            this.displayUsers(users);
            this.updateStats(users);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            this.showLoading(false);
        }
    }

    // عرض المستخدمين في الجدول
    displayUsers(users) {
        const tableBody = document.getElementById('usersTable');
        
        if (users.length === 0) {
            document.getElementById('noData').style.display = 'block';
            tableBody.innerHTML = '';
            return;
        }
        
        document.getElementById('noData').style.display = 'none';
        
        tableBody.innerHTML = users.map((user, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${user.name || 'غير معروف'}</td>
                <td>${user.email || 'غير معروف'}</td>
                <td>${user.phone || 'غير معروف'}</td>
                <td>
                    <span class="status-badge status-${user.status || 'inactive'}">
                        ${user.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                </td>
                <td>${user.plan || 'غير محدد'}</td>
                <td>${this.formatDate(user.createdAt)}</td>
                <td>
                    <div class="action-buttons-cell">
                        <button class="action-btn edit" onclick="dashboard.editUser('${user.id}')" 
                                ${!this.auth.hasPermission('edit') ? 'disabled' : ''}>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="dashboard.confirmDelete('${user.id}')" 
                                ${!this.auth.hasPermission('delete') ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // تحديث الإحصائيات
    updateStats(users) {
        const totalUsers = users.length;
        const activeUsers = users.filter(user => user.status === 'active').length;
        const inactiveUsers = totalUsers - activeUsers;
        
        document.getElementById('statsSection').innerHTML = `
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon users">
                        <i class="fas fa-users"></i>
                    </div>
                </div>
                <div class="stat-value">${totalUsers}</div>
                <div class="
