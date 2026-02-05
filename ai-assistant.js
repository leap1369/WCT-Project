// ai-assistant.js - FIXED VERSION
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

class AIAssistant {
    constructor() {
        this.initialized = false;
        this.model = null;
        
        if (!process.env.GEMINI_API_KEY) {
            console.warn('GEMINI_API_KEY is not set. Using rule-based fallback only.');
            return;
        }
        
        try {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.loadContextAndInitialize();
        } catch (error) {
            console.error('Failed to initialize Gemini AI:', error);
        }
    }

    async loadContextAndInitialize() {
        try {
            const contextDir = path.join(__dirname, 'ai-context');
            
            // 1. Read Website Structure (Navigation & Pages)
            const structurePath = path.join(contextDir, 'structure.json');
            let structureData = {};
            if (fs.existsSync(structurePath)) {
                structureData = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
            }

            // 2. Read Policies (Shipping, Returns, Refunds)
            const policiesPath = path.join(contextDir, 'policies.md');
            let policiesContext = "";
            if (fs.existsSync(policiesPath)) {
                policiesContext = fs.readFileSync(policiesPath, 'utf8');
            }

            // 3. Read Component Guide (What buttons do)
            const componentPath = path.join(contextDir, 'component-guide.md');
            let componentContext = "";
            if (fs.existsSync(componentPath)) {
                componentContext = fs.readFileSync(componentPath, 'utf8');
            }
            
            // Build the "Brain" with all files
            const systemInstruction = this.buildSystemInstruction(structureData, policiesContext, componentContext);
            
            // Initialize Model
            const modelPriority = [
                process.env.GEMINI_MODEL, // Checks .env file first
                "gemini-1.5-flash",       // Primary stable model
                "gemini-1.5-pro"          // Fallback powerful model
            ];
            
            // --- FIXED SECTION START ---
            let activeModelName = null;
            
            // Loop through the priority list until one works
            for (const modelName of modelPriority.filter(Boolean)) {
                try {
                    console.log(`Trying to initialize model: ${modelName}...`);
                    this.model = this.genAI.getGenerativeModel({ 
                        model: modelName,
                        systemInstruction: systemInstruction,
                        generationConfig: {
                            temperature: 0.7, 
                            maxOutputTokens: 1000,
                        }
                    });
                    
                    // If we get here without error, it worked
                    activeModelName = modelName;
                    this.initialized = true;
                    console.log(`✅ AI Assistant initialized with full context using model: ${activeModelName}`);
                    break; // Stop the loop
                } catch (e) {
                    console.warn(`⚠️ Failed to load ${modelName}, trying next...`);
                }
            }

            if (!this.initialized) {
                throw new Error("Could not initialize any Gemini model from the priority list.");
            }
            // --- FIXED SECTION END ---

        } catch (error) {
            console.error('Failed to load AI context:', error);
            this.initialized = false;
        }
    }

    buildSystemInstruction(structureData, policies, components) {
        return `You are Jeeves, the intelligent and friendly AI assistant for the JeahLuy e-commerce platform.

YOUR KNOWLEDGE BASE:
1. **STORE POLICIES** (Use this for shipping, return, and payment questions):
${policies}

2. **WEBSITE MAP** (Use this to know where pages are):
${JSON.stringify(structureData, null, 2)}

3. **INTERFACE GUIDE** (Use this to explain how to use buttons/features):
${components}

BEHAVIOR GUIDELINES:
- **Tone**: Warm, helpful, professional but conversational. Use emojis 🛒.
- **Accuracy**: Only answer based on the provided KNOWLEDGE BASE. If a policy isn't listed, say you don't know.
- **Context Awareness**: You will receive the user's "Current Page". Adapt your answer to where they are right now.
- **Form Helper**: If the user is on a form (Checkout/Login), explain specific fields if asked.

RESPONSE FORMAT (JSON ONLY):
{
  "message": "Your text response here...",
  "action": "none|navigate|highlight|click",
  "target": "CSS selector or URL (optional)",
  "delay": 1000
}`;
    }

