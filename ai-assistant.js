// ai-assistant.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIAssistant {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not set in environment variables');
        }
        
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Try different model names - adjust based on what's available
        const availableModels = [
            "gemini-2.5-flash"
        ];
        
        // Use environment variable for model or default to first available
        const modelName = process.env.GEMINI_MODEL || availableModels[0];
        
        try {
            this.model = this.genAI.getGenerativeModel({ 
                model: modelName,
                systemInstruction: this.getSystemInstruction(),
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 1024,
                }
            });
            console.log(`AI Assistant initialized with model: ${modelName}`);
        } catch (modelError) {
            console.error(`Error initializing model ${modelName}:`, modelError);
            
            // Fallback to a basic model
            this.model = this.genAI.getGenerativeModel({ 
                model: "gemini-pro",
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                }
            });
            console.log(`Falling back to gemini-pro model`);
        }
    }

    getSystemInstruction() {
        return `You are a helpful UI assistant for JeahLuy e-commerce site.
Your goal is to guide users by answering their questions AND triggering specific actions.

WEBSITE MAP (URLs and Element IDs):
- Homepage: "/" 
- Login Page: "/login" (Button: ".sign-in")
- Registration Page: "/register" (Button: ".register")
- Forgot Password: "/forget"
- Merchant Dashboard: "/merchant" (Button: "#become-merchant-btn")
- Product Details: "/product-details.html?product=[ID]" (Product cards have data-product-id)
- Cart: Floating cart icon (ID: "cartPreview", Icon: ".cart-icon-container")
- Search: Search bar (ID: "searchInput" or "searchBar")
- User Profile: Profile picture (ID: "profilePic")
- Language/Translate: Floating translate button (ID: "floatTranslateBtn")

ELEMENT SELECTORS:
- #addToCartBtn - Add to Cart button
- #buyNowBtn - Buy Now button
- #loginBtn - Login button
- #registerBtn - Register button
- #logoutBtn - Logout button (merchant)
- .back-button - Back button
- .follow-btn - Follow store button
- .merchant-profile - Become Merchant button

ACTIONS YOU CAN TRIGGER:
1. Navigation (page redirects)
2. Highlighting buttons/elements (visual guide)
3. Opening modals (cart, login, etc.)
4. Clicking buttons programmatically

RULES:
1. If user asks to GO somewhere (login, register, homepage, etc.), respond with action: "navigate" and the target URL
2. If user asks WHERE something is (cart button, login button, etc.), respond with action: "highlight" and the target CSS selector
3. If user asks to DO something (add to cart, login, search), respond with action: "click" and the target CSS selector
4. If no action is needed, use action: "none"
5. ALWAYS include clear, helpful message explaining what you're doing
6. Use simple, friendly language
7. For product-related queries, suggest checking product details page

RESPONSE FORMAT (JSON):
{
  "message": "Your helpful response text here",
  "action": "none|navigate|highlight|click",
  "target": "URL or CSS selector or null",
  "scrollTo": "optional CSS selector for scrolling",
  "delay": 1000 // optional delay in ms before action
}`;
    }

    async processQuery(userMessage, currentPage = "/") {
        try {
            console.log(`Processing query: "${userMessage}" on page: ${currentPage}`);
            
            const prompt = `User is currently on page: ${currentPage}
User query: ${userMessage}

Respond with the exact JSON format specified above.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Clean the response (remove markdown, extra text)
            const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
            
            try {
                const parsedResponse = JSON.parse(cleanText);
                
                // Validate response structure
                if (!parsedResponse.message || !parsedResponse.action) {
                    throw new Error('Invalid response structure');
                }
                
                // Add timestamp
                parsedResponse.timestamp = new Date().toISOString();
                
                return parsedResponse;
                
            } catch (parseError) {
                console.error('Failed to parse AI response:', parseError, 'Raw text:', text);
                
                // Fallback response based on common queries
                return this.getFallbackResponse(userMessage, currentPage);
            }
            
        } catch (error) {
            console.error('AI Assistant error:', error);
            
            return {
                message: this.getFallbackMessage(userMessage),
                action: "none",
                target: null,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Helper for fallback responses
    getFallbackResponse(userMessage, currentPage) {
        const message = userMessage.toLowerCase().trim();
        
        // Common navigation queries
        if (message.includes('login') || message.includes('sign in')) {
            return {
                message: "I'll help you navigate to the login page!",
                action: "navigate",
                target: "/login",
                timestamp: new Date().toISOString()
            };
        }
        
        if (message.includes('register') || message.includes('sign up')) {
            return {
                message: "I'll take you to the registration page!",
                action: "navigate",
                target: "/register",
                timestamp: new Date().toISOString()
            };
        }
        
        if (message.includes('cart') || message.includes('shopping')) {
            return {
                message: "Your cart is the shopping cart icon in the bottom right. Click it to view!",
                action: "highlight",
                target: ".cart-icon-container",
                timestamp: new Date().toISOString()
            };
        }
        
        if (message.includes('merchant') || message.includes('seller')) {
            return {
                message: "Click the 'Become Merchant' button in the top right to get started!",
                action: "highlight",
                target: "#become-merchant-btn",
                timestamp: new Date().toISOString()
            };
        }
        
        if (message.includes('home') || message.includes('homepage')) {
            return {
                message: "Taking you back to the homepage!",
                action: "navigate",
                target: "/",
                timestamp: new Date().toISOString()
            };
        }
        
        if (message.includes('search') || message.includes('find')) {
            return {
                message: "Use the search bar at the top to find products!",
                action: "highlight",
                target: "#searchInput",
                timestamp: new Date().toISOString()
            };
        }
        
        // Default fallback
        return {
            message: `I understand you said: "${userMessage}". As an AI assistant, I'm here to help you navigate our e-commerce site. You can ask me to show you where things are or take you to different pages.`,
            action: "none",
            target: null,
            timestamp: new Date().toISOString()
        };
    }

    getFallbackMessage(userMessage) {
        return `I apologize, but I'm having trouble processing your request right now. You asked: "${userMessage}". Please try again or use the website navigation. You can ask me to help you find things or navigate to different pages.`;
    }

    // Helper function to get page context from URL
    getPageContext(url) {
        const pageMap = {
            '/': 'Homepage',
            '/login': 'Login Page',
            '/register': 'Registration Page',
            '/forget': 'Forgot Password Page',
            '/merchant': 'Merchant Dashboard',
            '/product-details': 'Product Details Page',
            '/merchant-register-information': 'Merchant Registration'
        };
        
        return pageMap[url] || url;
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

module.exports = { getAIAssistant };