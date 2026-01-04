// Profiles Management System - COMPLETE VERSION
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
        this.selectedCompletion = 'all';
        this.currentSort = 'newest';
        this.searchTerm = '';
        this.countryChart = null;
        this.currencyChart = null;
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
        
        // Bulk update button
        document.getElementById('bulkUpdateBtn').addEventListener('click', () => {
            this.showBulkUpdateModal();
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
        
        document.getElementById('completionFilter').addEventListener('change', (e) => {
            this.selectedCompletion = e.target.value;
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
        
        // Refresh completion button
        document.getElementById('refreshCompletionBtn').addEventListener('click', () => {
            this.updateCompletionAnalysis();
        });
        
        // Bulk update form
        document.getElementById('bulkUpdateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.bulkUpdateProfiles();
        });
        
        document.getElementById('cancelBulkUpdateBtn').addEventListener('click', () => {
            this.hideBulkUpdateModal();
        });
        
        // Bulk update field change
        document.getElementById('bulkUpdateField').addEventListener('change', (e) => {
            this.updateBulkValueInput(e.target.value);
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
        
        document.getElementById('closeBulkUpdateModal').addEventListener('click', () => {
            this.hideBulkUpdateModal();
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
            
            // Update charts
            this.updateCharts();
            
            // Update completion analysis
            this.updateCompletionAnalysis();
            
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
        
        // Find top country, currency, and language
        const countryCounts = {};
        const currencyCounts = {};
        const languageCounts = {};
        
        this.profiles.forEach(profile => {
            if (profile.country) {
                countries.add(profile.country);
                countryCounts[profile.country] = (countryCounts[profile.country] || 0) + 1;
            }
            if (profile.currency) {
                currencies.add(profile.currency);
                currencyCounts[profile.currency] = (currencyCounts[profile.currency] || 0) + 1;
            }
            if (profile.language) {
                languages.add(profile.language);
                languageCounts[profile.language] = (languageCounts[profile.language] || 0) + 1;
            }
        });
        
        // Find top items
        const topCountry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0];
        const topCurrency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0];
        const topLanguage = Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0];
        
        // Calculate growth (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentProfiles = this.profiles.filter(profile => 
            profile.createdAt && profile.createdAt >= thirtyDaysAgo
        ).length;
        
        const growth = totalProfiles > 0 ? 
            Math.round((recentProfiles / totalProfiles) * 100) : 0;
        
        // Update UI
        document.getElementById('totalProfilesCount').textContent = totalProfiles.toLocaleString();
        document.getElementById('profilesCount').textContent = totalProfiles;
        
        document.getElementById('countriesCount').textContent = countries.size;
        document.getElementById('currenciesCount').textContent = currencies.size;
        document.getElementById('languagesCount').textContent = languages.size;
        
        document.getElementById('profilesGrowth').textContent = growth + '% completion rate';
        document.getElementById('topCountry').textContent = topCountry ? topCountry[0] : '-';
        document.getElementById('topCurrency').textContent = topCurrency ? topCurrency[0] : 'USD';
        document.getElementById('topLanguage').textContent = topLanguage ? topLanguage[0] : 'en';
        
    }
    
    updateCharts() {
        this.updateCountryChart();
        this.updateCurrencyChart();
    }
    
    updateCountryChart() {
        const ctx = document.getElementById('countryChart');
        if (!ctx) return;
        
        // Calculate country distribution
        const countryCounts = {};
        this.profiles.forEach(profile => {
            if (profile.country) {
                countryCounts[profile.country] = (countryCounts[profile.country] || 0) + 1;
            }
        });
        
        // Sort and get top 8 countries
        const sortedCountries = Object.entries(countryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
        
        const labels = sortedCountries.map(item => item[0]);
        const data = sortedCountries.map(item => item[1]);
        
        // Destroy existing chart if it exists
        if (this.countryChart) {
            this.countryChart.destroy();
        }
        
        this.countryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Profiles',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    updateCurrencyChart() {
        const ctx = document.getElementById('currencyChart');
        if (!ctx) return;
        
        // Calculate currency distribution
        const currencyCounts = {};
        this.profiles.forEach(profile => {
            if (profile.currency) {
                currencyCounts[profile.currency] = (currencyCounts[profile.currency] || 0) + 1;
            }
        });
        
        // Prepare data for doughnut chart
        const labels = Object.keys(currencyCounts);
        const data = Object.values(currencyCounts);
        
        // Destroy existing chart if it exists
        if (this.currencyChart) {
            this.currencyChart.destroy();
        }
        
        this.currencyChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#8AC926', '#1982C4'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }
    
    updateCompletionAnalysis() {
        let basicTotal = 0, basicFilled = 0;
        let locationTotal = 0, locationFilled = 0;
        let preferencesTotal = 0, preferencesFilled = 0;
        let additionalTotal = 0, additionalFilled = 0;
        
        this.profiles.forEach(profile => {
            // Basic Info (Name, Email, Phone)
            if (profile.displayName) basicFilled++;
            if (profile.email) basicFilled++;
            if (profile.phone) basicFilled++;
            basicTotal += 3;
            
            // Location Info (Country, City, Address)
            if (profile.country) locationFilled++;
            if (profile.city) locationFilled++;
            if (profile.address) locationFilled++;
            locationTotal += 3;
            
            // Preferences (Currency, Language, Date Format)
            if (profile.currency) preferencesFilled++;
            if (profile.language) preferencesFilled++;
            if (profile.dateFormat) preferencesFilled++;
            preferencesTotal += 3;
            
            // Additional Info (Bio, Age, Gender, Avatar)
            if (profile.bio) additionalFilled++;
            if (profile.age) additionalFilled++;
            if (profile.gender) additionalFilled++;
            if (profile.avatarUrl && profile.avatarUrl !== 'default.png') additionalFilled++;
            additionalTotal += 4;
        });
        
        // Calculate percentages
        const basicPercentage = basicTotal > 0 ? Math.round((basicFilled / basicTotal) * 100) : 0;
        const locationPercentage = locationTotal > 0 ? Math.round((locationFilled / locationTotal) * 100) : 0;
        const preferencesPercentage = preferencesTotal > 0 ? Math.round((preferencesFilled / preferencesTotal) * 100) : 0;
        const additionalPercentage = additionalTotal > 0 ? Math.round((additionalFilled / additionalTotal) * 100) : 0;
        
        // Update UI
        document.getElementById('basicCompletion').textContent = basicPercentage + '%';
        document.getElementById('locationCompletion').textContent = locationPercentage + '%';
        document.getElementById('preferencesCompletion').textContent = preferencesPercentage + '%';
        document.getElementById('additionalCompletion').textContent = additionalPercentage + '%';
        
        document.getElementById('basicFill').style.width = basicPercentage + '%';
        document.getElementById('locationFill').style.width = locationPercentage + '%';
        document.getElementById('preferencesFill').style.width = preferencesPercentage + '%';
        document.getElementById('additionalFill').style.width = additionalPercentage + '%';
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
                const country = profile.country || '';
                
                return displayName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                       email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                       country.toLowerCase().includes(this.searchTerm.toLowerCase());
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
        
        // Apply completion filter
        if (this.selectedCompletion !== 'all') {
            this.filteredProfiles = this.filteredProfiles.filter(profile => {
                const completion = this.calculateProfileCompletion(profile);
                switch (this.selectedCompletion) {
                    case 'high': return completion >= 75;
                    case 'medium': return completion >= 50 && completion < 75;
                    case 'low': return completion < 50;
                    default: return true;
                }
            });
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
    }
    
    renderProfilesTable() {
        const tableBody = document.getElementById('profilesTableBody');
        
        if (this.filteredProfiles.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
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
            const updatedAt = profile.updatedAt;
            const updatedStr = updatedAt ? 
                updatedAt.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                }) : 'Never';
            
            const userName = this.getUserName(profile.userId);
            
            // Calculate profile completion percentage
            const completion = this.calculateProfileCompletion(profile);
            
            // Get completion color
            let completionColor = '#f5576c'; // red for low
            if (completion >= 75) completionColor = '#43e97b'; // green for high
            else if (completion >= 50) completionColor = '#fa709a'; // pink for medium
            
            // Get avatar initials
            const initials = profile.displayName ? 
                profile.displayName.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2) : 
                '??';
            
            // Get avatar color
            const avatarColor = this.getAvatarColor(profile.displayName);
            
            return `
                <tr data-profile-id="${profile.id}">
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar-small" style="background: ${avatarColor}; color: white;">
                                ${initials}
                            </div>
                            <div class="user-info">
                                <strong>${profile.displayName || 'No Name'}</strong>
                                <br>
                                <small class="text-muted">${userName}</small>
                            </div>
                        </div>
                    </td>
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
                    <td>${profile.dateFormat || 'dd/MM/yyyy'}</td>
                    <td>
                        <div class="avatar-cell">
                            ${profile.avatarUrl && profile.avatarUrl !== 'default.png' ? 
                                `<img src="${profile.avatarUrl}" alt="Avatar" class="avatar-img">` : 
                                `<div class="avatar-placeholder" style="background: ${avatarColor}">${initials}</div>`
                            }
                        </div>
                    </td>
                    <td>
                        <div class="completion-cell">
                            <div class="completion-bar-small">
                                <div class="completion-fill-small" style="width: ${completion}%; background: ${completionColor}"></div>
                            </div>
                            <span class="completion-text-small">${completion}%</span>
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
    }
    
    calculateProfileCompletion(profile) {
        const fields = [
            'displayName',
            'email',
            'phone',
            'country',
            'city',
            'address',
            'currency',
            'language',
            'dateFormat',
            'avatarUrl',
            'bio',
            'age',
            'gender'
        ];
        
        const filledFields = fields.filter(field => {
            const value = profile[field];
            if (!value) return false;
            if (typeof value === 'string' && value.trim() === '') return false;
            if (field === 'avatarUrl' && value === 'default.png') return false;
            if (field === 'dateFormat' && value === 'dd/MM/yyyy') return false;
            return true;
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
    
    showBulkUpdateModal() {
        document.getElementById('bulkUpdateModal').classList.add('active');
    }
    
    hideBulkUpdateModal() {
        document.getElementById('bulkUpdateModal').classList.remove('active');
    }
    
    updateBulkValueInput(field) {
        const container = document.getElementById('bulkValueContainer');
        
        let inputHTML = '';
        switch (field) {
            case 'currency':
                inputHTML = `
                    <select id="bulkUpdateValue" required>
                        <option value="">Select Currency</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="SAR">SAR - Saudi Riyal</option>
                        <option value="AED">AED - UAE Dirham</option>
                    </select>
                `;
                break;
                
            case 'language':
                inputHTML = `
                    <select id="bulkUpdateValue" required>
                        <option value="">Select Language</option>
                        <option value="en">English</option>
                        <option value="ar">Arabic</option>
                        <option value="fr">French</option>
                        <option value="es">Spanish</option>
                        <option value="de">German</option>
                    </select>
                `;
                break;
                
            case 'dateFormat':
                inputHTML = `
                    <select id="bulkUpdateValue" required>
                        <option value="">Select Date Format</option>
                        <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                        <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                        <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                        <option value="dd MMM yyyy">DD MMM YYYY</option>
                    </select>
                `;
                break;
                
            case 'country':
                inputHTML = `
                    <select id="bulkUpdateValue" required>
                        <option value="">Select Country</option>
                        <option value="US">United States</option>
                        <option value="GB">United Kingdom</option>
                        <option value="SA">Saudi Arabia</option>
                        <option value="AE">United Arab Emirates</option>
                        <option value="EG">Egypt</option>
                        <option value="FR">France</option>
                        <option value="DE">Germany</option>
                        <option value="JP">Japan</option>
                    </select>
                `;
                break;
                
            default:
                inputHTML = `<input type="text" id="bulkUpdateValue" required placeholder="Enter new value">`;
        }
        
        container.innerHTML = inputHTML;
    }
    
    async viewProfileDetails(profileId) {
        try {
            const profile = this.profiles.find(p => p.id === profileId);
            if (!profile) {
                this.showMessage('Profile not found', 'error');
                return;
            }
            
            const userName = this.getUserName(profile.userId);
            
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
                            <p class="profile-email">${profile.email || 'No email'}</p>
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
                        <button class="btn btn-danger" onclick="profilesManager.deleteProfile('${profile.id}')">
                            <i class="fas fa-trash"></i>
                            Delete Profile
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
            
            // Create edit modal if doesn't exist
            let editModal = document.getElementById('editProfileModal');
            if (!editModal) {
                editModal = this.createEditProfileModal();
                document.body.appendChild(editModal);
            }
            
            // Populate edit form
            document.getElementById('editProfileId').value = profile.id;
            document.getElementById('editUserId').value = profile.userId;
            document.getElementById('editDisplayName').value = profile.displayName || '';
            document.getElementById('editEmail').value = profile.email || '';
            document.getElementById('editPhone').value = profile.phone || '';
            document.getElementById('editAddress').value = profile.address || '';
            document.getElementById('editCity').value = profile.city || '';
            document.getElementById('editCountry').value = profile.country || '';
            document.getElementById('editCurrency').value = profile.currency || '';
            document.getElementById('editLanguage').value = profile.language || '';
            document.getElementById('editDateFormat').value = profile.dateFormat || 'dd/MM/yyyy';
            document.getElementById('editDecimalPlaces').value = profile.decimalPlaces || 2;
            document.getElementById('editBio').value = profile.bio || '';
            document.getElementById('editAge').value = profile.age || '';
            document.getElementById('editGender').value = profile.gender || '';
            document.getElementById('editAvatarUrl').value = profile.avatarUrl || 'default.png';
            
            // Show modal
            document.getElementById('editProfileTitle').textContent = `Edit Profile: ${profile.displayName || 'Unnamed'}`;
            this.showEditProfileModal();
            
        } catch (error) {
            console.error("Error preparing profile edit:", error);
            this.showMessage('Error loading profile data: ' + error.message, 'error');
        }
    }
    
    createEditProfileModal() {
        const modalHTML = `
            <div class="modal" id="editProfileModal">
                <div class="modal-content wide-modal">
                    <div class="modal-header">
                        <h3 id="editProfileTitle">Edit Profile</h3>
                        <button class="close-modal" id="closeEditProfileModal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="editProfileForm">
                            <input type="hidden" id="editProfileId">
                            <input type="hidden" id="editUserId">
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editDisplayName">
                                        <i class="fas fa-user"></i>
                                        Display Name *
                                    </label>
                                    <input type="text" id="editDisplayName" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="editEmail">
                                        <i class="fas fa-envelope"></i>
                                        Email *
                                    </label>
                                    <input type="email" id="editEmail" required>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editPhone">
                                        <i class="fas fa-phone"></i>
                                        Phone
                                    </label>
                                    <input type="tel" id="editPhone">
                                </div>
                                
                                <div class="form-group">
                                    <label for="editAge">
                                        <i class="fas fa-birthday-cake"></i>
                                        Age
                                    </label>
                                    <input type="number" id="editAge" min="1" max="120">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editGender">
                                        <i class="fas fa-venus-mars"></i>
                                        Gender
                                    </label>
                                    <select id="editGender">
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="editCountry">
                                        <i class="fas fa-globe"></i>
                                        Country
                                    </label>
                                    <select id="editCountry">
                                        <option value="">Select Country</option>
                                        <option value="US">United States</option>
                                        <option value="GB">United Kingdom</option>
                                        <option value="SA">Saudi Arabia</option>
                                        <option value="AE">United Arab Emirates</option>
                                        <option value="EG">Egypt</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editCity">
                                        <i class="fas fa-city"></i>
                                        City
                                    </label>
                                    <input type="text" id="editCity">
                                </div>
                                
                                <div class="form-group">
                                    <label for="editAddress">
                                        <i class="fas fa-home"></i>
                                        Address
                                    </label>
                                    <input type="text" id="editAddress">
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editCurrency">
                                        <i class="fas fa-money-bill"></i>
                                        Currency *
                                    </label>
                                    <select id="editCurrency" required>
                                        <option value="">Select Currency</option>
                                        <option value="USD">USD - US Dollar</option>
                                        <option value="EUR">EUR - Euro</option>
                                        <option value="GBP">GBP - British Pound</option>
                                        <option value="SAR">SAR - Saudi Riyal</option>
                                        <option value="AED">AED - UAE Dirham</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="editLanguage">
                                        <i class="fas fa-language"></i>
                                        Language *
                                    </label>
                                    <select id="editLanguage" required>
                                        <option value="">Select Language</option>
                                        <option value="en">English</option>
                                        <option value="ar">Arabic</option>
                                        <option value="fr">French</option>
                                        <option value="es">Spanish</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="editDateFormat">
                                        <i class="fas fa-calendar"></i>
                                        Date Format *
                                    </label>
                                    <select id="editDateFormat" required>
                                        <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                                        <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                                        <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                                        <option value="dd MMM yyyy">DD MMM YYYY</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="editDecimalPlaces">
                                        <i class="fas fa-calculator"></i>
                                        Decimal Places
                                    </label>
                                    <select id="editDecimalPlaces">
                                        <option value="0">0</option>
                                        <option value="1">1</option>
                                        <option value="2" selected>2</option>
                                        <option value="3">3</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="editAvatarUrl">
                                    <i class="fas fa-image"></i>
                                    Avatar URL
                                </label>
                                <input type="text" id="editAvatarUrl" placeholder="Enter image URL">
                            </div>
                            
                            <div class="form-group">
                                <label for="editBio">
                                    <i class="fas fa-align-left"></i>
                                    Bio
                                </label>
                                <textarea id="editBio" rows="3" placeholder="Enter biography..."></textarea>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" id="cancelEditProfileBtn">
                                    Cancel
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i>
                                    Update Profile
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHTML;
        
        // Add event listeners
        setTimeout(() => {
            document.getElementById('closeEditProfileModal').addEventListener('click', () => {
                this.hideEditProfileModal();
            });
            
            document.getElementById('cancelEditProfileBtn').addEventListener('click', () => {
                this.hideEditProfileModal();
            });
            
            document.getElementById('editProfileForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateProfile();
            });
        }, 100);
        
        return modalElement;
    }
    
    async updateProfile() {
        try {
            const profileId = document.getElementById('editProfileId').value;
            const userId = document.getElementById('editUserId').value;
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
            const avatarUrl = document.getElementById('editAvatarUrl').value;
            
            // Validate required fields
            if (!displayName || !email || !currency || !language) {
                this.showMessage('Please fill in all required fields', 'error');
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
                currency: currency,
                language: language,
                dateFormat: dateFormat,
                decimalPlaces: decimalPlaces,
                bio: bio || null,
                avatarUrl: avatarUrl || 'default.png',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Add optional fields if they have values
            if (age) updateData.age = parseInt(age);
            if (gender) updateData.gender = gender;
            
            // Also update user's email in users collection if changed
            const userDoc = await this.db.collection('users').doc(userId).get();
            if (userDoc.exists && userDoc.data().email !== email) {
                await this.db.collection('users').doc(userId).update({
                    email: email,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
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
            this.updateCharts();
            this.updateCompletionAnalysis();
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
            
            const confirmMessage = `Are you sure you want to reset settings for "${profile.displayName || 'this profile'}"? This will reset all preferences to default values.`;
            
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
                avatarUrl: 'default.png',
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
            this.updateCharts();
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
            
            const confirmMessage = `Are you sure you want to delete the profile for "${profile.displayName || 'this user'}"? This action cannot be undone.`;
            
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
            this.updateCharts();
            this.updateCompletionAnalysis();
            this.filterAndSortProfiles();
            
            // Close details modal if open
            this.hideProfileDetailsModal();
            
        } catch (error) {
            console.error("Error deleting profile:", error);
            this.showMessage('Error deleting profile: ' + error.message, 'error');
        }
    }
    
    async bulkUpdateProfiles() {
        try {
            const field = document.getElementById('bulkUpdateField').value;
            const value = document.getElementById('bulkUpdateValue').value;
            const filter = document.getElementById('bulkUpdateFilter').value;
            
            if (!field || !value) {
                this.showMessage('Please select a field and enter a value', 'error');
                return;
            }
            
            // Determine which profiles to update
            let profilesToUpdate = [];
            switch (filter) {
                case 'all':
                    profilesToUpdate = this.profiles;
                    break;
                case 'selected':
                    // In real implementation, you would track selected profiles
                    profilesToUpdate = this.filteredProfiles; // For demo
                    break;
                case 'filtered':
                    profilesToUpdate = this.filteredProfiles;
                    break;
            }
            
            if (profilesToUpdate.length === 0) {
                this.showMessage('No profiles to update', 'warning');
                return;
            }
            
            const confirmMessage = `Are you sure you want to update "${field}" to "${value}" for ${profilesToUpdate.length} profile(s)?`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Show loading
            this.showMessage(`Updating ${profilesToUpdate.length} profiles...`, 'info');
            
            // Prepare update data
            const updateData = {
                [field]: value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Perform batch update
            const batch = this.db.batch();
            let updatedCount = 0;
            
            for (const profile of profilesToUpdate.slice(0, 100)) { // Limit to 100 for performance
                const profileRef = this.db.collection('profiles').doc(profile.id);
                batch.update(profileRef, updateData);
                updatedCount++;
            }
            
            await batch.commit();
            
            // Show success message
            this.showMessage(`Successfully updated ${updatedCount} profile(s)!`, 'success');
            
            // Close modal
            this.hideBulkUpdateModal();
            
            // Refresh data
            await this.loadInitialData();
            
        } catch (error) {
            console.error("Error in bulk update:", error);
            this.showMessage('Error updating profiles: ' + error.message, 'error');
        }
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
                    'City': profile.city || '',
                    'Address': profile.address || '',
                    'Age': profile.age || '',
                    'Gender': profile.gender || '',
                    'Currency': profile.currency || '',
                    'Language': profile.language || '',
                    'Date Format': profile.dateFormat || '',
                    'Decimal Places': profile.decimalPlaces || '',
                    'Bio': profile.bio || '',
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
                    <td colspan="9" class="loading-row">
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
