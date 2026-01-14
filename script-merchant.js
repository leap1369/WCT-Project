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
                    loadRecentActivity(db);
                    
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
                
                const db = window.firebaseDb; // Get db instance
                
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
                        
                        // Load data for specific tabs
                        if (tabId === 'orders' && db) {
                            loadMerchantOrders(db);
                        }
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

                        // ==================== SIMPLE RECENT ACTIVITY ====================

            // ==================== SIMPLE RECENT ACTIVITY ====================

            async function loadRecentActivity(db) {
                console.log("🔔 Loading recent activity...");
                
                // Find the activity container using the ID
                const activityContainer = document.getElementById('activityContainer');
                if (!activityContainer) {
                    console.error("❌ Could not find #activityContainer");
                    return;
                }
                
                try {
                    // Show loading
                    activityContainer.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #666;">
                            <i class="fas fa-spinner fa-spin" style="font-size: 32px; margin-bottom: 15px; color: #85BB65;"></i>
                            <p>Loading activity...</p>
                        </div>
                    `;
                    
                    // 1. Get recent orders (last 5)
                    let recentOrders = [];
                    try {
                        const ordersSnapshot = await db.collection("order_history")
                            .orderBy("orderDate", "desc")
                            .limit(5)
                            .get();
                        
                        recentOrders = ordersSnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                    } catch (orderError) {
                        console.log("Could not load orders:", orderError);
                    }
                    
                    // 2. Get low stock products
                    let lowStockProducts = [];
                    if (currentMerchantId) {
                        try {
                            const productsSnapshot = await db.collection("product_list")
                                .where("merchantId", "==", currentMerchantId)
                                .where("stockQty", "<", 10)
                                .where("stockQty", ">", 0)
                                .limit(3)
                                .get();
                            
                            lowStockProducts = productsSnapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            }));
                        } catch (productError) {
                            console.log("Could not load low stock:", productError);
                        }
                    }
                    
                    // 3. Render the activity
                    displayActivity(recentOrders, lowStockProducts, activityContainer);
                    
                } catch (error) {
                    console.error("❌ Activity error:", error);
                    activityContainer.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #666;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 32px; margin-bottom: 15px; color: #dc3545;"></i>
                            <p>Could not load activity</p>
                            <small style="color: #999;">${error.message}</small>
                        </div>
                    `;
                }
            }

