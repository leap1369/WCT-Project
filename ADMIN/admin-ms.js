
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
  import {
    getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs,
    updateDoc, deleteDoc, query, where, orderBy, limit
  } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyBKswcE3xGh4feqGZytevh6N-IyrJoJ_7g",
    authDomain: "jeahluy.firebaseapp.com",
    projectId: "jeahluy",
    storageBucket: "jeahluy.firebasestorage.app",
    messagingSenderId: "308746007810",
    appId: "1:308746007810:web:c17396303b14d61c3b3e1b",
    measurementId: "G-3RLD0EB1FT"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const ADMIN_UID = "zYSujcmGisVdCNPYCfwb7tbpG3D2";
  const ROLES = { USER: "user", MERCHANT: "merchant", ADMIN: "ADMINISTRATOR" };
  
  // Utility Functions
  const normalizeRole = (val) => { 
    if (!val) return ""; 
    const s = String(val).trim().toLowerCase(); 
    if (s === "user") return ROLES.USER; 
    if (s === "merchant") return ROLES.MERCHANT; 
    if (s.startsWith("admin")) return ROLES.ADMIN; 
    return ROLES.USER; 
  };
  
  const fmtDate = (v, withTime = false) => { 
    if (!v) return "-"; 
    const d = v?.toDate ? v.toDate() : (typeof v === "string" ? new Date(v) : new Date(v)); 
    return withTime ? d.toLocaleString() : d.toLocaleDateString(); 
  };
  
  const debounce = (fn, ms = 250) => { 
    let t; 
    return (...args) => { 
      clearTimeout(t); 
      t = setTimeout(() => fn(...args), ms); 
    }; 
  };

  let bootstrapped = false;

  onAuthStateChanged(auth, async (user) => {
    if (!user || user.uid !== ADMIN_UID) {
      if (!/admin-login\.html$/i.test(location.pathname)) location.replace("admin-login.html");
      return;
    }
    if (bootstrapped) return;
    bootstrapped = true;

    document.getElementById("adminName").textContent = `Admin (${user.email || ADMIN_UID})`;

    // Logout
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      try { await signOut(auth); } catch(_) {}
      location.replace("admin-login.html");
    });

    // Overview
    document.getElementById("refreshOverview").addEventListener("click", initOverview);

    // Users
    const onUserSearch = debounce(loadUsers, 200);
    document.getElementById("userRoleFilter").addEventListener("change", loadUsers);
    document.getElementById("userSearch").addEventListener("input", onUserSearch);
    document.getElementById("refreshUsers").addEventListener("click", loadUsers);
    document.getElementById("createUserBtn").addEventListener("click", createUserDoc);

    // Applications
    const onAppSearch = debounce(loadMerchantApplications, 200);
    document.getElementById("appStatusFilter").addEventListener("change", loadMerchantApplications);
    document.getElementById("appSearch").addEventListener("input", onAppSearch);
    document.getElementById("refreshApps").addEventListener("click", loadMerchantApplications);
    document.getElementById("createAppBtn").addEventListener("click", createApplicationFromAdmin);

    // Verified merchants
    const onMerchantSearch = debounce(loadVerifiedMerchants, 200);
    document.getElementById("merchantSearch").addEventListener("input", onMerchantSearch);
    document.getElementById("refreshMerchants").addEventListener("click", loadVerifiedMerchants);
    
    // Orders
    const onOrderSearch = debounce(loadOrders, 200);
    document.getElementById("orderStatusFilter").addEventListener("change", loadOrders);
    document.getElementById("orderSearch").addEventListener("input", onOrderSearch);
    document.getElementById("refreshOrders").addEventListener("click", loadOrders);
    
    // Order modal events
    document.getElementById("closeOrderModal").addEventListener("click", hideOrderModal);
    document.getElementById("orderModalOverlay").addEventListener("click", hideOrderModal);
    
    // Status update buttons
    document.querySelectorAll('[data-status-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const status = e.target.getAttribute('data-status-action');
        updateOrderStatus(status);
      });
    });

    // Product Management
    const onProductSearch = debounce(loadProducts, 200);
    document.getElementById("productSearch").addEventListener("input", onProductSearch);
    document.getElementById("refreshProducts").addEventListener("click", loadProducts);
    document.getElementById("productCategoryFilter").addEventListener("change", loadProducts);
    document.getElementById("productStatusFilter").addEventListener("change", loadProducts);
    document.getElementById("createProductBtn").addEventListener("click", createProduct);
    document.getElementById("updateProductBtn").addEventListener("click", updateProduct);
    document.getElementById("cancelEditBtn").addEventListener("click", cancelEdit);

    // Test order functionality
    document.getElementById("createTestOrderBtn")?.addEventListener("click", showCreateTestOrderModal);
    document.getElementById("cancelTestOrderBtn")?.addEventListener("click", hideCreateTestOrderModal);
    document.getElementById("saveTestOrderBtn")?.addEventListener("click", createTestOrder);
    document.getElementById("addTestItemBtn")?.addEventListener("click", addTestItem);
    document.getElementById("createTestOrderModalOverlay")?.addEventListener("click", hideCreateTestOrderModal);
    
    // Add input listeners for shipping and tax
    document.getElementById("testShippingCost")?.addEventListener("input", calculateTestOrderTotal);
    document.getElementById("testTax")?.addEventListener("input", calculateTestOrderTotal);

    // Initial load
    initOverview();
    loadUsers();
    loadMerchantApplications();
    loadVerifiedMerchants();
    loadProducts();
  });

  /* ===== Overview ===== */
  async function initOverview() {
    const users = await getDocs(collection(db, "users"));
    const verified = await getDocs(collection(db, "verifiedMerchants"));
    document.getElementById("totalUsers").textContent = users.size;
    document.getElementById("activeMerchants").textContent = verified.size;
    document.getElementById("totalOrders").textContent = 0;
    document.getElementById("platformRevenue").textContent = "$0.00";
  }

  /* ===== Users ===== */
  async function createUserDoc() {
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const displayName = document.getElementById("displayName").value.trim();
    const email = document.getElementById("email").value.trim();
    const profilePicture = document.getElementById("profilePicture").value.trim();
    const role = normalizeRole(document.getElementById("role").value);
    if (!email || (!firstName && !displayName)) return alert("Provide Email and First/Display name.");
    await addDoc(collection(db, "users"), {
      createdAt: new Date(),
      displayName: displayName || `${firstName || ""} ${lastName || ""}`.trim(),
      email, emailVerified: false,
      firstName: firstName || "", lastName: lastName || "",
      lastLogin: null, profilePicture: profilePicture || "", role
    });
    ["firstName","lastName","displayName","email","profilePicture"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("role").value = ROLES.USER;
    await loadUsers(); await initOverview();
  }

  async function loadUsers() {
    const tbody = document.querySelector("#usersTable tbody"); tbody.innerHTML = "";
    const roleFilter = normalizeRole(document.getElementById("userRoleFilter").value || "");
    const qText = (document.getElementById("userSearch").value || "").toLowerCase();
    const base = collection(db, "users");

    let q;
    if (roleFilter) { q = query(base, where("role", "==", roleFilter)); }
    else { try { q = query(base, orderBy("createdAt","desc")); } catch { q = base; } }

    let snap; try { snap = await getDocs(q); }
    catch { snap = roleFilter ? await getDocs(query(base, where("role","==", roleFilter))) : await getDocs(base); }

    const matches = snap.docs.map(d => ({ id: d.id, data: d.data() }))
      .filter(({id, data:u}) => {
        if (!qText) return true;
        const hay = [id, u.displayName, u.firstName, u.lastName, u.email, u.role]
          .map(x => String(x || "").toLowerCase()).join(" ");
        return hay.includes(qText);
      })
      .sort((a,b) => {
        const aj = a.data.createdAt ? (a.data.createdAt?.toDate ? a.data.createdAt.toDate() : new Date(a.data.createdAt)) : 0;
        const bj = b.data.createdAt ? (b.data.createdAt?.toDate ? b.data.createdAt.toDate() : new Date(b.data.createdAt)) : 0;
        return bj - aj;
      });

    if (!matches.length) { const tr = document.createElement("tr"); tr.innerHTML = `<td colspan="8" class="muted">No users found.</td>`; tbody.appendChild(tr); return; }

    matches.forEach(({ id, data: d }) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${id}</td>
        <td><div>${d.displayName || `${d.firstName || "-"} ${d.lastName || ""}`.trim()}</div></td>
        <td>${d.email || "-"}</td>
        <td>${d.role || "-"}</td>
        <td><span class="chip ${d.emailVerified ? "true" : "false"}">${d.emailVerified ? "true" : "false"}</span></td>
        <td>${fmtDate(d.lastLogin, true)}</td>
        <td>${fmtDate(d.createdAt, true)}</td>
        <td class="actions">
          <button data-action="set-role" data-id="${id}" data-role="user">Role: user</button>
          <button data-action="set-role" data-id="${id}" data-role="merchant">Role: merchant</button>
          <button data-action="set-role" data-id="${id}" data-role="ADMINISTRATOR">Role: ADMIN</button>
          <button data-action="verify-email" data-id="${id}">Verify email</button>
          <button data-action="delete" data-id="${id}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.onclick = async (e) => {
      const btn = e.target.closest("button[data-action]"); if (!btn) return;
      const id = btn.dataset.id; const action = btn.dataset.action;
      try {
        if (action === "set-role") { await updateDoc(doc(db, "users", id), { role: normalizeRole(btn.dataset.role) }); }
        else if (action === "verify-email") { await updateDoc(doc(db, "users", id), { emailVerified: true }); }
        else if (action === "delete") { await deleteDoc(doc(db, "users", id)); }
        await loadUsers(); await initOverview();
      } catch (err) { alert(err?.message || "Action failed"); }
    };
  }

  /* ===== Merchant Applications ===== */
 async function createApplicationFromAdmin() {
  console.log("=== CREATING APPLICATION FROM ADMIN ===");
  
  try {
    // Get form values
    const businessName = document.getElementById("appBusinessName").value.trim();
    const businessType = document.getElementById("appBusinessType").value;
    const address = document.getElementById("appAddress").value.trim();
    const city = document.getElementById("appCity").value;
    const zipcode = document.getElementById("appZipcode").value.trim();
    const description = document.getElementById("appDescription").value.trim();
    const applicantEmail = (document.getElementById("appApplicantEmail").value || "").trim();

    // Validate required fields
    if (!businessName || !businessType || !city) {
      alert("❌ Business Name, Type, and City are required.");
      return;
    }

    console.log("Creating application for:", {
      businessName,
      businessType,
      city,
      applicantEmail
    });

    // Check if user exists for this email
    let applicantUserId = null;
    if (applicantEmail) {
      try {
        const q = query(collection(db, "users"), where("email", "==", applicantEmail));
        const s = await getDocs(q);
        if (!s.empty) {
          applicantUserId = s.docs[0].id;
          console.log("Found user ID:", applicantUserId);
        }
      } catch (err) {
        console.log("Error checking user:", err);
      }
    }

    // Prepare application data
    const applicationData = {
      businessName,
      businessType,
      address: address || "",
      city,
      zipcode: zipcode || "",
      description: description || "",
      applicantEmail: applicantEmail || "",
      applicantUserId: applicantUserId,
      status: "Pending Review",
      createdAt: new Date(),
      // Note: No document images when created by admin
      // User will need to upload documents separately
    };

    console.log("Application data:", applicationData);

    // Save to Firestore
    if (applicantUserId) {
      // Use user ID as document ID if user exists
      await setDoc(doc(db, "merchantApplications", applicantUserId), applicationData);
      console.log("Application saved with user ID as doc ID");
    } else {
      // Create new document with auto-generated ID
      await addDoc(collection(db, "merchantApplications"), applicationData);
      console.log("Application saved with auto-generated ID");
    }

    // Clear form
    document.getElementById("appBusinessName").value = "";
    document.getElementById("appAddress").value = "";
    document.getElementById("appZipcode").value = "";
    document.getElementById("appDescription").value = "";
    document.getElementById("appApplicantEmail").value = "";
    // Keep businessType and city selected

    // Show success message
    alert("✅ Application created successfully!");
    
    // Reload applications list
    await loadMerchantApplications();
    
  } catch (error) {
    console.error("❌ ERROR creating application:", error);
    alert("❌ Error creating application: " + error.message);
  }
}

 /* ===== Merchant Applications ===== */
async function loadMerchantApplications() {
  console.log("=== LOADING MERCHANT APPLICATIONS ===");
  
  try {
    const status = document.getElementById("appStatusFilter").value;
    const term = (document.getElementById("appSearch").value || "").toLowerCase();
    const base = collection(db, "merchantApplications");

    let q = status ? query(base, where("status", "==", status)) : base;
    
    let snap;
    try { 
      // Try to order by date
      q = query(q, orderBy("createdAt", "desc"));
      snap = await getDocs(q); 
    } catch (e) { 
      console.log("Ordering error, trying simple query:", e);
      snap = await getDocs(q);
    }

    const tbody = document.querySelector("#merchantAppsTable tbody");
    if (!tbody) {
      console.error("❌ Could not find #merchantAppsTable tbody!");
      return;
    }
    
    // Clear and rebuild the table using DOM methods
tbody.innerHTML = "";

snap.docs.forEach(doc => {
  const id = doc.id;
  const data = doc.data();
  
  const tr = document.createElement("tr");
  
  // Create each cell individually
  const cells = [
    createCell(`${id.substring(0, 8)}...`),
    createCell(`<strong>${data.businessName || "-"}</strong>`),
    createCell(`<span class="chip">${data.businessType || "-"}</span>`),
    createCell(data.city || "-"),
    createCell(data.applicantEmail || "-"),
    createImageCell(data.businessDocBase64, "Business", id, "business"),
    createImageCell(data.identityDocBase64, "Identity", id, "identity"),
    createCell(fmtDate(data.createdAt, true), "11px"),
    createStatusCell(data.status || "Pending Review"),
    createActionCell(id)
  ];
  
  cells.forEach(cell => tr.appendChild(cell));
  tbody.appendChild(tr);
});

// Helper functions
function createCell(content, fontSize = "13px") {
  const td = document.createElement("td");
  td.style.fontFamily = "system-ui, Arial, sans-serif";
  td.style.fontSize = fontSize;
  td.innerHTML = content;
  return td;
}

function createImageCell(base64Data, label, appId, type) {
  const td = document.createElement("td");
  td.style.fontFamily = "system-ui, Arial, sans-serif";
  td.style.fontSize = "13px";
  td.style.textAlign = "center";
  
  if (base64Data && base64Data.length > 100) {
    const div = document.createElement("div");
    div.style.textAlign = "center";
    
    const imgDiv = document.createElement("div");
    imgDiv.style.width = "60px";
    imgDiv.style.height = "60px";
    imgDiv.style.margin = "0 auto";
    imgDiv.style.position = "relative";
    
    const img = document.createElement("img");
    img.src = `data:image/jpeg;base64,${base64Data}`;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.borderRadius = "4px";
    img.style.border = "1px solid #ddd";
    img.style.cursor = "pointer";
    img.alt = `${label} Document`;
    
    img.onerror = function() {
      this.style.display = "none";
    };
    
    img.onclick = function() {
      window.showAppImageModal(`data:image/jpeg;base64,${base64Data}`, `${label} Document`);
    };
    
    imgDiv.appendChild(img);
    div.appendChild(imgDiv);
    
    const labelDiv = document.createElement("div");
    labelDiv.style.fontSize = "10px";
    labelDiv.style.color = "#666";
    labelDiv.style.marginTop = "4px";
    labelDiv.textContent = label;
    div.appendChild(labelDiv);
    
    td.appendChild(div);
  } else {
    td.textContent = "-";
  }
  
  return td;
}

function createStatusCell(status) {
  const td = document.createElement("td");
  td.style.fontFamily = "system-ui, Arial, sans-serif";
  td.style.fontSize = "13px";
  
  const span = document.createElement("span");
  span.className = "chip";
  if (status === "Approved") span.classList.add("true");
  if (status === "Rejected") span.classList.add("false");
  span.style.textTransform = "capitalize";
  span.textContent = status;
  
  td.appendChild(span);
  return td;
}

function createActionCell(appId) {
  const td = document.createElement("td");
  td.className = "actions";
  td.style.fontFamily = "system-ui, Arial, sans-serif";
  td.style.whiteSpace = "nowrap";
  
  const actions = ["approve", "reject", "delete"];
  const colors = ["#28a745", "#dc3545", "#6c757d"];
  const labels = ["Approve", "Reject", "Delete"];
  
  actions.forEach((action, index) => {
    const button = document.createElement("button");
    button.dataset.action = action;
    button.dataset.id = appId;
    button.textContent = labels[index];
    button.style.background = colors[index];
    button.style.color = "white";
    button.style.border = "none";
    button.style.padding = "6px 10px";
    button.style.borderRadius = "4px";
    button.style.cursor = "pointer";
    button.style.fontSize = "12px";
    button.style.margin = "2px";
    button.style.fontFamily = "inherit";
    
    td.appendChild(button);
  });
  
  return td;
} 

    // Add click handler for actions
    tbody.onclick = async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      
      try {
        const appRef = doc(db, "merchantApplications", id);
        const appSnap = await getDoc(appRef);
        
        if (!appSnap.exists()) {
          alert("Application not found!");
          return;
        }
        
        const app = appSnap.data();
        
        if (action === "view") {
          // View application details
          alert(`Application Details:\n\n` +
                `Business: ${app.businessName}\n` +
                `Type: ${app.businessType}\n` +
                `City: ${app.city}\n` +
                `Applicant: ${app.applicantEmail}\n` +
                `Status: ${app.status}\n` +
                `Applied: ${fmtDate(app.createdAt, true)}`);
          
        } else if (action === "approve") {
  // Confirm approval
  if (!confirm(`Approve "${app.businessName}"? This will create a verified merchant account.`)) {
    return;
  }
  
  console.log("DEBUG - Before approval:");
  console.log("Business Doc Base64 exists:", !!app.businessDocBase64);
  console.log("Business Doc Base64 length:", app.businessDocBase64?.length || 0);
  console.log("First 50 chars of Business Doc:", app.businessDocBase64?.substring(0, 50) || "none");
  console.log("Identity Doc Base64 exists:", !!app.identityDocBase64);
  console.log("Identity Doc Base64 length:", app.identityDocBase64?.length || 0);
  console.log("First 50 chars of Identity Doc:", app.identityDocBase64?.substring(0, 50) || "none");
  
  // Create verified merchant document
  const merchantData = {
    store: app.businessName,
    owner: app.owner || app.businessName,
    city: app.city,
    email: app.applicantEmail || "",
    // CRITICAL: Ensure Base64 data is properly copied
    businessDocBase64: app.businessDocBase64 || null,
    identityDocBase64: app.identityDocBase64 || null,
    status: "Active",
    verification: "Verified",
    joined: new Date(),
    applicationId: id,
    businessType: app.businessType,
    address: app.address || "",
    zipcode: app.zipcode || "",
    description: app.description || "",
    createdAt: app.createdAt || new Date()
  };
  
  console.log("DEBUG - Merchant data to save:", {
    hasBusinessDoc: !!merchantData.businessDocBase64,
    hasIdentityDoc: !!merchantData.identityDocBase64,
    businessDocLength: merchantData.businessDocBase64?.length || 0,
    identityDocLength: merchantData.identityDocBase64?.length || 0
  });
  
  // Save to verified merchants
  await setDoc(doc(db, "verifiedMerchants", id), merchantData);
  
  console.log("DEBUG - Saved to verified merchants");
  
  // Also update user role if applicantUserId exists
  if (app.applicantUserId) {
    try {
      await updateDoc(doc(db, "users", app.applicantUserId), {
        role: "merchant"
      });
      console.log("Updated user role to merchant");
    } catch (userErr) {
      console.log("Could not update user role:", userErr);
    }
  }
  
  // Delete the application
  await deleteDoc(appRef);
  
  alert(`✅ "${app.businessName}" approved successfully!\n\n` +
        `✓ Created verified merchant account\n` +
        `✓ ${app.businessDocBase64 ? '✓ Business document copied' : '✗ No business document'}\n` +
        `✓ ${app.identityDocBase64 ? '✓ Identity document copied' : '✗ No identity document'}\n\n` +
        `Check Active Merchants section to verify.`);
  
  // Reload both lists
  await loadMerchantApplications();
  // Reload the merchants list - but first prevent duplicates
const tbody = document.querySelector("#merchantsTable tbody");
if (tbody) {
  tbody.innerHTML = ""; // Clear existing content first
}
await loadVerifiedMerchants();
  await initOverview();
          
        } else if (action === "reject") {
          const reason = prompt("Enter rejection reason (optional):");
          await updateDoc(appRef, { 
            status: "Rejected",
            rejectedAt: new Date(),
            rejectionReason: reason || ""
          });
          alert("Application rejected.");
          
        } else if (action === "delete") {
          if (confirm("Are you sure you want to delete this application?")) {
            await deleteDoc(appRef);
            alert("Application deleted.");
          }
        }
        
        // Reload both lists
        await loadMerchantApplications();
        await loadVerifiedMerchants();
        await initOverview();
        
      } catch (err) {
        console.error("❌ Action error:", err);
        alert(`❌ Error: ${err.message}\n\nCheck console for details.`);
      }
    };
    
  } catch (error) {
    console.error("❌ ERROR in loadMerchantApplications:", error);
    const tbody = document.querySelector("#merchantAppsTable tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" style="color: red; padding: 20px; text-align: center;">
        <strong>Error loading applications:</strong><br>
        ${error.message}<br>
        <button onclick="loadMerchantApplications()" style="margin-top: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Retry
        </button>
      </td></tr>`;
    }
  }
}

 /* ===== Active Merchants ===== */
async function loadVerifiedMerchants() {
  console.log("=== LOADING VERIFIED MERCHANTS ===");
  
  try {
    const tbody = document.querySelector("#merchantsTable tbody");
    if (!tbody) {
      console.error("❌ Could not find #merchantsTable tbody!");
      return;
    }
    
    // 🟢 CRITICAL FIX: Clear the tbody and replace it to remove old event listeners
    tbody.innerHTML = "";
    
    const term = (document.getElementById("merchantSearch").value || "").toLowerCase();
    
    let snap;
    try {
      snap = await getDocs(collection(db, "verifiedMerchants"));
    } catch (error) {
      console.error("Error fetching merchants:", error);
      tbody.innerHTML = `<tr><td colspan="10" style="color: red;">Error loading: ${error.message}</td></tr>`;
      return;
    }
    
    if (snap.empty) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="10" class="muted">No verified merchants.</td>`;
      tbody.appendChild(tr);
      return;
    }

    // 🟢 Store all merchant data for the event handler
    const merchantsData = new Map();
    
    // Process each merchant
    snap.docs.forEach(doc => {
      const id = doc.id;
      const data = doc.data();
      
      // Store data for later use in event handler
      merchantsData.set(id, data);
      
      console.log(`Processing merchant ${id}:`, {
        store: data.store,
        hasBusinessDoc: !!data.businessDocBase64,
        hasIdentityDoc: !!data.identityDocBase64,
        businessDocLength: data.businessDocBase64?.length || 0,
        identityDocLength: data.identityDocBase64?.length || 0
      });

      const tr = document.createElement("tr");
      
      // ID cell
      const idCell = document.createElement("td");
      idCell.textContent = id.substring(0, 8) + "...";
      idCell.style.fontFamily = "system-ui, Arial, sans-serif";
      idCell.style.fontSize = "13px";
      tr.appendChild(idCell);
      
      // Store cell
      const storeCell = document.createElement("td");
      storeCell.textContent = data.store || "-";
      storeCell.style.fontFamily = "system-ui, Arial, sans-serif";
      storeCell.style.fontSize = "13px";
      tr.appendChild(storeCell);
      
      // Owner cell
      const ownerCell = document.createElement("td");
      ownerCell.textContent = data.owner || "-";
      ownerCell.style.fontFamily = "system-ui, Arial, sans-serif";
      ownerCell.style.fontSize = "13px";
      tr.appendChild(ownerCell);
      
      // City cell
      const cityCell = document.createElement("td");
      cityCell.textContent = data.city || "-";
      cityCell.style.fontFamily = "system-ui, Arial, sans-serif";
      cityCell.style.fontSize = "13px";
      tr.appendChild(cityCell);
      
      // Email cell
      const emailCell = document.createElement("td");
      emailCell.textContent = data.email || "-";
      emailCell.style.fontFamily = "system-ui, Arial, sans-serif";
      emailCell.style.fontSize = "13px";
      tr.appendChild(emailCell);
      
      // Documents cell
      const docsCell = document.createElement("td");
      docsCell.style.fontFamily = "system-ui, Arial, sans-serif";
      docsCell.style.fontSize = "13px";
      
      if (data.businessDocBase64 || data.identityDocBase64) {
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.gap = "10px";
        container.style.flexWrap = "wrap";
        container.style.justifyContent = "center";
        
        // Business Document
        if (data.businessDocBase64 && data.businessDocBase64.length > 100) {
          const businessContainer = document.createElement("div");
          businessContainer.style.textAlign = "center";
          
          const businessLabel = document.createElement("div");
          businessLabel.textContent = "Business";
          businessLabel.style.fontSize = "10px";
          businessLabel.style.color = "#666";
          businessLabel.style.marginBottom = "2px";
          
          const businessImg = document.createElement("img");
          businessImg.style.width = "50px";
          businessImg.style.height = "50px";
          businessImg.style.objectFit = "cover";
          businessImg.style.borderRadius = "4px";
          businessImg.style.border = "1px solid #ddd";
          businessImg.style.cursor = "pointer";
          businessImg.alt = "Business Document";
          
          // Set image source safely
          try {
            const cleanBase64 = data.businessDocBase64.replace(/[^A-Za-z0-9+/=]/g, '');
            if (cleanBase64.length > 100 && cleanBase64.length % 4 === 0) {
              businessImg.src = `data:image/jpeg;base64,${cleanBase64}`;
            } else {
              throw new Error("Invalid Base64 format");
            }
          } catch (e) {
            console.warn("Invalid business Base64 for merchant", id);
            businessImg.style.display = "none";
            const errorText = document.createElement("div");
            errorText.textContent = "Error";
            errorText.style.fontSize = "9px";
            errorText.style.color = "#999";
            businessContainer.appendChild(errorText);
          }
          
          // 🟢 Use event delegation - attach to the image directly
          businessImg.addEventListener("click", (e) => {
            e.stopPropagation();
            if (data.businessDocBase64 && data.businessDocBase64.length > 100) {
              try {
                const cleanBase64 = data.businessDocBase64.replace(/[^A-Za-z0-9+/=]/g, '');
                window.showMerchantImageModal(
                  `data:image/jpeg;base64,${cleanBase64}`, 
                  "Business Document - " + (data.store || "Merchant")
                );
              } catch (error) {
                alert("Cannot display business document. The file may be corrupted.");
              }
            }
          });
          
          businessContainer.appendChild(businessLabel);
          businessContainer.appendChild(businessImg);
          container.appendChild(businessContainer);
        }
        
        // Identity Document
        if (data.identityDocBase64 && data.identityDocBase64.length > 100) {
          const identityContainer = document.createElement("div");
          identityContainer.style.textAlign = "center";
          
          const identityLabel = document.createElement("div");
          identityLabel.textContent = "Identity";
          identityLabel.style.fontSize = "10px";
          identityLabel.style.color = "#666";
          identityLabel.style.marginBottom = "2px";
          
          const identityImg = document.createElement("img");
          identityImg.style.width = "50px";
          identityImg.style.height = "50px";
          identityImg.style.objectFit = "cover";
          identityImg.style.borderRadius = "4px";
          identityImg.style.border = "1px solid #ddd";
          identityImg.style.cursor = "pointer";
          identityImg.alt = "Identity Document";
          
          // Set image source safely
          try {
            const cleanBase64 = data.identityDocBase64.replace(/[^A-Za-z0-9+/=]/g, '');
            if (cleanBase64.length > 100 && cleanBase64.length % 4 === 0) {
              identityImg.src = `data:image/jpeg;base64,${cleanBase64}`;
            } else {
              throw new Error("Invalid Base64 format");
            }
          } catch (e) {
            console.warn("Invalid identity Base64 for merchant", id);
            identityImg.style.display = "none";
            const errorText = document.createElement("div");
            errorText.textContent = "Error";
            errorText.style.fontSize = "9px";
            errorText.style.color = "#999";
            identityContainer.appendChild(errorText);
          }
          
          // 🟢 Use event delegation - attach to the image directly
          identityImg.addEventListener("click", (e) => {
            e.stopPropagation();
            if (data.identityDocBase64 && data.identityDocBase64.length > 100) {
              try {
                const cleanBase64 = data.identityDocBase64.replace(/[^A-Za-z0-9+/=]/g, '');
                window.showMerchantImageModal(
                  `data:image/jpeg;base64,${cleanBase64}`, 
                  "Identity Document - " + (data.store || "Merchant")
                );
              } catch (error) {
                alert("Cannot display identity document. The file may be corrupted.");
              }
            }
          });
          
          identityContainer.appendChild(identityLabel);
          identityContainer.appendChild(identityImg);
          container.appendChild(identityContainer);
        }
        
        docsCell.appendChild(container);
      } else {
        docsCell.textContent = "-";
      }
      
      tr.appendChild(docsCell);
      
      // Joined date cell
      const joinedCell = document.createElement("td");
      joinedCell.textContent = fmtDate(data.joined);
      joinedCell.style.fontFamily = "system-ui, Arial, sans-serif";
      joinedCell.style.fontSize = "13px";
      tr.appendChild(joinedCell);
      
      // Status cell
      const statusCell = document.createElement("td");
      const statusSpan = document.createElement("span");
      statusSpan.className = `chip ${data.status === 'Active' ? 'true' : 'false'}`;
      statusSpan.textContent = data.status || "Active";
      statusCell.appendChild(statusSpan);
      statusCell.style.fontFamily = "system-ui, Arial, sans-serif";
      statusCell.style.fontSize = "13px";
      tr.appendChild(statusCell);
      
      // Verification cell
      const verificationCell = document.createElement("td");
      const verificationSpan = document.createElement("span");
      verificationSpan.className = "chip true";
      verificationSpan.textContent = data.verification || "Verified";
      verificationCell.appendChild(verificationSpan);
      verificationCell.style.fontFamily = "system-ui, Arial, sans-serif";
      verificationCell.style.fontSize = "13px";
      tr.appendChild(verificationCell);
      
      // Actions cell
      const actionsCell = document.createElement("td");
      actionsCell.className = "actions";
      actionsCell.style.fontFamily = "system-ui, Arial, sans-serif";
      actionsCell.style.whiteSpace = "nowrap";
      
      const actions = [
        { label: "Activate", action: "activate", color: "#28a745" },
        { label: "Suspend", action: "suspend", color: "#dc3545" },
        { label: "Delete", action: "delete", color: "#6c757d" }
      ];
      
      actions.forEach(({ label, action, color }) => {
        const button = document.createElement("button");
        button.textContent = label;
        button.dataset.action = action;
        button.dataset.id = id;
        
        button.style.background = color;
        button.style.color = "white";
        button.style.border = "none";
        button.style.padding = "6px 10px";
        button.style.borderRadius = "4px";
        button.style.cursor = "pointer";
        button.style.fontSize = "12px";
        button.style.margin = "2px";
        button.style.fontFamily = "inherit";
        
        actionsCell.appendChild(button);
      });
      
      tr.appendChild(actionsCell);
      
      // Add row to table
      tbody.appendChild(tr);
    });

    // 🟢 CRITICAL FIX: Use a single global event listener instead of adding new ones each time
    // Remove if there's an existing listener
    if (window.merchantActionHandler) {
      tbody.removeEventListener("click", window.merchantActionHandler);
    }
    
    // Create a new handler
    window.merchantActionHandler = async function merchantActionHandler(e) {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      
      // 🟢 Add loading state to prevent multiple clicks
      if (btn.hasAttribute("data-processing")) return;
      btn.setAttribute("data-processing", "true");
      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = "Processing...";
      
      try {
        const ref = doc(db, "verifiedMerchants", id);
        
        if (action === "activate") {
          await updateDoc(ref, { status: "Active" });
        } else if (action === "suspend") {
          await updateDoc(ref, { status: "Suspended" });
        } else if (action === "delete") {
          if (confirm(`Are you sure you want to delete merchant "${id}"?`)) {
            await deleteDoc(ref);
            alert("Merchant deleted!");
          } else {
            btn.removeAttribute("data-processing");
            btn.disabled = false;
            btn.textContent = originalText;
            return;
          }
        }
        
        // 🟢 Clear the table before reloading to prevent visual duplicates
        tbody.innerHTML = "";
        
        // Add a loading indicator
        const loadingRow = document.createElement("tr");
        loadingRow.innerHTML = `<td colspan="10" style="text-align: center; padding: 20px;">
          <div>Updating merchant...</div>
        </td>`;
        tbody.appendChild(loadingRow);
        
        // Reload the merchants list
        await loadVerifiedMerchants();
        
      } catch (err) {
        console.error("Action error:", err);
        alert("Error: " + err.message);
        
        // Restore button state on error
        btn.removeAttribute("data-processing");
        btn.disabled = false;
        btn.textContent = originalText;
      }
    };
    
    // Attach the handler
    tbody.addEventListener("click", window.merchantActionHandler);
    
  } catch (error) {
    console.error("❌ ERROR in loadVerifiedMerchants:", error);
    const tbody = document.querySelector("#merchantsTable tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="10" style="color: red; padding: 20px; text-align: center;">
        <strong>Error loading merchants:</strong><br>
        ${error.message}<br>
        <button onclick="loadVerifiedMerchants()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Retry
        </button>
      </td></tr>`;
    }
  }
}
  /* ===== Order Management ===== */
  let currentOrderId = null;
  
  // Show order details modal
  function showOrderModal(orderId) {
    currentOrderId = orderId;
    document.getElementById("modalOrderId").textContent = `#${orderId.substring(0, 8)}...`;
    
    // Show modal
    document.getElementById("orderModal").style.display = "block";
    document.getElementById("orderModalOverlay").style.display = "block";
    
    // Load order details
    loadOrderDetails(orderId);
  }
  
  // Hide order modal
  function hideOrderModal() {
    document.getElementById("orderModal").style.display = "none";
    document.getElementById("orderModalOverlay").style.display = "none";
    currentOrderId = null;
  }
  
  // Load order details
  async function loadOrderDetails(orderId) {
    try {
      const orderRef = doc(db, "order_history", orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (!orderSnap.exists()) {
        alert("Order not found!");
        hideOrderModal();
        return;
      }
      
      const order = orderSnap.data();
      
      // Fill customer info
      document.getElementById("modalCustomerName").textContent = order.customerName || "-";
      document.getElementById("modalCustomerEmail").textContent = order.customerEmail || "-";
      document.getElementById("modalCustomerPhone").textContent = order.customerPhone || "-";
      
      // Fill shipping info
      document.getElementById("modalShippingAddress").textContent = order.shippingAddress || "-";
      document.getElementById("modalShippingCity").textContent = order.shippingCity || "-";
      document.getElementById("modalShippingZip").textContent = order.shippingZip || "-";
      
      // Fill order items
      const itemsTbody = document.getElementById("modalOrderItems");
      itemsTbody.innerHTML = "";
      
      let subtotal = 0;
      const items = order.items || [];
      
      items.forEach(item => {
        const row = document.createElement("tr");
        const itemSubtotal = (item.price || 0) * (item.quantity || 1);
        subtotal += itemSubtotal;
        
        row.innerHTML = `
          <td>${item.name || "Unknown Product"}</td>
          <td>${item.quantity || 1}</td>
          <td>$${(item.price || 0).toFixed(2)}</td>
          <td>$${itemSubtotal.toFixed(2)}</td>
        `;
        itemsTbody.appendChild(row);
      });
      
      // Calculate totals
      const shipping = order.shippingCost || 0;
      const tax = order.tax || 0;
      const total = subtotal + shipping + tax;
      
      document.getElementById("modalSubtotal").textContent = subtotal.toFixed(2);
      document.getElementById("modalShippingCost").textContent = shipping.toFixed(2);
      document.getElementById("modalTax").textContent = tax.toFixed(2);
      document.getElementById("modalTotal").textContent = total.toFixed(2);
      
      // Fill order status
      const status = order.status || "pending";
      const statusElem = document.getElementById("modalCurrentStatus");
      statusElem.textContent = status;
      statusElem.className = `chip status-${status}`;
      
      document.getElementById("modalPaymentStatus").textContent = order.paymentStatus || "pending";
      document.getElementById("modalOrderDate").textContent = fmtDate(order.orderDate, true);
      
    } catch (err) {
      console.error("Error loading order details:", err);
      alert("Error loading order details: " + err.message);
    }
  }
  
  // Update order status
  async function updateOrderStatus(newStatus) {
    if (!currentOrderId) return;
    
    try {
      const orderRef = doc(db, "order_history", currentOrderId);
      const updateData = {
        status: newStatus,
        updatedAt: new Date()
      };
      
      // Add status-specific updates
      if (newStatus === "cancelled") {
        updateData.cancelledAt = new Date();
      } else if (newStatus === "refunded") {
        updateData.refundedAt = new Date();
        updateData.paymentStatus = "refunded";
      } else if (newStatus === "delivered") {
        updateData.deliveredAt = new Date();
      } else if (newStatus === "shipped") {
        updateData.shippedAt = new Date();
        updateData.trackingNumber = updateData.trackingNumber || `TRK${Date.now().toString().slice(-8)}`;
      }
      
      await updateDoc(orderRef, updateData);
      
      // Reload order details and orders list
      await loadOrderDetails(currentOrderId);
      await loadOrders();
      
      alert(`Order status updated to ${newStatus}`);
      
    } catch (err) {
      console.error("Error updating order status:", err);
      alert("Error updating order status: " + err.message);
    }
  }
  
  // Load all orders
  async function loadOrders() {
    const tbody = document.querySelector("#ordersTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    const statusFilter = document.getElementById("orderStatusFilter")?.value || "";
    const searchTerm = (document.getElementById("orderSearch")?.value || "").toLowerCase();
    
    try {
      let q = collection(db, "order_history");
      
      // Apply status filter if selected
      if (statusFilter) {
        q = query(q, where("status", "==", statusFilter));
      }
      
      // Try to order by date
      try {
        q = query(q, orderBy("orderDate", "desc"));
      } catch (err) {
        console.log("No index for orderDate ordering");
      }
      
      const snap = await getDocs(q);
      
      if (snap.empty) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="8" class="muted">No orders found.</td>`;
        tbody.appendChild(tr);
        return;
      }
      
      // Filter and process orders
      const orders = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(order => {
        // Apply search filter
        if (!searchTerm) return true;
        
        const searchable = [
          order.id,
          order.customerName || "",
          order.customerEmail || "",
          order.orderId || "",
          order.status || ""
        ].map(x => String(x).toLowerCase()).join(" ");
        
        // Also search in items
        const itemNames = (order.items || []).map(item => item.name || "").join(" ");
        
        return searchable.includes(searchTerm) || itemNames.toLowerCase().includes(searchTerm);
      });
      
      // Sort by date (newest first)
      orders.sort((a, b) => {
        const dateA = a.orderDate?.toDate ? a.orderDate.toDate() : new Date(a.orderDate || 0);
        const dateB = b.orderDate?.toDate ? b.orderDate.toDate() : new Date(b.orderDate || 0);
        return dateB - dateA;
      });
      
      // Display orders
      orders.forEach(order => {
        // Calculate total
        const items = order.items || [];
        const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
        const shipping = order.shippingCost || 0;
        const tax = order.tax || 0;
        const total = subtotal + shipping + tax;
        
        // Count items
        const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        
        // Create status badge
        const status = order.status || "pending";
        const statusBadge = `<span class="order-status status-${status}">${status}</span>`;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${order.id.substring(0, 12)}...</td>
          <td>
            <div><strong>${order.customerName || "Unknown Customer"}</strong></div>
            <div class="muted">${order.customerEmail || "-"}</div>
          </td>
          <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
          <td>$${total.toFixed(2)}</td>
          <td>${statusBadge}</td>
          <td>${order.paymentStatus || "pending"}</td>
          <td>${fmtDate(order.orderDate, true)}</td>
          <td class="actions">
            <button data-action="view-order" data-id="${order.id}">View</button>
            <button data-action="edit-order" data-id="${order.id}">Edit</button>
            <button data-action="delete-order" data-id="${order.id}">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      
      // Add event listeners to order actions
      tbody.onclick = async (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        
        const orderId = btn.dataset.id;
        const action = btn.dataset.action;
        
        try {
          if (action === "view-order") {
            showOrderModal(orderId);
          } else if (action === "edit-order") {
            // You can expand this to show an edit form
            alert("Edit functionality coming soon!");
          } else if (action === "delete-order") {
            if (confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
              await deleteDoc(doc(db, "order_history", orderId));
              await loadOrders();
              alert("Order deleted successfully!");
            }
          }
        } catch (err) {
          alert(err?.message || "Action failed");
        }
      };
      
    } catch (err) {
      console.error("Error loading orders:", err);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="8" class="muted">Error loading orders: ${err.message}</td>`;
      tbody.appendChild(tr);
    }
  }

  /* ===== Create Test Order Functions ===== */
  let testOrderItems = [];
  
  // Show create test order modal
  function showCreateTestOrderModal() {
    // Reset form
    testOrderItems = [
      { name: "Sample Product 1", price: 29.99, quantity: 1 },
      { name: "Sample Product 2", price: 49.99, quantity: 2 }
    ];
    
    renderTestOrderItems();
    calculateTestOrderTotal();
    
    // Show modal
    document.getElementById("createTestOrderModal").style.display = "block";
    document.getElementById("createTestOrderModalOverlay").style.display = "block";
  }
  
  // Hide create test order modal
  function hideCreateTestOrderModal() {
    document.getElementById("createTestOrderModal").style.display = "none";
    document.getElementById("createTestOrderModalOverlay").style.display = "none";
    testOrderItems = [];
  }
  
  // Render test order items
  function renderTestOrderItems() {
    const container = document.getElementById("testOrderItems");
    container.innerHTML = "";
    
    testOrderItems.forEach((item, index) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "form-row";
      itemDiv.style.marginBottom = "8px";
      itemDiv.innerHTML = `
        <input type="text" placeholder="Product Name" value="${item.name}" 
               data-index="${index}" data-field="name" style="flex:2;" />
        <input type="number" step="0.01" min="0" placeholder="Price" value="${item.price}" 
               data-index="${index}" data-field="price" style="flex:1;" />
        <input type="number" min="1" placeholder="Qty" value="${item.quantity}" 
               data-index="${index}" data-field="quantity" style="width:80px;" />
        <button type="button" class="btn" data-index="${index}" 
                style="background:#dc3545; color:white; width:40px;">×</button>
      `;
      container.appendChild(itemDiv);
    });
    
    // Add event listeners for input changes
    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        const value = e.target.value;
        
        if (field === 'price' || field === 'quantity') {
          testOrderItems[index][field] = parseFloat(value) || 0;
        } else {
          testOrderItems[index][field] = value;
        }
        
        calculateTestOrderTotal();
      });
    });
    
    // Add event listeners for delete buttons
    container.querySelectorAll('button[data-index]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        testOrderItems.splice(index, 1);
        renderTestOrderItems();
        calculateTestOrderTotal();
      });
    });
  }
  
  // Calculate test order total
  function calculateTestOrderTotal() {
    let subtotal = 0;
    
    testOrderItems.forEach(item => {
      subtotal += (item.price || 0) * (item.quantity || 1);
    });
    
    const shipping = parseFloat(document.getElementById("testShippingCost").value) || 0;
    const tax = parseFloat(document.getElementById("testTax").value) || 0;
    const total = subtotal + shipping + tax;
    
    document.getElementById("testSubtotal").textContent = subtotal.toFixed(2);
    document.getElementById("testTotal").textContent = total.toFixed(2);
  }
  
  // Add new test item
  function addTestItem() {
    if (testOrderItems.length >= 5) {
      alert("Maximum 5 items per order");
      return;
    }
    
    testOrderItems.push({
      name: "New Product",
      price: 19.99,
      quantity: 1
    });
    
    renderTestOrderItems();
    calculateTestOrderTotal();
  }
  
  // Create test order in database
  async function createTestOrder() {
    // Get customer info
    const customerName = document.getElementById("testCustomerName").value.trim();
    const customerEmail = document.getElementById("testCustomerEmail").value.trim();
    const customerPhone = document.getElementById("testCustomerPhone").value.trim();
    
    // Get shipping info
    const shippingAddress = document.getElementById("testShippingAddress").value.trim();
    const shippingCity = document.getElementById("testShippingCity").value.trim();
    const shippingZip = document.getElementById("testShippingZip").value.trim();
    
    // Get order details
    const status = document.getElementById("testOrderStatus").value;
    const paymentStatus = document.getElementById("testPaymentStatus").value;
    const paymentMethod = document.getElementById("testPaymentMethod").value;
    
    // Calculate totals
    let subtotal = 0;
    testOrderItems.forEach(item => {
      subtotal += (item.price || 0) * (item.quantity || 1);
    });
    
    const shippingCost = parseFloat(document.getElementById("testShippingCost").value) || 0;
    const tax = parseFloat(document.getElementById("testTax").value) || 0;
    const total = subtotal + shippingCost + tax;
    
    // Validate
    if (!customerName || !customerEmail) {
      alert("Please enter customer name and email");
      return;
    }
    
    if (testOrderItems.length === 0) {
      alert("Please add at least one item to the order");
      return;
    }
    
    // Generate order ID
    const orderId = `TEST-${Date.now().toString().slice(-8)}`;
    
    // Create order object
    const orderData = {
      orderId: orderId,
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      shippingAddress: shippingAddress,
      shippingCity: shippingCity,
      shippingZip: shippingZip,
      items: testOrderItems.map(item => ({
        name: item.name,
        price: parseFloat(item.price.toFixed(2)),
        quantity: parseInt(item.quantity)
      })),
      subtotal: parseFloat(subtotal.toFixed(2)),
      shippingCost: parseFloat(shippingCost.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      status: status,
      paymentStatus: paymentStatus,
      paymentMethod: paymentMethod,
      orderDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      // Save to Firestore
      await addDoc(collection(db, "order_history"), orderData);
      
      // Success
      alert(`✅ Test order created successfully!\nOrder ID: ${orderId}\nTotal: $${total.toFixed(2)}`);
      
      // Close modal and refresh orders
      hideCreateTestOrderModal();
      await loadOrders();
      
    } catch (err) {
      console.error("Error creating test order:", err);
      alert("❌ Error creating test order: " + err.message);
    }
  }

  /* ===== Product Management ===== */
  let editingProductId = null;

  async function loadProducts() {
    const tbody = document.querySelector("#productsTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    const category = document.getElementById("productCategoryFilter")?.value || "";
    const status = document.getElementById("productStatusFilter")?.value || "";
    const searchTerm = (document.getElementById("productSearch")?.value || "").toLowerCase();
    
    try {
      const q = collection(db, "product_list");
      const snap = await getDocs(q);
      
      if (snap.empty) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="10" class="muted">No products found.</td>`;
        tbody.appendChild(tr);
        return;
      }
      
      let products = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Apply filters
      if (category) {
        products = products.filter(product => product.category === category);
      }
      
      if (status) {
        products = products.filter(product => product.status === status);
      }
      
      if (searchTerm) {
        products = products.filter(product => {
          const searchable = [
            product.id,
            product.name || "",
            product.description || "",
            product.merchantId || "",
            product.category || ""
          ].map(x => String(x).toLowerCase()).join(" ");
          
          return searchable.includes(searchTerm);
        });
      }
      
      // Sort by date
      products.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      if (!products.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="10" class="muted">No products match your filters.</td>`;
        tbody.appendChild(tr);
        return;
      }
      
      // Display results
      products.forEach(product => {
        let imageHTML = '<div class="muted">No image</div>';
        
        if (product.imageBase64) {
          imageHTML = `<img src="data:image/jpeg;base64,${product.imageBase64}" 
                           class="product-image-small" 
                           alt="${product.name || 'Product'}" 
                           onerror="this.onerror=null; this.src=''; this.parentNode.innerHTML='<div class=\\'muted\\'>No image</div>';">`;
        }
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${product.id}</td>
          <td class="product-image-cell">${imageHTML}</td>
          <td>${product.name || "-"}</td>
          <td>${product.category || "-"}</td>
          <td>$${parseFloat(product.price || 0).toFixed(2)}</td>
          <td>${product.stockQty || 0}</td>
          <td><span class="chip ${product.status === 'active' ? 'true' : 'false'}">${product.status || "-"}</span></td>
          <td><span class="muted">${(product.merchantId || "").substring(0, 8)}...</span></td>
          <td>${fmtDate(product.createdAt, true)}</td>
          <td>${fmtDate(product.updatedAt, true)}</td>
          <td class="actions">
            <button data-action="edit" data-id="${product.id}">Edit</button>
            <button data-action="toggle-status" data-id="${product.id}">${product.status === 'active' ? 'Deactivate' : 'Activate'}</button>
            <button data-action="delete" data-id="${product.id}">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      
      tbody.onclick = async (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        
        try {
          if (action === "edit") {
            await editProduct(id);
          } else if (action === "toggle-status") {
            await toggleProductStatus(id);
          } else if (action === "delete") {
            if (confirm("Are you sure you want to delete this product?")) {
              await deleteDoc(doc(db, "product_list", id));
              await loadProducts();
            }
          }
        } catch (err) {
          alert(err?.message || "Action failed");
        }
      };
      
    } catch (err) {
      console.error("Error loading products:", err);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="10" class="muted">Error loading products: ${err.message}</td>`;
      tbody.appendChild(tr);
    }
  }

  async function createProduct() {
    const name = document.getElementById("productName").value.trim();
    const description = document.getElementById("productDescription").value.trim();
    const price = parseFloat(document.getElementById("productPrice").value);
    const stockQty = parseInt(document.getElementById("productStockQty").value);
    const category = document.getElementById("productCategory").value;
    const status = document.getElementById("productStatus").value;
    const merchantId = document.getElementById("productMerchantId").value.trim();
    
    // Basic validation
    if (!name || !category || isNaN(price) || price < 0 || isNaN(stockQty) || stockQty < 0) {
      alert("Please fill in all required fields with valid values.");
      return;
    }
    
    // Check merchant if provided
    if (merchantId) {
      try {
        const merchantDoc = await getDoc(doc(db, "verifiedMerchants", merchantId));
        if (!merchantDoc.exists()) {
          if (!confirm("Merchant ID not found in verified merchants. Continue anyway?")) {
            return;
          }
        }
      } catch (err) {
        console.log("Merchant verification skipped:", err);
      }
    }
    
    // Create product data object
    const productData = {
      name,
      description,
      price: parseFloat(price.toFixed(2)),
      stockQty: parseInt(stockQty),
      category,
      status,
      merchantId: merchantId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add image if available (use the global variable)
    if (window.productImageBase64) {
      productData.imageBase64 = window.productImageBase64;
      console.log("Adding base64 image to product");
    }
    
    try {
      console.log("Creating product with data:", productData);
      await addDoc(collection(db, "product_list"), productData);
      
      // Clear form
      document.getElementById("productName").value = "";
      document.getElementById("productDescription").value = "";
      document.getElementById("productPrice").value = "";
      document.getElementById("productStockQty").value = "";
      document.getElementById("productMerchantId").value = "";
      document.getElementById("productCategory").value = "";
      document.getElementById("productStatus").value = "active";
      
      // Clear image
      if (window.removeProductImage) window.removeProductImage();
      
      await loadProducts();
      alert("✅ Product created successfully!");
      
    } catch (err) {
      console.error("Error creating product:", err);
      alert("❌ Error creating product: " + err.message);
    }
  }

  async function editProduct(productId) {
    try {
      const productDoc = await getDoc(doc(db, "product_list", productId));
      
      if (!productDoc.exists()) {
        alert("Product not found!");
        return;
      }
      
      const product = productDoc.data();
      
      // Fill form fields
      document.getElementById("productName").value = product.name || "";
      document.getElementById("productDescription").value = product.description || "";
      document.getElementById("productPrice").value = product.price || "";
      document.getElementById("productStockQty").value = product.stockQty || "";
      document.getElementById("productCategory").value = product.category || "Other";
      document.getElementById("productStatus").value = product.status || "active";
      document.getElementById("productMerchantId").value = product.merchantId || "";
      
      // Handle image preview
      if (product.imageBase64) {
        // Set the global variable
        window.productImageBase64 = product.imageBase64;
        
        const previewImage = document.getElementById('previewImage');
        const previewContainer = document.getElementById('imagePreview');
        const uploadArea = document.getElementById('uploadArea');
        
        if (previewImage) previewImage.src = `data:image/jpeg;base64,${product.imageBase64}`;
        if (previewContainer) previewContainer.style.display = 'block';
        if (uploadArea) uploadArea.style.display = 'none';
      } else {
        // Clear image if none exists
        if (window.removeProductImage) window.removeProductImage();
      }
      
      editingProductId = productId;
      document.getElementById("createProductBtn").style.display = "none";
      document.getElementById("updateProductBtn").style.display = "inline-block";
      document.getElementById("cancelEditBtn").style.display = "inline-block";
      
    } catch (err) {
      alert("Error loading product for editing: " + err.message);
    }
  }

  async function updateProduct() {
    if (!editingProductId) return;
    
    const name = document.getElementById("productName").value.trim();
    const description = document.getElementById("productDescription").value.trim();
    const price = parseFloat(document.getElementById("productPrice").value);
    const stockQty = parseInt(document.getElementById("productStockQty").value);
    const category = document.getElementById("productCategory").value;
    const status = document.getElementById("productStatus").value;
    const merchantId = document.getElementById("productMerchantId").value.trim();
    
    // Basic validation
    if (!name || !category || isNaN(price) || price < 0 || isNaN(stockQty) || stockQty < 0) {
      alert("Please fill in all required fields with valid values.");
      return;
    }
    
    const productData = {
      name,
      description,
      price: parseFloat(price.toFixed(2)),
      stockQty: parseInt(stockQty),
      category,
      status,
      merchantId: merchantId || null,
      updatedAt: new Date()
    };
    
    // Handle image update/removal
    if (window.productImageBase64 === null) {
      // Explicitly remove the image field from Firestore
      productData.imageBase64 = null; // Set to null to remove the field
      console.log("Removing product image from database");
    } else if (window.productImageBase64) {
      // Add new/updated image
      productData.imageBase64 = window.productImageBase64;
      console.log("Updating product image");
    }
    // If window.productImageBase64 is undefined, don't modify the image field
    
    try {
      console.log("Updating product with data:", productData);
      await updateDoc(doc(db, "product_list", editingProductId), productData);
      
      cancelEdit();
      await loadProducts();
      alert("✅ Product updated successfully!");
      
    } catch (err) {
      console.error("Error updating product:", err);
      alert("❌ Error updating product: " + err.message);
    }
  }

  function cancelEdit() {
    editingProductId = null;
    
    // Clear form fields
    document.getElementById("productName").value = "";
    document.getElementById("productDescription").value = "";
    document.getElementById("productPrice").value = "";
    document.getElementById("productStockQty").value = "";
    document.getElementById("productMerchantId").value = "";
    document.getElementById("productCategory").value = "Electronics";
    document.getElementById("productStatus").value = "active";
    
    // Clear image using global function
    if (window.removeProductImage) window.removeProductImage();
    
    document.getElementById("createProductBtn").style.display = "inline-block";
    document.getElementById("updateProductBtn").style.display = "none";
    document.getElementById("cancelEditBtn").style.display = "none";
  }

  async function toggleProductStatus(productId) {
    try {
      const productRef = doc(db, "product_list", productId);
      const productDoc = await getDoc(productRef);
      
      if (!productDoc.exists()) {
        alert("Product not found!");
        return;
      }
      
      const currentStatus = productDoc.data().status || "active";
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      
      await updateDoc(productRef, { 
        status: newStatus,
        updatedAt: new Date() 
      });
      
      await loadProducts();
      alert(`Product status changed to ${newStatus}`);
      
    } catch (err) {
      alert("Error toggling product status: " + err.message);
    }
  }
