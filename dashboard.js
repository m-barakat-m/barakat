// لوحة التحكم المبسطة والمعدلة
class Dashboard {
    constructor() {
        console.log("🚀 بدء لوحة التحكم...");
        
        // تحقق من Firebase أولاً
        if (typeof firebase === 'undefined') {
            console.error("❌ Firebase غير محمل!");
            this.showErrorMessage("Firebase غير محمل. أعد تحميل الصفحة.");
            return;
        }
        
        try {
            // 🔧 حل مشكلة duplicate-app
            let app;
            try {
                app = firebase.app(); // تحقق إذا كان مهيأ
                console.log("✅ Firebase مهيأ مسبقاً باسم:", app.name);
            } catch (error) {
                // تهيئة إذا لم يكن مهيأ
                app = firebase.initializeApp(firebaseConfig);
                console.log("✅ Firebase مهيأ بنجاح");
            }
            
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            console.log("🎯 Firebase جاهز للاستخدام");
            
            // إعداد الأحداث
            this.setupEvents();
            
            // التحقق من المصادقة
            this.checkAuth();
            
        } catch (error) {
            console.error("❌ خطأ في النظام:", error);
            this.showErrorMessage("خطأ في النظام: " + error.message);
        }
    }
    
    setupEvents() {
        // تسجيل الخروج
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.auth.signOut();
        });
        
        // تحديث البيانات
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
        });
        
        // إضافة بيانات تجريبية
        const sampleBtn = document.getElementById('addSampleDataBtn');
        if (sampleBtn) {
            sampleBtn.addEventListener('click', () => {
                this.addSampleData();
            });
        }
    }
    
    checkAuth() {
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log("✅ مستخدم مسجل:", user.email);
                await this.loadUserData(user.uid);
            } else {
                console.log("❌ غير مسجل، إعادة التوجيه...");
                window.location.href = 'index.html';
            }
        });
    }
    
    async loadUserData(userId) {
        try {
            const doc = await this.db.collection('employees').doc(userId).get();
            
            if (doc.exists) {
                const userData = doc.data();
                document.getElementById('userName').textContent = userData.name || userData.email;
                document.getElementById('userRole').textContent = userData.role || 'مستخدم';
                
                console.log("✅ بيانات المستخدم محملة:", userData);
                this.loadData();
            } else {
                console.error("❌ لا توجد بيانات موظف");
                this.showErrorMessage("لا توجد بيانات موظف. اتصل بالدعم.");
            }
        } catch (error) {
            console.error("❌ خطأ في تحميل بيانات الموظف:", error);
        }
    }
    
    async loadData() {
        console.log("📊 جاري تحميل البيانات...");
        
        try {
            // جلب المستخدمين
            const usersSnapshot = await this.db.collection('users').limit(50).get();
            const users = [];
            
            usersSnapshot.forEach(doc => {
                users.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log("✅ عدد المستخدمين المحملين:", users.length);
            
            // تحديث الإحصائيات
            this.updateStats(users);
            
            // عرض البيانات
            this.displayUsers(users);
            
            // إظهار زر البيانات التجريبية إذا لم تكن هناك بيانات
            if (users.length === 0) {
                const sampleBtn = document.getElementById('addSampleDataBtn');
                if (sampleBtn) sampleBtn.style.display = 'inline-block';
            }
            
        } catch (error) {
            console.error("❌ خطأ في تحميل البيانات:", error);
            this.displayUsers([]);
            const sampleBtn = document.getElementById('addSampleDataBtn');
            if (sampleBtn) sampleBtn.style.display = 'inline-block';
        }
    }
    
    updateStats(users) {
        const total = users.length;
        const active = users.filter(u => u.status === 'active').length;
        const premium = users.filter(u => u.plan === 'Premium').length;
        
        document.getElementById('totalUsers').textContent = total;
        document.getElementById('activeUsers').textContent = active;
        document.getElementById('inactiveUsers').textContent = total - active;
        document.getElementById('premiumUsers').textContent = premium;
    }
    
    displayUsers(users) {
        const tableBody = document.getElementById('usersTable');
        if (!tableBody) {
            console.error("❌ جدول المستخدمين غير موجود!");
            return;
        }
        
        // إزالة رسالة التحميل
        const loadingRow = document.getElementById('loadingRow');
        if (loadingRow) loadingRow.remove();
        
        if (users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-database" style="font-size: 40px; margin-bottom: 10px; opacity: 0.5;"></i>
                        <br>
                        <p>لا توجد بيانات متاحة</p>
                        <p style="font-size: 14px; color: #999; margin-top: 10px;">
                            استخدم زر "إضافة بيانات تجريبية" للاختبار
                        </p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // عرض البيانات
        tableBody.innerHTML = users.map((user, index) => {
            // تنسيق التاريخ
            let dateStr = 'غير معروف';
            if (user.createdAt) {
                try {
                    const date = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
                    dateStr = date.toLocaleDateString('ar-SA');
                } catch (e) {
                    dateStr = 'تاريخ غير صالح';
                }
            }
            
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${user.name || 'غير معروف'}</strong></td>
                    <td>${user.email || 'غير معروف'}</td>
                    <td>${user.phone || 'غير معروف'}</td>
                    <td>
                        <span class="status-badge ${user.status === 'active' ? 'status-active' : 'status-inactive'}">
                            ${user.status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                    </td>
                    <td>${user.plan || 'غير محدد'}</td>
                    <td>${dateStr}</td>
                    <td>
                        <button class="action-btn edit" title="تعديل" onclick="dashboard.editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        console.log("✅ تم عرض", users.length, "مستخدم في الجدول");
    }
    
    async addSampleData() {
        console.log("➕ إضافة بيانات تجريبية...");
        
        const sampleUsers = [
            {
                name: "أحمد محمد",
                email: "ahmed@example.com",
                phone: "+966501234567",
                status: "active",
                plan: "Premium",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                name: "سارة علي",
                email: "sara@example.com",
                phone: "+966502345678",
                status: "active",
                plan: "Basic",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                name: "محمد حسن",
                email: "mohamed@example.com",
                phone: "+966503456789",
                status: "inactive",
                plan: "Free",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }
        ];
        
        try {
            for (const user of sampleUsers) {
                await this.db.collection('users').add(user);
                console.log("➕ تم إضافة:", user.name);
            }
            
            alert("✅ تم إضافة بيانات تجريبية بنجاح!");
            this.loadData(); // إعادة تحميل البيانات
            
        } catch (error) {
            console.error("❌ خطأ في إضافة البيانات:", error);
            alert("خطأ: " + error.message);
        }
    }
    
    editUser(userId) {
        console.log("تعديل المستخدم:", userId);
        alert("ميزة التعديل قيد التطوير. المستخدم: " + userId);
    }
    
    showErrorMessage(message) {
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px; color: #f56565;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 50px; margin-bottom: 20px;"></i>
                    <h2>⚠️ خطأ في النظام</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #018159; color: white; border: none; border-radius: 5px;">
                        <i class="fas fa-redo"></i> إعادة تحميل الصفحة
                    </button>
                </div>
            `;
        }
    }
}

// بدء التشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log("📄 صفحة لوحة التحكم جاهزة");
    window.dashboard = new Dashboard();
});
