  // ==================== GLOBAL VARIABLES ====================
  let currentUser = null;
  let cart = [];
  let currentProduct = null;
  let currentQuantity = 1;
  let selectedImageIndex = 0;
  let selectedPaymentMethod = 'cash_on_delivery';
  let isProcessingOrder = false;

  // ==================== FIREBASE INITIALIZATION ====================
  document.addEventListener('DOMContentLoaded', function() {
      console.log("🚀 Product details page loading...");
      
      // Get Firebase instances from shared config
      const auth = window.firebaseAuth;
      const db = window.firebaseDb;
      
      if (!auth || !db) {
          console.error("❌ Firebase services not loaded from shared config!");
          showError("Firebase services not loaded. Please refresh the page.");
          return;
      }
      
      console.log("✅ Firebase services loaded from shared config");
      
      // Check authentication state
      auth.onAuthStateChanged(async (user) => {
          if (user) {
              console.log("✅ User is signed in:", user.uid);
              currentUser = user;
              updateUIForLoggedInUser(user);
              await loadUserCart(user.uid, db);
          } else {
              console.log("👤 User is signed out");
              currentUser = null;
              updateUIForGuest();
              loadGuestCart();
          }
      });
      
      // Get product ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const productId = urlParams.get('product');
      
      if (!productId) {
          showError("No product ID specified in URL.");
          return;
      }
      
      console.log("🔍 Loading product with ID:", productId);
      
      // Load product details
      loadProductDetails(productId, db);
      
      // Setup event listeners
      setupEventListeners();
  });

  // ==================== PRODUCT LOADING FUNCTIONS ====================
  async function loadProductDetails(productId, db) {
      try {
          const productDoc = await db.collection('product_list').doc(productId).get();
          
          if (!productDoc.exists) {
              showError("Product not found.");
              return;
          }
          
          currentProduct = {
              id: productDoc.id,
              ...productDoc.data()
          };
          
          console.log("✅ Product loaded:", currentProduct);
          
          // Display product details
          displayProductDetails();
          
          // Hide loading, show content
          document.getElementById('loadingState').style.display = 'none';
          document.getElementById('productContent').style.display = 'block';
          
      } catch (error) {
          console.error("❌ Error loading product:", error);
          showError("Error loading product details. Please try again.");
      }
  }

  function displayProductDetails() {
      if (!currentProduct) return;
      
      // Product Title
      document.getElementById('productTitle').textContent = currentProduct.name || 'Unnamed Product';
      
      // Product Status
      const status = currentProduct.status || 'active';
      const statusElement = document.getElementById('productStatus');
      statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      statusElement.className = `product-status status-${status}`;
      
      // Category Badge
      const category = currentProduct.category || 'Uncategorized';
      document.getElementById('productCategoryBadge').textContent = category;
      document.getElementById('productCategory').textContent = category;
      
      // Price
      const price = parseFloat(currentProduct.price) || 0;
      document.getElementById('productPrice').textContent = `$${price.toFixed(2)}`;
      document.getElementById('finalPrice').textContent = `$${price.toFixed(2)}`;
      
      // Sold Count (random for demo)
      const soldCount = Math.floor(Math.random() * 100) + 50;
      document.getElementById('soldCount').textContent = `${soldCount}+ sold`;
      
      // Stock Info
      const stockQty = parseInt(currentProduct.stockQty) || 0;
      const stockElement = document.getElementById('stockInfo');
      const maxQuantityInput = document.getElementById('quantityInput');
      
      if (stockQty > 10) {
          stockElement.className = 'stock-info stock-available';
          stockElement.textContent = `✅ In Stock (${stockQty} available)`;
          maxQuantityInput.max = stockQty;
          document.getElementById('maxQuantityNote').textContent = `Maximum ${stockQty} per order`;
          document.getElementById('addToCartBtn').disabled = false;
          document.getElementById('buyNowBtn').disabled = false;
      } else if (stockQty > 0 && stockQty <= 10) {
          stockElement.className = 'stock-info stock-low';
          stockElement.textContent = `⚠️ Low Stock (Only ${stockQty} left!)`;
          maxQuantityInput.max = stockQty;
          document.getElementById('maxQuantityNote').textContent = `Maximum ${stockQty} per order`;
          document.getElementById('addToCartBtn').disabled = false;
          document.getElementById('buyNowBtn').disabled = false;
      } else {
          stockElement.className = 'stock-info stock-out';
          stockElement.textContent = '❌ Out of Stock';
          maxQuantityInput.max = 0;
          document.getElementById('maxQuantityNote').textContent = 'Currently unavailable';
          document.getElementById('addToCartBtn').disabled = true;
          document.getElementById('buyNowBtn').disabled = true;
          document.getElementById('addToCartBtn').innerHTML = '<i class="fas fa-times"></i> Out of Stock';
      }
      
      // Store Info
      document.getElementById('storeName').textContent = currentProduct.storeName || 'Project Store';
      document.getElementById('storeDescription').textContent = currentProduct.storeDescription || 'Verified Store';
      
      // Product Details
      document.getElementById('productBrand').textContent = currentProduct.brand || 'Not specified';
      document.getElementById('productSKU').textContent = currentProduct.sku || 'Not specified';
      
      // Product Description
      const descriptionElement = document.getElementById('productDescription');
      const description = currentProduct.description || 'No description available.';
      descriptionElement.innerHTML = `<p><strong>Description:</strong> ${description}</p>`;
      
      // Product Specifications
      const specsElement = document.getElementById('productSpecs');
      specsElement.innerHTML = '<strong>Specifications:</strong><ul>' +
          `<li>Category: ${currentProduct.category || 'Not specified'}</li>` +
          `<li>Weight: ${currentProduct.weight || 'Not specified'} kg</li>` +
          `<li>Status: ${currentProduct.status || 'active'}</li>` +
          `<li>Added: ${currentProduct.createdAt ? new Date(currentProduct.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</li>` +
          '</ul>';
      
      // Product Images
      displayProductImages();
  }

  function displayProductImages() {
      const mainImageElement = document.getElementById('mainProductImage');
      const thumbnailsElement = document.getElementById('productThumbnails');
      
      // Clear existing content
      mainImageElement.innerHTML = '';
      thumbnailsElement.innerHTML = '';
      
      // Get image source
      const imageSrc = getProductImageSrc(currentProduct);
      
      // Main Image
      const mainImg = document.createElement('img');
      mainImg.src = imageSrc;
      mainImg.alt = currentProduct.name || 'Product Image';
      mainImg.onerror = function() {
          this.onerror = null;
          this.src = 'https://via.placeholder.com/500x400?text=No+Image+Available';
      };
      mainImageElement.appendChild(mainImg);
      
      // Single thumbnail for now (can be extended for multiple images)
      const thumbnail = document.createElement('div');
      thumbnail.className = 'thumbnail active';
      thumbnail.onclick = () => selectImage(0);
      
      const thumbImg = document.createElement('img');
      thumbImg.src = imageSrc;
      thumbImg.alt = 'Thumbnail';
      thumbImg.onerror = function() {
          this.onerror = null;
          this.src = 'https://via.placeholder.com/80?text=Image';
      };
      
      thumbnail.appendChild(thumbImg);
      thumbnailsElement.appendChild(thumbnail);
      
      // If there are additional images in the product data, we could add them here
      // For example: if (currentProduct.additionalImages) { ... }
  }

  function getProductImageSrc(product) {
      // Check for base64 image (from merchant upload)
      if (product.imageBase64) {
          // If it's already a data URL, use it directly
          if (product.imageBase64.startsWith('data:image/')) {
              return product.imageBase64;
          }
          // Otherwise, assume it's a base64 string and format it
          return `data:image/jpeg;base64,${product.imageBase64}`;
      }
      // Check for imageUrl field (Firestore storage URL)
      if (product.imageUrl) {
          return product.imageUrl;
      }
      // Check for image field (alternative naming)
      if (product.image) {
          return product.image;
      }
      // Default placeholder
      return 'https://via.placeholder.com/500x400?text=No+Image+Available';
  }

  function selectImage(index) {
      selectedImageIndex = index;
      
      // Update thumbnail active state
      document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
          thumb.classList.toggle('active', i === index);
      });
      
      // Update main image (for multiple images)
      // For now, we only have one image
  }

  // ==================== CHECKOUT FUNCTIONS ====================
  function confirmAndCheckout() {
      console.log("🛒 confirmAndCheckout called");
      
      if (cart.length === 0) {
          showNotification('Your cart is empty', 'error');
          return;
      }
      
      if (!currentUser) {
          showNotification('Please login to checkout', 'warning');
          setTimeout(() => {
              window.location.href = 'login.html';
          }, 1000);
          return;
      }
      
      // Show payment method modal
      showPaymentMethodModal();
  }

  function showPaymentMethodModal() {
    console.log("💳 Showing payment method modal");
    
    // Calculate order summary
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = 5.99;
    const tax = subtotal * 0.07;
    const total = subtotal + shippingCost + tax;
    
    // Get current user data for pre-filling
    const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // Update order summary and add shipping form
    const orderSummaryHTML = `
        <!-- Shipping Information Form -->
        <div class="shipping-form-section" style="margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #eee;">
            <h4 style="margin: 0 0 15px 0; color: #444; font-size: 16px; font-weight: 600;">
                <i class="fas fa-map-marker-alt" style="margin-right: 8px; color: #85BB65;"></i> Shipping Information
            </h4>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <!-- Full Name -->
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 14px; margin-bottom: 8px; color: #555; font-weight: 500;">
                        Full Name <span style="color: #ff6b6b;">*</span>
                    </label>
                    <input type="text" id="shippingName" placeholder="Enter your full name" 
                           style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;"
                           value="${userData.displayName || ''}">
                </div>
                
                <!-- Phone Number -->
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 14px; margin-bottom: 8px; color: #555; font-weight: 500;">
                        Phone Number <span style="color: #ff6b6b;">*</span>
                    </label>
                    <input type="tel" id="shippingPhone" placeholder="Enter your phone number (e.g., 012 345 678)" 
                           style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;"
                           value="${userData.phone || ''}">
                    <div style="font-size: 12px; color: #888; margin-top: 5px;">
                        Format: 012 345 678 or +855 12 345 678
                    </div>
                </div>
                
                <!-- Address -->
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 14px; margin-bottom: 8px; color: #555; font-weight: 500;">
                        Delivery Address <span style="color: #ff6b6b;">*</span>
                    </label>
                    <textarea id="shippingAddress" placeholder="Enter your full address (Street, House number, District)" 
                              rows="3" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; resize: vertical;">${userData.address || ''}</textarea>
                </div>
                
                <!-- City -->
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 14px; margin-bottom: 8px; color: #555; font-weight: 500;">
                        City <span style="color: #ff6b6b;">*</span>
                    </label>
                    <select id="shippingCity" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                        <option value="Phnom Penh" ${(userData.city === 'Phnom Penh') ? 'selected' : ''}>Phnom Penh</option>
                        <option value="Siem Reap" ${(userData.city === 'Siem Reap') ? 'selected' : ''}>Siem Reap</option>
                        <option value="Sihanoukville" ${(userData.city === 'Sihanoukville') ? 'selected' : ''}>Sihanoukville</option>
                        <option value="Battambang" ${(userData.city === 'Battambang') ? 'selected' : ''}>Battambang</option>
                        <option value="Kampong Cham" ${(userData.city === 'Kampong Cham') ? 'selected' : ''}>Kampong Cham</option>
                        <option value="Kampong Thom" ${(userData.city === 'Kampong Thom') ? 'selected' : ''}>Kampong Thom</option>
                        <option value="Kampot" ${(userData.city === 'Kampot') ? 'selected' : ''}>Kampot</option>
                        <option value="Kep" ${(userData.city === 'Kep') ? 'selected' : ''}>Kep</option>
                        <option value="Other" ${(!userData.city) ? 'selected' : ''}>Other City/Province</option>
                    </select>
                </div>
                
                <!-- Zip Code -->
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 14px; margin-bottom: 8px; color: #555; font-weight: 500;">
                        Zip/Postal Code
                    </label>
                    <input type="text" id="shippingZip" placeholder="Zip/Postal Code" 
                           style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;"
                           value="${userData.zipCode || ''}">
                </div>
                
                <!-- Location Map Button -->
                <div style="margin-top: 15px; padding: 12px; background-color: #fff8e1; border-radius: 6px; border-left: 4px solid #ffb300;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-map-marked-alt" style="color: #ff9800; font-size: 16px;"></i>
                        <div style="font-size: 13px; color: #666;">
                            <strong>Need precise location?</strong> 
                            <button type="button" onclick="openGoogleMapForLocation()" 
                                    style="background: none; border: none; color: #85BB65; font-weight: bold; cursor: pointer; margin-left: 5px; text-decoration: underline;">
                                Click here to mark location on Google Maps
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Special Instructions -->
                <div style="margin-top: 15px;">
                    <label style="display: block; font-size: 14px; margin-bottom: 8px; color: #555;">
                        <i class="fas fa-sticky-note"></i> Special Instructions (Optional)
                    </label>
                    <textarea id="shippingNotes" placeholder="Any special instructions for delivery? (e.g., call before arrival, leave at door, etc.)" 
                              rows="2" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; resize: vertical;"></textarea>
                </div>
            </div>
        </div>
        
        <!-- Order Summary -->
        <h4 style="margin: 0 0 15px 0; color: #444;">Order Summary</h4>
        <div class="order-summary-item">
            <span>Items (${cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
            <span>$${subtotal.toFixed(2)}</span>
        </div>
        <div class="order-summary-item">
            <span>Shipping</span>
            <span>$${shippingCost.toFixed(2)}</span>
        </div>
        <div class="order-summary-item">
            <span>Tax</span>
            <span>$${tax.toFixed(2)}</span>
        </div>
        <div class="order-summary-total">
            <span>Total</span>
            <span>$${total.toFixed(2)}</span>
        </div>
    `;
    
    document.getElementById('orderSummaryContainer').innerHTML = orderSummaryHTML;
    
    // Setup payment methods
    setupPaymentMethods();
    
    // Show modal
    document.getElementById('paymentMethodModal').classList.add('show');
}

  function setupPaymentMethods() {
      const paymentMethodsHTML = `
          <div class="payment-method-option ${selectedPaymentMethod === 'cash_on_delivery' ? 'selected' : ''}" 
               data-method="cash_on_delivery"
               onclick="selectPaymentMethod('cash_on_delivery')">
              <div class="payment-method-icon">💵</div>
              <div class="payment-method-name">Cash on Delivery</div>
              <div class="payment-method-desc">Pay when you receive</div>
          </div>
          
          <div class="payment-method-option ${selectedPaymentMethod === 'card' ? 'selected' : ''}" 
               data-method="card"
               onclick="selectPaymentMethod('card')">
              <div class="payment-method-icon">💳</div>
              <div class="payment-method-name">Credit/Debit Card</div>
              <div class="payment-method-desc">Visa, Mastercard</div>
          </div>
          
          <div class="payment-method-option ${selectedPaymentMethod === 'paypal' ? 'selected' : ''}" 
               data-method="paypal"
               onclick="selectPaymentMethod('paypal')">
              <div class="payment-method-icon">🔵</div>
              <div class="payment-method-name">PayPal</div>
              <div class="payment-method-desc">Secure online payment</div>
          </div>
          
          <div class="payment-method-option ${selectedPaymentMethod === 'khqr' ? 'selected' : ''}" 
               data-method="khqr"
               onclick="selectPaymentMethod('khqr')">
              <div class="payment-method-icon">
                  <img src="asset/KHQR.png" alt="KHQR" style="width: 24px; height: 24px; object-fit: contain;">
              </div>
              <div class="payment-method-name">KHQR</div>
              <div class="payment-method-desc">Scan to Pay</div>
          </div>
      `;
      
      document.getElementById('paymentMethods').innerHTML = paymentMethodsHTML;
      
      // Hide all payment detail sections initially
      document.getElementById('cardDetails').style.display = 'none';
      document.getElementById('khqrDetails').style.display = 'none';
      
      // Show appropriate section for selected method
      if (selectedPaymentMethod === 'card') {
          document.getElementById('cardDetails').style.display = 'block';
      } else if (selectedPaymentMethod === 'khqr') {
          document.getElementById('khqrDetails').style.display = 'block';
          document.getElementById('qrCodeContainer').style.display = 'none';
          document.getElementById('showQrBtn').style.display = 'inline-flex';
      }
  }

  function selectPaymentMethod(method) {
      selectedPaymentMethod = method;
      
      // Update UI
      document.querySelectorAll('.payment-method-option').forEach(option => {
          option.classList.remove('selected');
      });
      document.querySelector(`[data-method="${method}"]`).classList.add('selected');
      
      // Show/hide payment details
      document.getElementById('cardDetails').style.display = 'none';
      document.getElementById('khqrDetails').style.display = 'none';
      
      if (method === 'card') {
          document.getElementById('cardDetails').style.display = 'block';
      } else if (method === 'khqr') {
          document.getElementById('khqrDetails').style.display = 'block';
          document.getElementById('qrCodeContainer').style.display = 'none';
          document.getElementById('showQrBtn').style.display = 'inline-flex';
      }
  }

  function showKHQRCode() {
      const qrCodeContainer = document.getElementById('qrCodeContainer');
      const showQrBtn = document.getElementById('showQrBtn');
      
      if (qrCodeContainer && showQrBtn) {
          qrCodeContainer.style.display = 'block';
          showQrBtn.style.display = 'none';
          
          // Generate transaction info
          const total = document.querySelector('.order-summary-total span:last-child').textContent;
          const transactionRef = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
          
          const transactionInfo = `
              <div style="font-weight: bold; color: #333;">Transaction Ref: ${transactionRef}</div>
              <div>Amount: ${total}</div>
              <div style="font-size: 11px; color: #888; margin-top: 5px;">Valid for 30 minutes</div>
          `;
          
          document.getElementById('transactionInfo').innerHTML = transactionInfo;
          
          showNotification('KHQR code displayed. Please scan with your banking app.', 'success');
      }
  }

  function closePaymentMethodModal() {
      document.getElementById('paymentMethodModal').classList.remove('show');
  }

  async function processCheckoutPayment() {
    if (isProcessingOrder) return;
    
    if (cart.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }
    
    if (!currentUser) {
        showNotification('Please login to checkout', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    // Validate shipping information
    const shippingName = document.getElementById('shippingName')?.value.trim();
    const shippingPhone = document.getElementById('shippingPhone')?.value.trim();
    const shippingAddress = document.getElementById('shippingAddress')?.value.trim();
    const shippingCity = document.getElementById('shippingCity')?.value;
    const shippingZip = document.getElementById('shippingZip')?.value.trim();
    const shippingNotes = document.getElementById('shippingNotes')?.value.trim();
    
    if (!shippingName || !shippingPhone || !shippingAddress || !shippingCity) {
        showNotification('Please fill in all required shipping information', 'error');
        return;
    }
    
    // Validate phone number format
    const phoneRegex = /^(\+?855|0)[1-9][0-9]{7,8}$/;
    const cleanPhone = shippingPhone.replace(/\s+/g, '');
    if (!phoneRegex.test(cleanPhone)) {
        showNotification('Please enter a valid Cambodian phone number (e.g., 012 345 678 or +855 12 345 678)', 'error');
        return;
    }
    
    // Validate KHQR payment proof
    if (selectedPaymentMethod === 'khqr') {
        const paymentProofInput = document.getElementById('khqrPaymentProof');
        if (!paymentProofInput.files.length) {
            showNotification('Please upload proof of payment for KHQR', 'error');
            return;
        }
    }
    
    // Start processing
    isProcessingOrder = true;
    showLoadingOverlay('Processing your order...');
    
    try {
        const auth = window.firebaseAuth;
        const db = window.firebaseDb;
        const FieldValue = firebase.firestore.FieldValue;
        
        // Get user data
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
        
        // Determine payment status
        let paymentStatus = 'pending';
        if (selectedPaymentMethod === 'cash_on_delivery') {
            paymentStatus = 'pending';
        } else if (selectedPaymentMethod === 'card' || selectedPaymentMethod === 'paypal') {
            paymentStatus = 'paid';
        } else if (selectedPaymentMethod === 'khqr') {
            paymentStatus = 'pending';
        }
        
        // Determine order status
        let orderStatus = 'pending';
        if (paymentStatus === 'paid') {
            orderStatus = 'processing';
        }
        
        // Create order data
        const orderData = {
            orderId: orderId,
            customerName: shippingName,
            customerEmail: currentUser.email,
            customerPhone: shippingPhone,
            shippingAddress: shippingAddress,
            shippingCity: shippingCity,
            shippingZip: shippingZip || '',
            shippingNotes: shippingNotes || '',
            shippingCost: shippingCost,
            items: cart.map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                productId: item.id,
                image: item.image || '',
                merchantId: getProductMerchantId(item.id)
            })),
            subtotal: subtotal,
            tax: tax,
            total: total,
            paymentMethod: selectedPaymentMethod,
            paymentStatus: paymentStatus,
            status: orderStatus,
            orderDate: firebase.firestore.Timestamp.fromDate(orderDate),
            createdAt: firebase.firestore.Timestamp.fromDate(orderDate),
            updatedAt: firebase.firestore.Timestamp.fromDate(orderDate),
            userId: currentUser.uid
        };
        
        // Add KHQR payment proof info if applicable
        if (selectedPaymentMethod === 'khqr') {
            const paymentProofInput = document.getElementById('khqrPaymentProof');
            if (paymentProofInput && paymentProofInput.files.length) {
                orderData.khqrPaymentProof = paymentProofInput.files[0].name;
                orderData.khqrPaymentDate = new Date();
            }
        }
        
        console.log("Creating order:", orderData);
        
        // 1. Save to order_history collection
        await db.collection('order_history').doc(orderId).set(orderData);
        console.log("✓ Order saved to order_history");
        
        // 2. Save to user's personal order history
        await db.collection('users').doc(currentUser.uid)
            .collection('my_orders').doc(orderId).set(orderData);
        console.log("✓ Order saved to user's my_orders");
        
        // 3. Update user's profile with shipping info
        await db.collection('users').doc(currentUser.uid).update({
            phone: shippingPhone,
            address: shippingAddress,
            city: shippingCity,
            zipCode: shippingZip || userData.zipCode || '',
            updatedAt: FieldValue.serverTimestamp()
        });
        
        // 4. Clear the cart
        cart = [];
        
        // 5. Update Firestore cart to empty
        await db.collection('carts').doc(currentUser.uid).set({
            userId: currentUser.uid,
            items: [],
            updatedAt: FieldValue.serverTimestamp(),
            totalItems: 0,
            totalAmount: 0,
            status: 'empty'
        }, { merge: true });
        
        // 6. Update local cart
        saveGuestCart();
        updateCartCount();
        renderCartPreview();
        
        // 7. Close modals
        closePaymentMethodModal();
        toggleCartPreview();
        
        // 8. Show success message
        let successMessage = `✅ Order #${orderId} created successfully!`;
        if (selectedPaymentMethod === 'cash_on_delivery') {
            successMessage += ' Please prepare cash for delivery.';
        } else if (selectedPaymentMethod === 'khqr') {
            successMessage += ' KHQR payment submitted. We will verify your payment shortly.';
        } else if (selectedPaymentMethod === 'card' || selectedPaymentMethod === 'paypal') {
            successMessage += ' Payment processed successfully!';
        }
        
        showNotification(successMessage, 'success');
        
        // 9. Hide loading overlay
        hideLoadingOverlay();
        
    } catch (error) {
        console.error("❌ Error during checkout:", error);
        showNotification(`Error processing checkout: ${error.message}`, 'error');
        hideLoadingOverlay();
    } finally {
        isProcessingOrder = false;
    }
}

