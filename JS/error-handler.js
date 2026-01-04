// Central Error Handler for Money Manager
class ErrorHandler {
    static init() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error);
        });
        
        // Promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection(event.reason);
        });
    }
    
    static handleGlobalError(error) {
        console.error('💥 Global Error:', error);
        
        // Don't show error for canceled requests
        if (error.name === 'AbortError') return;
        
        // Log to analytics service (if available)
        this.logToAnalytics(error);
        
        // Show user-friendly message
        this.showUserFriendlyMessage(error);
    }
    
    static handlePromiseRejection(reason) {
        console.error('💥 Promise Rejection:', reason);
        
        // Check if it's a Firebase error
        if (reason && reason.code) {
            this.handleFirebaseError(reason);
        } else {
            this.showUserFriendlyMessage(reason);
        }
    }
    
    static handleFirebaseError(error) {
        const errorMap = {
            // Auth errors
            'auth/invalid-email': 'Invalid email address format.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/email-already-in-use': 'Email already in use.',
            'auth/weak-password': 'Password is too weak (minimum 6 characters).',
            'auth/requires-recent-login': 'Please login again to perform this action.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            
            // Firestore errors
            'permission-denied': 'You don\'t have permission to perform this action.',
            'not-found': 'The requested data was not found.',
            'unavailable': 'Service is temporarily unavailable.',
            'failed-precondition': 'Operation failed due to a condition.',
            'aborted': 'Operation was aborted.',
            'already-exists': 'Document already exists.',
            'resource-exhausted': 'Resource quota exceeded.',
            'cancelled': 'Operation was cancelled.',
            'data-loss': 'Data loss or corruption occurred.',
            'deadline-exceeded': 'Operation timed out.',
            'internal': 'Internal server error.',
            
            // Storage errors
            'storage/unauthorized': 'You don\'t have permission to access this file.',
            'storage/canceled': 'User canceled the upload.',
            'storage/unknown': 'Unknown error occurred.',
            
            // Default
            'default': 'An unexpected error occurred. Please try again.'
        };
        
        const message = errorMap[error.code] || errorMap.default;
        this.showToast(message, 'error');
        
        // Log detailed error for developers
        if (error.code !== 'permission-denied' && error.code !== 'auth/wrong-password') {
            console.error('Firebase Error Details:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
        }
    }
    
    static showUserFriendlyMessage(error) {
        let message = 'An unexpected error occurred.';
        
        if (typeof error === 'string') {
            message = error;
        } else if (error.message) {
            message = error.message;
        }
        
        // Shorten long error messages
        if (message.length > 100) {
            message = message.substring(0, 100) + '...';
        }
        
        this.showToast(message, 'error');
    }
    
    static showToast(message, type = 'error') {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.error-toast');
        existingToasts.forEach(toast => {
            if (toast.textContent.includes(message)) {
                toast.remove();
            }
        });
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `error-toast error-toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getErrorIcon(type)}"></i>
            <span>${this.escapeHtml(message)}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to page
        document.body.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
    
    static getErrorIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            case 'info': return 'info-circle';
            default: return 'exclamation-circle';
        }
    }
    
    static logToAnalytics(error) {
        // Implement your analytics logging here
        // Example: Google Analytics, Sentry, etc.
        console.log('📊 Error logged to analytics:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
    
    static escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Validation helper
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static validatePassword(password) {
        return password && password.length >= 6;
    }
    
    static validatePhone(phone) {
        const re = /^[\+]?[1-9][\d\s\-\(\)\.]{8,}$/;
        return re.test(phone.replace(/\s/g, ''));
    }
    
    // Network status helper
    static checkNetworkStatus() {
        return navigator.onLine;
    }
    
    static showNetworkError() {
        if (!this.checkNetworkStatus()) {
            this.showToast('You are offline. Please check your internet connection.', 'warning');
            return false;
        }
        return true;
    }
}

// Initialize error handler
document.addEventListener('DOMContentLoaded', () => {
    ErrorHandler.init();
});

// Global error handling function
window.handleError = (error, context = '') => {
    console.error(`[${context}]`, error);
    ErrorHandler.showUserFriendlyMessage(error);
};