    // NEW: Get page type from URL (server-side safe)
    getPageTypeFromURL(url) {
        if (!url) return 'unknown';
        
        const urlStr = url.toLowerCase();
        if (urlStr.includes('login')) return 'login';
        if (urlStr.includes('register')) return 'registration';
        if (urlStr.includes('forget')) return 'password_reset';
        if (urlStr.includes('checkout') || urlStr.includes('payment')) return 'checkout';
        if (urlStr.includes('merchant')) return 'merchant_dashboard';
        if (urlStr.includes('product-details')) return 'product_details';
        if (urlStr.includes('homepage') || url === '/' || url === '/homepage.html') return 'homepage';
        
        return 'unknown';
    }

    // NEW: Get page context from pageDetails (server-side safe)
    getPageContext(pageDetails = null) {
        try {
            if (!pageDetails) {
                return {
                    pageType: 'unknown',
                    timestamp: new Date().toISOString()
                };
            }
            
            const context = {
                pageType: this.getPageTypeFromURL(pageDetails.url || pageDetails.pathname),
                url: pageDetails.url || '',
                title: pageDetails.title || '',
                timestamp: new Date().toISOString()
            };
            
            // Add form info if available
            if (pageDetails.forms && Array.isArray(pageDetails.forms)) {
                context.forms = pageDetails.forms;
            }
            
            // Add common elements if available
            if (pageDetails.commonElements) {
                context.commonElements = pageDetails.commonElements;
            }
            
            return context;
        } catch (error) {
            console.error('Error getting page context:', error);
            return {
                pageType: this.getPageTypeFromURL(pageDetails?.url || pageDetails?.pathname),
                timestamp: new Date().toISOString(),
                error: 'Context extraction failed'
            };
        }
    }

    async processQuery(userMessage, currentPage = "/", pageDetails = null) {
        console.log(`🤖 AI Query: "${userMessage}" on page: ${currentPage}`);
        
        // Get page context safely
        const pageContext = this.getPageContext(pageDetails);

        // Check if user wants to buy something specific
        const purchaseInfo = this.detectPurchaseIntent(userMessage);
        if (purchaseInfo.shouldAutoSearch) {
            // Return special action to auto-search and guide through purchase
            return this.createPurchaseGuideResponse(purchaseInfo, currentPage, pageContext);
        }
        // Always try to use the AI if initialized
        if (this.initialized && this.model) {
            try {
                const aiResponse = await this.getAIResponse(userMessage, currentPage, pageContext);
                console.log('✅ AI Response successful');
                return aiResponse;
            } catch (aiError) {
                console.warn('⚠️ AI failed, using rule-based fallback:', aiError.message);
            }
        }
        
        // Fallback to rule-based responses with page context
        console.log('🔄 Using rule-based fallback system');
        return this.getRuleBasedResponse(userMessage, currentPage, pageContext);
    }
    detectPurchaseIntent(userMessage) {
        const message = userMessage.toLowerCase().trim();
        
        // Keywords that indicate purchase intent
        const buyKeywords = ['buy', 'purchase', 'order', 'get', 'want to buy', 'looking for', 'need to buy', 'shopping for'];
        const ignoreWords = ['a', 'an', 'the', 'some', 'any', 'my', 'your', 'our'];
        
        for (const keyword of buyKeywords) {
            if (message.includes(keyword)) {
                // Extract product name
                const parts = message.split(keyword);
                if (parts.length > 1) {
                    let productName = parts[1].trim();
                    
                    // Remove common ignore words
                    ignoreWords.forEach(word => {
                        const regex = new RegExp(`^${word}\\s+`, 'i');
                        productName = productName.replace(regex, '');
                    });
                    
                    // Remove punctuation
                    productName = productName.replace(/[.,!?;:]/g, '').trim();
                    
                    if (productName) {
                        return {
                            shouldAutoSearch: true,
                            productName: productName,
                            actionKeyword: keyword,
                            originalMessage: userMessage
                        };
                    }
                }
            }
        }
        
        return { shouldAutoSearch: false, productName: '' };
    }