function displayActivity(orders, lowStock, container) {
    let html = '';
    
    // Show orders if we have any
    if (orders.length > 0) {
        html += '<div style="margin-bottom: 20px;">';
        html += '<h4 style="margin: 0 0 10px 0; color: #333; font-size: 16px; display: flex; align-items: center; gap: 8px;">';
        html += '<i class="fas fa-shopping-cart"></i> Recent Orders';
        html += `</h4>`;
        
        orders.forEach(order => {
            const date = order.orderDate?.toDate ? order.orderDate.toDate() : new Date();
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dayStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            
            // Get status color
            let statusColor = '#6c757d';
            if (order.status === 'pending') statusColor = '#ffc107';
            if (order.status === 'processing') statusColor = '#17a2b8';
            if (order.status === 'shipped') statusColor = '#28a745';
            if (order.status === 'delivered') statusColor = '#6c757d';
            if (order.status === 'cancelled') statusColor = '#dc3545';
            
            html += `
                <div style="background: white; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid ${statusColor}; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${order.customerName || 'Customer'}</div>
                            <div style="font-size: 13px; color: #666;">
                                ${order.items?.length || 0} item(s) • $${order.total?.toFixed(2) || '0.00'}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 12px; color: #888; margin-bottom: 4px;">${dayStr} ${timeStr}</div>
                            <span style="background: ${statusColor}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                ${order.status || 'pending'}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    // Show low stock alerts
    if (lowStock.length > 0) {
        html += '<div style="margin-bottom: 15px;">';
        html += '<h4 style="margin: 0 0 10px 0; color: #333; font-size: 16px; display: flex; align-items: center; gap: 8px;">';
        html += '<i class="fas fa-exclamation-triangle"></i> Low Stock Alerts';
        html += `</h4>`;
        
        lowStock.forEach(product => {
            html += `
                <div style="background: #fff3cd; padding: 10px 12px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid #ffc107;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-weight: 600; color: #856404;">${product.name}</div>
                        <span style="background: #dc3545; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;">
                            ${product.stockQty} left
                        </span>
                    </div>
                    <div style="font-size: 13px; color: #856404; margin-top: 5px;">
                        <a href="#" onclick="openEditProductModal('${product.id}', window.firebaseDb); return false;" style="color: #007bff; text-decoration: none;">
                            <i class="fas fa-edit"></i> Restock now
                        </a>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    // If no activity at all
    if (orders.length === 0 && lowStock.length === 0) {
        html = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-check-circle" style="font-size: 48px; color: #85BB65; margin-bottom: 15px; opacity: 0.5;"></i>
                <h4 style="color: #666; margin-bottom: 10px;">No Recent Activity</h4>
                <p style="color: #888; font-size: 14px; max-width: 300px; margin: 0 auto;">
                    Everything looks good! New orders and alerts will appear here automatically.
                </p>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

            // Helper: Get recent orders
            async function getRecentOrders(db) {
                try {
                    const snapshot = await db.collection("order_history")
                        .orderBy("orderDate", "desc")
                        .limit(5)
                        .get();
                    
                    return snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                } catch (error) {
                    console.log("Could not load orders:", error);
                    return [];
                }
            }

            // Helper: Get low stock products
            async function getLowStockProducts(db) {
                if (!currentMerchantId) return [];
                
                try {
                    const snapshot = await db.collection("product_list")
                        .where("merchantId", "==", currentMerchantId)
                        .where("stockQty", "<", 10)
                        .where("stockQty", ">", 0)
                        .limit(3)
                        .get();
                    
                    return snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                } catch (error) {
                    console.log("Could not load low stock:", error);
                    return [];
                }
            }

            // Helper: Render activity
            function renderActivity(orders, lowStock, container) {
                let html = '<div style="padding: 10px;">';
                
                // Show orders
                if (orders.length > 0) {
                    html += '<h4 style="margin: 15px 0 10px 0; color: #333;"><i class="fas fa-shopping-cart"></i> Recent Orders</h4>';
                    
                    orders.forEach(order => {
                        const date = order.orderDate?.toDate ? order.orderDate.toDate() : new Date();
                        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        
                        html += `
                            <div style="background: white; padding: 12px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #85BB65;">
                                <div style="display: flex; justify-content: space-between;">
                                    <strong style="color: #333;">${order.customerName || 'Customer'}</strong>
                                    <span style="font-size: 12px; color: #888;">${timeStr}</span>
                                </div>
                                <div style="font-size: 13px; color: #666; margin-top: 5px;">
                                    ${order.items?.length || 0} item(s) • $${order.total?.toFixed(2) || '0.00'}
                                </div>
                                <div style="margin-top: 8px;">
                                    <span style="background: ${getStatusColor(order.status)}; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px;">
                                        ${order.status || 'pending'}
                                    </span>
                                </div>
                            </div>
                        `;
                    });
                }
                
                // Show low stock alerts
                if (lowStock.length > 0) {
                    html += '<h4 style="margin: 20px 0 10px 0; color: #333;"><i class="fas fa-exclamation-triangle"></i> Low Stock Alerts</h4>';
                    
                    lowStock.forEach(product => {
                        html += `
                            <div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #ffc107;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <strong style="color: #856404;">${product.name}</strong>
                                    <span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px;">
                                        ${product.stockQty} left
                                    </span>
                                </div>
                                <div style="font-size: 13px; color: #856404; margin-top: 5px;">
                                    Running low on stock • <a href="#" onclick="openEditProductModal('${product.id}', window.firebaseDb); return false;" style="color: #007bff;">Restock now</a>
                                </div>
                            </div>
                        `;
                    });
                }
                
                // If no activity
                if (orders.length === 0 && lowStock.length === 0) {
                    html += `
                        <div style="text-align: center; padding: 30px 20px;">
                            <i class="fas fa-check-circle" style="font-size: 48px; color: #85BB65; margin-bottom: 15px; opacity: 0.5;"></i>
                            <h4 style="color: #666;">No Recent Activity</h4>
                            <p style="color: #888; font-size: 14px;">Everything looks good! New orders and alerts will appear here.</p>
                        </div>
                    `;
                }
                
                html += '</div>';
                container.innerHTML = html;
            }

            // Helper: Get status color
            function getStatusColor(status) {
                const colors = {
                    'pending': '#ffc107',
                    'processing': '#17a2b8',
                    'shipped': '#28a745',
                    'delivered': '#6c757d',
                    'cancelled': '#dc3545'
                };
                return colors[status] || '#6c757d';
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

    async function loadMerchantOrders(db) {
    console.log("📦 Loading orders for merchant:", currentMerchantId);
    
    const ordersContainer = document.querySelector('.orders-table');
    if (!ordersContainer) return;
    
    // Show loading state
    ordersContainer.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #666;">
            <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 20px;"></i>
            <h3>Loading Orders...</h3>
            <p>Fetching order data...</p>
        </div>
    `;
    
    try {
        // First, get all products from this merchant
        const productsSnapshot = await db.collection("product_list")
            .where("merchantId", "==", currentMerchantId)
            .get();
        
        if (productsSnapshot.empty) {
            ordersContainer.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #666;">
                    <i class="fas fa-box-open" style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;"></i>
                    <h3>No Products Yet</h3>
                    <p>Add products first to receive orders</p>
                    <button class="btn" onclick="openAddProductModal()" style="margin-top: 20px;">
                        <i class="fas fa-plus"></i> Add Product
                    </button>
                </div>
            `;
            return;
        }
        
        // Get merchant's product data
        const merchantProducts = {};
        const merchantProductIds = [];
        const merchantProductNames = new Set();
        
        productsSnapshot.forEach(doc => {
            const product = doc.data();
            merchantProducts[doc.id] = product;
            merchantProductIds.push(doc.id);
            merchantProductNames.add(product.name?.toLowerCase().trim());
        });
        
        console.log("Merchant products:", {
            count: merchantProductIds.length,
            ids: merchantProductIds,
            names: Array.from(merchantProductNames)
        });
        
        // Now fetch ALL orders
        const ordersSnapshot = await db.collection("order_history").get();
        
        if (ordersSnapshot.empty) {
            ordersContainer.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #666;">
                    <i class="fas fa-shopping-cart" style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;"></i>
                    <h3>No Orders Yet</h3>
                    <p>No orders found in the system</p>
                    <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <p style="font-size: 14px;">Check if orders exist in Firebase Firestore:</p>
                        <p style="font-size: 12px; color: #888;">Collection: order_history</p>
                    </div>
                </div>
            `;
            return;
        }
        
        console.log(`Total orders in system: ${ordersSnapshot.size}`);
        
        // Debug: Show first few orders
        ordersSnapshot.docs.slice(0, 3).forEach(doc => {
            const order = doc.data();
            console.log(`Sample order ${doc.id}:`, {
                items: order.items?.length || 0,
                firstItem: order.items?.[0] || 'none',
                customer: order.customerName
            });
        });
        
        // Filter orders to only include those with merchant's products
        let merchantOrders = [];
        let orderCount = 1;
        
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            const orderItems = order.items || [];
            
            // Find items that belong to this merchant
            const merchantOrderItems = [];
            
            orderItems.forEach(item => {
                // Method 1: Check by productId
                if (item.productId && merchantProductIds.includes(item.productId)) {
                    merchantOrderItems.push(item);
                }
                // Method 2: Check by product name (if productId is not available)
                else if (item.name) {
                    const itemName = item.name.toLowerCase().trim();
                    if (merchantProductNames.has(itemName)) {
                        merchantOrderItems.push(item);
                        console.log(`Found by name match: ${item.name}`);
                    }
                }
                // Method 3: Check if item references this merchantId
                else if (item.merchantId === currentMerchantId) {
                    merchantOrderItems.push(item);
                }
            });
            
            if (merchantOrderItems.length > 0) {
                console.log(`✅ Order ${doc.id} contains ${merchantOrderItems.length} merchant items`);
                
                // Calculate merchant's portion
                const merchantSubtotal = merchantOrderItems.reduce((sum, item) => 
                    sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0);
                
                // Calculate proportions for shipping/tax
                const totalItems = orderItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
                const merchantItems = merchantOrderItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
                const proportion = totalItems > 0 ? merchantItems / totalItems : 0;
                
                const merchantShipping = (parseFloat(order.shippingCost) || 0) * proportion;
                const merchantTax = (parseFloat(order.tax) || 0) * proportion;
                const merchantTotal = merchantSubtotal + merchantShipping + merchantTax;
                
                merchantOrders.push({
                    id: doc.id,
                    orderNumber: order.orderId || `ORD-${orderCount++}`,
                    originalOrder: order,
                    merchantItems: merchantOrderItems,
                    customerName: order.customerName || "Customer",
                    customerEmail: order.customerEmail || "",
                    customerPhone: order.customerPhone || "",
                    shippingAddress: order.shippingAddress || "Address not provided",
                    shippingCity: order.shippingCity || "",
                    shippingZip: order.shippingZip || "",
                    orderDate: order.orderDate || order.createdAt || new Date(),
                    status: order.status || "pending",
                    paymentMethod: order.paymentMethod || "cash_on_delivery",
                    paymentStatus: order.paymentStatus || "pending",
                    merchantSubtotal: merchantSubtotal,
                    merchantShipping: merchantShipping,
                    merchantTax: merchantTax,
                    merchantTotal: merchantTotal,
                    totalItems: merchantItems,
                    allItems: orderItems
                });
            } else {
                console.log(`❌ Order ${doc.id} has no merchant items`);
            }
        });
        
        console.log(`Found ${merchantOrders.length} orders containing merchant's products`);
        
        // If no orders found, show helpful message
        if (merchantOrders.length === 0) {
            ordersContainer.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #666;">
                    <i class="fas fa-search" style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;"></i>
                    <h3>No Orders Found</h3>
                    <p>We found ${ordersSnapshot.size} orders in the system, but none contain your products.</p>
                    
                    <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px; max-width: 500px; margin-left: auto; margin-right: auto;">
                        <h4><i class="fas fa-lightbulb"></i> Troubleshooting:</h4>
                        <ul style="text-align: left; margin-top: 10px; font-size: 14px;">
                            <li>Check if your product names match exactly in orders</li>
                            <li>Orders might not have productId references yet</li>
                            <li>Test with a new order from your products</li>
                            <li>Contact support if issues persist</li>
                        </ul>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <button class="btn" onclick="debugOrderData()" style="margin: 5px;">
                            <i class="fas fa-bug"></i> Debug Order Data
                        </button>
                        <button class="btn" onclick="createTestOrder()" style="margin: 5px;">
                            <i class="fas fa-plus"></i> Create Test Order
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        // ✅ FIXED: Use ordersContainer instead of undefined "container"
        renderMerchantOrders(merchantOrders, ordersContainer);
        
    } catch (error) {
        console.error("❌ Error loading orders:", error);
        ordersContainer.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #666;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px; color: #dc3545;"></i>
                <h3>Error Loading Orders</h3>
                <p>${error.message || "Database error occurred"}</p>
                <pre style="text-align: left; background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 20px 0; font-size: 12px; overflow: auto;">
${error.stack || 'No stack trace'}
                </pre>
                <button class="btn" onclick="loadMerchantOrders(db)" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

        function renderMerchantOrders(orders, container) {
            if (orders.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px; color: #666;">
                        <i class="fas fa-shopping-cart" style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;"></i>
                        <h3>No Orders Yet</h3>
                        <p>When customers purchase your products, their orders will show up here.</p>
                        <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px; max-width: 500px; margin-left: auto; margin-right: auto;">
                            <h4><i class="fas fa-lightbulb"></i> Tips to get orders:</h4>
                            <ul style="text-align: left; margin-top: 10px;">
                                <li>Add attractive product images</li>
                                <li>Write clear product descriptions</li>
                                <li>Set competitive prices</li>
                                <li>Ensure products are in stock</li>
                            </ul>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Create table structure
            container.innerHTML = `
                <div class="table-header">
                    <div style="flex: 2;">Order Details</div>
                    <div style="flex: 1.5;">Customer</div>
                    <div style="flex: 1;">Date</div>
                    <div style="flex: 1;">Total</div>
                    <div style="flex: 1;">Status</div>
                    <div style="flex: 1;">Actions</div>
                </div>
                <div id="merchantOrdersList"></div>
            `;
            
            const ordersList = document.getElementById('merchantOrdersList');
            
            orders.forEach(order => {
                const orderDate = order.orderDate?.toDate ? order.orderDate.toDate() : 
                                order.orderDate?.seconds ? new Date(order.orderDate.seconds * 1000) : 
                                new Date();
                
                const formattedDate = orderDate.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
                
                const statusBadge = getOrderStatusBadge(order.status);
                
                const orderItem = document.createElement('div');
                orderItem.className = 'order-row';
                orderItem.innerHTML = `
                    <div style="flex: 2;">
                        <div style="font-weight: bold; margin-bottom: 5px; color: #333;">
                            ${order.orderNumber}
                        </div>
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">
                            <i class="fas fa-box"></i> ${order.totalItems} item(s) from your store
                        </div>
                        <div style="font-size: 11px; color: #888;">
                            ${order.merchantItems.length > 0 ? order.merchantItems[0].name : 'Product'} ${order.merchantItems.length > 1 ? `+ ${order.merchantItems.length - 1} more` : ''}
                        </div>
                    </div>
                    <div style="flex: 1.5;">
                        <div style="font-weight: 600; margin-bottom: 3px;">${order.customerName}</div>
                        <div style="font-size: 11px; color: #666; margin-bottom: 2px;">${order.customerEmail}</div>
                        <div style="font-size: 11px; color: #666;">${order.customerPhone || 'No phone'}</div>
                    </div>
                    <div style="flex: 1; font-size: 14px; color: #555;">
                        ${formattedDate}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: #333;">$${order.merchantTotal.toFixed(2)}</div>
                        <div style="font-size: 11px; color: #666;">Your earnings</div>
                    </div>
                    <div style="flex: 1;">
                        <div class="status-badge ${statusBadge.class}" style="display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                            ${statusBadge.text}
                        </div>
                    </div>
                    <div style="flex: 1;">
                        <button class="btn btn-small view-order-btn" data-order-id="${order.id}" style="padding: 8px 12px; font-size: 12px;">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${order.status === 'pending' || order.status === 'processing' ? `
                            <button class="btn btn-small update-status-btn" data-order-id="${order.id}" style="padding: 8px 12px; font-size: 12px; margin-top: 5px; background: #6c757d;">
                                <i class="fas fa-edit"></i> Update
                            </button>
                        ` : ''}
                        <button class="btn btn-danger btn-small delete-order-btn" data-order-id="${order.id}" style="padding: 8px 12px; font-size: 12px; margin-top: 5px; background: #dc3545;">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                `;
                
                ordersList.appendChild(orderItem);
            });
            
            // Add event listeners for view buttons
            document.querySelectorAll('.view-order-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const orderId = this.getAttribute('data-order-id');
                    const order = orders.find(o => o.id === orderId);
                    if (order) {
                        showOrderDetailsModal(order, db);
                    }
                });
            });
            
            // Add event listeners for update buttons
            document.querySelectorAll('.update-status-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const orderId = this.getAttribute('data-order-id');
                    const order = orders.find(o => o.id === orderId);
                    if (order) {
                        showUpdateStatusModal(order, db);
                    }
                });
            });

            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-order-btn').forEach(btn => {
                btn.addEventListener('click', async function(e) {
                    e.stopPropagation(); // Prevent event bubbling
                    
                    const orderId = this.getAttribute('data-order-id');
                    const order = orders.find(o => o.id === orderId);
                    
                    if (!order) return;
                    
                    // Confirm deletion
                    const confirmDelete = confirm(`Are you sure you want to delete order #${order.orderNumber}?\n\nThis will remove:\n• Customer: ${order.customerName}\n• Amount: $${order.merchantTotal.toFixed(2)}\n\nThis action cannot be undone!`);
                    
                    if (!confirmDelete) return;
                    
                    // Show loading on the button
                    const originalHTML = this.innerHTML;
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
                    this.disabled = true;
                    
                    try {
                        // Get db instance
                        const db = window.firebaseDb;
                        if (!db) throw new Error("Database not available");
                        
                        // Delete the order from Firestore
                        await db.collection("order_history").doc(orderId).delete();
                        
                        // Show success message
                        alert(`✅ Order #${order.orderNumber} deleted successfully!`);
                        
                        // Reload orders
                        loadMerchantOrders(db);
                        
                    } catch (error) {
                        console.error("❌ Error deleting order:", error);
                        alert(`❌ Failed to delete order: ${error.message}`);
                        
                        // Restore button
                        this.innerHTML = originalHTML;
                        this.disabled = false;
                    }
                });
            });

            document.querySelectorAll('.delete-order-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const orderId = this.getAttribute('data-order-id');
                    if (confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
                        try {
                            const db = window.firebaseDb;
                            await db.collection("order_history").doc(orderId).delete();
                            alert("Order deleted successfully!");
                            loadMerchantOrders(db);
                        } catch (error) {
                            alert("Error deleting order: " + error.message);
                        }
                    }
                });
            });
        }

