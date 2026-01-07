// firebase-config.js
// SHARED CONFIG FOR ALL PAGES

// Firebase Configuration (v10.7.1)
const firebaseConfig = {
    apiKey: "AIzaSyBKswcE3xGh4feqGZytevh6N-IyrJoJ_7g",
    authDomain: "jeahluy.firebaseapp.com",
    projectId: "jeahluy",
    storageBucket: "jeahluy.firebasestorage.app",
    messagingSenderId: "308746007810",
    appId: "1:308746007810:web:c17396303b14d61c3b3e1b",
    measurementId: "G-3RLD0EB1FT"
};

// Initialize Firebase ONCE globally
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // Use existing app
}

// Export shared instances
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Configure persistence for auth
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Export for use
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseStorage = storage;