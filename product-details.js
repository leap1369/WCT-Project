// Fetch product data from Firebase Firestore when users click on products

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBKswcE3xGh4feqGZytevh6N-IyrJoJ_7g",
    authDomain: "jeahluy.firebaseapp.com",
    projectId: "jeahluy",
    storageBucket: "jeahluy.firebasestorage.app",
    messagingSenderId: "308746007810",
    appId: "1:308746007810:web:c17396303b14d61c3b3e1b",
    measurementId: "G-3RLD0EB1FT"
};

// Initialize Firebase with compat version
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Get Firebase instances
const auth = firebase.auth();
const db = firebase.firestore();
const FieldValue = firebase.firestore.FieldValue;

// Get product ID from URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('product');

// Global variables
let currentProduct = null;
let merchantData = null;
let currentUser = null;
let cart = [];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("Product details page loading...");
    console.log("Product ID from URL:", productId);
    
    // Check if we have a product ID
    if (!productId) {
        showError('No product specified. Please select a product from the homepage.');
        return;
    }
    
    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("User is signed in:", user.uid);
            currentUser = user;
            updateUIForLoggedInUser(user);
            await loadUserCart(user.uid);
        } else {
            console.log("User is signed out");
            currentUser = null;
            updateUIForGuest();
            loadGuestCart();
        }
        
        // Update cart count after loading cart
        updateCartCount();
    });
    
    // Load product data from Firestore
    loadProductFromFirestore(productId);
    
    // Setup event listeners
    setupEventListeners();
});

// Function to load product from Firestore product_list collection - FIXED VERSION
async function loadProductFromFirestore(productId) {
    try {
        console.log("Loading product from Firestore product_list:", productId);
        
        // Show loading state
        showLoadingState();
        
        // Load from product_list collection (where merchants store products)
        const productDoc = await db.collection("product_list").doc(productId).get();
        
        if (!productDoc.exists) {
            showError('Product not found. It may have been removed or does not exist.');
            return;
        }
        
        // Product found in product_list
        const productData = productDoc.data();
        currentProduct = {
            id: productDoc.id,
            ...productData
        };
        
        console.log("✅ Product loaded from product_list:", currentProduct);
        console.log("Product data structure:", {
            id: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            hasImageBase64: !!currentProduct.imageBase64,
            imageBase64Length: currentProduct.imageBase64 ? currentProduct.imageBase64.length : 0,
            imageUrl: currentProduct.imageUrl,
            image: currentProduct.image
        });
        
        // Load merchant data if available
        if (currentProduct.merchantId) {
            await loadMerchantData(currentProduct.merchantId);
        }
        
        // Display product data
        displayProductData(currentProduct);
        
        // Update page title
        document.title = `${currentProduct.name} - JeahLuy`;
        
    } catch (error) {
        console.error('Error loading product:', error);
        
        if (error.code === 'permission-denied') {
            showError('Permission denied. Unable to load product details.');
        } else if (error.code === 'not-found') {
            showError('Product not found. It may have been removed or does not exist.');
        } else {
            showError('Error loading product. Please try again later.');
        }
    }
}

// Function to load merchant data
async function loadMerchantData(merchantId) {
    if (!merchantId) {
        console.log("No merchant ID provided");
        return;
    }
    
    try {
        console.log("Loading merchant data for ID:", merchantId);
        
        // Try to get merchant from verifiedMerchants collection
        const merchantDoc = await db.collection('verifiedMerchants').doc(merchantId).get();
        
        if (merchantDoc.exists) {
            merchantData = merchantDoc.data();
            console.log("Merchant data loaded:", merchantData);
            updateStoreInfo(merchantData);
        } else {
            console.log("Merchant not found in verifiedMerchants");
            // Use default store info
            updateStoreInfo({
                storeName: 'Store',
                storeEmail: '',
                storePhone: '',
                storeAddress: ''
            });
        }
        
    } catch (error) {
        console.error('Error loading merchant data:', error);
    }
}

