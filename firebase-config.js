// إعدادات Firebase - استبدل هذه القيم بإعدادات مشروعك
const firebaseConfig = {
    apiKey: "AIzaSyB_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdefghijklmnopqrstuv"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// تهيئة الخدمات
const auth = firebase.auth();
const db = firebase.firestore();

// بيانات المستخدمين المثال (للتجربة إذا لم يكن لديك قاعدة بيانات)
const mockUsers = [
    {
        id: "1",
        name: "أحمد محمد",
        email: "ahmed@example.com",
        phone: "+966501234567",
        createdAt: "2024-01-15T10:30:00Z",
        status: "active",
        lastLogin: "2024-03-20T14:25:00Z",
        plan: "Premium"
    },
    {
        id: "2",
        name: "سارة علي",
        email: "sara@example.com",
        phone: "+966502345678",
        createdAt: "2024-02-10T09:15:00Z",
        status: "active",
        lastLogin: "2024-03-19T16:45:00Z",
        plan: "Basic"
    },
    {
        id: "3",
        name: "محمد حسن",
        email: "mohamed@example.com",
        phone: "+966503456789",
        createdAt: "2024-03-01T11:20:00Z",
        status: "inactive",
        lastLogin: "2024-03-05T12:10:00Z",
        plan: "Free"
    },
    {
        id: "4",
        name: "فاطمة خالد",
        email: "fatima@example.com",
        phone: "+966504567890",
        createdAt: "2024-03-15T08:45:00Z",
        status: "active",
        lastLogin: "2024-03-20T10:20:00Z",
        plan: "Premium"
    },
    {
        id: "5",
        name: "عبدالله سعيد",
        email: "abdullah@example.com",
        phone: "+966505678901",
        createdAt: "2024-02-28T14:30:00Z",
        status: "active",
        lastLogin: "2024-03-18T09:15:00Z",
        plan: "Pro"
    }
];