function getOrderStatusBadge(status) {
    const badges = {
        'pending': { class: 'badge-pending', text: 'Pending' },
        'processing': { class: 'badge-processing', text: 'Processing' },
        'shipped': { class: 'badge-shipped', text: 'Shipped' },
        'delivered': { class: 'badge-delivered', text: 'Delivered' },
        'cancelled': { class: 'badge-cancelled', text: 'Cancelled' }
    };
    return badges[status] || { class: 'badge-secondary', text: 'Unknown' };
}

function showOrderDetailsModal(order, db) {
    // Create modal for order details
    const orderDate = order.orderDate?.toDate ? order.orderDate.toDate() : 
                     order.orderDate?.seconds ? new Date(order.orderDate.seconds * 1000) : 
                     new Date();
    
    const formattedDate = orderDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let itemsHTML = '';
    order.merchantItems.forEach((item, index) => {
        itemsHTML += `
            <div style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #eee; background: #f9f9f9; border-radius: 8px; margin-bottom: 10px;">
                <div style="width: 60px; height: 60px; background: #f5f5f5; border-radius: 6px; margin-right: 15px; overflow: hidden;">
                    <img src="${item.image || 'https://via.placeholder.com/60'}" 
                         alt="${item.name}" 
                         style="width: 100%; height: 100%; object-fit: contain; padding: 5px;">
                </div>
                <div style="flex-grow: 1;">
                    <div style="font-weight: 600; margin-bottom: 5px;">${item.name}</div>
                    <div style="font-size: 14px; color: #666;">
                        Qty: ${item.quantity} × $${item.price.toFixed(2)} each
                    </div>
                    <div style="font-size: 12px; color: #888;">
                        Product ID: ${item.productId || 'N/A'}
                    </div>
                </div>
                <div style="font-weight: bold; color: #333; font-size: 16px;">
                    $${(item.price * item.quantity).toFixed(2)}
                </div>
            </div>
        `;
    });
    
    const modalHTML = `
        <div id="orderDetailsModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 3000;">
            <div style="background: white; border-radius: 15px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <div style="padding: 25px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #333;">
                        <i class="fas fa-file-invoice-dollar"></i> Order Details: ${order.orderNumber}
                    </h3>
                    <button class="close-modal-btn" style="background: none; border: none; font-size: 28px; color: #666; cursor: pointer; line-height: 1;">×</button>
                </div>
                
                <div style="padding: 25px;">
                    <!-- Order Info -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
                            <h4 style="margin-top: 0; margin-bottom: 15px; color: #555; font-size: 16px;">
                                <i class="fas fa-info-circle"></i> Order Information
                            </h4>
                            <div style="font-size: 14px;">
                                <div style="margin-bottom: 8px;">
                                    <strong>Order Date:</strong> ${formattedDate}
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong>Status:</strong> 
                                    <span class="status-badge ${getOrderStatusBadge(order.status).class}" style="margin-left: 10px;">
                                        ${getOrderStatusBadge(order.status).text}
                                    </span>
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong>Payment Method:</strong> ${getPaymentMethodName(order.paymentMethod)}
                                </div>
                                <div>
                                    <strong>Payment Status:</strong> 
                                    <span style="color: ${order.paymentStatus === 'paid' ? '#28a745' : '#dc3545'}; font-weight: 600;">
                                        ${order.paymentStatus || 'pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
                            <h4 style="margin-top: 0; margin-bottom: 15px; color: #555; font-size: 16px;">
                                <i class="fas fa-user"></i> Customer Information
                            </h4>
                            <div style="font-size: 14px;">
                                <div style="margin-bottom: 8px;">
                                    <strong>Name:</strong> ${order.customerName}
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong>Email:</strong> ${order.customerEmail}
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <strong>Phone:</strong> ${order.customerPhone || 'Not provided'}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Shipping Info -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                        <h4 style="margin-top: 0; margin-bottom: 15px; color: #555; font-size: 16px;">
                            <i class="fas fa-truck"></i> Shipping Information
                        </h4>
                        <div style="font-size: 14px;">
                            <div style="margin-bottom: 5px;">
                                <strong>Address:</strong> ${order.shippingAddress}
                            </div>
                            <div style="margin-bottom: 5px;">
                                <strong>City:</strong> ${order.shippingCity}
                            </div>
                            <div>
                                <strong>Zip Code:</strong> ${order.shippingZip}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Order Items -->
                    <div style="margin-bottom: 30px;">
                        <h4 style="margin-top: 0; margin-bottom: 15px; color: #555; font-size: 16px;">
                            <i class="fas fa-boxes"></i> Your Products in This Order (${order.merchantItems.length} items)
                        </h4>
                        ${itemsHTML}
                    </div>
                    
                    <!-- Order Summary -->
                    <div style="background: #f8f9fa; padding: 25px; border-radius: 10px;">
                        <h4 style="margin-top: 0; margin-bottom: 20px; color: #555; font-size: 16px;">
                            <i class="fas fa-receipt"></i> Order Summary (Your Portion)
                        </h4>
                        <div style="max-width: 400px; margin-left: auto;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 15px;">
                                <span style="color: #666;">Subtotal</span>
                                <span style="font-weight: 500;">$${order.merchantSubtotal.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 15px;">
                                <span style="color: #666;">Shipping</span>
                                <span style="font-weight: 500;">$${order.merchantShipping.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 15px;">
                                <span style="color: #666;">Tax</span>
                                <span style="font-weight: 500;">$${order.merchantTax.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; padding-top: 15px; border-top: 2px solid #ddd;">
                                <span style="color: #333;">Your Earnings</span>
                                <span style="color: #85BB65;">$${order.merchantTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="padding: 25px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 15px;">
                    <button class="btn btn-secondary" id="closeOrderDetailsBtn" style="padding: 12px 25px;">
                        <i class="fas fa-times"></i> Close
                    </button>
                    ${order.status !== 'delivered' && order.status !== 'cancelled' ? `
                        <button class="btn" id="updateOrderStatusBtn" style="padding: 12px 25px;">
                            <i class="fas fa-edit"></i> Update Status
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.getElementById('closeOrderDetailsBtn').addEventListener('click', () => {
        document.getElementById('orderDetailsModal').remove();
    });
    
    document.querySelector('#orderDetailsModal .close-modal-btn').addEventListener('click', () => {
        document.getElementById('orderDetailsModal').remove();
    });
    
    if (document.getElementById('updateOrderStatusBtn')) {
        document.getElementById('updateOrderStatusBtn').addEventListener('click', () => {
            document.getElementById('orderDetailsModal').remove();
            showUpdateStatusModal(order, db);
        });
    }
}

