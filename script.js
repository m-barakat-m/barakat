// الحالة العامة للتطبيق
const appState = {
    currentUser: null,
    users: [],
    filteredUsers: [],
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 1,
    theme: localStorage.getItem('theme') || 'light',
    sortBy: 'newest'
};

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تطبيق الثيم المختار
    applyTheme(appState.theme);
    
    // إعداد المستخدمين المثال (للاختبار)
    setupMockUsers();
    
    // إعداد معالجات الأحداث
    setupEventListeners();
    
    // التحقق من حالة المصادقة
    checkAuthState();
    
    // إخفاء شاشة تسجيل الدخول إذا كان المستخدم مسجلاً
    if (appState.currentUser) {
        document.getElementById('loginModal').style.display = 'none';
        loadUsersData();
    }
});

// تطبيق الثيم المختار
function applyTheme(theme) {
    appState.theme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // تحديث زر الثيم
    const themeToggle = document.getElementById('themeToggle');
    if (theme === 'dark') {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i><span>الوضع الفاتح</span>';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i><span>الوضع الداكن</span>';
    }
}

// إعداد المستخدمين المثال
function setupMockUsers() {
    appState.users = mockUsers.map(user => ({
        ...user,
        displayName: user.name,
        photoURL: null,
        metadata: {
            creationTime: user.createdAt,
            lastSignInTime: user.lastLogin
        }
    }));
    appState.filteredUsers = [...appState.users];
    updateStats();
}

// إعداد معالجات الأحداث
function setupEventListeners() {
    // زر تغيير الثيم
    document.getElementById('themeToggle').addEventListener('click', () => {
        const newTheme = appState.theme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        showMessage('تم تغيير المظهر', 'success');
    });
    
    // زر تسجيل الخروج
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // زر تحديث البيانات
    document.getElementById('refreshBtn').addEventListener('click', () => {
        showMessage('جاري تحديث البيانات...', 'info');
        loadUsersData();
    });
    
    // بحث المستخدمين
    document.getElementById('searchInput').addEventListener('input', filterUsers);
    
    // فرز المستخدمين
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        appState.sortBy = e.target.value;
        sortUsers();
        renderUsersTable();
    });
    
    // زر التصفية
    document.getElementById('filterBtn').addEventListener('click', () => {
        showMessage('جاري تصفية البيانات...', 'info');
        filterUsers();
    });
    
    // زر إغلاق التفاصيل
    document.getElementById('closeDetailsBtn').addEventListener('click', () => {
        document.getElementById('userDetailsContent').innerHTML = 
            '<p class="select-user-message">اختر مستخدمًا لعرض التفاصيل</p>';
    });
    
    // زر إغلاق المودال
    document.getElementById('modalCloseBtn').addEventListener('click', () => {
        document.getElementById('userModal').classList.remove('active');
    });
    
    // زر التالي
    document.getElementById('nextBtn').addEventListener('click', () => {
        if (appState.currentPage < appState.totalPages) {
            appState.currentPage++;
            renderUsersTable();
        }
    });
    
    // زر السابق
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (appState.currentPage > 1) {
            appState.currentPage--;
            renderUsersTable();
        }
    });
    
    // نموذج تسجيل الدخول
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        login();
    });
}

// التحقق من حالة المصادقة
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            appState.currentUser = user;
            document.getElementById('loginModal').style.display = 'none';
            showMessage(`مرحباً ${user.email}`, 'success');
            loadUsersData();
        } else {
            appState.currentUser = null;
            document.getElementById('loginModal').style.display = 'flex';
        }
    });
}

// تسجيل الدخول
function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    showMessage('جاري تسجيل الدخول...', 'info');
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            showMessage('تم تسجيل الدخول بنجاح!', 'success');
            document.getElementById('loginForm').reset();
        })
        .catch((error) => {
            let errorMessage = 'حدث خطأ في تسجيل الدخول';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'المستخدم غير موجود';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'كلمة المرور غير صحيحة';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'البريد الإلكتروني غير صالح';
                    break;
            }
            showMessage(errorMessage, 'error');
        });
}

// تسجيل الخروج
function logout() {
    auth.signOut()
        .then(() => {
            showMessage('تم تسجيل الخروج بنجاح', 'success');
            appState.currentUser = null;
            document.getElementById('loginModal').style.display = 'flex';
        })
        .catch((error) => {
            showMessage('حدث خطأ في تسجيل الخروج', 'error');
        });
}

// تحميل بيانات المستخدمين
function loadUsersData() {
    // هنا ستقوم بجلب البيانات من Firestore
    // في الوقت الحالي سنستخدم البيانات المثال
    
    // محاكاة جلب البيانات
    setTimeout(() => {
        updateStats();
        sortUsers();
        renderUsersTable();
        showMessage('تم تحديث البيانات بنجاح', 'success');
    }, 1000);
}

