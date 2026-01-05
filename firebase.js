// For Firebase JS SDK v10.7.1
const firebaseConfig = {
    apiKey: "AIzaSyBKswcE3xGh4feqGZytevh6N-IyrJoJ_7g",
    authDomain: "jeahluy.firebaseapp.com",
    projectId: "jeahluy",
    storageBucket: "jeahluy.firebasestorage.app",
    messagingSenderId: "308746007810",
    appId: "1:308746007810:web:c17396303b14d61c3b3e1b",
    measurementId: "G-3RLD0EB1FT"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth(app);
const db = firebase.firestore(app);

// After: const db = firebase.firestore(app);
try {
  db.settings({
    experimentalForceLongPolling: true, // prefer long‑polling over WebChannel Listen
    useFetchStreams: false              // avoid fetch streams that some blockers flag
  });
} catch (e) {
  console.warn('Firestore settings not applied:', e);
}


// --- Anti-blocker settings for Firestore (compat API) ---
try {
  db.settings({
    experimentalForceLongPolling: true, // prefer long-polling over WebChannel
    useFetchStreams: false              // avoid fetch streams some blockers flag
  });
  // firebase.firestore.setLogLevel('error'); // optional: quiet logs
} catch (e) {
  console.warn('Firestore settings not applied:', e);
}

const storage = firebase.storage(app);

// Export for use
window.auth = auth;
window.db = db;
window.storage = storage;

// Merchant Application Functions
window.saveMerchantApplication = async function(applicationData) {
    try {
        // Add timestamp and default status
        applicationData.status = "pending";
        applicationData.appliedDate = firebase.firestore.FieldValue.serverTimestamp();
        applicationData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Save to Firestore
        const docRef = await db.collection("merchant_applications").add(applicationData);
        console.log("Application saved with ID: ", docRef.id);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error saving application: ", error);
        return { success: false, error: error.message };
    }
};

window.getMerchantApplications = async function(status = null) {
    try {
        let query = db.collection("merchant_applications");
        
        if (status) {
            query = query.where("status", "==", status);
        }
        
        const querySnapshot = await query.orderBy("appliedDate", "desc").get();
        const applications = [];
        
        querySnapshot.forEach((doc) => {
            applications.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return { success: true, data: applications };
    } catch (error) {
        console.error("Error getting applications: ", error);
        return { success: false, error: error.message };
    }
};

window.updateMerchantApplication = async function(applicationId, updateData) {
    try {
        updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        await db.collection("merchant_applications").doc(applicationId).update(updateData);
        
        // If approved, create merchant account
        if (updateData.status === "approved") {
            const appDoc = await db.collection("merchant_applications").doc(applicationId).get();
            const appData = appDoc.data();
            
            // Create merchant in active merchants collection
            await createMerchantFromApplication(appData, applicationId);
        }
        
        return { success: true };
    } catch (error) {
        console.error("Error updating application: ", error);
        return { success: false, error: error.message };
    }
};

async function createMerchantFromApplication(appData, appId) {
    try {
        const merchantData = {
            storeName: appData.businessName,
            owner: `${appData.firstName} ${appData.lastName}`,
            email: appData.email,
            phone: appData.phone,
            address: appData.address,
            city: appData.city,
            businessType: appData.businessType,
            businessDescription: appData.businessDescription,
            paymentMethod: appData.paymentMethod,
            bankDetails: {
                accountNumber: appData.bankAccount,
                bankName: appData.bankName,
                accountHolder: appData.accountHolder
            },
            documents: {
                nationalIdFront: appData.nationalIdFrontUrl,
                nationalIdBack: appData.nationalIdBackUrl,
                storeCertification: appData.storeCertificationUrl,
                storeLogo: appData.storeLogoUrl
            },
            status: "active",
            verification: "verified",
            products: 0,
            totalSales: 0,
            joined: firebase.firestore.FieldValue.serverTimestamp(),
            applicationId: appId
        };
        
        // Create merchant document
        await db.collection("active_merchants").add(merchantData);
        
        // Also update user role to merchant if user exists
        const user = auth.currentUser;
        if (user) {
            await db.collection("users").doc(user.uid).update({
                role: "merchant",
                merchantId: merchantData.id
            });
        }
        
        return { success: true };
    } catch (error) {
        console.error("Error creating merchant: ", error);
        return { success: false, error: error.message };
    }
}

// File Upload Functions
window.uploadFile = async function(file, path) {
    try {
        const storageRef = storage.ref();
        const fileRef = storageRef.child(`${path}/${Date.now()}_${file.name}`);
        const snapshot = await fileRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        return { success: true, url: downloadURL };
    } catch (error) {
        console.error("Error uploading file: ", error);
        return { success: false, error: error.message };
    }
};
// Add to existing firebase.js after other functions:

// Product Management Functions
window.getMerchantProducts = async function(merchantId) {
    try {
        const querySnapshot = await db.collection("product_list")
            .where("merchantId", "==", merchantId)
            .orderBy("createdAt", "desc")
            .get();
        
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return { success: true, data: products };
    } catch (error) {
        console.error("Error getting products: ", error);
        return { success: false, error: error.message };
    }
};

window.addProduct = async function(productData, merchantId) {
    try {
        // Add merchant ID and timestamps
        productData.merchantId = merchantId;
        productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        productData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        productData.status = "active";
        
        const docRef = await db.collection("product_list").add(productData);
        console.log("Product added with ID: ", docRef.id);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error adding product: ", error);
        return { success: false, error: error.message };
    }
};

window.updateProduct = async function(productId, productData, merchantId) {
    try {
        // First verify product belongs to merchant
        const productDoc = await db.collection("product_list").doc(productId).get();
        
        if (!productDoc.exists) {
            return { success: false, error: "Product not found" };
        }
        
        const existingProduct = productDoc.data();
        if (existingProduct.merchantId !== merchantId) {
            return { success: false, error: "Unauthorized to edit this product" };
        }
        
        // Update product
        productData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection("product_list").doc(productId).update(productData);
        
        return { success: true };
    } catch (error) {
        console.error("Error updating product: ", error);
        return { success: false, error: error.message };
    }
};

window.deleteProduct = async function(productId, merchantId) {
    try {
        // First verify product belongs to merchant
        const productDoc = await db.collection("product_list").doc(productId).get();
        
        if (!productDoc.exists) {
            return { success: false, error: "Product not found" };
        }
        
        const productData = productDoc.data();
        if (productData.merchantId !== merchantId) {
            return { success: false, error: "Unauthorized to delete this product" };
        }
        
        // Delete product
        await db.collection("product_list").doc(productId).delete();
        
        return { success: true };
    } catch (error) {
        console.error("Error deleting product: ", error);
        return { success: false, error: error.message };
    }
};

// Get merchant info from verifiedMerchant
window.getMerchantInfo = async function(email) {
    try {
        // Check verifiedMerchant collection
        const merchantQuery = await db.collection("verifiedMerchant")
            .where("email", "==", email)
            .limit(1)
            .get();
        
        if (!merchantQuery.empty) {
            const merchantDoc = merchantQuery.docs[0];
            return { 
                success: true, 
                data: merchantDoc.data(),
                id: merchantDoc.id
            };
        }
        
        // Check active_merchants collection
        const activeMerchantQuery = await db.collection("active_merchants")
            .where("email", "==", email)
            .limit(1)
            .get();
        
        if (!activeMerchantQuery.empty) {
            const merchantDoc = activeMerchantQuery.docs[0];
            return { 
                success: true, 
                data: merchantDoc.data(),
                id: merchantDoc.id
            };
        }
        
        return { success: false, error: "Merchant not found" };
    } catch (error) {
        console.error("Error getting merchant info: ", error);
        return { success: false, error: error.message };
    }
};