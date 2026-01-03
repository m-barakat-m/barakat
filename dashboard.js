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
                <div class="stat-label">إجمالي المستخدمين</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon active">
                        <i class="fas fa-user-check"></i>
                    </div>
                </div>
                <div class="stat-value">${activeUsers}</div>
                <div class="stat-label">مستخدمين نشطين</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon inactive">
                        <i class="fas fa-user-clock"></i>
                    </div>
                </div>
                <div class="stat-value">${inactiveUsers}</div>
                <div class="stat-label">مستخدمين غير نشطين</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon revenue">
                        <i class="fas fa-chart-line"></i>
                    </div>
                </div>
                <div class="stat-value">${users.filter(u => u.plan === 'Premium').length}</div>
                <div class="stat-label">مستخدمين Premium</div>
            </div>
        `;
    }

    // البحث عن المستخدمين
    async searchUsers(searchTerm) {
        if (!searchTerm.trim()) {
            this.loadData();
            return;
        }

        this.showLoading(true);
        
        try {
            const results = await this.db.searchUsers(searchTerm);
            this.displayUsers(results);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    // فتح نافذة إضافة/تعديل مستخدم
    openUserModal(action, user = null) {
        const modal = document.getElementById('userModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('userForm');
        
        if (action === 'add') {
            title.textContent = 'إضافة مستخدم جديد';
            form.reset();
            document.getElementById('userId').value = '';
            this.selectedUserId = null;
        } else {
            title.textContent = 'تعديل بيانات المستخدم';
            this.selectedUserId = user.id;
            document.getElementById('userId').value = user.id;
            document.getElementById('userNameInput').value = user.name || '';
            document.getElementById('userEmail').value = user.email || '';
            document.getElementById('userPhone').value = user.phone || '';
            document.getElementById('userStatus').value = user.status || 'active';
            document.getElementById('userPlan').value = user.plan || 'Basic';
        }
        
        modal.classList.add('active');
    }

    // تعديل مستخدم
    editUser(userId) {
        if (!this.auth.hasPermission('edit')) return;
        
        const user = this.getUserById(userId);
        if (user) {
            this.openUserModal('edit', user);
        }
    }

    // تأكيد الحذف
    confirmDelete(userId) {
        if (!this.auth.hasPermission('delete')) return;
        
        this.selectedUserId = userId;
        const modal = document.getElementById('confirmModal');
        modal.classList.add('active');
    }

    // حفظ المستخدم
    async saveUser() {
        const userData = {
            name: document.getElementById('userNameInput').value,
            email: document.getElementById('userEmail').value,
            phone: document.getElementById('userPhone').value,
            status: document.getElementById('userStatus').value,
            plan: document.getElementById('userPlan').value
        };

        try {
            let result;
            
            if (this.selectedUserId) {
                // تحديث مستخدم موجود
                result = await this.db.updateAppUser(this.selectedUserId, userData);
            } else {
                // إضافة مستخدم جديد
                result = await this.db.addAppUser(userData);
            }

            if (result.success) {
                this.showMessage('تم حفظ البيانات بنجاح', 'success');
                this.closeModal();
                this.loadData();
            } else {
                this.showMessage(result.error, 'error');
            }
        } catch (error) {
            this.showMessage('حدث خطأ أثناء الحفظ', 'error');
            console.error('Save error:', error);
        }
    }

    // حذف المستخدم
    async deleteUser() {
        try {
            const result = await this.db.deleteAppUser(this.selectedUserId);
            
            if (result.success) {
                this.showMessage('تم حذف المستخدم بنجاح', 'success');
                this.closeConfirmModal();
                this.loadData();
            } else {
                this.showMessage(result.error, 'error');
            }
        } catch (error) {
            this.showMessage('حدث خطأ أثناء الحذف', 'error');
            console.error('Delete error:', error);
        }
    }

    // إغلاق النوافذ
    closeModal() {
        document.getElementById('userModal').classList.remove('active');
    }

    closeConfirmModal() {
        document.getElementById('confirmModal').classList.remove('active');
    }

    // دالات مساعدة
    getUserById(userId) {
        // هذه دالة مساعدة، تحتاج إلى التعديل حسب هيكل بياناتك
        return null;
    }

    formatDate(timestamp) {
        if (!timestamp) return 'غير معروف';
        
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString('ar-SA');
        } catch (error) {
            return 'غير معروف';
        }
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    showMessage(text, type = 'info') {
        // يمكن تطوير هذه الدالة لعرض رسائل أفضل
        alert(text);
    }
}

// تهيئة لوحة التحكم
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
});