function getPaymentMethodName(method) {
    const methods = {
        'cash_on_delivery': 'Cash on Delivery',
        'card': 'Credit/Debit Card',
        'paypal': 'PayPal',
        'khqr': 'KHQR',
        'aba': 'ABA Bank'
    };
    return methods[method] || method;
}

function showUpdateStatusModal(order, db) {
    const modalHTML = `
        <div id="updateStatusModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 3000;">
            <div style="background: white; border-radius: 15px; max-width: 500px; width: 90%; padding: 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <h3 style="margin-top: 0; margin-bottom: 20px; color: #333;">
                    <i class="fas fa-shipping-fast"></i> Update Order Status
                </h3>
                <p style="color: #666; margin-bottom: 25px;">
                    Order: <strong>${order.orderNumber}</strong><br>
                    Customer: ${order.customerName}
                </p>
                
                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #555;">
                        Select New Status
                    </label>
                    <select id="newOrderStatus" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px;">
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </div>
                
                <div id="trackingSection" style="margin-bottom: 25px; display: none;">
                    <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #555;">
                        Tracking Number
                    </label>
                    <input type="text" id="trackingNumber" placeholder="Enter tracking number" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px;">
                    <p style="font-size: 12px; color: #888; margin-top: 8px;">
                        Optional: Add tracking number for shipping
                    </p>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #555;">
                        Notes (Optional)
                    </label>
                    <textarea id="statusNotes" placeholder="Add any notes for the customer..." rows="3" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; resize: vertical;"></textarea>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 15px;">
                    <button class="btn btn-secondary" id="cancelUpdateBtn" style="padding: 12px 25px;">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button class="btn" id="saveStatusBtn" style="padding: 12px 25px;">
                        <i class="fas fa-save"></i> Update Status
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show/hide tracking number field based on status
    const statusSelect = document.getElementById('newOrderStatus');
    const trackingSection = document.getElementById('trackingSection');
    
    statusSelect.addEventListener('change', function() {
        if (this.value === 'shipped') {
            trackingSection.style.display = 'block';
        } else {
            trackingSection.style.display = 'none';
        }
    });
    
    // Trigger change event to set initial state
    statusSelect.dispatchEvent(new Event('change'));
    
    // Add event listeners
    document.getElementById('cancelUpdateBtn').addEventListener('click', () => {
        document.getElementById('updateStatusModal').remove();
    });
    
    document.getElementById('saveStatusBtn').addEventListener('click', async () => {
        await updateOrderStatus(order.id, statusSelect.value, db);
    });
}

async function updateOrderStatus(orderId, newStatus, db) {
    const trackingNumber = document.getElementById('trackingNumber')?.value || '';
    const notes = document.getElementById('statusNotes')?.value || '';
    
    try {
        const updateData = {
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (trackingNumber) {
            updateData.trackingNumber = trackingNumber;
        }
        
        if (notes) {
            updateData.merchantNotes = notes;
        }
        
        // Update in order_history
        await db.collection("order_history").doc(orderId).update(updateData);
        
        // Also update in user's my_orders subcollection (for user notification)
        // We need to get the user ID from the order first
        const orderDoc = await db.collection("order_history").doc(orderId).get();
        const orderData = orderDoc.data();
        
        if (orderData.userId) {
            try {
                await db.collection("users").doc(orderData.userId)
                    .collection("my_orders").doc(orderId).update(updateData);
            } catch (error) {
                console.log("Could not update user's my_orders", error);
            }
        }
        
        // Show success message
        alert(`✅ Order status updated to: ${newStatus}`);
        
        // Close modal
        document.getElementById('updateStatusModal').remove();
        
        // Refresh orders list
        const dbInstance = window.firebaseDb;
        loadMerchantOrders(dbInstance);
        
    } catch (error) {
        console.error("❌ Error updating order status:", error);
        alert('Error updating order status: ' + error.message);
    }
}

// Add to global exports
window.loadMerchantOrders = function() {
    const db = window.firebaseDb;
    loadMerchantOrders(db);
};

// Add to the tab switching logic to load orders when Orders tab is clicked
// In the initializeDashboard function, modify the tab click event:
function initializeDashboard(db) {
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
            
            // Load data for specific tabs
            if (tabId === 'orders') {
                loadMerchantOrders(db);
            }
        });
    });
}


async function exportOrders() {
    try {
        const db = window.firebaseDb;
        const ordersSnapshot = await db.collection("order_history")
            .where("status", "in", ["pending", "processing", "shipped", "delivered"])
            .get();
        
        if (ordersSnapshot.empty) {
            alert('No orders to export');
            return;
        }
        
        let csvContent = "Order ID,Customer Name,Email,Phone,Date,Status,Total,Items\n";
        
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            const orderDate = order.orderDate?.toDate ? order.orderDate.toDate() : new Date();
            const formattedDate = orderDate.toLocaleDateString('en-GB');
            
            const items = order.items ? order.items.map(item => 
                `${item.name} (x${item.quantity})`).join('; ') : '';
            
            csvContent += `"${order.orderId || doc.id}","${order.customerName || ''}","${order.customerEmail || ''}","${order.customerPhone || ''}","${formattedDate}","${order.status || ''}","${order.total || 0}","${items}"\n`;
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert('Orders exported successfully!');
        
    } catch (error) {
        console.error("Error exporting orders:", error);
        alert('Error exporting orders: ' + error.message);
    }
}
            
            // ==================== GLOBAL EXPORTS ====================
            window.exportOrders = exportOrders;
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