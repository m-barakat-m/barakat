// Profiles Management System
class ProfilesManager {
    constructor() {
        this.profiles = [];
        this.filteredProfiles = [];
        this.users = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalPages = 1;
        this.selectedCountry = 'all';
        this.selectedCurrency = 'all';
        this.selectedLanguage = 'all';
        this.currentSort = 'newest';
        this.searchTerm = '';
        this.init();
    }

    async init() {
        console.log("🚀 Initializing Profiles Manager...");
        
        // Check authentication
        await this.checkAuth();
        
        // Initialize Firebase
        try {
            let app;
            if (!firebase.apps.length) {
                app = firebase.initializeApp(firebaseConfig);
            } else {
                app = firebase.app();
            }
            
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            // Setup event listeners
            this.setupEvents();
            
            // Load initial data
            await this.loadInitialData();
            
            // Update user info in navbar
            this.updateUserInfo();
            
        } catch (error) {
            console.error("❌ System initialization error:", error);
            this.showError("System error: " + error.message);
        }
    }
    
    async checkAuth() {
        const user = await authSystem.checkAuth();
        if (!user.authenticated) {
            window.location.href = 'index.html';
            return;
        }
        
        // Check permissions
        if (!authSystem.hasPermission('manageUsers')) {
            this.showError("You don't have permission to access this page.");
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);
            return;
        }
    }
    
    setupEvents() {
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            authSystem.logout();
        });
        
        // Dashboard button
        document.querySelector('[href="dashboard.html"]').addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'dashboard.html';
        });
        
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.filterAndSortProfiles();
        });
        
        document.getElementById('clearSearchBtn').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            this.searchTerm = '';
            this.filterAndSortProfiles();
        });
        
        // Filter and sort
        document.getElementById('countryFilter').addEventListener('change', (e) => {
            this.selectedCountry = e.target.value;
            this.filterAndSortProfiles();
        });
        
        document.getElementById('currencyFilter').addEventListener('change', (e) => {
            this.selectedCurrency = e.target.value;
            this.filterAndSortProfiles();
        });
        
        document.getElementById('languageFilter').addEventListener('change', (e) => {
            this.selectedLanguage = e.target.value;
            this.filterAndSortProfiles();
        });
        
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.filterAndSortProfiles();
        });
        
        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportProfilesData();
        });
        
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadInitialData();
        });
        
        // Bulk actions
        document.getElementById('bulkDeleteBtn').addEventListener('click', () => {
            this.bulkDeleteProfiles();
        });
        
        document.getElementById('selectAllBtn').addEventListener('click', () => {
            this.toggleSelectAll();
        });
        
        // Pagination
        document.getElementById('prevPageBtn').addEventListener('click', () => {
            this.prevPage();
        });
        
        document.getElementById('nextPageBtn').addEventListener('click', () => {
            this.nextPage();
        });
        
        document.getElementById('itemsPerPage').addEventListener('change', (e) => {
            this.itemsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.updatePagination();
            this.renderProfilesTable();
        });
        
        // Modal close buttons
        document.getElementById('closeProfileDetailsModal').addEventListener('click', () => {
            this.hideProfileDetailsModal();
        });
        
        document.getElementById('closeEditProfileModal').addEventListener('click', () => {
            this.hideEditProfileModal();
        });
        
        document.getElementById('cancelEditProfileBtn').addEventListener('click', () => {
            this.hideEditProfileModal();
        });
        
        // Edit profile form
        document.getElementById('editProfileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });
        
        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }
    
    updateUserInfo() {
        const user = authSystem.currentUser;
        if (user) {
            document.getElementById('userName').textContent = user.name || user.email;
            document.getElementById('userRole').textContent = user.role || 'User';
        }
    }
    
    async loadInitialData() {
        try {
            // Show loading state
            this.showLoading(true);
            
            // Load all data in parallel
            await Promise.all([
                this.loadProfilesData(),
                this.loadUsersData()
            ]);
            
            // Update statistics
            await this.updateStatistics();
            
            // Update filters
            this.updateFilterOptions();
            
            // Filter and sort profiles
            this.filterAndSortProfiles();
            
            // Hide loading state
            this.showLoading(false);
            
        } catch (error) {
            console.error("❌ Error loading initial data:", error);
            this.showError("Error loading data: " + error.message);
            this.showLoading(false);
        }
    }
    
    async loadProfilesData() {
        try {
            const profilesSnapshot = await this.db.collection('profiles').get();
            this.profiles = [];
            
            profilesSnapshot.forEach(doc => {
                const profileData = doc.data();
                const profile = {
                    id: doc.id,
                    ...profileData,
                    // Add formatted dates
                    createdAt: profileData.createdAt?.toDate(),
                    updatedAt: profileData.updatedAt?.toDate()
                };
                
                this.profiles.push(profile);
            });
            
            console.log(`✅ Loaded ${this.profiles.length} profiles`);
            
        } catch (error) {
            console.error("Error loading profiles data:", error);
            throw error;
        }
    }
    
    async loadUsersData() {
        try {
            const usersSnapshot = await this.db.collection('users').get();
            this.users = [];
            
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                this.users.push({
                    id: doc.id,
                    userId: userData.userId || doc.id,
                    name: userData.name || 'Unknown User',
                    email: userData.email || ''
                });
            });
            
        } catch (error) {
            console.error("Error loading users data:", error);
        }
    }
    
    async updateStatistics() {
        const totalProfiles = this.profiles.length;
        
        // Calculate statistics
        const countries = new Set();
        const currencies = new Set();
        const languages = new Set();
        
        let profilesWithAvatar = 0;
        let profilesWithCompleteInfo = 0;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        let recentProfiles = 0;
        
        this.profiles.forEach(profile => {
            if (profile.country) countries.add(profile.country);
            if (profile.currency) currencies.add(profile.currency);
            if (profile.language) languages.add(profile.language);
            
            if (profile.avatarUrl && profile.avatarUrl !== 'default.png') {
                profilesWithAvatar++;
            }
            
            // Check for complete info (has at least 5 fields filled)
            const filledFields = [
                profile.displayName,
                profile.email,
                profile.phone,
                profile.country,
                profile.currency,
                profile.language,
                profile.dateFormat
            ].filter(field => field && field !== '' && field !== 'default.png').length;
            
            if (filledFields >= 5) {
                profilesWithCompleteInfo++;
            }
            
            // Check if profile was created/updated recently
            if (profile.updatedAt && profile.updatedAt >= thirtyDaysAgo) {
                recentProfiles++;
            }
        });
        
        // Update UI
        document.getElementById('totalProfilesCount').textContent = totalProfiles.toLocaleString();
        document.getElementById('profilesCount').textContent = totalProfiles;
        
        document.getElementById('uniqueCountries').textContent = countries.size;
        document.getElementById('uniqueCurrencies').textContent = currencies.size;
        
        const avatarPercentage = totalProfiles > 0 ? 
            Math.round((profilesWithAvatar / totalProfiles) * 100) : 0;
        document.getElementById('profilesWithAvatar').textContent = avatarPercentage + '%';
        
        const completePercentage = totalProfiles > 0 ? 
            Math.round((profilesWithCompleteInfo / totalProfiles) * 100) : 0;
        document.getElementById('completeProfiles').textContent = completePercentage + '%';
        
        document.getElementById('recentUpdates').textContent = recentProfiles;
        
        // Update profile completion chart
        this.updateCompletionChart(completePercentage);
        
    }
    
    updateCompletionChart(percentage) {
        const ctx = document.getElementById('completionChart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (this.completionChart) {
            this.completionChart.destroy();
        }
        
        const chartCtx = ctx.getContext('2d');
        this.completionChart = new Chart(chartCtx, {
            type: 'doughnut',
            data: {
                labels: ['Complete Profiles', 'Incomplete Profiles'],
                datasets: [{
                    data: [percentage, 100 - percentage],
                    backgroundColor: [
                        'rgba(72, 187, 120, 0.8)',
                        'rgba(237, 137, 54, 0.8)'
                    ],
                    borderWidth: 1,
                    borderColor: 'white'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw}%`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
    
    updateFilterOptions() {
        // Update country filter
        const countryFilter = document.getElementById('countryFilter');
        const countries = new Set();
        this.profiles.forEach(profile => {
            if (profile.country) countries.add(profile.country);
        });
        
        // Clear existing options except the first one
        while (countryFilter.options.length > 1) countryFilter.remove(1);
        
        // Add country options
        Array.from(countries).sort().forEach(country => {
            countryFilter.add(new Option(country, country));
        });
        
        // Update currency filter
        const currencyFilter = document.getElementById('currencyFilter');
        const currencies = new Set();
        this.profiles.forEach(profile => {
            if (profile.currency) currencies.add(profile.currency);
        });
        
        // Clear existing options except the first one
        while (currencyFilter.options.length > 1) currencyFilter.remove(1);
        
        // Add currency options
        Array.from(currencies).sort().forEach(currency => {
            currencyFilter.add(new Option(currency, currency));
        });
        
        // Update language filter
        const languageFilter = document.getElementById('languageFilter');
        const languages = new Set();
        this.profiles.forEach(profile => {
            if (profile.language) languages.add(profile.language);
        });
        
        // Clear existing options except the first one
        while (languageFilter.options.length > 1) languageFilter.remove(1);
        
        // Add language options
        Array.from(languages).sort().forEach(language => {
            languageFilter.add(new Option(language, language));
        });
    }
    
    filterAndSortProfiles() {
        // Start with all profiles
        this.filteredProfiles = [...this.profiles];
        
        // Apply search filter
        if (this.searchTerm.trim()) {
            this.filteredProfiles = this.filteredProfiles.filter(profile => {
                const displayName = profile.displayName || '';
                const email = profile.email || '';
                const phone = profile.phone || '';
                
                return displayName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                       email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                       phone.includes(this.searchTerm);
            });
        }
        
        // Apply country filter
        if (this.selectedCountry !== 'all') {
            this.filteredProfiles = this.filteredProfiles.filter(profile => 
                profile.country === this.selectedCountry
            );
        }
        
        // Apply currency filter
        if (this.selectedCurrency !== 'all') {
            this.filteredProfiles = this.filteredProfiles.filter(profile => 
                profile.currency === this.selectedCurrency
            );
        }
        
        // Apply language filter
        if (this.selectedLanguage !== 'all') {
            this.filteredProfiles = this.filteredProfiles.filter(profile => 
                profile.language === this.selectedLanguage
            );
        }
        
        // Apply sorting
        this.sortProfiles();
        
        // Reset to first page
        this.currentPage = 1;
        
        // Update UI
        this.updatePagination();
        this.renderProfilesTable();
    }
    
    sortProfiles() {
        switch (this.currentSort) {
            case 'newest':
                this.filteredProfiles.sort((a, b) => {
                    const dateA = a.updatedAt || a.createdAt || new Date(0);
                    const dateB = b.updatedAt || b.createdAt || new Date(0);
                    return dateB - dateA;
                });
                break;
                
            case 'oldest':
                this.filteredProfiles.sort((a, b) => {
                    const dateA = a.createdAt || new Date(0);
                    const dateB = b.createdAt || new Date(0);
                    return dateA - dateB;
                });
                break;
                
            case 'name':
                this.filteredProfiles.sort((a, b) => 
                    (a.displayName || '').localeCompare(b.displayName || '')
                );
                break;
                
            case 'country':
                this.filteredProfiles.sort((a, b) => 
                    (a.country || '').localeCompare(b.country || '')
                );
                break;
        }
    }
    
    getUserName(userId) {
        if (!userId) return 'Unknown User';
        
        const user = this.users.find(u => u.userId === userId);
        return user ? user.name : 'Unknown User';
    }
    
    getUserEmail(userId) {
        if (!userId) return 'No email';
        
        const user = this.users.find(u => u.userId === userId);
        return user ? user.email : 'No email';
    }
    
    updatePagination() {
        this.totalPages = Math.ceil(this.filteredProfiles.length / this.itemsPerPage);
        this.currentPage = Math.max(1, Math.min(this.currentPage, this.totalPages));
        
        // Update UI
        document.getElementById('currentPage').textContent = this.currentPage;
        document.getElementById('totalPages').textContent = this.totalPages;
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, this.filteredProfiles.length);
        
        document.getElementById('showingCount').textContent = (end - start);
        document.getElementById('totalCount').textContent = this.filteredProfiles.length;
        
        // Update button states
        document.getElementById('prevPageBtn').disabled = this.currentPage === 1;
        document.getElementById('nextPageBtn').disabled = this.currentPage === this.totalPages;
        
        // Update bulk actions
        this.updateBulkActions();
    }
    
    updateBulkActions() {
        const selectedCount = document.querySelectorAll('.profile-checkbox:checked').length;
        const bulkSelectedCount = document.getElementById('bulkSelectedCount');
        const bulkActions = document.getElementById('bulkActions');
        
        if (bulkSelectedCount) {
            bulkSelectedCount.textContent = selectedCount;
        }
        
        if (bulkActions) {
            if (selectedCount > 0) {
                bulkActions.classList.add('show');
            } else {
                bulkActions.classList.remove('show');
            }
        }
    }
    
    renderProfilesTable() {
        const tableBody = document.getElementById('profilesTableBody');
        
        if (this.filteredProfiles.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <i class="fas fa-id-card"></i>
                        <h4>No profiles found</h4>
                        <p>${this.searchTerm ? 'Try a different search term' : 'No profiles available'}</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = Math.min(start + this.itemsPerPage, this.filteredProfiles.length);
        const currentProfiles = this.filteredProfiles.slice(start, end);
        
        tableBody.innerHTML = currentProfiles.map((profile, index) => {
            const createdAt = profile.createdAt;
            const createdStr = createdAt ? 
                createdAt.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                }) : 'N/A';
            
            const updatedAt = profile.updatedAt;
            const updatedStr = updatedAt ? 
                updatedAt.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric'
                }) : 'Never';
            
            const userName = this.getUserName(profile.userId);
            const userEmail = this.getUserEmail(profile.userId);
            
            // Calculate profile completion percentage
            const completion = this.calculateProfileCompletion(profile);
            
            // Get avatar initials
            const initials = profile.displayName ? 
                profile.displayName.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2) : 
                '??';
            
            return `
                <tr data-profile-id="${profile.id}">
                    <td>
                        <input type="checkbox" class="profile-checkbox" data-profile-id="${profile.id}">
                    </td>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar-small" style="background: ${this.getAvatarColor(profile.displayName)}">
                                ${initials}
                            </div>
                            <div>
                                <strong>${profile.displayName || 'No Name'}</strong>
                                <br>
                                <small class="text-muted">${userName}</small>
                            </div>
                        </div>
                    </td>
                    <td>${userEmail}</td>
                    <td>${profile.phone || '-'}</td>
                    <td>
                        <span class="country-flag">${this.getCountryFlag(profile.country)}</span>
                        ${profile.country || '-'}
                    </td>
                    <td>
                        <span class="currency-badge">${profile.currency || '-'}</span>
                    </td>
                    <td>
                        <span class="language-badge">${profile.language || '-'}</span>
                    </td>
                    <td>
                        <div class="completion-bar">
                            <div class="completion-fill" style="width: ${completion}%"></div>
                            <span class="completion-text">${completion}%</span>
                        </div>
                    </td>
                    <td>${updatedStr}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" 
                                    title="View Details"
                                    onclick="profilesManager.viewProfileDetails('${profile.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit-btn" 
                                    title="Edit Profile"
                                    onclick="profilesManager.editProfile('${profile.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" 
                                    title="Delete Profile"
                                    onclick="profilesManager.deleteProfile('${profile.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Add event listeners to checkboxes
        document.querySelectorAll('.profile-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateBulkActions();
            });
        });
    }
    
    calculateProfileCompletion(profile) {
        const fields = [
            'displayName',
            'email',
            'phone',
            'country',
            'currency',
            'language',
            'dateFormat',
            'avatarUrl',
            'bio',
            'address',
            'city',
            'age',
            'gender'
        ];
        
        const filledFields = fields.filter(field => {
            const value = profile[field];
            return value && 
                   value !== '' && 
                   value !== 'default.png' && 
                   value !== 'dd/MM/yyyy';
        }).length;
        
        return Math.round((filledFields / fields.length) * 100);
    }
    
    getAvatarColor(name) {
        if (!name) return '#667eea';
        
        const colors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c',
            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
            '#fa709a', '#fee140', '#8E2DE2', '#4A00E0'
        ];
        
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    }
    
    getCountryFlag(countryCode) {
        if (!countryCode || countryCode.length !== 2) return '🌐';
        
        // Convert country code to flag emoji
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt());
        
        return String.fromCodePoint(...codePoints);
    }
    
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePagination();
            this.renderProfilesTable();
        }
    }
    
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePagination();
            this.renderProfilesTable();
        }
    }
    
    showProfileDetailsModal() {
        document.getElementById('profileDetailsModal').classList.add('active');
    }
    
    hideProfileDetailsModal() {
        document.getElementById('profileDetailsModal').classList.remove('active');
    }
    
    showEditProfileModal() {
        document.getElementById('editProfileModal').classList.add('active');
    }
    
    hideEditProfileModal() {
        document.getElementById('editProfileModal').classList.remove('active');
    }
    
    async viewProfileDetails(profileId) {
        try {
            const profile = this.profiles.find(p => p.id === profileId);
            if (!profile) {
                this.showMessage('Profile not found', 'error');
                return;
            }
            
            const userName = this.getUserName(profile.userId);
            const userEmail = this.getUserEmail(profile.userId);
            
            const createdStr = profile.createdAt ? 
                profile.createdAt.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'Unknown';
            
            const updatedStr = profile.updatedAt ? 
                profile.updatedAt.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'Never';
            
            // Calculate profile completion
            const completion = this.calculateProfileCompletion(profile);
            
            // Get avatar initials
            const initials = profile.displayName ? 
                profile.displayName.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2) : 
                '??';
            
            const modalContent = `
                <div class="profile-details-view">
                    <!-- Avatar and Basic Info -->
                    <div class="profile-header">
                        <div class="profile-avatar-large" style="background: ${this.getAvatarColor(profile.displayName)}">
                            ${initials}
                        </div>
                        <div class="profile-header-info">
                            <h3>${profile.displayName || 'No Name'}</h3>
                            <p class="profile-email">${userEmail}</p>
                            <p class="profile-user">Linked to: ${userName}</p>
                        </div>
                    </div>
                    
                    <!-- Completion Meter -->
                    <div class="completion-section">
                        <div class="completion-header">
                            <h4>Profile Completion</h4>
                            <span class="completion-percentage">${completion}%</span>
                        </div>
                        <div class="completion-meter">
                            <div class="completion-fill" style="width: ${completion}%"></div>
                        </div>
                    </div>
                    
                    <!-- Profile Information -->
                    <div class="profile-info-grid">
                        <div class="info-section">
                            <h4>Personal Information</h4>
                            <div class="info-row">
                                <span class="info-label">Phone</span>
                                <span class="info-value">${profile.phone || 'Not provided'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Address</span>
                                <span class="info-value">${profile.address || 'Not provided'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">City</span>
                                <span class="info-value">${profile.city || 'Not provided'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Age</span>
                                <span class="info-value">${profile.age || 'Not provided'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Gender</span>
                                <span class="info-value">${profile.gender || 'Not provided'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Bio</span>
                                <span class="info-value">${profile.bio || 'No biography'}</span>
                            </div>
                        </div>
                        
                        <div class="info-section">
                            <h4>Settings</h4>
                            <div class="info-row">
                                <span class="info-label">Country</span>
                                <span class="info-value">
                                    ${this.getCountryFlag(profile.country)} ${profile.country || 'Not set'}
                                </span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Currency</span>
                                <span class="info-value">${profile.currency || 'Not set'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Language</span>
                                <span class="info-value">${profile.language || 'Not set'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Date Format</span>
                                <span class="info-value">${profile.dateFormat || 'Not set'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Decimal Places</span>
                                <span class="info-value">${profile.decimalPlaces || '2'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Avatar</span>
                                <span class="info-value">${profile.avatarUrl || 'default.png'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Metadata -->
                    <div class="metadata-section">
                        <h4>Metadata</h4>
                        <div class="info-row">
                            <span class="info-label">Profile ID</span>
                            <span class="info-value code">${profile.id}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">User ID</span>
                            <span class="info-value code">${profile.userId}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Created</span>
                            <span class="info-value">${createdStr}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Last Updated</span>
                            <span class="info-value">${updatedStr}</span>
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="profile-actions">
                        <button class="btn btn-primary" onclick="profilesManager.editProfile('${profile.id}')">
                            <i class="fas fa-edit"></i>
                            Edit Profile
                        </button>
                        <button class="btn btn-secondary" onclick="profilesManager.resetProfileSettings('${profile.id}')">
                            <i class="fas fa-redo"></i>
                            Reset Settings
                        </button>
                    </div>
                </div>
            `;
            
            // Update modal
            document.getElementById('profileDetailsContent').innerHTML = modalContent;
            
            // Show modal
            this.showProfileDetailsModal();
            
        } catch (error) {
            console.error("Error viewing profile details:", error);
            this.showMessage('Error loading profile details: ' + error.message, 'error');
        }
    }
    
    async editProfile(profileId) {
        try {
            const profile = this.profiles.find(p => p.id === profileId);
            if (!profile) {
                this.showMessage('Profile not found', 'error');
                return;
            }
            
            // Populate edit form
            document.getElementById('editProfileId').value = profile.id;
            document.getElementById('editDisplayName').value = profile.displayName || '';
            document.getElementById('editEmail').value = profile.email || '';
            document.getElementById('editPhone').value = profile.phone || '';
            document.getElementById('editAddress').value = profile.address || '';
            document.getElementById('editCity').value = profile.city || '';
            document.getElementById('editCountry').value = profile.country || '';
            document.getElementById('editCurrency').value = profile.currency || '';
            document.getElementById('editLanguage').value = profile.language || '';
            document.getElementById('editDateFormat').value = profile.dateFormat || '';
            document.getElementById('editDecimalPlaces').value = profile.decimalPlaces || 2;
            document.getElementById('editBio').value = profile.bio || '';
            
            // Set age if exists
            if (profile.age) {
                document.getElementById('editAge').value = profile.age;
            }
            
            // Set gender if exists
            if (profile.gender) {
                document.getElementById('editGender').value = profile.gender;
            }
            
            // Show modal
            document.getElementById('editProfileTitle').textContent = `Edit Profile: ${profile.displayName || 'Unnamed'}`;
            this.showEditProfileModal();
            
        } catch (error) {
            console.error("Error preparing profile edit:", error);
            this.showMessage('Error loading profile data: ' + error.message, 'error');
        }
    }
    
    async updateProfile() {
        try {
            const profileId = document.getElementById('editProfileId').value;
            const displayName = document.getElementById('editDisplayName').value;
            const email = document.getElementById('editEmail').value;
            const phone = document.getElementById('editPhone').value;
            const address = document.getElementById('editAddress').value;
            const city = document.getElementById('editCity').value;
            const country = document.getElementById('editCountry').value;
            const currency = document.getElementById('editCurrency').value;
            const language = document.getElementById('editLanguage').value;
            const dateFormat = document.getElementById('editDateFormat').value;
            const decimalPlaces = parseInt(document.getElementById('editDecimalPlaces').value);
            const bio = document.getElementById('editBio').value;
            const age = document.getElementById('editAge').value;
            const gender = document.getElementById('editGender').value;
            
            // Validate required fields
            if (!displayName || !email) {
                this.showMessage('Display name and email are required', 'error');
                return;
            }
            
            // Create update object
            const updateData = {
                displayName: displayName,
                email: email,
                phone: phone || null,
                address: address || null,
                city: city || null,
                country: country || null,
                currency: currency || null,
                language: language || null,
                dateFormat: dateFormat || 'dd/MM/yyyy',
                decimalPlaces: decimalPlaces || 2,
                bio: bio || null,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Add optional fields if they have values
            if (age) updateData.age = parseInt(age);
            if (gender) updateData.gender = gender;
            
            // Update profile in Firestore
            await this.db.collection('profiles').doc(profileId).update(updateData);
            
            // Show success message
            this.showMessage(`Profile updated successfully!`, 'success');
            
            // Close modal
            this.hideEditProfileModal();
            
            // Update local data
            const profileIndex = this.profiles.findIndex(p => p.id === profileId);
            if (profileIndex !== -1) {
                this.profiles[profileIndex] = {
                    ...this.profiles[profileIndex],
                    ...updateData,
                    updatedAt: new Date()
                };
            }
            
            // Update statistics and UI
            await this.updateStatistics();
            this.filterAndSortProfiles();
            
            // Close details modal if open
            this.hideProfileDetailsModal();
            
        } catch (error) {
            console.error("Error updating profile:", error);
            this.showMessage('Error updating profile: ' + error.message, 'error');
        }
    }
    
    async resetProfileSettings(profileId) {
        try {
            const profile = this.profiles.find(p => p.id === profileId);
            if (!profile) {
                this.showMessage('Profile not found', 'error');
                return;
            }
            
            const confirmMessage = `Are you sure you want to reset settings for ${profile.displayName || 'this profile'}? This will reset all preferences to default values.`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Reset to default settings
            const resetData = {
                currency: 'USD',
                language: 'en',
                country: 'US',
                dateFormat: 'dd/MM/yyyy',
                decimalPlaces: 2,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Update profile in Firestore
            await this.db.collection('profiles').doc(profileId).update(resetData);
            
            // Show success message
            this.showMessage(`Profile settings reset to defaults!`, 'success');
            
            // Update local data
            const profileIndex = this.profiles.findIndex(p => p.id === profileId);
            if (profileIndex !== -1) {
                this.profiles[profileIndex] = {
                    ...this.profiles[profileIndex],
                    ...resetData,
                    updatedAt: new Date()
                };
            }
            
            // Update statistics and UI
            await this.updateStatistics();
            this.filterAndSortProfiles();
            
            // Close details modal if open
            this.hideProfileDetailsModal();
            
        } catch (error) {
            console.error("Error resetting profile settings:", error);
            this.showMessage('Error resetting profile settings: ' + error.message, 'error');
        }
    }
    
    async deleteProfile(profileId) {
        try {
            const profile = this.profiles.find(p => p.id === profileId);
            if (!profile) {
                this.showMessage('Profile not found', 'error');
                return;
            }
            
            const confirmMessage = `Are you sure you want to delete the profile for ${profile.displayName || 'this user'}? This action cannot be undone.`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Delete from Firestore
            await this.db.collection('profiles').doc(profileId).delete();
            
            // Remove from local array
            this.profiles = this.profiles.filter(p => p.id !== profileId);
            
            // Show success message
            this.showMessage(`Profile deleted successfully!`, 'success');
            
            // Update statistics and UI
            await this.updateStatistics();
            this.filterAndSortProfiles();
            
            // Close details modal if open
            this.hideProfileDetailsModal();
            
        } catch (error) {
            console.error("Error deleting profile:", error);
            this.showMessage('Error deleting profile: ' + error.message, 'error');
        }
    }
    
    async bulkDeleteProfiles() {
        try {
            const selectedCheckboxes = document.querySelectorAll('.profile-checkbox:checked');
            const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.profileId);
            
            if (selectedIds.length === 0) {
                this.showMessage('Please select at least one profile to delete', 'warning');
                return;
            }
            
            const confirmMessage = `Are you sure you want to delete ${selectedIds.length} profile(s)? This action cannot be undone.`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Delete each selected profile
            const deletePromises = selectedIds.map(profileId => 
                this.db.collection('profiles').doc(profileId).delete()
            );
            
            await Promise.all(deletePromises);
            
            // Remove from local array
            this.profiles = this.profiles.filter(p => !selectedIds.includes(p.id));
            
            // Show success message
            this.showMessage(`${selectedIds.length} profile(s) deleted successfully!`, 'success');
            
            // Update statistics and UI
            await this.updateStatistics();
            this.filterAndSortProfiles();
            
        } catch (error) {
            console.error("Error bulk deleting profiles:", error);
            this.showMessage('Error deleting profiles: ' + error.message, 'error');
        }
    }
    
    toggleSelectAll() {
        const checkboxes = document.querySelectorAll('.profile-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
        });
        
        this.updateBulkActions();
    }
    
    exportProfilesData() {
        try {
            // Prepare data for export
            const exportData = this.filteredProfiles.map(profile => {
                const userName = this.getUserName(profile.userId);
                const createdStr = profile.createdAt ? 
                    profile.createdAt.toISOString().split('T')[0] : 'N/A';
                const updatedStr = profile.updatedAt ? 
                    profile.updatedAt.toISOString().split('T')[0] : 'N/A';
                
                return {
                    'Display Name': profile.displayName || '',
                    'Email': profile.email || '',
                    'Linked User': userName,
                    'Phone': profile.phone || '',
                    'Country': profile.country || '',
                    'Currency': profile.currency || '',
                    'Language': profile.language || '',
                    'Address': profile.address || '',
                    'City': profile.city || '',
                    'Age': profile.age || '',
                    'Gender': profile.gender || '',
                    'Bio': profile.bio || '',
                    'Date Format': profile.dateFormat || '',
                    'Decimal Places': profile.decimalPlaces || '',
                    'Avatar URL': profile.avatarUrl || '',
                    'Created Date': createdStr,
                    'Last Updated': updatedStr,
                    'Profile ID': profile.id,
                    'User ID': profile.userId || ''
                };
            });
            
            // Convert to CSV
            const headers = Object.keys(exportData[0] || {});
            const csv = [
                headers.join(','),
                ...exportData.map(row => 
                    headers.map(header => {
                        const cell = row[header];
                        return typeof cell === 'string' && cell.includes(',') ? 
                            `"${cell}"` : cell;
                    }).join(',')
                )
            ].join('\n');
            
            // Create download link
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `profiles_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showMessage('Export completed successfully!', 'success');
            
        } catch (error) {
            console.error("Error exporting data:", error);
            this.showMessage('Error exporting data: ' + error.message, 'error');
        }
    }
    
    showLoading(show) {
        const tableBody = document.getElementById('profilesTableBody');
        if (show) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="loading-row">
                        <div class="loading-state">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Loading profiles data...</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    showMessage(message, type = 'info') {
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${this.getMessageIcon(type)}"></i>
            <span>${message}</span>
            <button class="message-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to page
        const container = document.querySelector('.main-content');
        container.insertBefore(messageDiv, container.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    }
    
    getMessageIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            case 'info': return 'info-circle';
            default: return 'info-circle';
        }
    }
    
    showError(message) {
        const container = document.querySelector('.main-content');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px; color: var(--danger-color);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 50px; margin-bottom: 20px;"></i>
                    <h2>⚠️ System Error</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> Reload Page
                    </button>
                </div>
            `;
        }
    }
}

// Initialize profiles manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.profilesManager = new ProfilesManager();
});