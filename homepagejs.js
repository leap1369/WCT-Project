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
} else {
    firebase.app(); // Use existing app
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
let cartAsOrder = null;

// Status mapping for homepage tabs
const STATUS_MAPPING = {
    'pending': 'topay',      // Orders with status 'pending' go to "To Pay" tab
    'processing': 'toship',  // Orders with status 'processing' go to "To Ship" tab  
    'shipped': 'toreceive',  // Orders with status 'shipped' go to "To Receive" tab
    'delivered': 'toreview'  // Orders with status 'delivered' go to "To Review" tab
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing homepage with order status tabs...");
    
    // Check if Firebase is properly initialized
    if (!firebase.apps.length) {
        console.error("Firebase not initialized!");
        showNotification("Firebase initialization failed. Please refresh the page.");
        return;
    }
    
    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("User is signed in:", user.uid);
            currentUser = user;
            
            try {
                // Create or update user document in Firestore
                await createOrUpdateUserDocument(user);
                
                updateUIForLoggedInUser(user);
                await loadUserCart(user.uid);
                await loadCartAsOrderList(user.uid);
                
                // Load order status tabs for badge counts
                await loadOrderStatusTabs();
            } catch (error) {
                console.error("Error during user initialization:", error);
                showNotification("Error loading user data. Please refresh.");
            }
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
                lastLogin: FieldValue.serverTimestamp(),
                address: '',
                city: 'Phnom Penh',
                zipCode: '12000',
                phone: ''
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
        if (error.code === 'permission-denied') {
            console.error('Permission denied to access user document');
        }
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
                            <i class="fas fa-user" style="font-size: 48px; color: white; line-height: 100px;"></i>
                        </div>
                        <h3>${user?.displayName || user?.email.split('@')[0] || 'User'}</h3>
                        <p>${user?.email || 'No email'}</p>
                    </div>
                    
                    <div style="padding: 20px;">
                        <div style="margin-bottom: 15px;">
                            <strong>Email:</strong> ${user?.email || 'Not set'}
                        </div>
                        <div style="margin-bottom: 15px;">
                            <strong>Account Created:</strong> ${user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}
                        </div>
                    </div>
                    
                    <button class="view-cart-btn" onclick="editProfile()" style="margin: 20px;">
                        <i class="fas fa-edit"></i> Edit Profile
                    </button>
                </div>
            `;
            break;
            
        case 'orders':
            contentHTML = `
                <div class="content-header">
                    <h3>Order List (Current Cart)</h3>
                    <button class="back-button" onclick="closeProfileContent()">
                        Back <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="orders-container" style="padding: 20px;">
                    ${renderOrdersList()}
                </div>
            `;
            break;
            
        case 'history':
            contentHTML = `
                <div class="content-header">
                    <h3>Order History</h3>
                    <button class="back-button" onclick="closeProfileContent()">
                        Back <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="history-container" style="padding: 20px;" id="orderHistoryContainer">
                    Loading order history...
                </div>
            `;
            
            contentDiv.innerHTML = contentHTML;
            contentDiv.classList.add('show');
            
            // Load order history
            setTimeout(async () => {
                const historyHTML = await loadOrderHistory();
                document.getElementById('orderHistoryContainer').innerHTML = historyHTML;
            }, 100);
            return;
            
        // Order status tabs
        case 'topay':
        case 'toship':
        case 'toreceive':
        case 'toreview':
            contentHTML = `
                <div class="content-header">
                    <h3>${getTabTitle(sectionId).toUpperCase()}</h3>
                    <button class="back-button" onclick="closeProfileContent()">
                        Back <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="tab-container" style="padding: 20px;" id="${sectionId}Container">
                    Loading ${getTabTitle(sectionId)} orders...
                </div>
            `;
            
            contentDiv.innerHTML = contentHTML;
            contentDiv.classList.add('show');
            
            // Load orders for this tab
            setTimeout(async () => {
                const ordersHTML = await loadOrdersForTab(sectionId);
                document.getElementById(`${sectionId}Container`).innerHTML = ordersHTML;
            }, 100);
            return;
            
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

// Main function to load order status tabs
async function loadOrderStatusTabs() {
    if (!currentUser) return;
    
    try {
        console.log("Loading order status tabs for user:", currentUser.uid);
        
        let snapshot;
        
        // Try to load from order_history collection first
        try {
            snapshot = await db.collection('order_history')
                .where('userId', '==', currentUser.uid)
                .where('status', 'in', ['pending', 'processing', 'shipped', 'delivered'])
                .get();
                
            console.log(`Found ${snapshot.size} orders in order_history`);
            
        } catch (orderHistoryError) {
            console.log('Cannot access order_history, trying user subcollection...', orderHistoryError);
            
            // Fallback to user's my_orders subcollection
            snapshot = await db.collection('users').doc(currentUser.uid)
                .collection('my_orders')
                .where('status', 'in', ['pending', 'processing', 'shipped', 'delivered'])
                .get();
                
            console.log(`Found ${snapshot.size} orders in my_orders`);
        }
        
        if (!snapshot || snapshot.empty) {
            console.log("No orders found for user");
            // Set all badges to 0
            updateTabBadges({ topay: 0, toship: 0, toreceive: 0, toreview: 0 });
            return;
        }
        
        // Count orders by status
        const counts = {
            topay: 0,
            toship: 0,
            toreceive: 0,
            toreview: 0
        };
        
        snapshot.forEach(doc => {
            const order = doc.data();
            const status = order.status || 'pending';
            
            // Map status to tab
            if (STATUS_MAPPING[status]) {
                counts[STATUS_MAPPING[status]]++;
            }
        });
        
        console.log("Order counts by tab:", counts);
        
        // Update badges
        updateTabBadges(counts);
        
    } catch (error) {
        console.error('Error loading order status tabs:', error);
        
        // Check if it's a permission error
        if (error.code === 'permission-denied') {
            console.error('Permission denied to access orders. Check Firestore rules.');
            showNotification('Unable to load orders. Please contact support.');
        }
        
        // Set badges to 0 on error
        updateTabBadges({ topay: 0, toship: 0, toreceive: 0, toreview: 0 });
    }
}

// Update tab badges with counts
function updateTabBadges(counts) {
    const badges = {
        topay: document.getElementById('topayBadge'),
        toship: document.getElementById('toshipBadge'),
        toreceive: document.getElementById('toreceiveBadge'),
        toreview: document.getElementById('toreviewBadge')
    };
    
    for (const [tab, badgeElement] of Object.entries(badges)) {
        if (badgeElement) {
            badgeElement.textContent = counts[tab] || 0;
        }
    }
}

// Function to load orders for a specific tab
async function loadOrdersForTab(tabName) {
    if (!currentUser) {
        return '<div style="text-align: center; padding: 40px;"><p>Please login to view your orders</p></div>';
    }
    
    try {
        console.log(`Loading orders for tab: ${tabName}`);
        
        // Get the status that corresponds to this tab
        const statusForTab = Object.keys(STATUS_MAPPING).find(
            status => STATUS_MAPPING[status] === tabName
        );
        
        // If no status found for this tab, show empty
        if (!statusForTab) {
            return `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-box-open" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                    <h4>No orders in this section</h4>
                </div>
            `;
        }
        
        let snapshot;
        let source = '';
        
        try {
            // Try to load from main order_history collection first
            snapshot = await db.collection('order_history')
                .where('userId', '==', currentUser.uid)
                .where('status', '==', statusForTab)
                .orderBy('orderDate', 'desc')
                .get();
            source = 'order_history';
        } catch (error) {
            console.log('Trying user subcollection instead...', error);
            // Fallback to user's my_orders subcollection
            snapshot = await db.collection('users').doc(currentUser.uid)
                .collection('my_orders')
                .where('status', '==', statusForTab)
                .orderBy('orderDate', 'desc')
                .get();
            source = 'my_orders';
        }
        
        console.log(`Loaded ${snapshot.size} orders from ${source} for tab ${tabName}`);
        
        if (snapshot.empty) {
            return `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-box-open" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                    <h4>No orders to ${getTabTitle(tabName)}</h4>
                    <p>${getEmptyTabMessage(tabName)}</p>
                </div>
            `;
        }
        
        let ordersHTML = '';
        
        snapshot.forEach(doc => {
            const order = doc.data();
            const orderId = order.orderId || doc.id;
            const orderDate = order.orderDate?.toDate ? order.orderDate.toDate() : 
                            order.createdAt?.toDate ? order.createdAt.toDate() : 
                            order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : 
                            new Date();
            
            const formattedDate = orderDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Format price properly
            const total = typeof order.total === 'number' ? order.total : parseFloat(order.total) || 0;
            
            // Count total items
            const totalItems = order.items ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
            
            ordersHTML += `
                <div class="order-tab-card" style="border: 1px solid #e0e0e0; border-radius: 12px; margin-bottom: 20px; background-color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
                    <div style="padding: 20px; border-bottom: 1px solid #e0e0e0; background-color: #f8f9fa;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <div>
                                <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 5px;">
                                    Order #${orderId}
                                </div>
                                <div style="font-size: 14px; color: #666;">
                                    ${formattedDate}
                                </div>
                            </div>
                            <div>
                                <span style="display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px; background-color: ${getStatusColor(order.status)}; color: ${getStatusTextColor(order.status)};">
                                    ${getTabStatusText(tabName)}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div style="padding: 20px;">
                        <div style="margin-bottom: 15px;">
                            <div style="font-weight: bold; color: #333; margin-bottom: 5px;">
                                ${order.customerName || 'Customer'}
                            </div>
                            <div style="color: #666; font-size: 14px; margin-bottom: 3px;">
                                ${order.customerEmail || ''}
                            </div>
                            <div style="color: #666; font-size: 14px;">
                                ${order.customerPhone || ''}
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 15px; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
                            <div style="font-weight: bold; color: #333; margin-bottom: 10px;">
                                Order Items (${totalItems} items)
                            </div>
                            ${order.items && order.items.length > 0 ? order.items.slice(0, 3).map(item => `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                                    <span style="color: #666;">${item.name} × ${item.quantity}</span>
                                    <span style="font-weight: bold; color: #333;">$${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                                </div>
                            `).join('') : ''}
                            ${order.items && order.items.length > 3 ? 
                                `<div style="text-align: center; color: #666; font-size: 14px; margin-top: 10px;">
                                    +${order.items.length - 3} more items
                                </div>` : ''
                            }
                        </div>
                        
                        <div style="padding-top: 15px; border-top: 1px solid #e0e0e0;">
                            <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;">
                                <span style="color: #333;">Total</span>
                                <span style="color: #85BB65;">$${total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div style="padding: 20px; border-top: 1px solid #e0e0e0; background-color: #f8f9fa;">
                        ${getTabActions(tabName, orderId)}
                    </div>
                </div>
            `;
        });
        
        return ordersHTML;
        
    } catch (error) {
        console.error(`Error loading orders for tab ${tabName}:`, error);
        
        // Check error type
        if (error.code === 'permission-denied') {
            return `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ffc107; margin-bottom: 20px;"></i>
                    <h4>Permission Error</h4>
                    <p>Unable to access your orders. Please check your account permissions.</p>
                    <p style="font-size: 12px; color: #999; margin-top: 10px;">Error: ${error.message}</p>
                </div>
            `;
        }
        
        return `
            <div style="text-align: center; padding: 40px;">
                <p>Error loading orders. Please try again.</p>
            </div>
        `;
    }
}

// Helper functions for tab display
function getTabTitle(tabName) {
    const titles = {
        topay: 'To Pay',
        toship: 'To Ship',
        toreceive: 'To Receive',
        toreview: 'To Review'
    };
    return titles[tabName] || tabName;
}

function getEmptyTabMessage(tabName) {
    const messages = {
        topay: 'You have no pending payments.',
        toship: 'All your orders are shipped!',
        toreceive: 'No packages are on the way.',
        toreview: 'No items need review yet.'
    };
    return messages[tabName] || 'No items in this section.';
}

function getStatusColor(status) {
    switch(status) {
        case 'pending': return '#fff3cd';
        case 'processing': return '#cce5ff';
        case 'shipped': return '#d4edda';
        case 'delivered': return '#d1ecf1';
        default: return '#f8f9fa';
    }
}

function getStatusTextColor(status) {
    switch(status) {
        case 'pending': return '#856404';
        case 'processing': return '#004085';
        case 'shipped': return '#155724';
        case 'delivered': return '#0c5460';
        default: return '#6c757d';
    }
}

function getTabStatusText(tabName) {
    const statusText = {
        topay: 'PAYMENT PENDING',
        toship: 'PROCESSING',
        toreceive: 'SHIPPED',
        toreview: 'DELIVERED'
    };
    return statusText[tabName] || tabName.toUpperCase();
}

function getTabActions(tabName, orderId) {
    const actions = {
        topay: `
            <div style="display: flex; gap: 10px;">
                <button onclick="payOrder('${orderId}')" 
                        style="background-color: #85BB65; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; flex: 1; transition: all 0.3s;">
                    <i class="fas fa-credit-card"></i> Pay Now
                </button>
                <button onclick="cancelOrder('${orderId}')" 
                        style="background-color: #f5f5f5; color: #666; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        `,
        toship: `
            <div style="text-align: center; color: #666; font-size: 14px;">
                <i class="fas fa-clock"></i> Your order is being processed. You'll be notified when it ships.
            </div>
        `,
        toreceive: `
            <div style="display: flex; gap: 10px;">
                <button onclick="trackOrder('${orderId}')" 
                        style="background-color: #85BB65; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; flex: 1; transition: all 0.3s;">
                    <i class="fas fa-shipping-fast"></i> Track Order
                </button>
                <button onclick="confirmReceipt('${orderId}')" 
                        style="background-color: #007bff; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
                    <i class="fas fa-check"></i> Mark as Received
                </button>
            </div>
        `,
        toreview: `
            <div style="display: flex; gap: 10px;">
                <button onclick="reviewOrder('${orderId}')" 
                        style="background-color: #85BB65; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; flex: 1; transition: all 0.3s;">
                    <i class="fas fa-star"></i> Write Review
                </button>
                <button onclick="skipReview('${orderId}')" 
                        style="background-color: #f5f5f5; color: #666; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
                    <i class="fas fa-forward"></i> Skip
                </button>
            </div>
        `
    };
    
    return actions[tabName] || '';
}

// Action functions for each tab
async function payOrder(orderId) {
    try {
        showNotification('Processing payment...');
        
        // Update order status to processing (paid)
        await updateOrderInFirestore(orderId, {
            status: 'processing',
            paymentStatus: 'paid',
            paidAt: new Date(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Payment successful! Your order is now being processed.');
        
        // Refresh the tabs
        await loadOrderStatusTabs();
        showProfileSection('topay');
        
    } catch (error) {
        console.error('Error processing payment:', error);
        showNotification('Error processing payment. Please try again.');
    }
}

async function cancelOrder(orderId) {
    if (confirm('Are you sure you want to cancel this order?')) {
        try {
            showNotification('Cancelling order...');
            
            await updateOrderInFirestore(orderId, {
                status: 'cancelled',
                cancelledAt: new Date(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification('Order cancelled successfully.');
            
            // Refresh the tabs
            await loadOrderStatusTabs();
            showProfileSection('topay');
            
        } catch (error) {
            console.error('Error cancelling order:', error);
            showNotification('Error cancelling order. Please try again.');
        }
    }
}

async function trackOrder(orderId) {
    try {
        // Try to get order from order_history first
        let orderDoc = await db.collection('order_history').doc(orderId).get();
        
        if (!orderDoc.exists) {
            // Try from user's my_orders subcollection
            orderDoc = await db.collection('users').doc(currentUser.uid)
                .collection('my_orders').doc(orderId).get();
        }
        
        if (!orderDoc.exists) {
            showNotification('Order not found');
            return;
        }
        
        const order = orderDoc.data();
        const trackingNumber = order.trackingNumber || 'Not available yet';
        
        alert(`Tracking Information:\n\nOrder: ${orderId}\nTracking Number: ${trackingNumber}\n\nYou can track your package using the tracking number above.`);
        
    } catch (error) {
        console.error('Error tracking order:', error);
        alert('Tracking information not available yet. Please check back later.');
    }
}

async function confirmReceipt(orderId) {
    if (confirm('Have you received this order?')) {
        try {
            showNotification('Confirming receipt...');
            
            await updateOrderInFirestore(orderId, {
                status: 'delivered',
                deliveredAt: new Date(),
                received: true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification('Order marked as received! Please leave a review.');
            
            // Refresh the tabs
            await loadOrderStatusTabs();
            showProfileSection('toreceive');
            
        } catch (error) {
            console.error('Error confirming receipt:', error);
            showNotification('Error confirming receipt. Please try again.');
        }
    }
}

async function reviewOrder(orderId) {
    try {
        // Try to get order from order_history first
        let orderDoc = await db.collection('order_history').doc(orderId).get();
        
        if (!orderDoc.exists) {
            // Try from user's my_orders subcollection
            orderDoc = await db.collection('users').doc(currentUser.uid)
                .collection('my_orders').doc(orderId).get();
        }
        
        if (!orderDoc.exists) {
            showNotification('Order not found');
            return;
        }
        
        const order = orderDoc.data();
        
        // Show review modal
        const reviewModal = `
            <div id="reviewModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000;">
                <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <h3 style="margin-top: 0;">Review Order #${orderId}</h3>
                    <p>Please rate and review the products from your order:</p>
                    
                    <div id="reviewItemsContainer">
                        ${order.items ? order.items.map((item, index) => `
                            <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
                                <div style="font-weight: bold; margin-bottom: 10px;">${item.name}</div>
                                <div style="margin-bottom: 10px;">
                                    <span style="color: #666;">Rating: </span>
                                    <div class="star-rating">
                                        ${[1,2,3,4,5].map(star => `
                                            <span class="star" data-index="${index}" data-value="${star}" style="cursor: pointer; font-size: 24px; color: #ddd; margin-right: 5px;">★</span>
                                        `).join('')}
                                    </div>
                                    <input type="hidden" id="rating_${index}" value="0">
                                </div>
                                <div>
                                    <textarea id="review_${index}" placeholder="Write your review (optional)" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; min-height: 80px;"></textarea>
                                </div>
                            </div>
                        `).join('') : ''}
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button onclick="submitReview('${orderId}')" style="background: #85BB65; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; flex: 1;">
                            Submit Review
                        </button>
                        <button onclick="closeReviewModal()" style="background: #f5f5f5; color: #666; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', reviewModal);
        
        // Add star rating functionality
        document.querySelectorAll('.star').forEach(star => {
            star.addEventListener('click', function() {
                const index = this.dataset.index;
                const value = parseInt(this.dataset.value);
                
                // Reset all stars for this item
                document.querySelectorAll(`[data-index="${index}"]`).forEach(s => {
                    s.style.color = '#ddd';
                });
                
                // Color stars up to clicked value
                for (let i = 1; i <= value; i++) {
                    const starEl = document.querySelector(`[data-index="${index}"][data-value="${i}"]`);
                    if (starEl) starEl.style.color = '#ffc107';
                }
                
                // Set hidden input value
                document.getElementById(`rating_${index}`).value = value;
            });
        });
        
    } catch (error) {
        console.error('Error showing review modal:', error);
        alert('Unable to load review form. Please try again.');
    }
}

function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) modal.remove();
}

async function submitReview(orderId) {
    try {
        showNotification('Submitting review...');
        
        // Mark order as reviewed
        await updateOrderInFirestore(orderId, {
            reviewed: true,
            reviewSubmittedAt: new Date(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Close modal
        closeReviewModal();
        
        showNotification('Thank you for your review!');
        
        // Refresh the tabs
        await loadOrderStatusTabs();
        showProfileSection('toreview');
        
    } catch (error) {
        console.error('Error submitting review:', error);
        showNotification('Error submitting review. Please try again.');
    }
}

async function skipReview(orderId) {
    if (confirm('Skip reviewing this order?')) {
        try {
            await updateOrderInFirestore(orderId, {
                reviewSkipped: true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification('Review skipped.');
            
            // Refresh the tabs
            await loadOrderStatusTabs();
            showProfileSection('toreview');
            
        } catch (error) {
            console.error('Error skipping review:', error);
            showNotification('Error skipping review. Please try again.');
        }
    }
}

// Helper function to update order in Firestore
async function updateOrderInFirestore(orderId, updateData) {
    if (!currentUser) return;
    
    try {
        // Update in order_history collection
        await db.collection('order_history').doc(orderId).update(updateData);
    } catch (error) {
        console.log('Could not update order_history, trying user collection...', error);
    }
    
    try {
        // Also update in user's my_orders subcollection
        await db.collection('users').doc(currentUser.uid)
            .collection('my_orders').doc(orderId).update(updateData);
    } catch (error) {
        console.log('Could not update my_orders', error);
    }
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
                <div class="product-price">$${parseFloat(product.price || 0).toFixed(2)}</div>
                ${product.rating ? `
                    <div class="product-rating">
                        ${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}
                        (${product.rating})
                    </div>
                ` : ''}
            </div>
            <button class="add-to-cart" onclick="addToCart('${product.id}', '${product.name.replace(/'/g, "\\'")}', ${product.price || 0}, '${product.imageUrl || ''}')">
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
            console.log("Loaded cart items from Firestore:", cart.length);
        } else {
            // Create empty cart document
            await db.collection('carts').doc(userId).set({
                userId: userId,
                items: [],
                updatedAt: FieldValue.serverTimestamp(),
                totalItems: 0,
                totalAmount: 0,
                status: 'active'
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

async function loadCartAsOrderList(userId) {
    try {
        if (!currentUser) {
            cartAsOrder = null;
            return;
        }
        
        console.log("Loading cart as order list for user:", userId);
        
        // Load from carts collection
        const cartDoc = await db.collection('carts').doc(userId).get();
        
        if (cartDoc.exists) {
            const cartData = cartDoc.data();
            cartAsOrder = {
                id: cartDoc.id,
                ...cartData,
                orderId: `CART-${userId.substring(0, 8)}`,
                status: 'in_cart',
                createdAt: cartData.updatedAt || FieldValue.serverTimestamp()
            };
        } else {
            cartAsOrder = null;
        }
        
        console.log("Loaded cart as order list:", cartAsOrder ? cartAsOrder.items?.length : 0, "items");
        
    } catch (error) {
        console.error('Error loading cart as order list:', error);
        cartAsOrder = null;
    }
}

async function addToCart(productId, productName, productPrice, productImage) {
    try {
        if (!currentUser) {
            // For guest users
            const existingItemIndex = cart.findIndex(item => item.id === productId);
            
            if (existingItemIndex > -1) {
                cart[existingItemIndex].quantity += 1;
            } else {
                cart.push({
                    id: productId,
                    name: productName,
                    price: parseFloat(productPrice),
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
                    price: parseFloat(productPrice),
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
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Error adding item to cart');
    }
}

async function saveCartToFirestore() {
    if (!currentUser) return;
    
    try {
        // Calculate totals
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
        
        console.log("Cart saved to Firestore/carts collection");
        
        // Refresh the cart as order list
        await loadCartAsOrderList(currentUser.uid);
        
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

function renderOrdersList() {
    if (!currentUser) {
        return '<div style="text-align: center; padding: 40px;"><p>Please login to view your cart/orders</p></div>';
    }
    
    let ordersHTML = '';
    
    // Check if we have cart data
    if (!cartAsOrder || !cartAsOrder.items || cartAsOrder.items.length === 0) {
        return `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-shopping-cart" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                <p>Your cart is empty</p>
                <button onclick="closeProfileContent()" style="background-color: #85BB65; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin-top: 20px; cursor: pointer;">
                    Browse Products
                </button>
            </div>
        `;
    }
    
    // Display cart items as order list
    const cartData = cartAsOrder;
    const cartItems = cartData.items || [];
    
    // Format date
    let orderDate = 'Just now';
    if (cartData.updatedAt) {
        if (cartData.updatedAt.seconds) {
            const date = new Date(cartData.updatedAt.seconds * 1000);
            orderDate = date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString();
        } else if (cartData.updatedAt.toDate) {
            const date = cartData.updatedAt.toDate();
            orderDate = date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString();
        }
    }
    
    let itemsHTML = '';
    if (cartItems && cartItems.length > 0) {
        itemsHTML = cartItems.map(item => {
            // Format price properly
            const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
            const itemTotal = price * (item.quantity || 1);
            
            return `
                <div style="display: flex; align-items: center; margin-bottom: 15px; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
                    <div style="width: 60px; height: 60px; margin-right: 15px; flex-shrink: 0;">
                        <img src="${item.image || 'https://via.placeholder.com/60'}" 
                             alt="${item.name}" 
                             style="width: 100%; height: 100%; object-fit: cover; border-radius: 5px;">
                    </div>
                    <div style="flex-grow: 1;">
                        <div style="font-weight: bold; margin-bottom: 5px; font-size: 16px; color: #333;">
                            ${item.name || 'Unnamed Product'}
                        </div>
                        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">
                            Price: $${price.toFixed(2)} each
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <button onclick="updateQuantity('${item.id}', -1)" 
                                    style="background: none; border: 1px solid #ddd; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 14px;">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span style="font-weight: bold; min-width: 30px; text-align: center;">${item.quantity || 1}</span>
                            <button onclick="updateQuantity('${item.id}', 1)" 
                                    style="background: none; border: 1px solid #ddd; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 14px;">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button onclick="removeFromCart('${item.id}')" 
                                    style="background: none; border: 1px solid #ff6b6b; color: #ff6b6b; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 14px; margin-left: auto;">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                        </div>
                    </div>
                    <div style="text-align: right; margin-left: 15px; flex-shrink: 0;">
                        <div style="font-weight: bold; font-size: 16px; color: #85BB65;">
                            $${itemTotal.toFixed(2)}
                        </div>
                        <div style="font-size: 14px; color: #666; margin-top: 5px;">
                            Qty: ${item.quantity || 1}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Calculate total if not in cartData
    const totalItems = cartData.totalItems || cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const totalAmount = cartData.totalAmount || cartItems.reduce((sum, item) => {
        const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
        return sum + (price * (item.quantity || 1));
    }, 0);
    
    ordersHTML = `
        <div class="order-card" style="border: 1px solid #e0e0e0; border-radius: 12px; margin-bottom: 20px; background-color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
            <div style="padding: 20px; border-bottom: 1px solid #e0e0e0; background-color: #f8f9fa;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="font-size: 20px; font-weight: bold; color: #333;">
                        Current Cart
                    </div>
                    <div>
                        <span style="background-color: #85BB65; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px;">
                            IN CART
                        </span>
                    </div>
                </div>
                <div style="font-size: 14px; color: #666;">
                    <i class="fas fa-clock" style="margin-right: 5px;"></i> Last updated: ${orderDate}
                </div>
            </div>
            
            <div style="padding: 20px; max-height: 400px; overflow-y: auto;">
                ${itemsHTML}
            </div>
            
            <div style="padding: 20px; border-top: 2px solid #e0e0e0; background-color: #f8f9fa;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <div style="font-size: 16px; color: #666;">
                        <i class="fas fa-box" style="margin-right: 8px;"></i> Items: ${totalItems}
                    </div>
                    <div style="font-size: 24px; font-weight: bold; color: #333;">
                        Total: $${totalAmount.toFixed(2)}
                    </div>
                </div>
                <button onclick="confirmAndCheckout()" 
                        style="background-color: #85BB65; color: white; border: none; padding: 16px; border-radius: 8px; cursor: pointer; width: 100%; font-weight: bold; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 10px; transition: background-color 0.3s;">
                    <i class="fas fa-shopping-bag"></i> Proceed to Checkout
                </button>
            </div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f0f8ff; border-radius: 8px; border-left: 4px solid #85BB65;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-info-circle" style="color: #85BB65; font-size: 18px;"></i>
                <div>
                    <div style="font-weight: bold; margin-bottom: 5px;">Note:</div>
                    <div style="font-size: 14px; color: #666;">
                        This is your current shopping cart. Items will be saved here until you checkout.
                        Click "Proceed to Checkout" to complete your purchase.
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return ordersHTML;
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
        
        // Refresh order list if it's open
        const profileContent = document.getElementById('profileContent');
        if (profileContent && profileContent.classList.contains('show') && 
            document.querySelector('.content-header h3')?.textContent.includes('Order List')) {
            showProfileSection('orders');
        }
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
    if (cartPreview) {
        cartPreview.classList.toggle('show');
    }
}

// Simple checkout confirmation
async function confirmAndCheckout() {
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    
    // Calculate totals for display
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = 5.99;
    const tax = subtotal * 0.07;
    const total = subtotal + shippingCost + tax;
    
    // Show confirmation dialog
    const confirmed = confirm(
        `Order Summary:\n\n` +
        `Items: ${cart.length}\n` +
        `Subtotal: $${subtotal.toFixed(2)}\n` +
        `Shipping: $${shippingCost.toFixed(2)}\n` +
        `Tax: $${tax.toFixed(2)}\n` +
        `Total: $${total.toFixed(2)}\n\n` +
        `Do you want to place this order?`
    );
    
    if (confirmed) {
        await proceedToCheckout();
    }
}

// Main checkout function
async function proceedToCheckout() {
    if (!currentUser) {
        alert('Please login to checkout');
        window.location.href = 'login.html';
        return;
    }
    
    if (cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    
    try {
        // Show loading
        showNotification('Processing your order...');
        
        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        // Calculate totals
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingCost = 5.99;
        const tax = subtotal * 0.07;
        const total = subtotal + shippingCost + tax;
        
        // Generate order ID
        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const orderDate = new Date();
        
        // Create order data matching your schema
        const orderData = {
            orderId: orderId,
            customerName: userData.displayName || currentUser.displayName || currentUser.email.split('@')[0],
            customerEmail: currentUser.email,
            customerPhone: userData.phone || 'Not provided',
            shippingAddress: userData.address || 'Not provided',
            shippingCity: userData.city || 'Phnom Penh',
            shippingZip: userData.zipCode || '12000',
            shippingCost: shippingCost,
            items: cart.map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                productId: item.id,
                image: item.image || ''
            })),
            subtotal: subtotal,
            tax: tax,
            total: total,
            paymentMethod: 'cash_on_delivery',
            paymentStatus: 'pending',
            status: 'pending', // This will place it in "To Pay" tab
            orderDate: firebase.firestore.Timestamp.fromDate(orderDate),
            createdAt: firebase.firestore.Timestamp.fromDate(orderDate),
            updatedAt: firebase.firestore.Timestamp.fromDate(orderDate),
            userId: currentUser.uid
        };
        
        console.log("Creating order with data:", orderData);
        
        // 1. Save to order_history collection
        await db.collection('order_history').doc(orderId).set(orderData);
        console.log("✓ Order saved to order_history collection:", orderId);
        
        // 2. Also save to user's personal order history subcollection
        await db.collection('users').doc(currentUser.uid)
            .collection('my_orders').doc(orderId).set(orderData);
        console.log("✓ Order saved to user's my_orders");
        
        // 3. Clear the cart
        cart = [];
        
        // 4. Update Firestore cart to empty
        await db.collection('carts').doc(currentUser.uid).set({
            userId: currentUser.uid,
            items: [],
            updatedAt: FieldValue.serverTimestamp(),
            totalItems: 0,
            totalAmount: 0,
            status: 'empty'
        }, { merge: true });
        
        console.log("✓ Cart cleared");
        
        // 5. Update local storage and UI
        saveGuestCart();
        updateCartCount();
        renderCartPreview();
        await loadCartAsOrderList(currentUser.uid);
        
        // 6. Update order status tabs
        await loadOrderStatusTabs();
        
        // 7. Show success message
        showNotification(`Order #${orderId} created successfully! Please complete payment.`);
        
        // 8. If order tabs are open, refresh them
        const profileContent = document.getElementById('profileContent');
        if (profileContent && profileContent.classList.contains('show') && 
            document.querySelector('.content-header h3')?.textContent.includes('Pay')) {
            showProfileSection('topay');
        }
        
        // 9. Close cart preview if open
        const cartPreview = document.getElementById('cartPreview');
        if (cartPreview && cartPreview.classList.contains('show')) {
            cartPreview.classList.remove('show');
        }
        
    } catch (error) {
        console.error('Error during checkout:', error);
        
        if (error.code === 'permission-denied') {
            showNotification('Permission denied. Please check your account settings.');
        } else {
            showNotification('Error processing checkout. Please try again.');
        }
    }
}

// Order history functions
async function loadOrderHistory() {
    if (!currentUser) {
        return '<div style="text-align: center; padding: 40px;"><p>Please login to view order history</p></div>';
    }
    
    try {
        console.log("Loading order history for user:", currentUser.uid);
        
        let snapshot;
        
        // Try to load from order_history collection first
        try {
            snapshot = await db.collection('order_history')
                .where('userId', '==', currentUser.uid)
                .orderBy('orderDate', 'desc')
                .get();
            console.log(`Loaded ${snapshot.size} orders from order_history`);
        } catch (error) {
            console.log('Cannot access order_history, trying user subcollection...', error);
            
            // Fallback to user's my_orders subcollection
            snapshot = await db.collection('users').doc(currentUser.uid)
                .collection('my_orders')
                .orderBy('orderDate', 'desc')
                .get();
            console.log(`Loaded ${snapshot.size} orders from my_orders`);
        }
        
        if (!snapshot || snapshot.empty) {
            return `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-box-open" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                    <h4>No orders yet</h4>
                    <p>Start shopping to see your order history here!</p>
                    <button onclick="closeProfileContent()" style="background-color: #85BB65; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin-top: 20px; cursor: pointer;">
                        Browse Products
                    </button>
                </div>
            `;
        }
        
        let ordersHTML = '';
        
        snapshot.forEach(doc => {
            const order = doc.data();
            const orderId = order.orderId || doc.id;
            const orderDate = order.orderDate?.toDate ? order.orderDate.toDate() : 
                            order.createdAt?.toDate ? order.createdAt.toDate() : 
                            order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : 
                            new Date();
            
            const formattedDate = orderDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Format price properly
            const total = typeof order.total === 'number' ? order.total : parseFloat(order.total) || 0;
            const subtotal = typeof order.subtotal === 'number' ? order.subtotal : parseFloat(order.subtotal) || 0;
            const tax = typeof order.tax === 'number' ? order.tax : parseFloat(order.tax) || 0;
            const shippingCost = typeof order.shippingCost === 'number' ? order.shippingCost : parseFloat(order.shippingCost) || 0;
            
            // Get status badge class
            const statusClass = getStatusClass(order.status);
            const statusText = order.status ? order.status.replace('_', ' ') : 'pending';
            
            // Count total items
            const totalItems = order.items ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
            
            ordersHTML += `
                <div class="order-history-card" style="border: 1px solid #e0e0e0; border-radius: 12px; margin-bottom: 20px; background-color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
                    <div style="padding: 20px; border-bottom: 1px solid #e0e0e0; background-color: #f8f9fa;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <div>
                                <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 5px;">
                                    Order #${orderId}
                                </div>
                                <div style="font-size: 14px; color: #666;">
                                    ${formattedDate}
                                </div>
                            </div>
                            <div>
                                <span style="display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px; ${getStatusStyle(order.status)}">
                                    ${statusText.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div style="padding: 20px;">
                        <div style="margin-bottom: 15px;">
                            <div style="font-weight: bold; color: #333; margin-bottom: 5px;">
                                ${order.customerName || 'Customer'}
                            </div>
                            <div style="color: #666; font-size: 14px; margin-bottom: 3px;">
                                ${order.customerEmail || ''}
                            </div>
                            <div style="color: #666; font-size: 14px;">
                                ${order.customerPhone || ''}
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 15px; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
                            <div style="font-weight: bold; color: #333; margin-bottom: 10px;">
                                Order Items (${totalItems} items)
                            </div>
                            ${order.items && order.items.length > 0 ? order.items.slice(0, 3).map(item => `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                                    <span style="color: #666;">${item.name} × ${item.quantity}</span>
                                    <span style="font-weight: bold; color: #333;">$${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                                </div>
                            `).join('') : ''}
                            ${order.items && order.items.length > 3 ? 
                                `<div style="text-align: center; color: #666; font-size: 14px; margin-top: 10px;">
                                    +${order.items.length - 3} more items
                                </div>` : ''
                            }
                        </div>
                        
                        <div style="padding-top: 15px; border-top: 1px solid #e0e0e0;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                                <span style="color: #666;">Subtotal</span>
                                <span style="color: #333;">$${subtotal.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                                <span style="color: #666;">Shipping</span>
                                <span style="color: #333;">$${shippingCost.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                                <span style="color: #666;">Tax</span>
                                <span style="color: #333;">$${tax.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; padding-top: 10px; border-top: 2px solid #e0e0e0;">
                                <span style="color: #333;">Total</span>
                                <span style="color: #85BB65;">$${total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div style="padding: 20px; border-top: 1px solid #e0e0e0; background-color: #f8f9fa;">
                        <button onclick="viewOrderDetails('${orderId}')" 
                                style="background-color: #85BB65; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%; transition: all 0.3s;">
                            View Order Details
                        </button>
                    </div>
                </div>
            `;
        });
        
        return ordersHTML;
        
    } catch (error) {
        console.error('Error loading order history:', error);
        return `
            <div style="text-align: center; padding: 40px;">
                <p>Error loading order history. Please try again.</p>
            </div>
        `;
    }
}

function getStatusClass(status) {
    switch(status) {
        case 'pending': return 'status-pending';
        case 'processing': return 'status-processing';
        case 'shipped': return 'status-shipped';
        case 'delivered': return 'status-delivered';
        case 'cancelled': return 'status-cancelled';
        default: return 'status-pending';
    }
}

function getStatusStyle(status) {
    switch(status) {
        case 'pending':
            return 'background-color: #fff3cd; color: #856404;';
        case 'processing':
            return 'background-color: #cce5ff; color: #004085;';
        case 'shipped':
            return 'background-color: #d4edda; color: #155724;';
        case 'delivered':
            return 'background-color: #d1ecf1; color: #0c5460;';
        case 'cancelled':
            return 'background-color: #f8d7da; color: #721c24;';
        default:
            return 'background-color: #fff3cd; color: #856404;';
    }
}

async function viewOrderDetails(orderId) {
    try {
        // Try to get order from order_history first
        let orderDoc = await db.collection('order_history').doc(orderId).get();
        
        if (!orderDoc.exists) {
            // Try from user's my_orders subcollection
            orderDoc = await db.collection('users').doc(currentUser.uid)
                .collection('my_orders').doc(orderId).get();
        }
        
        if (!orderDoc.exists) {
            showNotification('Order not found');
            return;
        }
        
        const order = orderDoc.data();
        const orderDate = order.orderDate?.toDate ? order.orderDate.toDate() : 
                        order.createdAt?.toDate ? order.createdAt.toDate() : 
                        order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : 
                        new Date();
        
        const formattedDate = orderDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Create order details modal
        const modalHTML = `
            <div id="orderDetailsModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 2000; padding: 20px;">
                <div style="background: white; border-radius: 12px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);">
                    <div style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; color: #333; font-size: 22px;">Order Details: #${orderId}</h3>
                        <button onclick="closeOrderDetailsModal()" style="background: none; border: none; font-size: 28px; color: #666; cursor: pointer; line-height: 1;">×</button>
                    </div>
                    
                    <div style="padding: 20px;">
                        <div style="margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #eee;">
                            <h4 style="margin: 0 0 15px 0; color: #444; font-size: 16px; font-weight: 600;">Order Information</h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Order Date</div>
                                    <div style="font-size: 16px; color: #333; font-weight: 500;">${formattedDate}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Order Status</div>
                                    <div style="font-size: 16px; color: #333; font-weight: 500; ${getStatusStyle(order.status)} padding: 4px 12px; border-radius: 20px; display: inline-block;">
                                        ${(order.status || '').toUpperCase()}
                                    </div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Payment Method</div>
                                    <div style="font-size: 16px; color: #333; font-weight: 500;">${(order.paymentMethod || '').replace('_', ' ').toUpperCase()}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Payment Status</div>
                                    <div style="font-size: 16px; color: #333; font-weight: 500;">${(order.paymentStatus || '').toUpperCase()}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #eee;">
                            <h4 style="margin: 0 0 15px 0; color: #444; font-size: 16px; font-weight: 600;">Customer Information</h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Name</div>
                                    <div style="font-size: 16px; color: #333; font-weight: 500;">${order.customerName || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Email</div>
                                    <div style="font-size: 16px; color: #333; font-weight: 500;">${order.customerEmail || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Phone</div>
                                    <div style="font-size: 16px; color: #333; font-weight: 500;">${order.customerPhone || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #eee;">
                            <h4 style="margin: 0 0 15px 0; color: #444; font-size: 16px; font-weight: 600;">Shipping Information</h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Address</div>
                                    <div style="font-size: 16px; color: #333; font-weight: 500;">${order.shippingAddress || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">City</div>
                                    <div style="font-size: 16px; color: #333; font-weight: 500;">${order.shippingCity || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Zip Code</div>
                                    <div style="font-size: 16px; color: #333; font-weight: 500;">${order.shippingZip || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #eee;">
                            <h4 style="margin: 0 0 15px 0; color: #444; font-size: 16px; font-weight: 600;">Order Items</h4>
                            <div style="max-height: 300px; overflow-y: auto;">
                                ${order.items ? order.items.map(item => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #f0f0f0; background-color: #f9f9f9; border-radius: 8px; margin-bottom: 10px;">
                                        <div style="flex: 2;">
                                            <div style="font-weight: bold; margin-bottom: 5px; color: #333;">${item.name || 'Unnamed Product'}</div>
                                            <div style="font-size: 14px; color: #666;">$${(item.price || 0).toFixed(2)} each</div>
                                        </div>
                                        <div style="flex: 1; text-align: center; font-weight: 600;">
                                            <span>Quantity: ${item.quantity || 1}</span>
                                        </div>
                                        <div style="flex: 1; text-align: right; font-weight: bold; font-size: 18px; color: #85BB65;">
                                            $${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                                        </div>
                                    </div>
                                `).join('') : '<div style="text-align: center; padding: 20px; color: #666;">No items found</div>'}
                            </div>
                        </div>
                        
                        <div>
                            <h4 style="margin: 0 0 15px 0; color: #444; font-size: 16px; font-weight: 600;">Order Summary</h4>
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px;">
                                    <span style="color: #666;">Subtotal</span>
                                    <span style="color: #333; font-weight: 500;">$${(order.subtotal || 0).toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px;">
                                    <span style="color: #666;">Shipping</span>
                                    <span style="color: #333; font-weight: 500;">$${(order.shippingCost || 0).toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px;">
                                    <span style="color: #666;">Tax</span>
                                    <span style="color: #333; font-weight: 500;">$${(order.tax || 0).toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; padding-top: 10px; border-top: 2px solid #e0e0e0;">
                                    <span style="color: #333;">Total</span>
                                    <span style="color: #85BB65;">$${(order.total || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="padding: 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end;">
                        <button onclick="closeOrderDetailsModal()" style="background: #f5f5f5; color: #666; border: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s;">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
    } catch (error) {
        console.error('Error loading order details:', error);
        showNotification('Error loading order details');
    }
}

function closeOrderDetailsModal() {
    const modal = document.getElementById('orderDetailsModal');
    if (modal) modal.remove();
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
            cartIcon && !cartIcon.contains(e.target)) {
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
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.checked = true;
        }
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
window.confirmAndCheckout = confirmAndCheckout;
window.closeOrderDetailsModal = closeOrderDetailsModal;
window.payOrder = payOrder;
window.cancelOrder = cancelOrder;
window.trackOrder = trackOrder;
window.confirmReceipt = confirmReceipt;
window.reviewOrder = reviewOrder;
window.skipReview = skipReview;
window.submitReview = submitReview;
window.closeReviewModal = closeReviewModal;
window.viewOrderDetails = viewOrderDetails;