// Function to display product data in the UI - FIXED VERSION
function displayProductData(product) {
    console.log("Displaying product data:", product);
    
    // Hide loading state
    hideLoadingState();
    
    // Set product title
    document.getElementById('productTitle').textContent = product.name || 'Unnamed Product';
    
    // Set product price
    const price = parseFloat(product.price || 0);
    document.getElementById('productPrice').textContent = `$${price.toFixed(2)}`;
    document.getElementById('finalPrice').textContent = `$${price.toFixed(2)}`;
    
    // Update the product image - FIXED IMAGE HANDLING
    const productImageContainer = document.querySelector('.product-image');
    const imageSrc = getProductImageSrc(product);
    
    console.log("Image source to be used:", imageSrc.substring(0, 100) + "...");
    
    productImageContainer.innerHTML = `
        <img id="productImage" src="${imageSrc}" 
             alt="${product.name || 'Product Image'}"
             onerror="handleProductImageError(this)" 
             style="width: 100%; height: auto; border-radius: 10px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);">
    `;
    
    // Set product category
    const categoryElement = document.getElementById('productCategory');
    if (categoryElement) {
        categoryElement.textContent = product.category || 'Uncategorized';
    }
    
    // Set product description
    const descriptionElement = document.getElementById('productDescription');
    if (descriptionElement) {
        if (product.description) {
            descriptionElement.innerHTML = `<p><strong>Description:</strong> ${product.description}</p>`;
        } else {
            descriptionElement.innerHTML = '<p><strong>Description:</strong> No description available.</p>';
        }
    }
    
    // Set product specifications
    const specsContainer = document.getElementById('productSpecs');
    if (specsContainer) {
        specsContainer.innerHTML = '';
        
        const defaultSpecs = [];
        
        if (product.category) {
            defaultSpecs.push(`Category: ${product.category}`);
        }
        
        if (product.brand) {
            defaultSpecs.push(`Brand: ${product.brand}`);
        }
        
        if (product.sku) {
            defaultSpecs.push(`SKU: ${product.sku}`);
        }
        
        if (product.weight) {
            defaultSpecs.push(`Weight: ${product.weight} kg`);
        }
        
        if (product.stockQty !== undefined) {
            const stockStatus = product.stockQty > 0 ? 
                `In Stock (${product.stockQty} available)` : 
                'Out of Stock';
            defaultSpecs.push(`Availability: ${stockStatus}`);
        }
        
        if (product.status) {
            defaultSpecs.push(`Status: ${product.status}`);
        }
        
        if (defaultSpecs.length > 0) {
            defaultSpecs.forEach(spec => {
                const li = document.createElement('li');
                li.textContent = spec;
                specsContainer.appendChild(li);
            });
        } else {
            specsContainer.innerHTML = '<li>No specifications available.</li>';
        }
    }
    
    // Set discount badge
    const discountBadge = document.getElementById('discountBadge');
    if (discountBadge) {
        if (product.discount && product.discount > 0) {
            discountBadge.textContent = `${product.discount}% OFF`;
            discountBadge.style.display = 'inline-block';
            
            const discountedPrice = price - (price * product.discount / 100);
            document.getElementById('finalPrice').textContent = `$${discountedPrice.toFixed(2)}`;
            
            const priceElement = document.getElementById('productPrice');
            if (priceElement) {
                priceElement.innerHTML = 
                    `<span style="text-decoration: line-through; color: #999; margin-right: 10px;">$${price.toFixed(2)}</span>` +
                    `<span style="color: #ff6b6b; font-weight: bold;">$${discountedPrice.toFixed(2)}</span>`;
            }
        } else {
            discountBadge.style.display = 'none';
        }
    }
    
    // Set sold count
    const soldCountElement = document.getElementById('soldCount');
    if (soldCountElement && product.soldCount !== undefined) {
        soldCountElement.textContent = `${product.soldCount}+ sold`;
    }
    
    // Set shipping ETA
    const shippingETAElement = document.getElementById('shippingETA');
    if (shippingETAElement && product.shippingETA) {
        shippingETAElement.textContent = `ETA: ${product.shippingETA}`;
    }
    
    // Enable/disable add to cart button based on stock
    const addToCartBtn = document.querySelector('.add-to-cart');
    if (addToCartBtn) {
        if (product.stockQty === 0 || product.status === 'out_of_stock') {
            addToCartBtn.textContent = 'Out of Stock';
            addToCartBtn.disabled = true;
            addToCartBtn.style.backgroundColor = '#ccc';
            addToCartBtn.style.cursor = 'not-allowed';
        } else {
            addToCartBtn.textContent = 'Add to Cart';
            addToCartBtn.disabled = false;
            addToCartBtn.style.backgroundColor = '';
            addToCartBtn.style.cursor = 'pointer';
        }
    }
}