// Open Google Maps for location selection
function openGoogleMapForLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                window.open(googleMapsUrl, '_blank');
                
                // Update address field with coordinates
                const addressField = document.getElementById('shippingAddress');
                if (addressField) {
                    const currentAddress = addressField.value;
                    addressField.value = currentAddress + ` (Location: ${lat.toFixed(6)}, ${lng.toFixed(6)})`;
                    showNotification('Google Maps opened with your current location. Please copy the exact address from Maps.', 'success');
                }
            },
            (error) => {
                console.error('Error getting location:', error);
                // Fallback to general Google Maps
                window.open('https://www.google.com/maps', '_blank');
                showNotification('Google Maps opened. Please find and copy your exact address.', 'info');
            }
        );
    } else {
        // Fallback if geolocation is not supported
        window.open('https://www.google.com/maps', '_blank');
        showNotification('Google Maps opened. Please find and copy your exact address.', 'info');
    }
}

  function getProductMerchantId(productId) {
      // This function would need to fetch the product to get its merchantId
      // For now, return a placeholder or try to get from currentProduct
      if (currentProduct && currentProduct.id === productId) {
          return currentProduct.merchantId || 'unknown';
      }
      return 'unknown';
  }

  // ==================== CART FUNCTIONS ====================
  async function loadUserCart(userId, db) {
      try {
          console.log("🛒 Loading cart for user:", userId);
          
          const cartDoc = await db.collection('carts').doc(userId).get();
          
          if (cartDoc.exists) {
              cart = cartDoc.data().items || [];
              console.log("✅ Loaded cart items from Firestore:", cart.length);
          } else {
              // Create empty cart document
              await db.collection('carts').doc(userId).set({
                  userId: userId,
                  items: [],
                  updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                  totalItems: 0,
                  totalAmount: 0,
                  status: 'active'
              });
              cart = [];
          }
          
          updateCartCount();
          renderCartPreview();
          
      } catch (error) {
          console.error('❌ Error loading cart:', error);
          cart = [];
      }
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
          console.error('❌ Error loading guest cart:', error);
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

  async function saveCartToFirestore(db) {
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
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              totalItems: totalItems,
              totalAmount: totalAmount,
              status: 'active'
          }, { merge: true });
          
          console.log("✅ Cart saved to Firestore");
          
      } catch (error) {
          console.error('❌ Error saving cart:', error);
      }
  }

  async function addToCart() {
      if (!currentProduct) {
          showNotification('Product not loaded', 'error');
          return;
      }
      
      const quantity = parseInt(document.getElementById('quantityInput').value) || 1;
      
      if (quantity < 1) {
          showNotification('Quantity must be at least 1', 'error');
          return;
      }
      
      const stockQty = parseInt(currentProduct.stockQty) || 0;
      if (stockQty <= 0) {
          showNotification('This product is out of stock', 'error');
          return;
      }
      
      if (quantity > stockQty) {
          showNotification(`Only ${stockQty} items available in stock`, 'error');
          document.getElementById('quantityInput').value = stockQty;
          return;
      }
      
      try {
          const db = window.firebaseDb;
          
          const existingItemIndex = cart.findIndex(item => item.id === currentProduct.id);
          
          if (existingItemIndex > -1) {
              const newQuantity = cart[existingItemIndex].quantity + quantity;
              
              if (newQuantity > stockQty) {
                  showNotification(`Cannot add more than ${stockQty} items in total`, 'error');
                  return;
              }
              
              cart[existingItemIndex].quantity = newQuantity;
          } else {
              const imageSrc = getProductImageSrc(currentProduct);
              
              cart.push({
                  id: currentProduct.id,
                  name: currentProduct.name,
                  price: parseFloat(currentProduct.price),
                  image: imageSrc,
                  quantity: quantity,
                  merchantId: currentProduct.merchantId
              });
          }
          
          if (currentUser) {
              await saveCartToFirestore(db);
          } else {
              saveGuestCart();
          }
          
          updateCartCount();
          renderCartPreview();
          
          showNotification(`Added ${quantity} ${currentProduct.name} to cart`, 'success');
          
          document.getElementById('cartPreview').classList.add('show');
          
      } catch (error) {
          console.error('❌ Error adding to cart:', error);
          showNotification('Error adding item to cart', 'error');
      }
  }

  async function buyNow() {
      // Add to cart first
      await addToCart();
      
      // Then proceed to checkout
      if (cart.length > 0) {
          confirmAndCheckout();
      }
  }

  function updateCartCount() {
      const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
      document.querySelector('.cart-count').textContent = totalItems;
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
                      <img src="${item.image || 'https://via.placeholder.com/60'}" 
                           alt="${item.name}" 
                           onerror="this.onerror=null; this.src='https://via.placeholder.com/60'">
                  </div>
                  <div class="cart-item-details">
                      <div class="cart-item-title">${item.name}</div>
                      <div class="cart-item-price">$${item.price.toFixed(2)} × ${item.quantity}</div>
                      <div class="cart-item-actions">
                          <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', -1)">-</button>
                          <span>${item.quantity}</span>
                          <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', 1)">+</button>
                          <button class="remove-item" onclick="removeFromCart('${item.id}')">Remove</button>
                      </div>
                  </div>
              </div>
          `;
      });
      
      container.innerHTML = itemsHTML;
      if (totalElement) totalElement.textContent = `$${total.toFixed(2)}`;
  }

  async function updateCartQuantity(productId, change) {
      const itemIndex = cart.findIndex(item => item.id === productId);
      
      if (itemIndex > -1) {
          cart[itemIndex].quantity += change;
          
          if (cart[itemIndex].quantity <= 0) {
              cart.splice(itemIndex, 1);
          }
          
          const db = window.firebaseDb;
          if (currentUser) {
              await saveCartToFirestore(db);
          } else {
              saveGuestCart();
          }
          
          updateCartCount();
          renderCartPreview();
      }
  }

  async function removeFromCart(productId) {
      cart = cart.filter(item => item.id !== productId);
      
      const db = window.firebaseDb;
      if (currentUser) {
          await saveCartToFirestore(db);
      } else {
          saveGuestCart();
      }
      
      updateCartCount();
      renderCartPreview();
  }

  function proceedToCheckout() {
      confirmAndCheckout();
  }

  // ==================== UI HELPER FUNCTIONS ====================
  function showLoadingOverlay(message = 'Processing...') {
      document.getElementById('loadingText').textContent = message;
      document.getElementById('loadingOverlay').classList.add('show');
  }

  function hideLoadingOverlay() {
      document.getElementById('loadingOverlay').classList.remove('show');
  }

  function showNotification(message, type = 'info') {
      const notification = document.getElementById('notification');
      
      let backgroundColor = '#85BB65';
      if (type === 'error') backgroundColor = '#dc3545';
      if (type === 'warning') backgroundColor = '#ffc107';
      
      notification.style.backgroundColor = backgroundColor;
      notification.textContent = message;
      notification.style.display = 'block';
      
      setTimeout(() => {
          notification.style.display = 'none';
      }, 3000);
  }

  // ==================== UI FUNCTIONS ====================
  function updateUIForLoggedInUser(user) {
      const authButtons = document.getElementById('authButtons');
      const profilePic = document.getElementById('profilePic');
      
      // Hide auth buttons
      authButtons.style.display = 'none';
      
      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const displayName = userData.displayName || user.email.split('@')[0];
      
      // Update profile picture
      if (userData.profilePicture) {
          profilePic.innerHTML = `<img src="${userData.profilePicture}" alt="Profile">`;
      } else {
          const initials = displayName.charAt(0).toUpperCase();
          profilePic.innerHTML = `<span style="font-size: 1.2em;">${initials}</span>`;
      }
  }

  function updateUIForGuest() {
      const authButtons = document.getElementById('authButtons');
      authButtons.style.display = 'flex';
      
      // Reset profile picture
      const profilePic = document.getElementById('profilePic');
      profilePic.innerHTML = `<i class="fas fa-user" style="font-size: 1.5em;"></i>`;
  }

  function handleProfileClick() {
      if (!currentUser) {
          window.location.href = 'login.html';
          return;
      }
      // Open profile menu (similar to homepage)
      // For now, redirect to homepage
      window.location.href = 'homepage.html';
  }

  function handleMerchantClick() {
      if (!currentUser) {
          showNotification('Please login to become a merchant', 'warning');
          setTimeout(() => {
              window.location.href = 'login.html';
          }, 1000);
      } else {
          window.location.href = 'merchant.html';
      }
  }

  function toggleCartPreview() {
      const cartPreview = document.getElementById('cartPreview');
      if (cartPreview) {
          cartPreview.classList.toggle('show');
      }
  }

  function showError(message) {
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('errorState').style.display = 'block';
      
      // Update error message if needed
      const errorText = document.querySelector('#errorState p');
      if (errorText) {
          errorText.textContent = message;
      }
  }

  // ==================== EVENT LISTENERS ====================
  function setupEventListeners() {
      // Quantity controls
      document.getElementById('decreaseQuantity').addEventListener('click', function() {
          const input = document.getElementById('quantityInput');
          let value = parseInt(input.value) || 1;
          if (value > 1) {
              input.value = value - 1;
              updateTotalPrice();
          }
      });
      
      document.getElementById('increaseQuantity').addEventListener('click', function() {
          const input = document.getElementById('quantityInput');
          let value = parseInt(input.value) || 1;
          const max = parseInt(input.max) || 999;
          if (value < max) {
              input.value = value + 1;
              updateTotalPrice();
          } else {
              showNotification(`Maximum ${max} items allowed`, 'warning');
          }
      });
      
      document.getElementById('quantityInput').addEventListener('change', function() {
          let value = parseInt(this.value) || 1;
          const max = parseInt(this.max) || 999;
          const min = parseInt(this.min) || 1;
          
          if (value < min) value = min;
          if (value > max) value = max;
          
          this.value = value;
          updateTotalPrice();
      });
      
      // Add to Cart button
      document.getElementById('addToCartBtn').addEventListener('click', addToCart);
      
      // Buy Now button
      document.getElementById('buyNowBtn').addEventListener('click', buyNow);
      
      // Follow button
      document.querySelector('.follow-btn').addEventListener('click', function() {
          const storeName = document.getElementById('storeName').textContent;
          showNotification(`Following ${storeName}`, 'success');
          this.textContent = 'Following';
          this.disabled = true;
          this.style.backgroundColor = '#6c757d';
      });
      
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
  }

  function updateTotalPrice() {
      if (!currentProduct) return;
      
      const quantity = parseInt(document.getElementById('quantityInput').value) || 1;
      const price = parseFloat(currentProduct.price) || 0;
      const total = price * quantity;
      
      document.getElementById('finalPrice').textContent = `$${total.toFixed(2)}`;
  }

  // ==================== GLOBAL EXPORTS ====================
  window.handleProfileClick = handleProfileClick;
  window.handleMerchantClick = handleMerchantClick;
  window.toggleCartPreview = toggleCartPreview;
  window.updateCartQuantity = updateCartQuantity;
  window.removeFromCart = removeFromCart;
  window.proceedToCheckout = proceedToCheckout;
  window.addToCart = addToCart;
  window.buyNow = buyNow;
  window.confirmAndCheckout = confirmAndCheckout;
  window.showPaymentMethodModal = showPaymentMethodModal;
  window.selectPaymentMethod = selectPaymentMethod;
  window.showKHQRCode = showKHQRCode;
  window.closePaymentMethodModal = closePaymentMethodModal;
  window.processCheckoutPayment = processCheckoutPayment;
  window.openGoogleMapForLocation = openGoogleMapForLocation;
