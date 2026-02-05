# Component Reference Guide

## Navigation Components

### Header Section
- **Profile Picture** (`#profilePic`): Click to open user profile panel
- **Auth Buttons** (`#authButtons`): Sign In and Register buttons (visible when logged out)
- **Welcome Message**: Shows when user is logged in
- **Merchant Button** (`#become-merchant-btn`): Navigates to merchant registration

### Side Profile Panel
- **Profile**: User details and edit options
- **Order List**: Current shopping cart items
- **Order History**: All past orders
- **Order Tabs**: 
  - To Pay (`#topayBadge`): Orders pending payment
  - To Ship (`#toshipBadge`): Orders being processed
  - To Receive (`#toreceiveBadge`): Shipped orders
  - To Review (`#toreviewBadge`): Delivered orders needing review

### Cart System
- **Cart Icon** (`.cart-icon-container`): Floating button to toggle cart preview
- **Cart Preview** (`#cartPreview`): Modal showing cart items
- **Cart Count**: Badge showing total items in cart
- **Checkout Button**: "Proceed to Checkout" in cart preview

## Product Components

### Product Card
- **Image**: Click navigates to product details
- **Title**: Product name
- **Price**: Product price
- **Category Tag**: Product category
- **Stock Indicator**: Shows availability
- **Add to Cart Button**: Adds product to cart

### Product Filtering
- **Categories** (`#categoriesContainer`): Click to filter products by category
- **Search** (`#searchInput`): Type to search products
- **Voice Search**: Microphone icon for voice search

## Checkout Process

### Payment Method Modal
1. **Shipping Information**: Name, phone, address, city, zip code
2. **Order Summary**: Subtotal, shipping, tax, total
3. **Payment Methods**: 
   - Cash on Delivery
   - Credit/Debit Card
   - PayPal
   - KHQR (with QR code)
4. **Confirmation**: Confirm & Place Order button

## User States

### Guest User
- Can browse products
- Can add to cart (stored in localStorage)
- Must login to checkout
- Limited profile access

### Logged In User
- Cart saved to Firestore
- Order history available
- Profile management
- Can become merchant
- Order status tracking

### Merchant User
- Access to merchant dashboard
- Product management
- Order management
- Sales analytics

## Key JavaScript Functions

### Navigation Functions
- `handleProfileClick()`: Opens side profile
- `handleMerchantClick()`: Navigates to merchant registration
- `showProfileSection(sectionId)`: Shows specific profile section
- `toggleCartPreview()`: Toggles cart modal

### Cart Functions
- `addToCart(productId, name, price, image)`: Adds item to cart
- `updateQuantity(productId, change)`: Updates item quantity
- `removeFromCart(productId)`: Removes item from cart
- `saveCartToFirestore()`: Saves cart to database

### Order Functions
- `confirmAndCheckout()`: Starts checkout process
- `processCheckoutPayment()`: Processes payment and creates order
- `loadOrderStatusTabs()`: Loads order status badges
- `viewOrderDetails(orderId)`: Shows order details modal

### Payment Functions
- `showPaymentMethodModal()`: Shows payment options
- `processPaymentForOrder(orderId)`: Pays for existing order
- `showKHQRCode()`: Displays KHQR for payment