// تحديث الإحصائيات
function updateStats() {
    document.getElementById('totalUsers').textContent = appState.users.length;
    
    const activeUsers = appState.users.filter(user => user.status === 'active').length;
    document.getElementById('activeUsers').textContent = activeUsers;
    
    // المستخدمين الجدد (آخر 7 أيام)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentUsers = appState.users.filter(user => {
        const createdAt = new Date(user.createdAt);
        return createdAt >= weekAgo;
    }).length;
    document.getElementById('recentUsers').textContent = recentUsers;
}

// تصفية المستخدمين
function filterUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        appState.filteredUsers = [...appState.users];
    } else {
        appState.filteredUsers = appState.users.filter(user => 
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.phone.includes(searchTerm)
        );
    }
    
    appState.currentPage = 1;
    updatePagination();
    renderUsersTable();
}

// فرز المستخدمين
function sortUsers() {
    switch (appState.sortBy) {
        case 'newest':
            appState.filteredUsers.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );
            break;
        case 'oldest':
            appState.filteredUsers.sort((a, b) => 
                new Date(a.createdAt) - new Date(b.createdAt)
            );
            break;
        case 'name':
            appState.filteredUsers.sort((a, b) => 
                a.name.localeCompare(b.name, 'ar')
            );
            break;
    }
}

// تحديث ترقيم الصفحات
function updatePagination() {
    appState.totalPages = Math.ceil(appState.filteredUsers.length / appState.itemsPerPage);
    appState.currentPage = Math.max(1, Math.min(appState.currentPage, appState.totalPages));
    
    document.getElementById('totalPages').textContent = appState.totalPages;
    document.getElementById('prevBtn').disabled = appState.currentPage === 1;
    document.getElementById('nextBtn').disabled = appState.currentPage === appState.totalPages;
    
    const start = (appState.currentPage - 1) * appState.itemsPerPage;
    const end = Math.min(start + appState.itemsPerPage, appState.filteredUsers.length);
    
    document.getElementById('currentPage').textContent = appState.currentPage;
    document.getElementById('currentCount').textContent = end - start;
    document.getElementById('totalCount').textContent = appState.filteredUsers.length;
}

