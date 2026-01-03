// إدارة بيانات Firestore
class FirestoreManager {
    constructor() {
        this.db = firebase.firestore();
    }

    // جلب جميع مستخدمي التطبيق
    async getAppUsers() {
        try {
            const snapshot = await this.db.collection('appUsers').get();
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
            
            const docRef = await this.db.collection('appUsers').add(userData);
            return { success: true, id: docRef.id };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // تحديث مستخدم
    async updateAppUser(userId, userData) {
        try {
            await this.db.collection('appUsers').doc(userId).update(userData);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // حذف مستخدم
    async deleteAppUser(userId) {
        try {
            await this.db.collection('appUsers').doc(userId).delete();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // البحث في المستخدمين
    async searchUsers(searchTerm) {
        try {
            let query = this.db.collection('appUsers');
            
            // البحث في الاسم
            const nameQuery = await query
                .where('name', '>=', searchTerm)
                .where('name', '<=', searchTerm + '\uf8ff')
                .get();

            // البحث في البريد
            const emailQuery = await query
                .where('email', '>=', searchTerm)
                .where('email', '<=', searchTerm + '\uf8ff')
                .get();

            // البحث في الهاتف
            const phoneQuery = await query
                .where('phone', '>=', searchTerm)
                .where('phone', '<=', searchTerm + '\uf8ff')
                .get();

            // دمج النتائج
            const results = new Map();
            
            [...nameQuery.docs, ...emailQuery.docs, ...phoneQuery.docs].forEach(doc => {
                results.set(doc.id, { id: doc.id, ...doc.data() });
            });

            return Array.from(results.values());
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }
}
