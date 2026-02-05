# Technical Implementation Details

## Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **AI Integration**: Google Gemini API
- **Hosting**: Local server with potential for cloud deployment

## Key JavaScript Files

### homepagejs.js
- **Purpose**: Main application logic for homepage
- **Features**:
  - Firebase initialization and authentication
  - Product loading and display
  - Cart management (guest and logged-in)
  - Order processing and payment
  - User profile management
  - Order status tracking with badges
  - Dark mode toggle

### ai-assistant.js
- **Purpose**: AI assistant for user navigation and help
- **Features**:
  - Google Gemini integration
  - Context-aware responses
  - Action triggering (navigate, highlight, click)
  - JSON response formatting
  - Error handling and fallbacks

### ai-routes.js
- **Purpose**: Express routes for AI queries
- **Endpoints**:
  - POST `/api/ai/query`: Process user queries
  - GET `/api/ai/status`: Check AI service status

## Data Structure

### Firestore Collections
1. **users**: User profiles and preferences
2. **product_list**: Product catalog with images
3. **carts**: User shopping carts
4. **order_history**: All orders placed
5. **merchants**: Merchant information and products

### Local Storage Keys
- `currentUser`: Logged in user data
- `guestCart`: Cart items for guest users
- `darkMode`: Dark mode preference

## API Integration Points

### Firebase
- Authentication state listeners
- Real-time database updates
- File storage for product images

### Google Gemini
- System instruction with context
- JSON response parsing
- Error handling for API failures

## UI/UX Patterns

### Modals & Overlays
- Cart preview modal
- Payment method modal
- Order details modal
- Side profile panel
- Review modal

### Notifications
- Toast notifications for actions
- Cart updates
- Order confirmations
- Error messages

### Loading States
- Product loading skeleton
- Order processing indicators
- Payment processing feedback

## Security Considerations
- API keys in environment variables
- Firebase security rules
- Input validation and sanitization
- Payment data handling
- User authentication flows

## Performance Optimizations
- Lazy loading for images
- Firestore query optimization
- Local storage caching
- Debounced search input
- Efficient DOM updates

## Browser Compatibility
- Chrome, Firefox, Safari, Edge
- Mobile responsive design
- Touch event support
- Offline capability for cart

# JavaScript Functions Documentation

## homepagejs.js

**Functions:**
- `createOrUpdateUserDocument()`
- `updateUIForLoggedInUser()`
- `updateUIForGuest()`
- `loadGuestCart()`
- `saveGuestCart()`
- `handleMerchantClick()`
- `handleProfileClick()`
- `openSideProfile()`
- `closeSideProfile()`
- `logout()`
- `setActiveMenuItem()`
- `showProfileSection()`
- `closeProfileContent()`
- `toggleTheme()`
- `loadOrderStatusTabs()`
- `updateTabBadges()`
- `loadOrdersForTab()`
- `getTabTitle()`
- `getEmptyTabMessage()`
- `getStatusColor()`
- `getStatusTextColor()`
- `getTabStatusText()`
- `getTabActions()`
- `payOrder()`
- `showPaymentMethodModalForOrder()`
- `getOrderById()`
- `cancelOrder()`
- `trackOrder()`
- `confirmReceipt()`
- `reviewOrder()`
- `closeReviewModal()`
- `submitReview()`
- `skipReview()`
- `updateOrderInFirestore()`
- `loadProducts()`
- `renderCategories()`
- `filterByCategory()`
- `renderProducts()`
- `loadUserCart()`
- `loadCartAsOrderList()`
- `addToCart()`
- `saveCartToFirestore()`
- `renderOrdersList()`
- `removeFromCart()`
- `updateQuantity()`
- `updateCartCount()`
- `renderCartPreview()`
- `toggleCartPreview()`
- `confirmAndCheckout()`
- `showPaymentMethodModal()`
- `createPaymentMethodModal()`
- `setupPaymentMethodSelection()`
- `showKHQRCode()`
- `closePaymentMethodModal()`
- `processCheckoutPayment()`
- `openGoogleMapForLocation()`
- `processPaymentForOrder()`
- `processPaymentForOrder()`
- `loadOrderHistory()`
- `getPaymentMethodDisplay()`
- `getPaymentStatusStyle()`
- `getStatusClass()`
- `getStatusStyle()`
- `viewOrderDetails()`
- `closeOrderDetailsModal()`
- `editProfile()`
- `showNotification()`
- `setupEventListeners()`
- `getProductImageSrc()`
- `handleProductImageError()`
- `getCartItemImageSrc()`
- `handleCartImageError()`

## ai-assistant.js

**Functions:**
- `getAIAssistant()`



# JavaScript Functions Documentation

## homepagejs.js