// Function to get product image source - FIXED VERSION
function getProductImageSrc(product) {
    console.log("Getting image source for product:", product.id);
    console.log("Available image fields:", {
        imageBase64: product.imageBase64 ? `Present (${product.imageBase64.length} chars)` : 'Missing',
        imageUrl: product.imageUrl || 'Missing',
        image: product.image || 'Missing'
    });
    
    // Priority 1: Base64 image (from merchant upload)
    if (product.imageBase64) {
        console.log("✅ Using imageBase64 field");
        
        // Check if it's already a data URL
        if (product.imageBase64.startsWith('data:image/')) {
            console.log("Base64 is already a data URL");
            return product.imageBase64;
        }
        
        // Check if it's a URL
        if (product.imageBase64.startsWith('http')) {
            console.log("Base64 field contains a URL");
            return product.imageBase64;
        }
        
        // Check if it's raw base64
        const base64Pattern = /^[A-Za-z0-9+/=]+$/;
        if (base64Pattern.test(product.imageBase64)) {
            console.log("Raw base64 detected, converting to data URL");
            
            // Try to detect image format from the first few characters
            if (product.imageBase64.startsWith('/9j/') || product.imageBase64.startsWith('/9j/')) {
                return `data:image/jpeg;base64,${product.imageBase64}`;
            } else if (product.imageBase64.startsWith('iVBORw0KGgo')) {
                return `data:image/png;base64,${product.imageBase64}`;
            } else if (product.imageBase64.startsWith('R0lGODlh')) {
                return `data:image/gif;base64,${product.imageBase64}`;
            } else if (product.imageBase64.startsWith('UklGR')) {
                return `data:image/webp;base64,${product.imageBase64}`;
            } else {
                // Default to JPEG if format unknown
                console.log("Unknown base64 format, defaulting to JPEG");
                return `data:image/jpeg;base64,${product.imageBase64}`;
            }
        }
        
        console.log("Base64 doesn't match expected patterns, using as-is");
        return product.imageBase64;
    }
    
    // Priority 2: Image URL
    if (product.imageUrl) {
        console.log("Using imageUrl field");
        return product.imageUrl;
    }
    
    // Priority 3: Image field
    if (product.image) {
        console.log("Using image field");
        return product.image;
    }
    
    // Default placeholder
    console.log("No image found, using placeholder");
    return 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
}

// Handle image loading errors - SIMPLIFIED VERSION
function handleProductImageError(imgElement) {
    console.error("Image failed to load");
    imgElement.onerror = null; // Prevent infinite loop
    
    // Fallback to placeholder
    imgElement.src = 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    imgElement.style.objectFit = 'contain';
    imgElement.style.padding = '20px';
    imgElement.style.backgroundColor = '#f5f5f5';
}

// Function to update store information
function updateStoreInfo(merchant) {
    console.log("Updating store info:", merchant);
    
    const storeNameElement = document.getElementById('storeName');
    if (storeNameElement && merchant.storeName) {
        storeNameElement.textContent = merchant.storeName;
    }
}

// Function to show loading state
function showLoadingState() {
    const container = document.querySelector('.container');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 100px 20px;">
                <div class="loading-spinner" style="
                    width: 60px;
                    height: 60px;
                    border: 5px solid #f3f3f3;
                    border-top: 5px solid #85BB65;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <h3 style="color: #333;">Loading Product Details...</h3>
                <p style="color: #666;">Please wait while we fetch the product information.</p>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

function hideLoadingState() {
    // Content is already loaded by displayProductData
}

// Function to show error message
function showError(message) {
    const container = document.querySelector('.container');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 100px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 64px; color: #ff6b6b; margin-bottom: 20px;"></i>
                <h2 style="color: #ff6b6b;">Product Not Available</h2>
                <p style="font-size: 18px; margin: 20px 0; color: #666;">${message}</p>
                <div style="margin-top: 30px;">
                    <button onclick="window.history.back()" 
                            style="background-color: #6c757d; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 16px; margin-right: 10px;">
                        <i class="fas fa-arrow-left"></i> Go Back
                    </button>
                    <button onclick="window.location.href='homepage.html'" 
                            style="background-color: #85BB65; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 16px;">
                        <i class="fas fa-home"></i> Return to Homepage
                    </button>
                </div>
            </div>
        `;
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser(user) {
    const authButtons = document.querySelector('.auth-buttons');
    const profilePic = document.querySelector('.profile-pic');
    const userSection = document.querySelector('.user-section');
    
    if (!authButtons || !profilePic || !userSection) return;
    
    const existingWelcome = document.querySelector('.welcome-message');
    if (existingWelcome) {
        existingWelcome.remove();
    }
    
    const displayName = user.displayName || user.email.split('@')[0];
    
    authButtons.style.display = 'none';
    
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-message';
    welcomeDiv.innerHTML = `
        Welcome, <span class="username">${displayName}</span>!
        <button class="btn logout" onclick="logout()">Logout</button>
    `;
    
    userSection.insertBefore(welcomeDiv, authButtons);
    
    if (user.photoURL) {
        profilePic.innerHTML = `<img src="${user.photoURL}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    } else {
        const initials = displayName.charAt(0).toUpperCase();
        profilePic.innerHTML = `<span style="font-size: 1.5em;">${initials}</span>`;
    }
}