    createPurchaseGuideResponse(purchaseInfo, currentPage, pageContext) {
        const { productName, actionKeyword } = purchaseInfo;
        
        return {
            message: `Perfect! Let me help you get "${productName}"! 🛍️\n\nI'll guide you through the entire process:\n\n1. **Searching**: I've already searched for "${productName}" (check the search bar!)\n2. **Select Product**: Click on the product you want from the results\n3. **Add to Cart**: Click "Add to Cart" on the product page\n4. **Checkout**: Go to the cart icon and click "Proceed to Checkout"\n5. **Fill Info**: I'll help you fill in shipping and payment details\n\nReady to start shopping? Let me know if you need help at any step!`,
            action: "auto_search_guide",
            target: "#searchInput",
            productName: productName,
            steps: [
                { action: "search", target: "#searchInput", query: productName },
                { action: "highlight", target: ".product-card:first-child", message: "Click on the first product" },
                { action: "highlight", target: ".add-to-cart", message: "Click Add to Cart" },
                { action: "highlight", target: ".cart-icon-container", message: "Click Cart Icon" },
                { action: "highlight", target: ".view-cart-btn", message: "Click Proceed to Checkout" }
            ],
            delay: 500,
            timestamp: new Date().toISOString(),
            source: "purchase-guide-system"
        };
    }