**Functions:**
- `createOrUpdateUserDocument()`
- `updateUIForLoggedInUser()`
- `updateUIForGuest()`
- `loadGuestCart()`
- `saveGuestCart()`
- `handleMerchantClick()`
- `handleProfileClick()`
- `openSideProfile()`
- `closeSideProfile()`
- `logout()`
- `setActiveMenuItem()`
- `showProfileSection()`
- `closeProfileContent()`
- `toggleTheme()`
- `loadOrderStatusTabs()`
- `updateTabBadges()`
- `loadOrdersForTab()`
- `getTabTitle()`
- `getEmptyTabMessage()`
- `getStatusColor()`
- `getStatusTextColor()`
- `getTabStatusText()`
- `getTabActions()`
- `payOrder()`
- `showPaymentMethodModalForOrder()`
- `getOrderById()`
- `cancelOrder()`
- `trackOrder()`
- `confirmReceipt()`
- `reviewOrder()`
- `closeReviewModal()`
- `submitReview()`
- `skipReview()`
- `updateOrderInFirestore()`
- `loadProducts()`
- `renderCategories()`
- `filterByCategory()`
- `renderProducts()`
- `loadUserCart()`
- `loadCartAsOrderList()`
- `addToCart()`
- `saveCartToFirestore()`
- `renderOrdersList()`
- `removeFromCart()`
- `updateQuantity()`
- `updateCartCount()`
- `renderCartPreview()`
- `toggleCartPreview()`
- `confirmAndCheckout()`
- `showPaymentMethodModal()`
- `createPaymentMethodModal()`
- `setupPaymentMethodSelection()`
- `showKHQRCode()`
- `closePaymentMethodModal()`
- `processCheckoutPayment()`
- `openGoogleMapForLocation()`
- `processPaymentForOrder()`
- `processPaymentForOrder()`
- `loadOrderHistory()`
- `getPaymentMethodDisplay()`
- `getPaymentStatusStyle()`
- `getStatusClass()`
- `getStatusStyle()`
- `viewOrderDetails()`
- `closeOrderDetailsModal()`
- `editProfile()`
- `showNotification()`
- `setupEventListeners()`
- `getProductImageSrc()`
- `handleProductImageError()`
- `getCartItemImageSrc()`
- `handleCartImageError()`

## ai-assistant.js

**Functions:**
- `getAIAssistant()`



# JavaScript Functions Documentation

## homepagejs.js

**Functions:**
- `createOrUpdateUserDocument()`
- `updateUIForLoggedInUser()`
- `updateUIForGuest()`
- `loadGuestCart()`
- `saveGuestCart()`
- `handleMerchantClick()`
- `handleProfileClick()`
- `openSideProfile()`
- `closeSideProfile()`
- `logout()`
- `setActiveMenuItem()`
- `showProfileSection()`
- `closeProfileContent()`
- `toggleTheme()`
- `loadOrderStatusTabs()`
- `updateTabBadges()`
- `loadOrdersForTab()`
- `getTabTitle()`
- `getEmptyTabMessage()`
- `getStatusColor()`
- `getStatusTextColor()`
- `getTabStatusText()`
- `getTabActions()`
- `payOrder()`
- `showPaymentMethodModalForOrder()`
- `getOrderById()`
- `cancelOrder()`
- `trackOrder()`
- `confirmReceipt()`
- `reviewOrder()`
- `closeReviewModal()`
- `submitReview()`
- `skipReview()`
- `updateOrderInFirestore()`
- `loadProducts()`
- `renderCategories()`
- `filterByCategory()`
- `renderProducts()`
- `loadUserCart()`
- `loadCartAsOrderList()`
- `addToCart()`
- `saveCartToFirestore()`
- `renderOrdersList()`
- `removeFromCart()`
- `updateQuantity()`
- `updateCartCount()`
- `renderCartPreview()`
- `toggleCartPreview()`
- `confirmAndCheckout()`
- `showPaymentMethodModal()`
- `createPaymentMethodModal()`
- `setupPaymentMethodSelection()`
- `showKHQRCode()`
- `closePaymentMethodModal()`
- `processCheckoutPayment()`
- `openGoogleMapForLocation()`
- `processPaymentForOrder()`
- `processPaymentForOrder()`
- `loadOrderHistory()`
- `getPaymentMethodDisplay()`
- `getPaymentStatusStyle()`
- `getStatusClass()`
- `getStatusStyle()`
- `viewOrderDetails()`
- `closeOrderDetailsModal()`
- `editProfile()`
- `showNotification()`
- `setupEventListeners()`
- `getProductImageSrc()`
- `handleProductImageError()`
- `getCartItemImageSrc()`
- `handleCartImageError()`

## ai-assistant.js

**Functions:**
- `getAIAssistant()`



# JavaScript Functions Documentation

## homepagejs.js

