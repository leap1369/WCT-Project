

  // ===== GLOBALLY ACCESSIBLE IMAGE FUNCTIONS =====
  window.productImageBase64 = null;
  window.selectedImageFile = null;
  
  // Product Image Modal Functions
  window.showImageModal = function(imageUrl, caption) {
    const modalImage = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalImageCaption');
    const downloadLink = document.getElementById('downloadImageLink');
    
    if (modalImage) {
      modalImage.src = imageUrl;
      modalImage.alt = caption || 'Preview';
    }
    
    if (modalCaption) {
      modalCaption.textContent = caption || 'Image Preview';
    }
    
    if (downloadLink) {
      downloadLink.href = imageUrl;
      downloadLink.download = caption ? caption.replace(/\s+/g, '_').toLowerCase() + '.jpg' : 'document.jpg';
    }
    
    document.getElementById('imagePreviewModal').style.display = 'block';
    document.getElementById('imagePreviewModalOverlay').style.display = 'block';
  };

  window.closeImageModal = function() {
    document.getElementById('imagePreviewModal').style.display = 'none';
    document.getElementById('imagePreviewModalOverlay').style.display = 'none';
  };

  // Merchant Applications Image Modal Functions
  window.showAppImageModal = function(imageUrl, caption) {
    const modalImage = document.getElementById('appModalImage');
    const modalCaption = document.getElementById('appModalImageCaption');
    const downloadLink = document.getElementById('appDownloadImageLink');
    
    if (modalImage) {
      modalImage.src = imageUrl;
      modalImage.alt = caption || 'Preview';
    }
    
    if (modalCaption) {
      modalCaption.textContent = caption || 'Document Preview';
    }
    
    if (downloadLink) {
      downloadLink.href = imageUrl;
      downloadLink.download = caption ? caption.replace(/\s+/g, '_').toLowerCase() + '.jpg' : 'document.jpg';
    }
    
    document.getElementById('appImagePreviewModal').style.display = 'block';
    document.getElementById('appImagePreviewModalOverlay').style.display = 'block';
  };

  window.closeAppImageModal = function() {
    document.getElementById('appImagePreviewModal').style.display = 'none';
    document.getElementById('appImagePreviewModalOverlay').style.display = 'none';
  };

  // Active Merchants Image Modal Functions
  window.showMerchantImageModal = function(imageUrl, caption) {
    const modalImage = document.getElementById('merchantModalImage');
    const modalCaption = document.getElementById('merchantModalImageCaption');
    const downloadLink = document.getElementById('merchantDownloadImageLink');
    
    if (modalImage) {
      modalImage.src = imageUrl;
      modalImage.alt = caption || 'Preview';
    }
    
    if (modalCaption) {
      modalCaption.textContent = caption || 'Document Preview';
    }
    
    if (downloadLink) {
      downloadLink.href = imageUrl;
      downloadLink.download = caption ? caption.replace(/\s+/g, '_').toLowerCase() + '.jpg' : 'document.jpg';
    }
    
    document.getElementById('merchantImagePreviewModal').style.display = 'block';
    document.getElementById('merchantImagePreviewModalOverlay').style.display = 'block';
  };

  window.closeMerchantImageModal = function() {
    document.getElementById('merchantImagePreviewModal').style.display = 'none';
    document.getElementById('merchantImagePreviewModalOverlay').style.display = 'none';
  };

  window.removeProductImage = function() {
  window.productImageBase64 = null;
  window.selectedImageFile = null;
  
  const previewContainer = document.getElementById('imagePreview');
  const uploadArea = document.getElementById('uploadArea');
  const imageInput = document.getElementById('productImageInput');
  const uploadProgress = document.getElementById('uploadProgress');
  const progressFill = document.getElementById('progressFill');
  const previewImage = document.getElementById('previewImage');
  
  if (previewContainer) previewContainer.style.display = 'none';
  if (uploadArea) uploadArea.style.display = 'block';
  if (imageInput) imageInput.value = '';
  if (uploadProgress) uploadProgress.style.display = 'none';
  if (progressFill) progressFill.style.width = '0%';
  if (previewImage) previewImage.src = '#';
  
  console.log("Product image removed (set to null)");
}

  window.setupImageUpload = function() {
    const imageInput = document.getElementById('productImageInput');
    if (!imageInput) return;

    imageInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.match('image.*')) {
        alert('❌ Please select an image file (JPEG, PNG, WebP)');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        alert('❌ Image is too large! Maximum size is 2MB.');
        return;
      }

      window.selectedImageFile = file;
      const reader = new FileReader();
      
      reader.onload = async function(e) {
        // Show progress
        const uploadProgress = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        if (uploadProgress) uploadProgress.style.display = 'block';
        if (progressFill) progressFill.style.width = '10%';

        try {
          const compressedBase64 = await window.compressAndConvertToBase64(file);
          window.productImageBase64 = compressedBase64;

          // Show preview
          const previewImage = document.getElementById('previewImage');
          const previewContainer = document.getElementById('imagePreview');
          const uploadArea = document.getElementById('uploadArea');
          
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
          window.removeProductImage();
        }
      };
      reader.readAsDataURL(file);
    });
  }

  window.compressAndConvertToBase64 = function(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
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
          
          // Extract base64 data
          const base64Data = base64String.split(',')[1];
          
          // Check size (max 500KB for Firestore)
          const sizeInBytes = (base64Data.length * 3) / 4;
          
          if (sizeInBytes > 500 * 1024) {
            // If too large, compress more
            window.compressAndConvertToBase64(file, maxWidth * 0.8, maxHeight * 0.8, quality * 0.8)
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

  // Initialize all image modal events
  document.addEventListener('DOMContentLoaded', function() {
    // Product modal events
    const closeBtn = document.getElementById('closeImageModal');
    const overlay = document.getElementById('imagePreviewModalOverlay');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', closeImageModal);
    }
    
    if (overlay) {
      overlay.addEventListener('click', closeImageModal);
    }
    
    // Applications modal events
    const closeAppBtn = document.getElementById('closeAppImageModal');
    const appOverlay = document.getElementById('appImagePreviewModalOverlay');
    
    if (closeAppBtn) {
      closeAppBtn.addEventListener('click', closeAppImageModal);
    }
    
    if (appOverlay) {
      appOverlay.addEventListener('click', closeAppImageModal);
    }
    
    // Merchants modal events
    const closeMerchantBtn = document.getElementById('closeMerchantImageModal');
    const merchantOverlay = document.getElementById('merchantImagePreviewModalOverlay');
    
    if (closeMerchantBtn) {
      closeMerchantBtn.addEventListener('click', closeMerchantImageModal);
    }
    
    if (merchantOverlay) {
      merchantOverlay.addEventListener('click', closeMerchantImageModal);
    }
    
    // ESC key to close any open modal
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (document.getElementById('imagePreviewModal').style.display === 'block') {
          closeImageModal();
        }
        if (document.getElementById('appImagePreviewModal').style.display === 'block') {
          closeAppImageModal();
        }
        if (document.getElementById('merchantImagePreviewModal').style.display === 'block') {
          closeMerchantImageModal();
        }
      }
    });
    window.addFontAwesome();
    window.setupImageUpload();
  });

  window.addFontAwesome = function() {
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(link);
    }
  }