    async getAIResponse(userMessage, currentPage, pageContext) {
        const contextInfo = pageContext ? 
            `\nCurrent Page Context: ${JSON.stringify(pageContext, null, 2)}` : 
            `\nUser is on page: ${currentPage}`;
        
        const prompt = `${contextInfo}
User said: "${userMessage}"

Respond in a friendly, helpful way. Be specific about the current page if relevant. Remember to be conversational and use emojis when appropriate.`;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Clean and parse the response
        const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
        
        try {
            const parsedResponse = JSON.parse(cleanText);
            
            // Validate response
            if (!parsedResponse.message) {
                throw new Error('No message in response');
            }
            
            // Ensure proper action
            if (!parsedResponse.action) {
                parsedResponse.action = "none";
            }
            
            // Add metadata
            parsedResponse.timestamp = new Date().toISOString();
            parsedResponse.source = "gemini-ai";
            parsedResponse.query = userMessage;
            parsedResponse.pageContext = pageContext;
            
            return parsedResponse;
            
        } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            
            // Try to extract JSON
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const extracted = JSON.parse(jsonMatch[0]);
                    extracted.timestamp = new Date().toISOString();
                    extracted.source = "gemini-ai-parsed";
                    return extracted;
                } catch (e) {
                    // Continue to text response
                }
            }
            
            // Return as a text response
            return {
                message: cleanText,
                action: "none",
                target: null,
                timestamp: new Date().toISOString(),
                source: "gemini-ai-text"
            };
        }
    }

    // NEW: Helper to create field help response
    createFieldHelpResponse(fieldType, fieldInfo) {
        const responses = {
            'zip': {
                message: `I see you're asking about the ${fieldInfo.label || fieldInfo.placeholder || fieldInfo.name || 'zip code'} field! 📮 This is your postal/zip code for delivery. For Cambodia, common codes are: Phnom Penh (12000), Siem Reap (17259), Sihanoukville (18000). If unsure, you can leave it blank or ask your local post office.`,
                selector: fieldInfo.id ? `#${fieldInfo.id}` : fieldInfo.name ? `[name="${fieldInfo.name}"]` : null
            },
            'address': {
                message: `The ${fieldInfo.label || fieldInfo.placeholder || fieldInfo.name || 'address'} field is for your complete delivery address. 📍 Include: street name, house number, district. Example: "123 Street 456, Sangkat Toul Svay Prey, Khan Chamkarmon". This helps our delivery team find you!`,
                selector: fieldInfo.id ? `#${fieldInfo.id}` : fieldInfo.name ? `[name="${fieldInfo.name}"]` : null
            },
            'phone': {
                message: `The ${fieldInfo.label || fieldInfo.placeholder || fieldInfo.name || 'phone'} field needs your contact number. 📱 Use Cambodian format: 012 345 678 or +855 12 345 678. This allows our delivery team to call you if needed!`,
                selector: fieldInfo.id ? `#${fieldInfo.id}` : fieldInfo.name ? `[name="${fieldInfo.name}"]` : null
            },
            'email': {
                message: `The ${fieldInfo.label || fieldInfo.placeholder || fieldInfo.name || 'email'} field requires your email address. 📧 Enter the email you used to register, like "yourname@example.com". This is used for order confirmation and account recovery.`,
                selector: fieldInfo.id ? `#${fieldInfo.id}` : fieldInfo.name ? `[name="${fieldInfo.name}"]` : null
            },
            'name': {
                message: `The ${fieldInfo.label || fieldInfo.placeholder || fieldInfo.name || 'name'} field is for your full name. 👤 Enter your first and last name as you'd like it to appear on your order and delivery. Example: "John Smith".`,
                selector: fieldInfo.id ? `#${fieldInfo.id}` : fieldInfo.name ? `[name="${fieldInfo.name}"]` : null
            }
        };
        
        const response = responses[fieldType] || {
            message: `The ${fieldInfo.label || fieldInfo.placeholder || fieldInfo.name || 'field'} requires ${fieldType} information. Please fill it with your ${fieldType}.`,
            selector: fieldInfo.id ? `#${fieldInfo.id}` : fieldInfo.name ? `[name="${fieldInfo.name}"]` : null
        };
        
        return {
            message: response.message,
            action: response.selector ? "highlight" : "none",
            target: response.selector,
            highlightField: response.selector ? {
                selector: response.selector,
                fieldName: fieldInfo.label || fieldInfo.name || fieldType
            } : null,
            delay: 500,
            timestamp: new Date().toISOString(),
            source: "rule-based-form-help"
        };
    }

    // NEW: Get form field help
    getFormFieldHelp(message, forms) {
        const fieldKeywords = {
            'zip': ['zip', 'postal', 'code', 'post code'],
            'address': ['address', 'location', 'where i live', 'my address', 'street'],
            'phone': ['phone', 'number', 'mobile', 'contact', 'call'],
            'email': ['email', 'e-mail', 'mail'],
            'name': ['name', 'full name', 'my name', 'first name', 'last name']
        };
        
        for (const form of forms) {
            if (form.fields && Array.isArray(form.fields)) {
                for (const field of form.fields) {
                    for (const [fieldType, keywords] of Object.entries(fieldKeywords)) {
                        for (const keyword of keywords) {
                            if (message.toLowerCase().includes(keyword)) {
                                // Check if field matches the keyword
                                const fieldText = (
                                    field.label?.toLowerCase() || 
                                    field.placeholder?.toLowerCase() || 
                                    field.name?.toLowerCase() || 
                                    ''
                                );
                                
                                if (fieldText.includes(keyword) || keyword.includes(fieldType)) {
                                    return this.createFieldHelpResponse(fieldType, field);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return null;
    }

    getRuleBasedResponse(userMessage, currentPage, pageContext = null) {
        const message = userMessage.toLowerCase().trim();
        const pageType = pageContext?.pageType || this.getPageTypeFromURL(currentPage);
        
            // Check for purchase intent first
    const purchaseInfo = this.detectPurchaseIntent(userMessage);
    if (purchaseInfo.shouldAutoSearch) {
        return this.createPurchaseGuideResponse(purchaseInfo, currentPage, pageContext);
    }

        // First, check for form field help if we have form data
        if (pageContext?.forms && pageContext.forms.length > 0) {
            const formHelp = this.getFormFieldHelp(message, pageContext.forms);
            if (formHelp) {
                return formHelp;
            }
        }
        
        // Page-specific responses for homepage
        if (pageType === 'homepage') {
            if (message.includes('zip') || message.includes('postal') || message.includes('code')) {
                return {
                    message: "I see you're asking about zip code! 📮 On JeahLuy, zip codes are used during checkout for delivery. For Cambodia:\n\n• Phnom Penh: 12000\n• Siem Reap: 17259\n• Sihanoukville: 18000\n\nYou'll need this when you proceed to checkout. Want to see your cart?",
                    action: "highlight",
                    target: ".cart-icon-container",
                    delay: 1000,
                    timestamp: new Date().toISOString(),
                    source: "rule-based-page-aware"
                };
            }
            
            if (message.includes('checkout') || message.includes('pay') || message.includes('buy')) {
                return {
                    message: "Ready to checkout? 🛒 First, add items to your cart by clicking 'Add to Cart' on products. Then click the shopping cart icon in the bottom right! I can help you fill in your address and zip code when you get to the checkout page.",
                    action: "highlight",
                    target: ".cart-icon-container",
                    delay: 1000,
                    timestamp: new Date().toISOString(),
                    source: "rule-based-page-aware"
                };
            }
        }
        
        // Original rule-based responses (keep your existing ones)
        const responseMap = [
            {
                keywords: ['hello', 'hi', 'hey', 'greetings'],
                response: () => ({
                    message: this.getRandomGreeting(),
                    action: "none",
                    target: null
                })
            },
            {
                keywords: ['login', 'sign in', 'log in'],
                response: () => ({
                    message: `Need to sign in? No problem! 😊 Just click the "Sign In" button at the top right of the page. If you don't have an account yet, you can register first!`,
                    action: "highlight",
                    target: ".sign-in",
                    scrollTo: "header"
                })
            },
            {
                keywords: ['register', 'sign up', 'create account'],
                response: () => ({
                    message: `Ready to join JeahLuy? Awesome! 🎉 Click the "Register" button next to Sign In. It only takes a minute to create your account!`,
                    action: "highlight",
                    target: ".register",
                    scrollTo: "header"
                })
            },
            {
                keywords: ['cart', 'shopping cart', 'basket', 'my cart'],
                response: () => ({
                    message: `Your shopping cart is right here! 🛒 Look for the cart icon floating in the bottom right corner. Click it to see what's inside!`,
                    action: "highlight",
                    target: ".cart-icon-container",
                    delay: 500
                })
            },
            {
                keywords: ['merchant', 'seller', 'become merchant', 'sell'],
                response: () => ({
                    message: `Want to become a merchant? That's great! 🛍️ Click the "Become Merchant" button in the top right. You'll need to be logged in first. Once you're a merchant, you can start selling your products!`,
                    action: "highlight",
                    target: "#become-merchant-btn",
                    scrollTo: "header"
                })
            },
            {
                keywords: ['search', 'find', 'look for'],
                response: () => ({
                    message: `Looking for something specific? 🔍 Just type what you're looking for in the search bar at the top of the page. You can also use the microphone icon for voice search!`,
                    action: "highlight",
                    target: "#searchInput",
                    scrollTo: ".search-section"
                })
            },
            {
                keywords: ['products', 'items', 'goods', 'shop'],
                response: () => ({
                    message: `Check out our awesome products below! 🎁 You can browse by category or use the search bar. Click any product to see more details.`,
                    action: "scroll",
                    target: "#productsContainer",
                    delay: 300
                })
            },
            {
                keywords: ['categories', 'filter', 'category'],
                response: () => ({
                    message: `Want to filter by category? 📁 Just click any category icon above the products. We've got everything organized for you!`,
                    action: "highlight",
                    target: "#categoriesContainer",
                    scrollTo: ".search-section"
                })
            },
            {
                keywords: ['profile', 'account', 'my account', 'settings'],
                response: () => ({
                    message: `Your profile is just a click away! 👤 Click your profile picture at the top left to open your account settings, order history, and more!`,
                    action: "click",
                    target: "#profilePic",
                    delay: 300
                })
            },
            {
                keywords: ['order', 'my order', 'purchase', 'track order'],
                response: () => ({
                    message: `Want to check your orders? 📦 Click your profile picture, then select "Order History" or check the order tabs (To Pay, To Ship, etc.). You can track everything there!`,
                    action: "click",
                    target: "#profilePic",
                    delay: 300
                })
            },
            {
                keywords: ['help', 'support', 'faq', 'question'],
                response: () => ({
                    message: `I'm here to help! 🤗 What do you need assistance with? You can ask me about navigation, orders, payments, or anything about JeahLuy!`,
                    action: "none",
                    target: null
                })
            },
            {
                keywords: ['payment', 'checkout', 'buy', 'pay'],
                response: () => ({
                    message: `Ready to checkout? 💳 Add items to your cart first, then click the cart icon and select "Proceed to Checkout". We accept cash on delivery, cards, PayPal, and KHQR!`,
                    action: "click",
                    target: ".cart-icon-container",
                    delay: 500
                })
            },
            {
                keywords: ['shipping', 'delivery', 'ship'],
                response: () => ({
                    message: `Shipping info: 🚚 Free shipping on orders over $50! Standard takes 3-5 days ($5.99), Express takes 1-2 days ($12.99). We ship to Cambodia, USA, Japan, Singapore, and Thailand!`,
                    action: "none",
                    target: null
                })
            },
            {
                keywords: ['return', 'refund', 'exchange'],
                response: () => ({
                    message: `Returns & refunds: 🔄 30-day return policy! Items must be unused in original packaging. Go to Order History to start a return. Refunds go back to your original payment method.`,
                    action: "none",
                    target: null
                })
            }
        ];

        // Find matching response
        for (const item of responseMap) {
            for (const keyword of item.keywords) {
                if (message.includes(keyword)) {
                    const response = item.response();
                    response.timestamp = new Date().toISOString();
                    response.source = "rule-based";
                    return response;
                }
            }
        }

        // Default response with page context
        return {
            message: this.getDefaultResponseWithContext(userMessage, pageType),
            action: "none",
            target: null,
            timestamp: new Date().toISOString(),
            source: "rule-based-default"
        };
    }

    getDefaultResponseWithContext(userMessage, pageType) {
        const pageSpecific = {
            'homepage': `"${userMessage}" - I see you're on the homepage! 🏠 I can help you shop, find products, or navigate to checkout. What would you like to do?`,
            'login': `"${userMessage}" - You're on the login page! 🔐 Need help signing in or creating an account?`,
            'checkout': `"${userMessage}" - You're on the checkout page! 💳 I can help explain address fields, zip codes, or payment methods.`,
            'unknown': this.getDefaultResponse(userMessage)
        };
        
        return pageSpecific[pageType] || pageSpecific.unknown;
    }

    getRandomGreeting() {
        const greetings = [
            `Hello there! 👋 I'm Jeeves, your JeahLuy assistant. How can I help you today?`,
            `Hi! 😊 Welcome to JeahLuy! I'm here to help you shop, navigate, or answer any questions. What would you like to do?`,
            `Hey! 🎉 Great to see you! I'm your friendly AI assistant for JeahLuy. Need help finding something or navigating the site?`,
            `Greetings! 🤗 I'm here to make your shopping experience awesome. What can I help you with today?`,
            `Hi there! 🌟 Ready to shop? I can help you find products, navigate the site, or answer questions. What's on your mind?`
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    getDefaultResponse(userMessage) {
        const responses = [
            `I understand you said: "${userMessage}". I'm Jeeves, your JeahLuy assistant! 😊 I can help you navigate the site, find products, check orders, or answer questions about shipping and returns. What would you like to know?`,
            `"${userMessage}" - got it! 🤔 I'm here to help with anything on JeahLuy. You can ask me about shopping, your account, orders, payments, or just general navigation. What do you need help with?`,
            `Thanks for reaching out! 🙏 I'm Jeeves, your shopping assistant. I can help you: find products, navigate to different pages, check your orders, or learn about our policies. What would you like to do?`,
            `I heard: "${userMessage}". 👍 As your JeahLuy assistant, I'm here to make shopping easier! Need help finding something? Want to check out? Looking for your orders? Just ask!`,
            `"${userMessage}" - thanks for sharing! 💭 I'm Jeeves, and I specialize in helping with: product search, cart management, order tracking, account settings, and general navigation. How can I assist you?`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
}

// Export singleton instance
let aiInstance = null;
function getAIAssistant() {
    if (!aiInstance) {
        aiInstance = new AIAssistant();
    }
    return aiInstance;
}

module.exports = { getAIAssistant: () => new AIAssistant() };