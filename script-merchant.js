        // ==================== GLOBAL VARIABLES ====================
        let currentMerchantId = null;
        let currentMerchantData = null;
        let editingProductId = null;
        let products = [];
        let selectedImageFile = null;
        let productImageBase64 = null;
        let currentProductImageBase64 = null;
        
        // ==================== INITIALIZATION ====================
        document.addEventListener('DOMContentLoaded', function() {
            console.log("🚀 Merchant dashboard loading...");
            
            // Get Firebase instances from shared config
            const auth = window.firebaseAuth;
            const db = window.firebaseDb;
            
            if (!auth || !db) {
                console.error("❌ Firebase services not loaded from shared config!");
                alert("Error: Firebase services not loaded. Please check firebase-config.js");
                return;
            }
            
            console.log("✅ Firebase services loaded from shared config");
            
            // Initialize the application
            initializeApp(auth, db);
        });
        
        // ==================== MAIN APP FUNCTION ====================
        function initializeApp(auth, db) {
            console.log("🔧 Initializing application...");
            
            // ==================== AUTHENTICATION HANDLING ====================
            auth.onAuthStateChanged(async (user) => {
                if (!user) {
                    console.log("❌ No user logged in - showing login prompt");
                    showLoginPrompt();
                    return;
                }
                
                console.log("✅ User logged in:", user.email, user.uid);
                
                // Try to find merchant data
                await findMerchantData(user, db);
            });
            
            // ==================== CORE FUNCTIONS ====================
            async function findMerchantData(user, db) {
                console.log("🔍 Finding merchant data for user:", user.email, user.uid);
                
                try {
                    // Search for merchant by email in merchants collection
                    await searchMerchantByEmail(user.email, db);
                } catch (error) {
                    console.error("❌ Error finding merchant data:", error);
                    showLoginPrompt("Error accessing merchant account. Please contact support.");
                }
            }
            
            async function searchMerchantByEmail(email, db) {
                console.log("📧 Searching merchant by email:", email);
                
                try {
                    const merchantsRef = db.collection("verifiedMerchants");
                    const querySnapshot = await merchantsRef
                        .where("email", "==", email)
                        .limit(1)
                        .get();
                    
                    if (querySnapshot.empty) {
                        console.log("❌ No merchant found with email:", email);
                        showLoginPrompt("No merchant account found for " + email + ". Please contact support.");
                        return;
                    }
                    
                    // Found merchant
                    querySnapshot.forEach(doc => {
                        console.log("✅ Found merchant:", doc.id);
                        const merchantData = doc.data();
                        loadMerchantById(doc.id, merchantData, db);
                    });
                    
                } catch (error) {
                    console.error("❌ Error searching merchant:", error);
                    showLoginPrompt("Error searching merchant account. Please try again.");
                }
            }
            
            async function loadMerchantById(merchantId, merchantData = null, db) {
                console.log("📋 Loading merchant by ID:", merchantId);
                
                try {
                    if (!merchantData) {
                        const doc = await db.collection("verifiedMerchants").doc(merchantId).get();
                        if (!doc.exists) {
                            console.log("❌ Merchant document not found:", merchantId);
                            showLoginPrompt("Merchant account not found.");
                            return;
                        }
                        merchantData = doc.data();
                    }
                    
                    // Store merchant data globally
                    currentMerchantId = merchantId;
                    currentMerchantData = merchantData;
                    
                    console.log("✅ Merchant loaded successfully:", merchantData);
                    
                    // Show dashboard
                    showDashboard(merchantData);
                    
                    // Load initial data
                    loadProducts(db);
                    loadStatistics(db);
                    
                } catch (error) {
                    console.error("❌ Error loading merchant:", error);
                    showLoginPrompt("Error loading merchant data. Please try again.");
                }
            }
            
            function showLoginPrompt(message = "Please log in with your merchant account to access the dashboard.") {
                console.log("🔒 Showing login prompt");
                
                const loginPrompt = document.getElementById('loginPrompt');
                const dashboardContent = document.getElementById('dashboardContent');
                
                if (loginPrompt) {
                    loginPrompt.style.display = 'block';
                    if (message) {
                        const p = loginPrompt.querySelector('p');
                        if (p) p.textContent = message;
                    }
                }
                
                if (dashboardContent) {
                    dashboardContent.style.display = 'none';
                }
            }
            
            function showDashboard(merchantData) {
                console.log("🎯 Showing dashboard for:", merchantData);
                
                const loginPrompt = document.getElementById('loginPrompt');
                const dashboardContent = document.getElementById('dashboardContent');
                
                if (loginPrompt) loginPrompt.style.display = 'none';
                if (dashboardContent) dashboardContent.style.display = 'block';
                
                // Update merchant info in header
                const merchantName = document.getElementById('merchantName');
                const merchantStore = document.getElementById('merchantStore');
                
                if (merchantName) merchantName.textContent = merchantData.name || merchantData.email;
                if (merchantStore) merchantStore.textContent = `Store: ${merchantData.storeName || "My Store"}`;
                
                // Initialize tabs
                initializeDashboard();
            }
            
            function initializeDashboard() {
                console.log("📊 Initializing dashboard tabs");
                
                // Tab switching
                document.querySelectorAll('.tab').forEach(tab => {
                    tab.addEventListener('click', function() {
                        const tabId = this.getAttribute('data-tab');
                        
                        // Update active tab
                        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                        this.classList.add('active');
                        
                        // Show corresponding content
                        document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
                        const content = document.getElementById(tabId);
                        if (content) content.classList.add('active');
                    });
                });
            }
            
            // ==================== PRODUCT MANAGEMENT ====================
            async function loadProducts(db) {
                console.log("📦 Loading products for merchant:", currentMerchantId);
                
                const productsGrid = document.getElementById('productsGrid');
                if (!productsGrid) return;
                
                // Show loading state
                productsGrid.innerHTML = `
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading products...</p>
                    </div>
                `;
                
                try {
                    let querySnapshot;
                    
                    try {
                        querySnapshot = await db.collection("product_list")
                            .where("merchantId", "==", currentMerchantId)
                            .orderBy("createdAt", "desc")
                            .get();
                    } catch (indexError) {
                        console.log("⚠️ Index error, trying without ordering...");
                        
                        querySnapshot = await db.collection("product_list")
                            .where("merchantId", "==", currentMerchantId)
                            .get();
                        
                        products = [];
                        querySnapshot.forEach(doc => {
                            products.push({
                                id: doc.id,
                                ...doc.data()
                            });
                        });
                        
                        products.sort((a, b) => {
                            const timeA = a.createdAt?.toDate?.() || new Date(0);
                            const timeB = b.createdAt?.toDate?.() || new Date(0);
                            return timeB - timeA;
                        });
                        
                        console.log(`✅ Loaded ${products.length} products (manual sort)`);
                        renderProducts();
                        return;
                    }
                    
                    products = [];
                    querySnapshot.forEach(doc => {
                        products.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });
                    
                    console.log(`✅ Loaded ${products.length} products`);
                    renderProducts();
                    
                } catch (error) {
                    console.error("❌ Error loading products:", error);
                    
                    if (error.code === 'failed-precondition' && error.message.includes('index')) {
                        productsGrid.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-cogs"></i>
                                <h3>Database Index Required</h3>
                                <p>Please create a Firestore index to enable product sorting.</p>
                                <p><small>Error: ${error.message}</small></p>
                                <div style="margin-top: 20px;">
                                    <button class="btn" onclick="window.location.reload()">
                                        <i class="fas fa-redo"></i> Retry
                                    </button>
                                </div>
                            </div>
                        `;
                    } else {
                        productsGrid.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-exclamation-triangle"></i>
                                <h3>Error Loading Products</h3>
                                <p>${error.message}</p>
                                <button class="btn" onclick="loadProducts(db)" style="margin-top: 20px;">
                                    <i class="fas fa-redo"></i> Try Again
                                </button>
                            </div>
                        `;
                    }
                }
            }
            
            async function loadStatistics(db) {
                console.log("📊 Loading statistics for merchant:", currentMerchantId);
                
                const statsGrid = document.getElementById('statsGrid');
                if (!statsGrid) return;
                
                try {
                    const productsSnapshot = await db.collection("product_list")
                        .where("merchantId", "==", currentMerchantId)
                        .get();
                    const totalProducts = productsSnapshot.size;
                    
                    let totalStockValue = 0;
                    let lowStockCount = 0;
                    let outOfStockCount = 0;
                    
                    productsSnapshot.forEach(doc => {
                        const product = doc.data();
                        totalStockValue += (product.price || 0) * (product.stockQty || 0);
                        
                        if (product.stockQty === 0) {
                            outOfStockCount++;
                        } else if (product.stockQty < 10) {
                            lowStockCount++;
                        }
                    });
                    
                    const activeProductsSnapshot = await db.collection("product_list")
                        .where("merchantId", "==", currentMerchantId)
                        .where("status", "==", "active")
                        .get();
                    const activeProducts = activeProductsSnapshot.size;
                    
                    statsGrid.innerHTML = `
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-box"></i>
                            </div>
                            <div class="stat-value">${totalProducts}</div>
                            <div class="stat-label">Total Products</div>
                            <div class="stat-trend trend-up">
                                <i class="fas fa-arrow-up"></i> ${activeProducts} active
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-dollar-sign"></i>
                            </div>
                            <div class="stat-value">$${totalStockValue.toFixed(2)}</div>
                            <div class="stat-label">Stock Value</div>
                            <div class="stat-trend trend-up">
                                <i class="fas fa-chart-line"></i> Total worth
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div class="stat-value">${lowStockCount}</div>
                            <div class="stat-label">Low Stock</div>
                            <div class="stat-trend ${lowStockCount > 0 ? 'trend-down' : 'trend-up'}">
                                <i class="fas fa-${lowStockCount > 0 ? 'arrow-down' : 'check'}"></i> 
                                ${lowStockCount > 0 ? 'Need restock' : 'All good'}
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-times-circle"></i>
                            </div>
                            <div class="stat-value">${outOfStockCount}</div>
                            <div class="stat-label">Out of Stock</div>
                            <div class="stat-trend ${outOfStockCount > 0 ? 'trend-down' : 'trend-up'}">
                                <i class="fas fa-${outOfStockCount > 0 ? 'arrow-down' : 'check'}"></i> 
                                ${outOfStockCount > 0 ? 'Need attention' : 'All in stock'}
                            </div>
                        </div>
                    `;
                    
                } catch (error) {
                    console.error("❌ Error loading statistics:", error);
                    statsGrid.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h3>Error Loading Statistics</h3>
                            <p>${error.message}</p>
                        </div>
                    `;
                }
            }
            
            async function deleteProduct(productId, db) {
                if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
                    return;
                }
                
                try {
                    await db.collection("product_list").doc(productId).delete();
                    console.log("✅ Product deleted:", productId);
                    alert('Product deleted successfully!');
                    
                    loadProducts(db);
                    loadStatistics(db);
                    
                } catch (error) {
                    console.error("❌ Error deleting product:", error);
                    alert('Error deleting product: ' + error.message);
                }
            }
            
            // ==================== UI FUNCTIONS ====================
            function setupEventListeners(auth) {
                console.log("🔗 Setting up event listeners");
                
                const closeModalBtn = document.getElementById('closeModal');
                const cancelBtn = document.getElementById('cancelBtn');
                
                if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
                if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
                
                const saveBtn = document.getElementById('saveBtn');
                if (saveBtn) saveBtn.addEventListener('click', async function(e) {
                    e.preventDefault();
                    const auth = window.firebaseAuth;
                    const db = window.firebaseDb;
                    await saveProduct(auth, db);
                });
                
                const addProductBtn = document.getElementById('addProductBtn');
                if (addProductBtn) addProductBtn.addEventListener('click', openAddProductModal);
                
                const productForm = document.getElementById('productForm');
                if (productForm) productForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const auth = window.firebaseAuth;
                    const db = window.firebaseDb;
                    await saveProduct(auth, db);
                });
                
                const goToLoginBtn = document.getElementById('goToLoginBtn');
                if (goToLoginBtn) goToLoginBtn.addEventListener('click', function() {
                    window.location.href = 'login.html';
                });
                
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) logoutBtn.addEventListener('click', async function() {
                    if (confirm('Are you sure you want to logout?')) {
                        try {
                            await auth.signOut();
                            window.location.href = 'login.html';
                        } catch (error) {
                            console.error('Logout error:', error);
                            alert('Error during logout: ' + error.message);
                        }
                    }
                });
            }
            
            function setupSearchAndFilters() {
                const searchInput = document.getElementById('productSearch');
                if (searchInput) {
                    searchInput.addEventListener('input', function() {
                        const searchTerm = this.value.toLowerCase();
                        filterProducts(searchTerm);
                    });
                }
                
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                        
                        const filter = this.getAttribute('data-filter');
                        filterProductsByStatus(filter);
                    });
                });
            }
            
            function filterProducts(searchTerm) {
                if (!searchTerm) {
                    renderProducts();
                    return;
                }
                
                const filteredProducts = products.filter(product => {
                    return product.name.toLowerCase().includes(searchTerm) ||
                        (product.description && product.description.toLowerCase().includes(searchTerm)) ||
                        (product.category && product.category.toLowerCase().includes(searchTerm)) ||
                        (product.brand && product.brand.toLowerCase().includes(searchTerm));
                });
                
                renderFilteredProducts(filteredProducts);
            }
            
            function filterProductsByStatus(status) {
                if (status === 'all') {
                    renderProducts();
                    return;
                }
                
                const filteredProducts = products.filter(product => {
                    if (status === 'low_stock') {
                        return product.stockQty < 10 && product.stockQty > 0;
                    } else if (status === 'out_of_stock') {
                        return product.stockQty === 0;
                    } else {
                        return product.status === status;
                    }
                });
                
                renderFilteredProducts(filteredProducts);
            }
            
            function renderFilteredProducts(filteredProducts) {
                const productsGrid = document.getElementById('productsGrid');
                
                if (!productsGrid) return;
                
                if (filteredProducts.length === 0) {
                    productsGrid.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h3>No Products Found</h3>
                            <p>Try adjusting your search or filter criteria</p>
                            <button class="btn" onclick="window.openAddProductModal()" style="margin-top: 20px;">
                                <i class="fas fa-plus"></i> Add New Product
                            </button>
                        </div>
                    `;
                    return;
                }
                
                renderProductsToGrid(productsGrid, filteredProducts);
            }
            
            function renderProducts() {
                const productsGrid = document.getElementById('productsGrid');
                
                if (!productsGrid) return;
                
                if (products.length === 0) {
                    productsGrid.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-box-open"></i>
                            <h3>No Products Yet</h3>
                            <p>Start by adding your first product to the store</p>
                            <button class="btn" onclick="window.openAddProductModal()" style="margin-top: 20px;">
                                <i class="fas fa-plus"></i> Add Your First Product
                            </button>
                        </div>
                    `;
                    return;
                }
                
                renderProductsToGrid(productsGrid, products);
            }
            
            function renderProductsToGrid(container, productList) {
                container.innerHTML = '';
                
                productList.forEach(product => {
                    const stockLevel = getStockLevel(product.stockQty);
                    const statusBadge = getStatusBadge(product.status);
                    
                    const productCard = document.createElement('div');
                    productCard.className = 'product-card';
                    
                    // Generate image source from base64 or use placeholder
                    let imageContent = '';
                    if (product.imageBase64) {
                        // Create data URL from base64
                        const imageSrc = `data:image/jpeg;base64,${product.imageBase64}`;
                        imageContent = `
                            <img src="${imageSrc}" alt="${product.name}" onerror="this.onerror=null; this.style.display='none'; this.parentNode.querySelector('i').style.display='block';">
                            <i class="fas fa-${getProductIcon(product.category)}" style="display: none;"></i>
                        `;
                    } else {
                        imageContent = `<i class="fas fa-${getProductIcon(product.category)}"></i>`;
                    }
                    
                    productCard.innerHTML = `
                        <div class="product-status ${statusBadge.class}">
                            ${statusBadge.text}
                        </div>
                        <div class="product-image ${product.imageBase64 ? 'has-image' : ''}" onclick="window.location.href='product-details.html?product=${product.id}'">
                            ${imageContent}
                        </div>
                        <div class="product-title">
                            ${product.name}
                            <span class="category-tag">${product.category || 'Uncategorized'}</span>
                        </div>
                        <div class="product-desc">${product.description || 'No description provided'}</div>
                        
                        <div class="product-footer">
                            <div>
                                <div class="product-price">$${parseFloat(product.price || 0).toFixed(2)}</div>
                                ${product.brand ? `<div style="font-size: 12px; color: #666;">${product.brand}</div>` : ''}
                            </div>
                            <div class="product-stock">
                                <div class="stock-indicator ${stockLevel}"></div>
                                <span>${product.stockQty || 0} in stock</span>
                            </div>
                        </div>
                        
                        <div class="product-actions">
                            <button class="action-btn edit-btn" data-id="${product.id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="action-btn delete-btn" data-id="${product.id}">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    `;
                    container.appendChild(productCard);
                });
                
                document.querySelectorAll('.edit-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const productId = this.getAttribute('data-id');
                        openEditProductModal(productId, db);
                    });
                });
                
                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const productId = this.getAttribute('data-id');
                        const db = window.firebaseDb;
                        deleteProduct(productId, db);
                    });
                });
            }
            
            function getStockLevel(stock) {
                if (stock === 0) return 'stock-low';
                if (stock < 10) return 'stock-medium';
                return 'stock-high';
            }
            
            function getStatusBadge(status) {
                const badges = {
                    'active': { class: 'badge-active', text: 'Active' },
                    'inactive': { class: 'badge-inactive', text: 'Inactive' },
                    'out_of_stock': { class: 'badge-out_of_stock', text: 'Out of Stock' },
                    'draft': { class: 'badge-secondary', text: 'Draft' }
                };
                return badges[status] || { class: 'badge-secondary', text: 'Unknown' };
            }
            
            function getProductIcon(category) {
                const icons = {
                    'Electronics': 'laptop',
                    'Electronics & Gadgets': 'laptop',
                    'Clothing': 'tshirt',
                    'Clothing & Fashion': 'tshirt',
                    'Footwear': 'shoe-prints',
                    'Footwear & Shoes': 'shoe-prints',
                    'Home & Garden': 'home',
                    'Kitchen': 'utensils',
                    'Furniture': 'couch',
                    'Sports': 'futbol',
                    'Books': 'book',
                    'Health': 'heartbeat',
                    'Toys': 'gamepad',
                    'Automotive': 'car',
                    'Jewelry': 'gem',
                    'Food': 'apple-alt',
                    'Pet': 'paw',
                    'Office': 'briefcase',
                    'Tools': 'tools',
                    'Baby': 'baby',
                    'Art': 'palette',
                    'Musical': 'music',
                    'Other': 'box'
                };
                return icons[category] || 'box';
            }
            
            // ==================== MODAL FUNCTIONS ====================
            function openAddProductModal() {
                editingProductId = null;
                currentProductImageBase64 = null;
                productImageBase64 = null;
                selectedImageFile = null;
                
                const modalTitle = document.getElementById('modalTitle');
                const productForm = document.getElementById('productForm');
                const productModal = document.getElementById('productModal');
                
                if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Product';
                if (productForm) productForm.reset();
                if (productModal) productModal.classList.add('active');
                
                const imagePreview = document.getElementById('imagePreview');
                const uploadArea = document.getElementById('uploadArea');
                const productImage = document.getElementById('productImage');
                
                if (imagePreview) imagePreview.style.display = 'none';
                if (uploadArea) uploadArea.style.display = 'block';
                if (productImage) productImage.value = '';
            }
            
            async function openEditProductModal(productId, db) {
                try {
                    const productDoc = await db.collection("product_list").doc(productId).get();
                    
                    if (!productDoc.exists) {
                        alert('Product not found');
                        return;
                    }
                    
                    const product = productDoc.data();
                    editingProductId = productId;
                    currentProductImageBase64 = product.imageBase64 || null;
                    productImageBase64 = product.imageBase64 || null;
                    
                    const modalTitle = document.getElementById('modalTitle');
                    if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Product';
                    
                    document.getElementById('name').value = product.name || '';
                    document.getElementById('description').value = product.description || '';
                    document.getElementById('price').value = product.price || '';
                    document.getElementById('stockQty').value = product.stockQty || '';
                    document.getElementById('category').value = product.category || 'Other';
                    document.getElementById('status').value = product.status || 'active';
                    document.getElementById('sku').value = product.sku || '';
                    document.getElementById('brand').value = product.brand || '';
                    document.getElementById('weight').value = product.weight || '';
                    
                    if (product.imageBase64) {
                        const previewImage = document.getElementById('previewImage');
                        const previewContainer = document.getElementById('imagePreview');
                        const uploadArea = document.getElementById('uploadArea');
                        
                        // Create data URL from base64
                        const imageSrc = `data:image/jpeg;base64,${product.imageBase64}`;
                        if (previewImage) previewImage.src = imageSrc;
                        if (previewContainer) previewContainer.style.display = 'block';
                        if (uploadArea) uploadArea.style.display = 'none';
                    } else {
                        const previewContainer = document.getElementById('imagePreview');
                        const uploadArea = document.getElementById('uploadArea');
                        
                        if (previewContainer) previewContainer.style.display = 'none';
                        if (uploadArea) uploadArea.style.display = 'block';
                    }
                    
                    const productModal = document.getElementById('productModal');
                    if (productModal) productModal.classList.add('active');
                    
                } catch (error) {
                    console.error("Error loading product:", error);
                    alert('Error loading product: ' + error.message);
                }
            }
            
            function closeModal() {
                document.getElementById('productModal').classList.remove('active');
                editingProductId = null;
                selectedImageFile = null;
                productImageBase64 = null;
                currentProductImageBase64 = null;
                
                const imagePreview = document.getElementById('imagePreview');
                const uploadArea = document.getElementById('uploadArea');
                const productImage = document.getElementById('productImage');
                const uploadProgress = document.getElementById('uploadProgress');
                const progressFill = document.getElementById('progressFill');
                
                if (imagePreview) imagePreview.style.display = 'none';
                if (uploadArea) uploadArea.style.display = 'block';
                if (productImage) productImage.value = '';
                if (uploadProgress) uploadProgress.style.display = 'none';
                if (progressFill) progressFill.style.width = '0%';
                
                const productForm = document.getElementById('productForm');
                if (productForm) productForm.reset();
            }
            
            // ==================== IMAGE HANDLING FUNCTIONS ====================
            function setupImageUpload() {
                const imageInput = document.getElementById('productImage');
                if (!imageInput) {
                    console.error("❌ Image input element not found!");
                    return;
                }
                
                imageInput.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    if (!file.type.match('image.*')) {
                        alert('❌ Please select an image file (JPEG, PNG, WebP)');
                        return;
                    }
                    
                    if (file.size > 2 * 1024 * 1024) { // Reduced from 5MB to 2MB for Firestore
                        alert('❌ Image is too large! Maximum size is 2MB for Firestore storage.');
                        return;
                    }
                    
                    selectedImageFile = file;
                    
                    const reader = new FileReader();
                    reader.onload = async function(e) {
                        const previewImage = document.getElementById('previewImage');
                        const previewContainer = document.getElementById('imagePreview');
                        const uploadArea = document.getElementById('uploadArea');
                        const uploadProgress = document.getElementById('uploadProgress');
                        const progressFill = document.getElementById('progressFill');
                        
                        // Show progress
                        if (uploadProgress) uploadProgress.style.display = 'block';
                        if (progressFill) progressFill.style.width = '10%';
                        
                        // Compress and convert to base64
                        try {
                            const compressedBase64 = await compressAndConvertToBase64(file);
                            productImageBase64 = compressedBase64;
                            
                            if (previewImage) previewImage.src = `data:image/jpeg;base64,${compressedBase64}`;
                            if (previewContainer) previewContainer.style.display = 'block';
                            if (uploadArea) uploadArea.style.display = 'none';
                            
                            // Complete progress
                            if (progressFill) progressFill.style.width = '100%';
                            setTimeout(() => {
                                if (uploadProgress) uploadProgress.style.display = 'none';
                                if (progressFill) progressFill.style.width = '0%';
                            }, 500);
                            
                        } catch (error) {
                            console.error('❌ Error processing image:', error);
                            alert('❌ Error processing image. Please try again.');
                            removeImage();
                        }
                    };
                    reader.readAsDataURL(file);
                });
                
                console.log("✅ Image upload setup complete");
            }
            
            function compressAndConvertToBase64(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    
                    reader.onload = function(event) {
                        const img = new Image();
                        img.src = event.target.result;
                        
                        img.onload = function() {
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            
                            // Calculate new dimensions
                            if (width > height) {
                                if (width > maxWidth) {
                                    height *= maxWidth / width;
                                    width = maxWidth;
                                }
                            } else {
                                if (height > maxHeight) {
                                    width *= maxHeight / height;
                                    height = maxHeight;
                                }
                            }
                            
                            canvas.width = width;
                            canvas.height = height;
                            
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            
                            // Convert to base64 with compression
                            const base64String = canvas.toDataURL('image/jpeg', quality);
                            
                            // Extract base64 data (remove "data:image/jpeg;base64," prefix)
                            const base64Data = base64String.split(',')[1];
                            
                            // Check size (Firestore has 1MB limit per field, but we'll be safe with 500KB)
                            const sizeInBytes = (base64Data.length * 3) / 4; // Approximate byte size
                            
                            if (sizeInBytes > 500 * 1024) {
                                // If too large, compress more
                                compressAndConvertToBase64(file, maxWidth * 0.8, maxHeight * 0.8, quality * 0.8)
                                    .then(resolve)
                                    .catch(reject);
                            } else {
                                console.log(`✅ Image compressed to base64: ${(sizeInBytes / 1024).toFixed(2)}KB`);
                                resolve(base64Data);
                            }
                        };
                        
                        img.onerror = function() {
                            reject(new Error('Failed to load image'));
                        };
                    };
                    
                    reader.onerror = function() {
                        reject(new Error('Failed to read file'));
                    };
                });
            }
            
            function removeImage() {
                selectedImageFile = null;
                productImageBase64 = null;
                currentProductImageBase64 = null; // Clear the stored product image too
                
                const imagePreview = document.getElementById('imagePreview');
                const uploadArea = document.getElementById('uploadArea');
                const imageInput = document.getElementById('productImage');
                const uploadProgress = document.getElementById('uploadProgress');
                
                if (imagePreview) imagePreview.style.display = 'none';
                if (uploadArea) uploadArea.style.display = 'block';
                if (imageInput) imageInput.value = '';
                if (uploadProgress) uploadProgress.style.display = 'none';
            }
            
            // ==================== SAVE PRODUCT FUNCTION ====================
            async function saveProduct(auth, db) {
                const name = document.getElementById('name')?.value.trim();
                const description = document.getElementById('description')?.value.trim();
                const price = parseFloat(document.getElementById('price')?.value);
                const stockQty = parseInt(document.getElementById('stockQty')?.value);
                const category = document.getElementById('category')?.value;
                const status = document.getElementById('status')?.value;
                const sku = document.getElementById('sku')?.value.trim();
                const brand = document.getElementById('brand')?.value.trim();
                const weight = parseFloat(document.getElementById('weight')?.value) || 0;
                
                if (!name || isNaN(price) || price < 0 || isNaN(stockQty) || stockQty < 0 || !category) {
                    alert('❌ Please fill in all required fields with valid values');
                    return;
                }
                
                try {
                    const productData = {
                        name,
                        description: description || '',
                        price,
                        stockQty,
                        category,
                        status,
                        merchantId: currentMerchantId,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    // Handle image: Only add if there's a new image
                    if (productImageBase64) {
                        // New image was uploaded
                        productData.imageBase64 = productImageBase64;
                        console.log("✅ Base64 image added to product data");
                    } else if (currentProductImageBase64 === null && editingProductId) {
                        // If editing and currentProductImageBase64 is null (image was removed)
                        productData.imageBase64 = null; // Explicitly set to null to remove image
                        console.log("✅ Image removed from product");
                    }
                    // If productImageBase64 is null and editingProductId exists but currentProductImageBase64 has a value,
                    // we keep the existing image (user didn't change it)
                    
                    // Add optional fields if provided
                    if (sku) productData.sku = sku;
                    if (brand) productData.brand = brand;
                    if (weight) productData.weight = weight;
                    
                    if (editingProductId) {
                        // Update existing product
                        await db.collection("product_list").doc(editingProductId).update(productData);
                        alert('✅ Product updated successfully!');
                    } else {
                        // Add new product
                        productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                        await db.collection("product_list").add(productData);
                        alert('✅ Product added successfully!');
                    }
                    
                    // Reset and close
                    closeModal();
                    loadProducts(db);
                    loadStatistics(db);
                    
                } catch (error) {
                    console.error("❌ Error saving product:", error);
                    
                    // Check if error is due to image size
                    if (error.message.includes('size') || error.message.includes('too large')) {
                        alert('❌ Error: Image is too large for Firestore. Please select a smaller image (max 500KB after compression).');
                    } else {
                        alert('❌ Error saving product: ' + error.message);
                    }
                }
            }
            
            // ==================== GLOBAL EXPORTS ====================
            window.openAddProductModal = openAddProductModal;
            window.loadProducts = function() {
                const db = window.firebaseDb;
                loadProducts(db);
            };
            window.exportProducts = function() {
                alert('Export feature will be available in the next update!');
            };
            window.removeImage = removeImage;
            
            // ==================== FINAL SETUP ====================
            setupEventListeners(auth);
            setupSearchAndFilters();
            setupImageUpload();
            
            console.log("✅ Merchant dashboard initialized successfully");
        }