**Functions:**
- `createOrUpdateUserDocument()`
- `updateUIForLoggedInUser()`
- `updateUIForGuest()`
- `loadGuestCart()`
- `saveGuestCart()`
- `handleMerchantClick()`
- `handleProfileClick()`
- `openSideProfile()`
- `closeSideProfile()`
- `logout()`
- `setActiveMenuItem()`
- `showProfileSection()`
- `closeProfileContent()`
- `toggleTheme()`
- `loadOrderStatusTabs()`
- `updateTabBadges()`
- `loadOrdersForTab()`
- `getTabTitle()`
- `getEmptyTabMessage()`
- `getStatusColor()`
- `getStatusTextColor()`
- `getTabStatusText()`
- `getTabActions()`
- `payOrder()`
- `showPaymentMethodModalForOrder()`
- `getOrderById()`
- `cancelOrder()`
- `trackOrder()`
- `confirmReceipt()`
- `reviewOrder()`
- `closeReviewModal()`
- `submitReview()`
- `skipReview()`
- `updateOrderInFirestore()`
- `loadProducts()`
- `renderCategories()`
- `filterByCategory()`
- `renderProducts()`
- `loadUserCart()`
- `loadCartAsOrderList()`
- `addToCart()`
- `saveCartToFirestore()`
- `renderOrdersList()`
- `removeFromCart()`
- `updateQuantity()`
- `updateCartCount()`
- `renderCartPreview()`
- `toggleCartPreview()`
- `confirmAndCheckout()`
- `showPaymentMethodModal()`
- `createPaymentMethodModal()`
- `setupPaymentMethodSelection()`
- `showKHQRCode()`
- `closePaymentMethodModal()`
- `processCheckoutPayment()`
- `openGoogleMapForLocation()`
- `processPaymentForOrder()`
- `processPaymentForOrder()`
- `loadOrderHistory()`
- `getPaymentMethodDisplay()`
- `getPaymentStatusStyle()`
- `getStatusClass()`
- `getStatusStyle()`
- `viewOrderDetails()`
- `closeOrderDetailsModal()`
- `editProfile()`
- `showNotification()`
- `setupEventListeners()`
- `getProductImageSrc()`
- `handleProductImageError()`
- `getCartItemImageSrc()`
- `handleCartImageError()`

## ai-assistant.js

**Functions:**
- `getAIAssistant()`



# JavaScript Functions Documentation

## homepagejs.js

**Functions:**
- `createOrUpdateUserDocument()`
- `updateUIForLoggedInUser()`
- `updateUIForGuest()`
- `loadGuestCart()`
- `saveGuestCart()`
- `handleMerchantClick()`
- `handleProfileClick()`
- `openSideProfile()`
- `closeSideProfile()`
- `logout()`
- `setActiveMenuItem()`
- `showProfileSection()`
- `closeProfileContent()`
- `toggleTheme()`
- `loadOrderStatusTabs()`
- `updateTabBadges()`
- `loadOrdersForTab()`
- `getTabTitle()`
- `getEmptyTabMessage()`
- `getStatusColor()`
- `getStatusTextColor()`
- `getTabStatusText()`
- `getTabActions()`
- `payOrder()`
- `showPaymentMethodModalForOrder()`
- `getOrderById()`
- `cancelOrder()`
- `trackOrder()`
- `confirmReceipt()`
- `reviewOrder()`
- `closeReviewModal()`
- `submitReview()`
- `skipReview()`
- `updateOrderInFirestore()`
- `loadProducts()`
- `renderCategories()`
- `filterByCategory()`
- `renderProducts()`
- `loadUserCart()`
- `loadCartAsOrderList()`
- `addToCart()`
- `saveCartToFirestore()`
- `renderOrdersList()`
- `removeFromCart()`
- `updateQuantity()`
- `updateCartCount()`
- `renderCartPreview()`
- `toggleCartPreview()`
- `confirmAndCheckout()`
- `showPaymentMethodModal()`
- `createPaymentMethodModal()`
- `setupPaymentMethodSelection()`
- `showKHQRCode()`
- `closePaymentMethodModal()`
- `processCheckoutPayment()`
- `openGoogleMapForLocation()`
- `processPaymentForOrder()`
- `processPaymentForOrder()`
- `loadOrderHistory()`
- `getPaymentMethodDisplay()`
- `getPaymentStatusStyle()`
- `getStatusClass()`
- `getStatusStyle()`
- `viewOrderDetails()`
- `closeOrderDetailsModal()`
- `editProfile()`
- `showNotification()`
- `setupEventListeners()`
- `getProductImageSrc()`
- `handleProductImageError()`
- `getCartItemImageSrc()`
- `handleCartImageError()`

## ai-assistant.js

**Functions:**
- `getAIAssistant()`

