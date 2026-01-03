// نظام المصادقة والصلاحيات
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.permissions = {};
    }

    // تسجيل الدخول
    async login(email, password) {
        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            await this.loadUserData(userCredential.user.uid);
            return { success: true, user: this.currentUser };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // تحميل بيانات الموظف
    async loadUserData(userId) {
        const doc = await db.collection('employees').doc(userId).get();
        if (doc.exists) {
            this.currentUser = { id: doc.id, ...doc.data() };
            this.userRole = this.currentUser.role;
            this.setPermissions();
            this.saveToLocalStorage();
        }
    }

    // تعيين الصلاحيات حسب الدور
    setPermissions() {
        const permissionsMap = {
            'مدير': { view: true, edit: true, delete: true, manage: true },
            'مدير مشرفين': { view: true, edit: true, delete: true, manage: true },
            'مدير خدمة عملاء': { view: true, edit: true, delete: false, manage: false },
            'مشرف': { view: true, edit: true, delete: true, manage: false },
            'خدمة عملاء': { view: true, edit: true, delete: false, manage: false },
            'مراقب': { view: true, edit: false, delete: false, manage: false }
        };

        this.permissions = permissionsMap[this.userRole] || { view: false };
    }

    // حفظ في التخزين المحلي
    saveToLocalStorage() {
        localStorage.setItem('user', JSON.stringify(this.currentUser));
        localStorage.setItem('permissions', JSON.stringify(this.permissions));
    }

    // تسجيل الخروج
    logout() {
        firebase.auth().signOut();
        localStorage.clear();
        window.location.href = 'index.html';
    }

    // التحقق من الصلاحية
    hasPermission(permission) {
        return this.permissions[permission] === true;
    }
}