// عرض جدول المستخدمين
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    updatePagination();
    
    const start = (appState.currentPage - 1) * appState.itemsPerPage;
    const end = Math.min(start + appState.itemsPerPage, appState.filteredUsers.length);
    const currentUsers = appState.filteredUsers.slice(start, end);
    
    if (currentUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                        <i class="fas fa-users" style="font-size: 3rem; color: var(--text-light);"></i>
                        <p style="color: var(--text-light); font-size: 1.1rem;">لا توجد بيانات متاحة</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = currentUsers.map(user => `
        <tr>
            <td>
                <div class="user-cell">
                    <div class="user-avatar">
                        ${getInitials(user.name)}
                    </div>
                    <div class="user-info">
                        <h4>${user.name}</h4>
                        <span>${user.plan}</span>
                    </div>
                </div>
            </td>
            <td>
                <div class="email-cell">
                    <i class="fas fa-envelope" style="margin-left: 8px; color: var(--text-light);"></i>
                    ${user.email}
                </div>
            </td>
            <td>
                <div class="date-cell">
                    <i class="fas fa-calendar" style="margin-left: 8px; color: var(--text-light);"></i>
                    ${formatDate(user.createdAt)}
                </div>
            </td>
            <td>
                <span class="status-badge status-${user.status}">
                    ${user.status === 'active' ? 'نشط' : 'غير نشط'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="viewUserDetails('${user.id}')" title="عرض التفاصيل">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="editUser('${user.id}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteUser('${user.id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// عرض تفاصيل المستخدم
function viewUserDetails(userId) {
    const user = appState.users.find(u => u.id === userId);
    if (!user) return;
    
    const modal = document.getElementById('userModal');
    const modalBody = document.getElementById('modalBody');
    const modalUserName = document.getElementById('modalUserName');
    
    modalUserName.textContent = user.name;
    
    modalBody.innerHTML = `
        <div class="user-details-modal">
            <div class="user-header">
                <div class="user-avatar-large">
                    ${getInitials(user.name)}
                </div>
                <div class="user-header-info">
                    <h3>${user.name}</h3>
                    <p>${user.email}</p>
                </div>
            </div>
            
            <div class="user-info-grid">
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-phone"></i>
                        رقم الهاتف
                    </div>
                    <div class="info-value">${user.phone}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-calendar-check"></i>
                        تاريخ التسجيل
                    </div>
                    <div class="info-value">${formatDate(user.createdAt, true)}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-sign-in-alt"></i>
                        آخر تسجيل دخول
                    </div>
                    <div class="info-value">${formatDate(user.lastLogin, true)}</div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-star"></i>
                        الباقة
                    </div>
                    <div class="info-value">
                        <span class="plan-badge plan-${user.plan.toLowerCase()}">
                            ${user.plan}
                        </span>
                    </div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-chart-line"></i>
                        الحالة
                    </div>
                    <div class="info-value">
                        <span class="status-badge status-${user.status}">
                            ${user.status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                    </div>
                </div>
                
                <div class="info-item">
                    <div class="info-label">
                        <i class="fas fa-id-card"></i>
                        معرف المستخدم
                    </div>
                    <div class="info-value" style="font-family: monospace; font-size: 0.9rem;">
                        ${user.id}
                    </div>
                </div>
            </div>
            
            <div class="user-actions">
                <button class="action-btn-full primary" onclick="sendMessage('${user.id}')">
                    <i class="fas fa-envelope"></i>
                    إرسال رسالة
                </button>
                <button class="action-btn-full secondary" onclick="resetPassword('${user.id}')">
                    <i class="fas fa-key"></i>
                    إعادة تعيين كلمة المرور
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

// دالات مساعدة
function getInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
}

function formatDate(dateString, includeTime = false) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('ar-SA', options);
}

function showMessage(text, type = 'info') {
    const container = document.getElementById('messageContainer');
    const messageId = 'msg-' + Date.now();
    
    const message = document.createElement('div');
    message.id = messageId;
    message.className = `message message-${type}`;
    message.innerHTML = `
        <i class="fas fa-${getMessageIcon(type)}"></i>
        <span>${text}</span>
        <button class="message-close" onclick="document.getElementById('${messageId}').remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(message);
    
    // إزالة الرسالة تلقائياً بعد 5 ثواني
    setTimeout(() => {
        const msg = document.getElementById(messageId);
        if (msg) msg.remove();
    }, 5000);
}

function getMessageIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}

// دالات الإجراءات (للتطوير المستقبلي)
function editUser(userId) {
    showMessage('ميزة التعديل قيد التطوير', 'info');
}

function deleteUser(userId) {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
        showMessage('جاري حذف المستخدم...', 'info');
        setTimeout(() => {
            showMessage('تم حذف المستخدم بنجاح', 'success');
        }, 1000);
    }
}

function sendMessage(userId) {
    showMessage('ميزة إرسال الرسائل قيد التطوير', 'info');
}

function resetPassword(userId) {
    showMessage('ميزة إعادة تعيين كلمة المرور قيد التطوير', 'info');
}

// إضافة CSS إضافي للتفاصيل
const style = document.createElement('style');
style.textContent = `
    .user-details-modal {
        padding: 1rem;
    }
    
    .user-header {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid #e2e8f0;
    }
    
    body[data-theme="dark"] .user-header {
        border-bottom-color: rgba(255, 255, 255, 0.1);
    }
    
    .user-avatar-large {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--primary-color), var(--tertiary-color));
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 1.8rem;
        font-weight: bold;
    }
    
    .user-header-info h3 {
        margin: 0;
        color: var(--text-secondary);
    }
    
    body[data-theme="dark"] .user-header-info h3 {
        color: var(--text-primary);
    }
    
    .user-header-info p {
        margin: 0.5rem 0 0;
        color: var(--text-light);
    }
    
    .user-info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
        margin-bottom: 2rem;
    }
    
    @media (max-width: 600px) {
        .user-info-grid {
            grid-template-columns: 1fr;
        }
    }
    
    .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .info-label {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-light);
        font-size: 0.9rem;
    }
    
    .info-value {
        font-weight: 600;
        color: var(--text-secondary);
        padding: 0.5rem 0;
    }
    
    body[data-theme="dark"] .info-value {
        color: var(--text-primary);
    }
    
    .plan-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
    }
    
    .plan-premium {
        background: linear-gradient(135deg, #f2b835, #d98a1f);
        color: white;
    }
    
    .plan-pro {
        background: linear-gradient(135deg, var(--primary-color), var(--tertiary-color));
        color: white;
    }
    
    .plan-basic {
        background: rgba(1, 129, 89, 0.1);
        color: var(--primary-color);
    }
    
    .plan-free {
        background: rgba(148, 163, 184, 0.1);
        color: #64748b;
    }
    
    .user-actions {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
    }
    
    @media (max-width: 400px) {
        .user-actions {
            grid-template-columns: 1fr;
        }
    }
    
    .action-btn-full {
        padding: 12px;
        border: none;
        border-radius: var(--border-radius);
        cursor: pointer;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: var(--transition);
    }
    
    .action-btn-full.primary {
        background: linear-gradient(135deg, var(--primary-color), var(--tertiary-color));
        color: white;
    }
    
    .action-btn-full.secondary {
        background: rgba(1, 129, 89, 0.1);
        color: var(--primary-color);
    }
    
    body[data-theme="dark"] .action-btn-full.secondary {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary);
    }
    
    .action-btn-full:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .message-close {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        margin-right: auto;
        padding: 0;
        font-size: 1rem;
    }
    
    .email-cell, .date-cell {
        display: flex;
        align-items: center;
    }
`;
document.head.appendChild(style);
