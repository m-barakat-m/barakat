// إدارة بيانات Firestore
class FirestoreManager {
    constructor() {
        // ✅ تأكد أن firebase محمل
        if (typeof firebase === 'undefined') {
            console.error('Firebase غير محمل! تأكد من الروابط');
            return;
        }
        
        // ✅ الإصدار 8.x.x يستخدم firebase.firestore()
        // ✅ الإصدار 9.x.x يستخدم firebase.firestore
        this.db = firebase.firestore ? firebase.firestore() : firebase.firestore;
        
        if (!this.db) {
            console.error('فشل تحميل Firestore');
        }
    }

    // جلب جميع مستخدمي التطبيق
    async getAppUsers() {
        try {
            const snapshot = await this.db.collection('users').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    }

    // جلب موظفين
    async getEmployees() {
        try {
            const snapshot = await this.db.collection('employees').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching employees:', error);
            return [];
        }
    }

    // إضافة مستخدم جديد
    async addAppUser(userData) {
        try {
            userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            userData.status = userData.status || 'active';
            
            const docRef = await this.db.collection('users').add(userData);
            return { success: true, id: docRef.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // تحديث مستخدم
    async updateAppUser(userId, userData) {
        try {
            await this.db.collection('users').doc(userId).update(userData);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // حذف مستخدم
    async deleteAppUser(userId) {
        try {
            await this.db.collection('users').doc(userId).delete();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // البحث في المستخدمين
    async searchUsers(searchTerm) {
        try {
            if (!searchTerm.trim()) {
                return await this.getAppUsers();
            }
            
            const users = await this.getAppUsers();
            return users.filter(user => 
                (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (user.phone && user.phone.includes(searchTerm))
            );
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }
}