// Update UI for guest user
function updateUIForGuest() {
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) {
        authButtons.style.display = 'flex';
    }
    
    const existingWelcome = document.querySelector('.welcome-message');
    if (existingWelcome) {
        existingWelcome.remove();
    }
    
    const profilePic = document.querySelector('.profile-pic');
    if (profilePic) {
        profilePic.innerHTML = `<i class="fas fa-user" style="font-size: 2em;"></i>`;
    }
}

// Load user cart from Firestore
async function loadUserCart(userId) {
    try {
        console.log("Loading cart for user:", userId);
        
        const cartDoc = await db.collection('carts').doc(userId).get();
        
        if (cartDoc.exists) {
            cart = cartDoc.data().items || [];
            console.log("Loaded cart items from Firestore:", cart.length);
        } else {
            cart = [];
        }
        
        updateCartCount();
        renderCartPreview();
        
    } catch (error) {
        console.error('Error loading cart:', error);
        cart = [];
    }
}

// Load guest cart from localStorage
function loadGuestCart() {
    try {
        const savedCart = localStorage.getItem('guestCart');
        if (savedCart) {
            cart = JSON.parse(savedCart) || [];
        } else {
            cart = [];
        }
    } catch (error) {
        console.error('Error loading guest cart:', error);
        cart = [];
    }
    updateCartCount();
    renderCartPreview();
}

// Save guest cart to localStorage
function saveGuestCart() {
    if (!currentUser) {
        localStorage.setItem('guestCart', JSON.stringify(cart));
    }
}

// Save cart to Firestore for logged in users
async function saveCartToFirestore() {
    if (!currentUser) return;
    
    try {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        await db.collection('carts').doc(currentUser.uid).set({
            userId: currentUser.uid,
            items: cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                image: item.image || '',
                quantity: item.quantity
            })),
            updatedAt: FieldValue.serverTimestamp(),
            totalItems: totalItems,
            totalAmount: totalAmount,
            status: 'active'
        }, { merge: true });
        
        console.log("Cart saved to Firestore");
        
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

// Function to add current product to cart
async function addProductToCart() {
    if (!currentProduct) {
        showNotification('Product data not loaded. Please try again.', 'error');
        return;
    }
    
    // Check if product is in stock
    if (currentProduct.stockQty === 0 || currentProduct.status === 'out_of_stock') {
        showNotification('This product is out of stock!', 'error');
        return;
    }
    
    try {
        const productId = currentProduct.id;
        const productName = currentProduct.name;
        const productPrice = parseFloat(currentProduct.price || 0);
        const productImage = getProductImageSrc(currentProduct);
        
        // Check if product already in cart
        const existingItemIndex = cart.findIndex(item => item.id === productId);
        
        if (existingItemIndex > -1) {
            // Update quantity if already in cart
            cart[existingItemIndex].quantity += 1;
        } else {
            // Add new item to cart
            cart.push({
                id: productId,
                name: productName,
                price: productPrice,
                image: productImage,
                quantity: 1
            });
        }
        
        // Save cart
        if (currentUser) {
            await saveCartToFirestore();
        } else {
            saveGuestCart();
        }
        
        // Update UI
        updateCartCount();
        renderCartPreview();
        
        // Show success message
        showNotification(`${productName} added to cart!`, 'success');
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Error adding item to cart', 'error');
    }
}

// Update cart count
function updateCartCount() {
    const cartCountElement = document.querySelector('.cart-count');
    if (cartCountElement) {
        const totalItems = cart.reduce((total, item) => total + (item.quantity || 1), 0);
        cartCountElement.textContent = totalItems;
    }
}

// Render cart preview
function renderCartPreview() {
    const cartItemsContainer = document.querySelector('.cart-items-container');
    const cartTotalElement = document.querySelector('.total-amount');
    
    if (!cartItemsContainer) return;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart-message">
                <i class="fas fa-shopping-basket"></i>
                <p>Your cart is empty</p>
            </div>
        `;
        if (cartTotalElement) cartTotalElement.textContent = '$0.00';
        return;
    }
    
    let total = 0;
    let itemsHTML = '';
    
    cart.forEach(item => {
        const itemTotal = item.price * (item.quantity || 1);
        total += itemTotal;
        
        itemsHTML += `
            <div class="cart-item" data-product-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${item.image || 'https://via.placeholder.com/60'}" 
                         alt="${item.name}"
                         onerror="this.src='https://via.placeholder.com/60'">
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)} × ${item.quantity}</div>
                    <div class="cart-item-actions">
                        <button class="quantity-btn" onclick="updateCartItemQuantity('${item.id}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateCartItemQuantity('${item.id}', 1)">+</button>
                        <button class="remove-item" onclick="removeCartItem('${item.id}')">Remove</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    cartItemsContainer.innerHTML = itemsHTML;
    if (cartTotalElement) {
        cartTotalElement.textContent = `$${total.toFixed(2)}`;
    }
}

