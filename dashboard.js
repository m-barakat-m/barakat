// 🔧 استبدل class Dashboard بالكامل بهذا:

class Dashboard {
    constructor() {
        this.auth = null;
        this.db = null;
        
        // تهيئة Firebase أولاً
        this.initFirebase();
    }

    // تهيئة Firebase
    initFirebase() {
        try {
            // تحقق من تحميل firebase
            if (typeof firebase === 'undefined') {
                console.error('❌ Firebase غير محمل');
                setTimeout(() => this.initFirebase(), 1000);
                return;
            }
            
            // تهيئة التطبيق
            firebase.initializeApp(firebaseConfig);
            
            // إنشاء الكائنات
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            console.log('✅ Firebase محمل بنجاح');
            
            // التحقق من المصادقة
            this.checkAuth();
            
        } catch (error) {
            console.error('❌ خطأ في تهيئة Firebase:', error);
        }
    }

    // التحقق من تسجيل الدخول
    checkAuth() {
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('✅ مستخدم مسجل:', user.email);
                await this.loadUserData(user.uid);
            } else {
                console.log('❌ غير مسجل، إعادة التوجيه...');
                window.location.href = 'index.html';
            }
        });
    }

    // تحميل بيانات المستخدم
    async loadUserData(userId) {
        try {
            console.log('جاري تحميل بيانات الموظف...');
            
            const doc = await this.db.collection('employees').doc(userId).get();
            
            if (doc.exists) {
                this.userData = doc.data();
                console.log('✅ بيانات الموظف:', this.userData);
                this.showDashboard();
            } else {
                console.error('❌ لا توجد بيانات موظف');
                alert('لا توجد بيانات موظف مرتبطة بهذا الحساب');
                this.auth.signOut();
            }
            
        } catch (error) {
            console.error('❌ خطأ في تحميل بيانات الموظف:', error);
        }
    }

    // عرض لوحة التحكم
    showDashboard() {
        console.log('عرض لوحة التحكم...');
        
        // تحديث واجهة المستخدم
        document.getElementById('userName').textContent = this.userData.name || 'مستخدم';
        document.getElementById('userRole').textContent = this.userData.role || 'غير محدد';
        
        // تحميل البيانات
        this.loadData();
    }

    // تحميل بيانات المستخدمين
    async loadData() {
        console.log('جاري تحميل بيانات المستخدمين...');
        
        try {
            const usersSnapshot = await this.db.collection('users').limit(10).get();
            const users = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('📊 عدد المستخدمين:', users.length);
            this.displayUsers(users);
            
        } catch (error) {
            console.error('❌ خطأ في تحميل المستخدمين:', error);
            document.getElementById('usersTable').innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: red; padding: 20px;">
                        خطأ في تحميل البيانات: ${error.message}
                    </td>
                </tr>
            `;
        }
    }

    // عرض المستخدمين في الجدول
    displayUsers(users) {
        const tableBody = document.getElementById('usersTable');
        
        if (!tableBody) {
            console.error('❌ جدول المستخدمين غير موجود في HTML');
            return;
        }
        
        if (users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px;">
                        <i class="fas fa-users-slash" style="font-size: 40px; color: #ccc; margin-bottom: 10px;"></i>
                        <br>
                        <p>لا توجد بيانات للمستخدمين</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = users.map((user, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${user.name || 'غير معروف'}</td>
                <td>${user.email || 'غير معروف'}</td>
                <td>${user.phone || 'غير معروف'}</td>
                <td>
                    <span class="status-badge ${user.status === 'active' ? 'status-active' : 'status-inactive'}">
                        ${user.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                </td>
                <td>${user.plan || 'غير محدد'}</td>
                <td>${user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('ar-SA') : 'غير معروف'}</td>
                <td>
                    <button class="action-btn edit" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        console.log('✅ تم عرض المستخدمين في الجدول');
    }
}

// تهيئة لوحة التحكم عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 صفحة لوحة التحكم محملة');
    window.dashboard = new Dashboard();
});
