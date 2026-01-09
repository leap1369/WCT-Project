
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
    
    // Get auth and firestore instances
    const auth = firebase.auth();
    const db = firebase.firestore();
    const FieldValue = firebase.firestore.FieldValue;

    // Global variables
    let currentUser = null;
    let products = [];
    let cart = [];
    let selectedCategory = 'all';

    // Initialize when page loads
    document.addEventListener('DOMContentLoaded', function() {
        console.log("Initializing homepage with new layout...");
        
        // Check authentication state
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log("User is signed in:", user.uid);
                currentUser = user;
                
                // Create or update user document in Firestore
                await createOrUpdateUserDocument(user);
                
                updateUIForLoggedInUser(user);
                loadUserCart(user.uid);
            } else {
                console.log("User is signed out");
                currentUser = null;
                updateUIForGuest();
            }
        });
        
        // Load products and categories
        loadProducts();
        setupEventListeners();
    });

    // Function to create or update user document in Firestore
    async function createOrUpdateUserDocument(user) {
        try {
            const userRef = db.collection('users').doc(user.uid);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                // Create new user document
                await userRef.set({
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    firstName: user.displayName ? user.displayName.split(' ')[0] : '',
                    lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
                    emailVerified: user.emailVerified || false,
                    role: "user",
                    createdAt: FieldValue.serverTimestamp(),
                    profilePicture: user.photoURL || '',
                    lastLogin: FieldValue.serverTimestamp()
                });
                console.log("User document created in Firestore");
            } else {
                // Update last login
                await userRef.update({
                    lastLogin: FieldValue.serverTimestamp()
                });
                
                // Get user data for UI
                const userData = userDoc.data();
                localStorage.setItem('currentUser', JSON.stringify({
                    uid: user.uid,
                    ...userData
                }));
            }
        } catch (error) {
            console.error('Error creating/updating user document:', error);
        }
    }

    function updateUIForLoggedInUser(user) {
        const authButtons = document.getElementById('authButtons');
        const profilePic = document.getElementById('profilePic');
        
        // Remove any existing welcome message
        const existingWelcome = document.querySelector('.welcome-message');
        if (existingWelcome) {
            existingWelcome.remove();
        }
        
        // Get user data
        const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const displayName = userData.displayName || user.email.split('@')[0];
        
        // Hide auth buttons and show welcome message
        authButtons.style.display = 'none';
        
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        welcomeDiv.innerHTML = `
            Welcome, <span class="username">${displayName}</span>!
            <button class="btn logout" onclick="logout()">Logout</button>
        `;
        
        // Insert welcome message
        const userSection = document.querySelector('.user-section');
        if (userSection) {
            userSection.insertBefore(welcomeDiv, authButtons);
        }
        
        // Update profile picture
        if (userData.profilePicture) {
            profilePic.innerHTML = `<img src="${userData.profilePicture}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            const initials = displayName.charAt(0).toUpperCase();
            profilePic.innerHTML = `<span style="font-size: 1.5em;">${initials}</span>`;
        }
        
        // Update side profile
        document.getElementById('sideUsername').textContent = displayName;
        document.getElementById('sideEmail').textContent = user.email;
    }

    function updateUIForGuest() {
        const authButtons = document.getElementById('authButtons');
        authButtons.style.display = 'flex';
        
        // Clear any welcome message
        const existingWelcome = document.querySelector('.welcome-message');
        if (existingWelcome) {
            existingWelcome.remove();
        }
        
        // Reset profile picture
        const profilePic = document.getElementById('profilePic');
        profilePic.innerHTML = `<i class="fas fa-user" style="font-size: 2em;"></i>`;
        
        // Reset side profile
        document.getElementById('sideUsername').textContent = 'Guest User';
        document.getElementById('sideEmail').textContent = 'guest@example.com';
        
        // Clear cart for guest (use localStorage for guest cart)
        loadGuestCart();
    }

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

    function saveGuestCart() {
        if (!currentUser) {
            localStorage.setItem('guestCart', JSON.stringify(cart));
        }
    }

    function handleMerchantClick() {
        if (!currentUser) {
            alert('Please login to become a merchant');
            window.location.href = 'login.html';
        } else {
            window.location.href = 'merchant-register-information.html';
        }
    }

    function handleProfileClick() {
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
        openSideProfile();
    }

    function openSideProfile() {
        document.getElementById('sideProfile').classList.add('show');
        document.querySelector('.side-profile-overlay').classList.add('show');
        setActiveMenuItem('profile');
        showProfileSection('profile');
    }

    function closeSideProfile() {
        document.getElementById('sideProfile').classList.remove('show');
        document.querySelector('.side-profile-overlay').classList.remove('show');
        document.getElementById('profileContent').classList.remove('show');
    }

    function logout() {
        auth.signOut()
            .then(() => {
                currentUser = null;
                localStorage.removeItem('currentUser');
                updateUIForGuest();
                closeSideProfile();
                showNotification('Logged out successfully!');
            })
            .catch(error => {
                console.error('Logout error:', error);
                alert('Error logging out: ' + error.message);
            });
    }

    function setActiveMenuItem(sectionId) {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const menuItem = document.querySelector(`[onclick*="${sectionId}"]`);
        if (menuItem) {
            menuItem.classList.add('active');
        }
    }

    function showProfileSection(sectionId) {
        setActiveMenuItem(sectionId);
        
        const contentDiv = document.getElementById('profileContent');
        const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const user = auth.currentUser;
        
        let contentHTML = '';
        
        switch(sectionId) {
            case 'profile':
                contentHTML = `
                    <div class="content-header">
                        <h3>Profile</h3>
                        <button class="back-button" onclick="closeProfileContent()">
                            Back <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                    <div class="profile-details">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <div class="profile-pic-side" style="width: 100px; height: 100px; margin: 0 auto; background-color: #85BB65;">
                                ${userData.profilePicture ? 
                                    `<img src="${userData.profilePicture}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` :
                                    `<i class="fas fa-user" style="font-size: 48px; color: white; line-height: 100px;"></i>`
                                }
                            </div>
                            <h3>${userData.displayName || 'User'}</h3>
                            <p>${userData.email || user?.email || 'No email'}</p>
                        </div>
                        
                        <div style="padding: 20px;">
                            <div style="margin-bottom: 15px;">
                                <strong>First Name:</strong> ${userData.firstName || 'Not set'}
                            </div>
                            <div style="margin-bottom: 15px;">
                                <strong>Last Name:</strong> ${userData.lastName || 'Not set'}
                            </div>
                        </div>
                        
                        <button class="view-cart-btn" onclick="editProfile()" style="margin: 20px;">
                            <i class="fas fa-edit"></i> Edit Profile
                        </button>
                    </div>
                `;
                break;
                
            default:
                contentHTML = `
                    <div class="content-header">
                        <h3>${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}</h3>
                        <button class="back-button" onclick="closeProfileContent()">
                            Back <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                    <div style="padding: 20px; text-align: center;">
                        <p>Feature coming soon!</p>
                    </div>
                `;
        }
        
        contentDiv.innerHTML = contentHTML;
        contentDiv.classList.add('show');
    }

    function closeProfileContent() {
        document.getElementById('profileContent').classList.remove('show');
        setActiveMenuItem('profile');
    }

    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
    }

    async function loadProducts() {
        try {
            console.log("Loading products from Firestore...");
            
            const snapshot = await db.collection('product_list').get();
            products = [];
            
            snapshot.forEach(doc => {
                const product = {
                    id: doc.id,
                    ...doc.data()
                };
                products.push(product);
            });
            
            console.log(`Loaded ${products.length} products`);
            
            // Get unique categories
            const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
            renderCategories(categories);
            renderProducts(products);
            
        } catch (error) {
            console.error('Error loading products:', error);
            document.getElementById('productsContainer').innerHTML = 
                '<div style="text-align: center; padding: 40px; color: #666;">Error loading products. Please refresh.</div>';
        }
    }

    function renderCategories(categories) {
        const container = document.getElementById('categoriesContainer');
        container.innerHTML = categories.map(category => `
            <div class="category" onclick="filterByCategory('${category}')">
                <div style="width: 50px; height: 50px; background-color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 5px;">
                    <i class="fas fa-tag" style="color: #85BB65; font-size: 24px;"></i>
                </div>
                <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
            </div>
        `).join('');
    }

    function filterByCategory(category) {
        selectedCategory = category;
        
        // Filter products
        const filteredProducts = category === 'all' 
            ? products 
            : products.filter(product => product.category === category);
        
        renderProducts(filteredProducts);
    }

    function renderProducts(productsToShow) {
        const container = document.getElementById('productsContainer');
        
        if (productsToShow.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #666; grid-column: 1 / -1;">No products found</div>';
            return;
        }
        
        container.innerHTML = productsToShow.map(product => `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.imageUrl || 'https://via.placeholder.com/300x200'}" alt="${product.name}">
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
                    ${product.rating ? `
                        <div class="product-rating">
                            ${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}
                            (${product.rating})
                        </div>
                    ` : ''}
                </div>
                <button class="add-to-cart" onclick="addToCart('${product.id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.imageUrl || ''}')">
                    Add to Cart
                </button>
            </div>
        `).join('');
    }

    async function loadUserCart(userId) {
        try {
            console.log("Loading cart for user:", userId);
            
            const cartDoc = await db.collection('carts').doc(userId).get();
            
            if (cartDoc.exists) {
                cart = cartDoc.data().items || [];
                console.log("Loaded cart items:", cart.length);
            } else {
                // Create empty cart document
                await db.collection('carts').doc(userId).set({
                    userId: userId,
                    items: [],
                    updatedAt: FieldValue.serverTimestamp()
                });
                cart = [];
            }
            
            updateCartCount();
            renderCartPreview();
            
        } catch (error) {
            console.error('Error loading cart:', error);
            cart = [];
        }
    }

    async function addToCart(productId, productName, productPrice, productImage) {
        if (!currentUser) {
            // For guest users
            const existingItemIndex = cart.findIndex(item => item.id === productId);
            
            if (existingItemIndex > -1) {
                cart[existingItemIndex].quantity += 1;
            } else {
                cart.push({
                    id: productId,
                    name: productName,
                    price: productPrice,
                    image: productImage,
                    quantity: 1
                });
            }
            
            saveGuestCart();
        } else {
            // For logged in users
            const existingItemIndex = cart.findIndex(item => item.id === productId);
            
            if (existingItemIndex > -1) {
                cart[existingItemIndex].quantity += 1;
            } else {
                cart.push({
                    id: productId,
                    name: productName,
                    price: productPrice,
                    image: productImage,
                    quantity: 1
                });
            }
            
            // Save to Firestore
            await saveCartToFirestore();
        }
        
        // Update UI
        updateCartCount();
        renderCartPreview();
        showNotification(`Added ${productName} to cart`);
    }

    async function saveCartToFirestore() {
        if (!currentUser) return;
        
        try {
            await db.collection('carts').doc(currentUser.uid).set({
                userId: currentUser.uid,
                items: cart,
                updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log("Cart saved to Firestore");
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    }

    async function removeFromCart(productId) {
        cart = cart.filter(item => item.id !== productId);
        
        if (currentUser) {
            await saveCartToFirestore();
        } else {
            saveGuestCart();
        }
        
        updateCartCount();
        renderCartPreview();
    }

    async function updateQuantity(productId, change) {
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

    function updateCartCount() {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        document.querySelector('.cart-count').textContent = totalItems;
        
        // Update cart badge in side profile
        const badgeElement = document.getElementById('cartBadge');
        if (badgeElement) {
            badgeElement.textContent = totalItems;
        }
    }

    function renderCartPreview() {
        const container = document.getElementById('cartItemsContainer');
        const totalElement = document.querySelector('.total-amount');
        
        if (cart.length === 0) {
            container.innerHTML = `
                <div class="empty-cart-message">
                    <i class="fas fa-shopping-basket"></i>
                    <p>Your cart is empty</p>
                </div>
            `;
            if (totalElement) totalElement.textContent = '$0.00';
            return;
        }
        
        let total = 0;
        let itemsHTML = '';
        
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            itemsHTML += `
                <div class="cart-item" data-product-id="${item.id}">
                    <div class="cart-item-image">
                        <img src="${item.image || 'https://via.placeholder.com/60'}" alt="${item.name}">
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-title">${item.name}</div>
                        <div class="cart-item-price">$${item.price.toFixed(2)} × ${item.quantity}</div>
                        <div class="cart-item-actions">
                            <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                            <button class="remove-item" onclick="removeFromCart('${item.id}')">Remove</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = itemsHTML;
        if (totalElement) totalElement.textContent = `$${total.toFixed(2)}`;
    }

    function toggleCartPreview() {
        if (!currentUser && cart.length === 0) {
            showNotification('Your cart is empty');
            return;
        }
        
        const cartPreview = document.getElementById('cartPreview');
        cartPreview.classList.toggle('show');
    }

    function proceedToCheckout() {
        if (!currentUser) {
            alert('Please login to checkout');
            window.location.href = 'login.html';
            return;
        }
        
        if (cart.length === 0) {
            alert('Your cart is empty');
            return;
        }
        
        alert('Checkout feature coming soon!');
    }

    function editProfile() {
        alert('Edit profile feature coming soon!');
    }

    function showNotification(message) {
        // Simple notification implementation
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #85BB65;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            z-index: 1001;
            transform: translateX(150%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(150%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    function setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();
                const filteredProducts = products.filter(product => 
                    product.name.toLowerCase().includes(searchTerm) ||
                    (product.description && product.description.toLowerCase().includes(searchTerm))
                );
                renderProducts(filteredProducts);
            });
        }
        
        // Close cart preview when clicking outside
        document.addEventListener('click', function(e) {
            const cartPreview = document.getElementById('cartPreview');
            const cartIcon = document.querySelector('.cart-icon-container');
            
            if (cartPreview && cartPreview.classList.contains('show') && 
                !cartPreview.contains(e.target) && 
                !cartIcon.contains(e.target)) {
                cartPreview.classList.remove('show');
            }
        });
        
        // Close cart preview with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const cartPreview = document.getElementById('cartPreview');
                if (cartPreview && cartPreview.classList.contains('show')) {
                    cartPreview.classList.remove('show');
                }
            }
        });
        
        // Check for saved dark mode preference
        const savedDarkMode = localStorage.getItem('darkMode');
        if (savedDarkMode === 'true') {
            document.body.classList.add('dark-mode');
            document.getElementById('themeToggle').checked = true;
        }
    }

    // Expose functions to global scope
    window.handleProfileClick = handleProfileClick;
    window.handleMerchantClick = handleMerchantClick;
    window.closeSideProfile = closeSideProfile;
    window.showProfileSection = showProfileSection;
    window.closeProfileContent = closeProfileContent;
    window.toggleTheme = toggleTheme;
    window.toggleCartPreview = toggleCartPreview;
    window.logout = logout;
    window.addToCart = addToCart;
    window.updateQuantity = updateQuantity;
    window.removeFromCart = removeFromCart;
    window.proceedToCheckout = proceedToCheckout;
    window.filterByCategory = filterByCategory;
    window.editProfile = editProfile;