// Toggle cart preview
function toggleCartPreview() {
    const cartPreview = document.querySelector('.cart-preview');
    if (cartPreview) {
        cartPreview.classList.toggle('show');
        
        if (cartPreview.classList.contains('show')) {
            renderCartPreview();
        }
    }
}

// Update cart item quantity
async function updateCartItemQuantity(productId, change) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    
    if (itemIndex > -1) {
        cart[itemIndex].quantity += change;
        
        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
        
        if (currentUser) {
            await saveCartToFirestore();
        } else {
            saveGuestCart();
        }
        
        updateCartCount();
        renderCartPreview();
    }
}

// Remove item from cart
async function removeCartItem(productId) {
    cart = cart.filter(item => item.id !== productId);
    
    if (currentUser) {
        await saveCartToFirestore();
    } else {
        saveGuestCart();
    }
    
    updateCartCount();
    renderCartPreview();
}

// Show notification
function showNotification(message, type = 'success') {
    let notification = document.querySelector('.product-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'product-notification';
        document.body.appendChild(notification);
        
        const style = document.createElement('style');
        style.textContent = `
            .product-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: ${type === 'success' ? '#85BB65' : '#ff6b6b'};
                color: white;
                padding: 15px 20px;
                border-radius: 5px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                z-index: 1001;
                transform: translateX(150%);
                transition: transform 0.3s ease;
                max-width: 300px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .product-notification.show {
                transform: translateX(0);
            }
            
            .product-notification i {
                font-size: 18px;
            }
        `;
        document.head.appendChild(style);
    }
    
    notification.style.backgroundColor = type === 'success' ? '#85BB65' : '#ff6b6b';
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Logout function
function logout() {
    auth.signOut()
        .then(() => {
            currentUser = null;
            cart = [];
            localStorage.removeItem('guestCart');
            updateUIForGuest();
            updateCartCount();
            showNotification('Logged out successfully!');
            setTimeout(() => {
                window.location.href = 'homepage.html';
            }, 1000);
        })
        .catch(error => {
            console.error('Logout error:', error);
            showNotification('Error logging out: ' + error.message, 'error');
        });
}

// Setup event listeners
function setupEventListeners() {
    // Add to cart button
    const addToCartBtn = document.querySelector('.add-to-cart');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', addProductToCart);
    }
    
    // Cart icon click
    const cartIcon = document.querySelector('.cart-icon-container');
    if (cartIcon) {
        cartIcon.addEventListener('click', toggleCartPreview);
    }
    
    // Close cart preview button
    const closeCartBtn = document.querySelector('.close-cart-preview');
    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', toggleCartPreview);
    }
    
    // View cart button
    const viewCartBtn = document.querySelector('.view-cart-btn');
    if (viewCartBtn) {
        viewCartBtn.addEventListener('click', () => {
            window.location.href = 'homepage.html';
        });
    }
    
    // Follow button
    const followBtn = document.querySelector('.follow-btn');
    if (followBtn) {
        followBtn.addEventListener('click', () => {
            showNotification('Follow feature coming soon!');
        });
    }
    
    // Close cart preview when clicking outside
    document.addEventListener('click', function(event) {
        const cartPreview = document.querySelector('.cart-preview');
        const cartIcon = document.querySelector('.cart-icon-container');
        
        if (cartPreview && cartPreview.classList.contains('show') && 
            !cartPreview.contains(event.target) && 
            !cartIcon.contains(event.target)) {
            cartPreview.classList.remove('show');
        }
    });
    
    // Close cart preview with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const cartPreview = document.querySelector('.cart-preview');
            if (cartPreview && cartPreview.classList.contains('show')) {
                cartPreview.classList.remove('show');
            }
        }
    });
}

// Make functions available globally
window.addProductToCart = addProductToCart;
window.toggleCartPreview = toggleCartPreview;
window.updateCartItemQuantity = updateCartItemQuantity;
window.removeCartItem = removeCartItem;
window.logout = logout;
window.handleProductImageError = handleProductImageError;