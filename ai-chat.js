// ai-chat.js - Fixed draggable functionality
class AIChat {
    constructor() {
        this.chatOpen = false;
        this.messages = [];
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.togglePosition = { x: 20, y: window.innerHeight - 100 }; // Start near bottom
        this.init();
    }

    init() {
        // Create chat UI if not exists
        if (!document.getElementById('aiChatWidget')) {
            this.createChatUI();
        }
        
        // Load previous messages
        this.loadMessages();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup draggable functionality
        this.setupDraggable();
        
        // Auto-open if there are unread messages
        if (this.messages.some(msg => !msg.read)) {
            setTimeout(() => this.openChat(), 1000);
        }
    }

    createChatUI() {
        const chatHTML = `
            <div id="aiChatWidget" class="ai-chat-widget">
                <!-- Draggable Toggle Button (Always Visible) -->
                <button id="chatToggleBtn" class="chat-toggle-btn draggable" 
                        style="left: ${this.togglePosition.x}px; top: ${this.togglePosition.y}px;">
                    <div class="toggle-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="toggle-text">
                        <span class="toggle-label">Ask Jeeves</span>
                    </div>
                    <span class="chat-badge">0</span>
                </button>
                
                <!-- Chat Container (Hidden when closed) -->
                <div class="chat-container">
                    <div class="chat-header draggable">
                        <div class="drag-handle">
                            <i class="fas fa-grip-horizontal"></i>
                        </div>
                        <div class="chat-header-title">
                            <i class="fas fa-robot"></i>
                            <span class="title-text">Jeeves Assistant</span>
                        </div>
                        <div class="chat-header-actions">
                            <button class="header-btn minimize-btn" title="Minimize">
                                <i class="fas fa-minus"></i>
                            </button>
                            <button class="header-btn close-btn" title="Close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="chat-messages" id="chatMessages">
                        <div class="welcome-section">
                            <div class="welcome-avatar">
                                <div class="avatar-circle">
                                    <i class="fas fa-robot"></i>
                                </div>
                                <div class="welcome-text">
                                    <div class="welcome-title">Hello! I'm Jeeves 👋</div>
                                    <div class="welcome-subtitle">Your JeahLuy shopping assistant</div>
                                </div>
                            </div>
                            
                            <div class="welcome-message">
                                <div class="message-bubble ai-message welcome-bubble">
                                    <div class="message-content">
                                        I can help you with:
                                        <div class="capabilities-grid">
                                            <div class="capability-item">
                                                <i class="fas fa-search"></i>
                                                <span class="capability-text">Product Search</span>
                                            </div>
                                            <div class="capability-item">
                                                <i class="fas fa-shopping-cart"></i>
                                                <span class="capability-text">Cart & Checkout</span>
                                            </div>
                                            <div class="capability-item">
                                                <i class="fas fa-box-open"></i>
                                                <span class="capability-text">Order Tracking</span>
                                            </div>
                                            <div class="capability-item">
                                                <i class="fas fa-user-circle"></i>
                                                <span class="capability-text">Account Help</span>
                                            </div>
                                        </div>
                                        <div class="welcome-hint">
                                            <i class="fas fa-lightbulb"></i>
                                            <span class="hint-text">Try asking: "Where's my cart?" or "How do I login?"</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="chat-input-area">
                        <div class="quick-actions">
                            <div class="quick-actions-title">Quick Actions:</div>
                            <div class="quick-buttons-container">
                                <div class="quick-buttons-scroll">
                                    <div class="quick-buttons" id="quickButtons">
                                        <button class="quick-btn" data-query="Where is the cart?">
                                            <i class="fas fa-shopping-cart"></i>
                                            <span class="quick-btn-text">Cart</span>
                                        </button>
                                        <button class="quick-btn" data-query="How do I login?">
                                            <i class="fas fa-sign-in-alt"></i>
                                            <span class="quick-btn-text">Login</span>
                                        </button>
                                        <button class="quick-btn" data-query="I want to search for products">
                                            <i class="fas fa-search"></i>
                                            <span class="quick-btn-text">Search</span>
                                        </button>
                                        <button class="quick-btn" data-query="How to become merchant?">
                                            <i class="fas fa-store"></i>
                                            <span class="quick-btn-text">Merchant</span>
                                        </button>
                                        <button class="quick-btn" data-query="Check my orders">
                                            <i class="fas fa-box-open"></i>
                                            <span class="quick-btn-text">Orders</span>
                                        </button>
                                        <button class="quick-btn" data-query="Payment methods">
                                            <i class="fas fa-credit-card"></i>
                                            <span class="quick-btn-text">Payments</span>
                                        </button>
                                        <button class="quick-btn" data-query="Shipping info">
                                            <i class="fas fa-shipping-fast"></i>
                                            <span class="quick-btn-text">Shipping</span>
                                        </button>
                                        <button class="quick-btn" data-query="Return policy">
                                            <i class="fas fa-exchange-alt"></i>
                                            <span class="quick-btn-text">Returns</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="input-wrapper">
                            <div class="input-container">
                                <textarea 
                                    id="chatInput" 
                                    placeholder="Ask me anything about JeahLuy..."
                                    rows="1"
                                    class="chat-textarea"
                                ></textarea>
                                <div class="input-actions">
                                    <button class="input-action-btn" title="Clear" onclick="document.getElementById('chatInput').value = ''">
                                        <i class="fas fa-times"></i>
                                    </button>
                                    <button id="sendMessageBtn" class="send-btn" title="Send message">
                                        <i class="fas fa-paper-plane"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="input-hint">
                            <i class="fas fa-info-circle"></i>
                            <span class="hint-text">Press Enter to send, Shift+Enter for new line</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', chatHTML);
        
        // Add styles
        this.addStyles();
    }

    addStyles() {
        const styles = `
            <style>
                /* Reset and Base Styles */
                .ai-chat-widget {
                    position: fixed;
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    user-select: none;
                }
                
                /* Toggle Button - Always Visible and Draggable */
                .chat-toggle-btn {
                    position: fixed !important;
                    background: linear-gradient(135deg, #85BB65, #6AA84F);
                    border: none;
                    color: white;
                    cursor: grab !important;
                    box-shadow: 0 8px 25px rgba(133, 187, 101, 0.4);
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 15px;
                    border-radius: 50px;
                    font-weight: 600;
                    font-size: 13px;
                    animation: pulse 2s infinite;
                    z-index: 10001;
                    touch-action: none;
                    white-space: nowrap;
                    overflow: hidden;
                    max-width: 140px;
                }
                
                .chat-toggle-btn:active {
                    cursor: grabbing !important;
                    transform: scale(0.98);
                    box-shadow: 0 4px 15px rgba(133, 187, 101, 0.6);
                }
                
                .chat-toggle-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 30px rgba(133, 187, 101, 0.5);
                }
                
                .toggle-icon {
                    font-size: 18px;
                    flex-shrink: 0;
                }
                
                .toggle-text {
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                }
                
                .toggle-label {
                    display: block;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                @keyframes pulse {
                    0% { box-shadow: 0 8px 25px rgba(133, 187, 101, 0.4); }
                    50% { box-shadow: 0 8px 25px rgba(133, 187, 101, 0.6); }
                    100% { box-shadow: 0 8px 25px rgba(133, 187, 101, 0.4); }
                }
                
                .chat-badge {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: #ff4757;
                    color: white;
                    border-radius: 50%;
                    min-width: 20px;
                    height: 20px;
                    font-size: 11px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    box-shadow: 0 2px 8px rgba(255, 71, 87, 0.3);
                }
                
                /* Chat Container */
                .chat-container {
                    position: fixed;
                    width: 380px;
                    height: 550px;
                    background: white;
                    border-radius: 15px;
                    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.25);
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid #e0e0e0;
                    z-index: 10002;
                    resize: both;
                    overflow: hidden;
                    min-width: 300px;
                    min-height: 400px;
                    max-width: 90vw;
                    max-height: 90vh;
                }
                
                .ai-chat-widget.open .chat-container {
                    display: flex;
                    animation: slideUp 0.3s ease;
                }
                
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                /* Draggable Header */
                .chat-header {
                    background: linear-gradient(135deg, #85BB65, #6AA84F);
                    color: white;
                    padding: 12px 15px;
                    cursor: grab;
                    user-select: none;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0;
                }
                
                .chat-header:active {
                    cursor: grabbing;
                }
                
                .drag-handle {
                    padding: 5px;
                    opacity: 0.7;
                    cursor: grab;
                    flex-shrink: 0;
                }
                
                .drag-handle:active {
                    cursor: grabbing;
                }
                
                .chat-header-title {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 600;
                    font-size: 14px;
                    min-width: 0;
                }
                
                .title-text {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .chat-header-actions {
                    display: flex;
                    gap: 5px;
                    flex-shrink: 0;
                }
                
                .header-btn {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }
                
                .header-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                
                /* Chat Messages Area */
                .chat-messages {
                    flex: 1;
                    padding: 15px;
                    overflow-y: auto;
                    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                }
                
                /* Welcome Section */
                .welcome-section {
                    margin-bottom: 15px;
                    flex-shrink: 0;
                }
                
                .welcome-avatar {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 15px;
                    padding: 12px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                
                .avatar-circle {
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #85BB65, #6AA84F);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    color: white;
                    flex-shrink: 0;
                }
                
                .welcome-text {
                    flex: 1;
                    min-width: 0;
                }
                
                .welcome-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: #333;
                    margin-bottom: 3px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .welcome-subtitle {
                    font-size: 13px;
                    color: #666;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                /* Message Bubbles */
                .message-bubble {
                    max-width: 85%;
                    margin-bottom: 12px;
                    padding: 12px 15px;
                    border-radius: 18px;
                    position: relative;
                    animation: fadeIn 0.3s ease;
                    font-size: 14px;
                    line-height: 1.5;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .user-message {
                    background: linear-gradient(135deg, #85BB65, #6AA84F);
                    color: white;
                    margin-left: auto;
                    border-bottom-right-radius: 8px;
                    align-self: flex-end;
                }
                
                .ai-message {
                    background: white;
                    color: #333;
                    margin-right: auto;
                    border-bottom-left-radius: 8px;
                    border: 1px solid #e8f4e8;
                    align-self: flex-start;
                }
                
                .welcome-bubble {
                    max-width: 100%;
                    background: white;
                    border: 1px solid #e8f4e8;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }
                
                .message-content {
                    font-size: 14px;
                    line-height: 1.5;
                    word-break: break-word;
                }
                
                .message-time {
                    font-size: 11px;
                    color: #888;
                    margin-top: 6px;
                    text-align: right;
                    opacity: 0.8;
                }
                
                /* Capabilities Grid */
                .capabilities-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    margin: 12px 0;
                }
                
                .capability-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 10px;
                    border: 1px solid #e9ecef;
                    transition: all 0.2s;
                }
                
                .capability-item:hover {
                    background: #e9ecef;
                }
                
                .capability-item i {
                    color: #85BB65;
                    font-size: 14px;
                    width: 16px;
                }
                
                .capability-text {
                    font-size: 12px;
                    font-weight: 500;
                    color: #333;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .welcome-hint {
                    margin-top: 10px;
                    padding: 10px;
                    background: #f0f7eb;
                    border-radius: 10px;
                    border-left: 4px solid #85BB65;
                    font-size: 12px;
                    color: #555;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                /* Quick Actions with Horizontal Scroll */
                .quick-actions {
                    margin-bottom: 12px;
                    flex-shrink: 0;
                }
                
                .quick-actions-title {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 8px;
                    font-weight: 600;
                }
                
                .quick-buttons-container {
                    position: relative;
                }
                
                .quick-buttons-scroll {
                    overflow-x: auto;
                    overflow-y: hidden;
                    padding-bottom: 5px;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: thin;
                    scrollbar-color: #85BB65 #f0f0f0;
                }
                
                .quick-buttons-scroll::-webkit-scrollbar {
                    height: 6px;
                }
                
                .quick-buttons-scroll::-webkit-scrollbar-track {
                    background: #f0f0f0;
                    border-radius: 3px;
                }
                
                .quick-buttons-scroll::-webkit-scrollbar-thumb {
                    background: #85BB65;
                    border-radius: 3px;
                }
                
                .quick-buttons-scroll::-webkit-scrollbar-thumb:hover {
                    background: #6AA84F;
                }
                
                .quick-buttons {
                    display: flex;
                    gap: 8px;
                    padding: 5px 3px;
                    width: max-content;
                    min-width: 100%;
                }
                
                .quick-btn {
                    background: white;
                    border: 1px solid #e0e0e0;
                    color: #555;
                    padding: 8px 12px;
                    border-radius: 10px;
                    font-size: 11px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    flex-shrink: 0;
                    min-width: 60px;
                }
                
                .quick-btn:hover {
                    background: #f0f7eb;
                    border-color: #85BB65;
                    color: #85BB65;
                }
                
                .quick-btn i {
                    font-size: 14px;
                }
                
                .quick-btn-text {
                    font-size: 10px;
                    font-weight: 500;
                }
                
                /* Input Area */
                .chat-input-area {
                    border-top: 1px solid #e0e0e0;
                    padding: 15px;
                    background: white;
                    flex-shrink: 0;
                }
                
                .input-wrapper {
                    margin-bottom: 8px;
                }
                
                .input-container {
                    display: flex;
                    gap: 8px;
                    align-items: flex-end;
                    border: 1px solid #ddd;
                    border-radius: 15px;
                    padding: 10px;
                    background: white;
                    transition: all 0.2s;
                }
                
                .input-container:focus-within {
                    border-color: #85BB65;
                    box-shadow: 0 0 0 2px rgba(133, 187, 101, 0.1);
                }
                
                .chat-textarea {
                    flex: 1;
                    border: none;
                    outline: none;
                    font-size: 14px;
                    resize: none;
                    max-height: 100px;
                    min-height: 20px;
                    line-height: 1.4;
                    font-family: inherit;
                    background: transparent;
                }
                
                .input-actions {
                    display: flex;
                    gap: 5px;
                    align-items: center;
                }
                
                .input-action-btn {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    background: #f5f5f5;
                    border: none;
                    color: #666;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                
                .input-action-btn:hover {
                    background: #e0e0e0;
                }
                
                .send-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #85BB65, #6AA84F);
                    border: none;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                }
                
                .send-btn:hover {
                    background: linear-gradient(135deg, #6AA84F, #558B2F);
                    transform: scale(1.05);
                }
                
                .input-hint {
                    font-size: 11px;
                    color: #888;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                
                /* Typing Indicator */
                .typing-indicator {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px;
                    color: #666;
                    font-size: 13px;
                }
                
                .typing-dots {
                    display: flex;
                    gap: 4px;
                }
                
                .typing-dots span {
                    width: 8px;
                    height: 8px;
                    background: #85BB65;
                    border-radius: 50%;
                    animation: bounce 1.4s infinite ease-in-out both;
                }
                
                .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
                .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
                .typing-dots span:nth-child(3) { animation-delay: 0s; }
                
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1); }
                }
                
                /* Dark Mode */
                body.dark-mode .chat-container {
                    background: #2d2d2d;
                    border-color: #444;
                }
                
                body.dark-mode .chat-header {
                    background: linear-gradient(135deg, #6AA84F, #558B2F);
                }
                
                body.dark-mode .chat-messages {
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                }
                
                body.dark-mode .ai-message {
                    background: #3d3d3d;
                    border-color: #444;
                    color: #f0f0f0;
                }
                
                body.dark-mode .welcome-avatar {
                    background: #3d3d3d;
                }
                
                body.dark-mode .quick-btn {
                    background: #3d3d3d;
                    border-color: #555;
                    color: #f0f0f0;
                }
                
                /* Responsive */
                @media (max-width: 768px) {
                    .chat-container {
                        width: 90vw;
                        height: 70vh;
                        left: 5vw !important;
                        top: 15vh !important;
                        right: auto !important;
                        bottom: auto !important;
                    }
                    
                    .chat-toggle-btn {
                        max-width: 120px;
                        font-size: 12px;
                        padding: 10px 12px;
                    }
                }
                
                @media (max-width: 480px) {
                    .chat-container {
                        width: 100vw;
                        height: 100vh;
                        border-radius: 0;
                        left: 0 !important;
                        top: 0 !important;
                    }
                    
                    .chat-toggle-btn {
                        bottom: 20px !important;
                        right: 20px !important;
                        left: auto !important;
                        top: auto !important;
                    }
                }
                    .field-tooltip {
    background: linear-gradient(135deg, #85BB65, #6AA84F);
    color: white;
    padding: 12px 15px;
    border-radius: 10px;
    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    max-width: 300px;
    animation: slideDown 0.3s ease;
    font-size: 14px;
    line-height: 1.4;
}

.tooltip-content {
    position: relative;
}

.tooltip-content:after {
    content: '';
    position: absolute;
    top: 100%;
    left: 20px;
    border-width: 8px;
    border-style: solid;
    border-color: #85BB65 transparent transparent transparent;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Add to the existing styles in ai-chat.js */
.bright-yellow-glow {
    animation: brightYellowPulse 1.5s infinite alternate;
    box-shadow: 0 0 20px #FFFF00, 0 0 40px #FFFF66, 0 0 60px #FFFF99 !important;
    border: 3px solid #FFFF00 !important;
    z-index: 9999 !important;
    position: relative;
}

@keyframes brightYellowPulse {
    from {
        box-shadow: 0 0 10px #FFFF00, 0 0 20px #FFFF66;
    }
    to {
        box-shadow: 0 0 25px #FFFF00, 0 0 50px #FFFF66, 0 0 75px #FFFF99;
    }
}

.purchase-guide-container {
    animation: slideInLeft 0.5s ease;
}

@keyframes slideInLeft {
    from {
        transform: translateX(0);
        opacity: 0;
    }
    to {
        transform: translateX(-100%);
        opacity: 1;
    }
}

/* Enhanced field highlighting for checkout */
.field-glow {
    animation: fieldPulse 2s infinite;
    border: 3px solid #FFFF00 !important;
    background-color: rgba(255, 255, 204, 0.2) !important;
    box-shadow: 0 0 15px #FFFF00, inset 0 0 10px rgba(255, 255, 102, 0.3) !important;
}

@keyframes fieldPulse {
    0%, 100% { box-shadow: 0 0 10px #FFFF00, inset 0 0 5px rgba(255, 255, 102, 0.3); }
    50% { box-shadow: 0 0 20px #FFFF00, inset 0 0 10px rgba(255, 255, 102, 0.5); }
}

.tooltip-arrow {
    position: absolute;
    bottom: -8px;
    left: 20px;
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid #85BB65;
}
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    setupEventListeners() {
        const toggleBtn = document.getElementById('chatToggleBtn');
        const sendBtn = document.getElementById('sendMessageBtn');
        const chatInput = document.getElementById('chatInput');
        const minimizeBtn = document.querySelector('.minimize-btn');
        const closeBtn = document.querySelector('.close-btn');
        
        // Toggle chat
        toggleBtn.addEventListener('click', (e) => {
            if (!this.isDragging) {
                this.toggleChat();
            }
        });
        
        // Send message
        sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Enter to send
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        chatInput.addEventListener('input', (e) => {
            this.adjustTextareaHeight(e.target);
        });
        
        // Minimize button
        minimizeBtn.addEventListener('click', () => this.closeChat());
        
        // Close button
        closeBtn.addEventListener('click', () => this.closeChat());
        
        // Quick action buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const query = btn.getAttribute('data-query');
                document.getElementById('chatInput').value = query;
                this.sendMessage();
            });
        });
    }

    setupDraggable() {
        // Make toggle button draggable
        this.setupToggleDraggable();
        
        // Make chat header draggable (when chat is open)
        this.setupChatDraggable();
    }

    setupToggleDraggable() {
        const toggleBtn = document.getElementById('chatToggleBtn');
        let isDraggingToggle = false;
        let startX, startY, initialX, initialY;
        
        const onMouseDown = (e) => {
            // Don't start drag if clicking on badge
            if (e.target.closest('.chat-badge')) return;
            
            e.preventDefault();
            isDraggingToggle = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // Get current position
            const rect = toggleBtn.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            // Set cursor
            toggleBtn.style.cursor = 'grabbing';
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
        
        const onMouseMove = (e) => {
            if (!isDraggingToggle) return;
            e.preventDefault();
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            let newX = initialX + dx;
            let newY = initialY + dy;
            
            // Constrain to viewport
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const btnWidth = toggleBtn.offsetWidth;
            const btnHeight = toggleBtn.offsetHeight;
            
            newX = Math.max(10, Math.min(newX, viewportWidth - btnWidth - 10));
            newY = Math.max(10, Math.min(newY, viewportHeight - btnHeight - 10));
            
            // Update position
            toggleBtn.style.left = newX + 'px';
            toggleBtn.style.top = newY + 'px';
            
            // Update stored position
            this.togglePosition = { x: newX, y: newY };
        };
        
        const onMouseUp = () => {
            if (!isDraggingToggle) return;
            
            isDraggingToggle = false;
            toggleBtn.style.cursor = 'grab';
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            // Save position
            this.saveTogglePosition();
        };
        
        // Mouse events
        toggleBtn.addEventListener('mousedown', onMouseDown);
        
        // Touch events for mobile
        toggleBtn.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            isDraggingToggle = true;
            startX = touch.clientX;
            startY = touch.clientY;
            
            const rect = toggleBtn.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            const onTouchMove = (e) => {
                if (!isDraggingToggle) return;
                const touch = e.touches[0];
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;
                
                let newX = initialX + dx;
                let newY = initialY + dy;
                
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const btnWidth = toggleBtn.offsetWidth;
                const btnHeight = toggleBtn.offsetHeight;
                
                newX = Math.max(10, Math.min(newX, viewportWidth - btnWidth - 10));
                newY = Math.max(10, Math.min(newY, viewportHeight - btnHeight - 10));
                
                toggleBtn.style.left = newX + 'px';
                toggleBtn.style.top = newY + 'px';
                this.togglePosition = { x: newX, y: newY };
            };
            
            const onTouchEnd = () => {
                isDraggingToggle = false;
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
                this.saveTogglePosition();
            };
            
            document.addEventListener('touchmove', onTouchMove);
            document.addEventListener('touchend', onTouchEnd);
        });
    }

    setupChatDraggable() {
        const chatHeader = document.querySelector('.chat-header');
        const chatContainer = document.querySelector('.chat-container');
        let isDraggingChat = false;
        let startX, startY, initialX, initialY;
        
        const onMouseDown = (e) => {
            // Don't start drag if clicking on buttons
            if (e.target.closest('.header-btn')) return;
            
            e.preventDefault();
            isDraggingChat = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // Get current position
            const rect = chatContainer.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            // Set cursor
            chatHeader.style.cursor = 'grabbing';
            chatContainer.style.cursor = 'grabbing';
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
        
        const onMouseMove = (e) => {
            if (!isDraggingChat) return;
            e.preventDefault();
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            let newX = initialX + dx;
            let newY = initialY + dy;
            
            // Constrain to viewport
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const containerWidth = chatContainer.offsetWidth;
            const containerHeight = chatContainer.offsetHeight;
            
            newX = Math.max(0, Math.min(newX, viewportWidth - containerWidth));
            newY = Math.max(0, Math.min(newY, viewportHeight - containerHeight));
            
            // Update position
            chatContainer.style.left = newX + 'px';
            chatContainer.style.top = newY + 'px';
            chatContainer.style.right = 'auto';
            chatContainer.style.bottom = 'auto';
        };
        
        const onMouseUp = () => {
            if (!isDraggingChat) return;
            
            isDraggingChat = false;
            chatHeader.style.cursor = 'grab';
            chatContainer.style.cursor = 'default';
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            // Save position
            this.saveChatPosition();
        };
        
        // Mouse events
        chatHeader.addEventListener('mousedown', onMouseDown);
        
        // Touch events for mobile
        chatHeader.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            isDraggingChat = true;
            startX = touch.clientX;
            startY = touch.clientY;
            
            const rect = chatContainer.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            const onTouchMove = (e) => {
                if (!isDraggingChat) return;
                const touch = e.touches[0];
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;
                
                let newX = initialX + dx;
                let newY = initialY + dy;
                
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const containerWidth = chatContainer.offsetWidth;
                const containerHeight = chatContainer.offsetHeight;
                
                newX = Math.max(0, Math.min(newX, viewportWidth - containerWidth));
                newY = Math.max(0, Math.min(newY, viewportHeight - containerHeight));
                
                chatContainer.style.left = newX + 'px';
                chatContainer.style.top = newY + 'px';
                chatContainer.style.right = 'auto';
                chatContainer.style.bottom = 'auto';
            };
            
            const onTouchEnd = () => {
                isDraggingChat = false;
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
                this.saveChatPosition();
            };
            
            document.addEventListener('touchmove', onTouchMove);
            document.addEventListener('touchend', onTouchEnd);
        });
    }

    saveTogglePosition() {
        localStorage.setItem('aiChatTogglePosition', JSON.stringify(this.togglePosition));
    }

    saveChatPosition() {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            const rect = chatContainer.getBoundingClientRect();
            const position = { x: rect.left, y: rect.top };
            localStorage.setItem('aiChatContainerPosition', JSON.stringify(position));
        }
    }

    loadTogglePosition() {
        try {
            const saved = localStorage.getItem('aiChatTogglePosition');
            if (saved) {
                const position = JSON.parse(saved);
                this.togglePosition = position;
                
                const toggleBtn = document.getElementById('chatToggleBtn');
                if (toggleBtn) {
                    toggleBtn.style.left = position.x + 'px';
                    toggleBtn.style.top = position.y + 'px';
                }
            }
        } catch (error) {
            console.error('Failed to load toggle position:', error);
        }
    }

    loadChatPosition() {
        try {
            const saved = localStorage.getItem('aiChatContainerPosition');
            if (saved) {
                const position = JSON.parse(saved);
                const chatContainer = document.querySelector('.chat-container');
                if (chatContainer) {
                    chatContainer.style.left = position.x + 'px';
                    chatContainer.style.top = position.y + 'px';
                    chatContainer.style.right = 'auto';
                    chatContainer.style.bottom = 'auto';
                }
            }
        } catch (error) {
            console.error('Failed to load chat position:', error);
        }
    }

    toggleChat() {
        this.chatOpen = !this.chatOpen;
        const widget = document.getElementById('aiChatWidget');
        const toggleBtn = document.getElementById('chatToggleBtn');
        const chatContainer = document.querySelector('.chat-container');
        
        widget.classList.toggle('open', this.chatOpen);
        
        if (this.chatOpen) {
            // Position chat container near toggle button
            const toggleRect = toggleBtn.getBoundingClientRect();
            const containerWidth = 380;
            const containerHeight = 550;
            
            let chatX = toggleRect.left - containerWidth + 50;
            let chatY = toggleRect.top - containerHeight + 50;
            
            // Constrain to viewport
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            chatX = Math.max(10, Math.min(chatX, viewportWidth - containerWidth - 10));
            chatY = Math.max(10, Math.min(chatY, viewportHeight - containerHeight - 10));
            
            chatContainer.style.left = chatX + 'px';
            chatContainer.style.top = chatY + 'px';
            chatContainer.style.right = 'auto';
            chatContainer.style.bottom = 'auto';
            
            document.getElementById('chatInput').focus();
            this.markMessagesAsRead();
            this.loadChatPosition();
        }
    }

    openChat() {
        if (!this.chatOpen) {
            this.toggleChat();
        }
    }

    closeChat() {
        if (this.chatOpen) {
            this.toggleChat();
        }
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message
        this.addMessage(message, 'user');
        input.value = '';
        this.adjustTextareaHeight(input);
        
        // Show typing indicator
        const typingId = this.showTypingIndicator();
        
        try {
            // Collect current page context
            const pageDetails = this.collectPageContext();
            
            const response = await fetch('/api/ai/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    currentPage: window.location.pathname,
                    pageDetails: pageDetails
                })
            });
            
            const data = await response.json();
            this.removeTypingIndicator(typingId);
            
            if (data.success) {
                const aiResponse = data.data;
                this.addMessage(aiResponse.message, 'ai');
                
                // Handle auto-search and purchase guide
                if (aiResponse.action === 'auto_search_guide') {
                    this.startPurchaseGuide(aiResponse);
                }
                // Handle regular actions
                else if (aiResponse.action !== 'none') {
                    setTimeout(() => {
                        this.executeAction(aiResponse);
                    }, aiResponse.delay || 500);
                }
                
                // Handle field highlighting if present
                if (aiResponse.highlightField) {
                    this.highlightField(aiResponse.highlightField);
                }
                
                this.saveMessage({
                    query: message,
                    response: aiResponse.message,
                    action: aiResponse.action,
                    timestamp: new Date().toISOString()
                });
                
            } else {
                throw new Error(data.error || 'Unknown error');
            }
            
        } catch (error) {
            console.error('AI Chat error:', error);
            this.removeTypingIndicator(typingId);
            
            // Fallback response for purchase queries
            if (message.toLowerCase().includes('buy') || message.toLowerCase().includes('purchase')) {
                this.addMessage(`I'd love to help you shop! 😊 For "${message}", you can:\n\n1. Use the search bar at the top 🔍\n2. Browse categories above the products\n3. Click any product to see details\n4. Add to cart and checkout 🛒\n\nTry searching for what you want!`, 'ai');
            } else {
                const fallbackMessage = `I'm having some trouble connecting right now. 😅 You can try:\n• Clicking the shopping cart icon 🛒\n• Using the search bar at the top 🔍\n• Tapping your profile picture 👤\n• Checking the merchant button`;
                this.addMessage(fallbackMessage, 'ai');
            }
        }
    }
    startPurchaseGuide(response) {
        if (!response.productName || !response.steps) return;
        
        // Step 1: Auto-search
        setTimeout(() => {
            this.autoSearchProduct(response.productName);
        }, 1000);
        
        // Show step-by-step instructions
        setTimeout(() => {
            this.showStepByStepGuide(response.steps);
        }, 2000);
    }
    
    // Auto-search function
    autoSearchProduct(productName) {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;
        
        // Fill search input
        searchInput.value = productName;
        
        // Highlight with bright yellow glow
        this.highlightElementWithGlow(searchInput, 'rgb(255, 255, 102)', 5);
        
        // Trigger search
        const event = new Event('input', { bubbles: true });
        searchInput.dispatchEvent(event);
        
        // Show notification
        this.showSearchNotification(productName);
        
        // Scroll to products section
        setTimeout(() => {
            const productsSection = document.querySelector('.products-section');
            if (productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 500);
    }

    highlightElementWithGlow(element, color = 'rgb(255, 255, 102)', duration = 5) {
        if (!element) return;
        
        // Save original styles
        const originalStyle = {
            border: element.style.border,
            boxShadow: element.style.boxShadow,
            transition: element.style.transition,
            zIndex: element.style.zIndex,
            outline: element.style.outline
        };
        
        // Apply bright yellow highlight
        element.style.transition = 'all 0.3s ease';
        element.style.border = '3px solid ' + color;
        element.style.boxShadow = `0 0 25px ${color}, 0 0 50px rgba(255, 255, 102, 0.5)`;
        element.style.outline = 'none';
        element.style.zIndex = '9999';
        
        // Pulsing animation
        let pulseCount = 0;
        const pulseInterval = setInterval(() => {
            element.style.boxShadow = pulseCount % 2 === 0 
                ? `0 0 25px ${color}, 0 0 50px rgba(255, 255, 102, 0.8)`
                : `0 0 15px ${color}, 0 0 30px rgba(255, 255, 102, 0.6)`;
            pulseCount++;
        }, 500);
        
        // Remove highlight after duration
        setTimeout(() => {
            clearInterval(pulseInterval);
            element.style.border = originalStyle.border;
            element.style.boxShadow = originalStyle.boxShadow;
            element.style.transition = originalStyle.transition;
            element.style.zIndex = originalStyle.zIndex;
            element.style.outline = originalStyle.outline;
        }, duration * 1000);
    }
    
    // Show step-by-step guide
    showStepByStepGuide(steps) {
        if (!steps || !steps.length) return;
        
        let currentStep = 0;
        const guideContainer = this.createGuideContainer();
        
        const showNextStep = () => {
            if (currentStep >= steps.length) {
                guideContainer.remove();
                this.addMessage("🎉 Great job! You've completed all the steps. Ready to fill in your shipping information?", 'ai');
                return;
            }
            
            const step = steps[currentStep];
            this.updateGuideStep(guideContainer, step, currentStep + 1, steps.length);
            
            // Highlight the target element
            setTimeout(() => {
                const element = document.querySelector(step.target);
                if (element) {
                    this.highlightElementWithGlow(element);
                    
                    // Scroll to element
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Add click listener for user interaction
                    const clickHandler = () => {
                        element.removeEventListener('click', clickHandler);
                        
                        // Show success message
                        this.showStepSuccess(step);
                        
                        // Move to next step after delay
                        setTimeout(showNextStep, 1500);
                    };
                    
                    element.addEventListener('click', clickHandler);
                }
            }, 500);
            
            currentStep++;
        };
        
        // Start guide
        setTimeout(showNextStep, 1000);
    }
    
    createGuideContainer() {
        const container = document.createElement('div');
        container.className = 'purchase-guide-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            padding: 20px;
            width: 300px;
            z-index: 10000;
            border: 3px solid #85BB65;
        `;
        
        document.body.appendChild(container);
        return container;
    }
    
    updateGuideStep(container, step, current, total) {
        container.innerHTML = `
            <div style="margin-bottom: 15px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <h4 style="margin: 0; color: #333;">Step ${current} of ${total}</h4>
                    <span style="background: #85BB65; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px;">${step.action}</span>
                </div>
                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.4;">${step.message || 'Follow the highlighted element'}</p>
            </div>
            <div style="background: #f0f8f0; padding: 10px; border-radius: 8px; border-left: 4px solid #85BB65;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-lightbulb" style="color: #85BB65;"></i>
                    <span style="font-size: 12px; color: #555;">Click the highlighted ${step.target.replace(/[.#\[\]]/g, '')} to continue</span>
                </div>
            </div>
        `;
    }
    
    showStepSuccess(step) {
        this.addMessage(`✅ Perfect! You've completed: ${step.message || step.action}. Ready for the next step?`, 'ai');
    }
    
    showSearchNotification(productName) {
        this.addMessage(`🔍 Searching for "${productName}"... Check the products below! I've highlighted the search bar in bright yellow.`, 'ai');
    }
    
    executeAction(response) {
        switch (response.action) {
            case 'navigate':
                if (response.target) {
                    window.location.href = response.target;
                }
                break;
                
            case 'highlight':
                if (response.target) {
                    this.highlightElementWithGlow(document.querySelector(response.target));
                }
                break;
                
            case 'click':
                if (response.target) {
                    const element = document.querySelector(response.target);
                    if (element) {
                        element.click();
                    }
                }
                break;
                
            case 'search':
                if (response.target && response.query) {
                    this.autoSearchProduct(response.query);
                }
                break;
        }
    }
    

    highlightField(fieldInfo) {
        if (!fieldInfo || !fieldInfo.selector) return;
        
        setTimeout(() => {
            const element = document.querySelector(fieldInfo.selector);
            if (element) {
                // Scroll to element
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Highlight with animation
                const originalStyle = {
                    border: element.style.border,
                    boxShadow: element.style.boxShadow,
                    transition: element.style.transition
                };
                
                element.style.transition = 'all 0.3s ease';
                element.style.border = '2px solid #85BB65';
                element.style.boxShadow = '0 0 15px rgba(133, 187, 101, 0.6)';
                
                // Focus if it's an input
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
                    element.focus();
                }
                
                // Remove highlight after 5 seconds
                setTimeout(() => {
                    element.style.border = originalStyle.border;
                    element.style.boxShadow = originalStyle.boxShadow;
                    element.style.transition = originalStyle.transition;
                }, 5000);
            }
        }, 500);
    }

    highlightFormField(fieldHelp) {
        if (!fieldHelp.fieldName) return;
        
        // Try to find the field by name, id, or placeholder
        let field = null;
        
        // Try by name first
        field = document.querySelector(`input[name="${fieldHelp.fieldName}"], 
                                       select[name="${fieldHelp.fieldName}"], 
                                       textarea[name="${fieldHelp.fieldName}"]`);
        
        // Try by id if not found
        if (!field) {
            field = document.getElementById(fieldHelp.fieldName);
        }
        
        // Try by placeholder
        if (!field) {
            field = document.querySelector(`[placeholder*="${fieldHelp.fieldName}"]`);
        }
        
        if (field) {
            // Scroll to the field
            field.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Highlight it
            const originalBorder = field.style.border;
            const originalBoxShadow = field.style.boxShadow;
            
            field.style.border = '2px solid #85BB65';
            field.style.boxShadow = '0 0 10px rgba(133, 187, 101, 0.5)';
            field.focus();
            
            // Add a tooltip if possible
            this.showFieldTooltip(field, fieldHelp);
            
            // Remove highlight after 5 seconds
            setTimeout(() => {
                field.style.border = originalBorder;
                field.style.boxShadow = originalBoxShadow;
            }, 5000);
        }
    }

    showFieldTooltip(field, fieldHelp) {
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'field-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <strong>${fieldHelp.fieldName}</strong><br>
                <small>${fieldHelp.instructions}</small>
                ${fieldHelp.example ? `<br><em>Example: ${fieldHelp.example}</em>` : ''}
            </div>
        `;
        
        // Position near the field
        const rect = field.getBoundingClientRect();
        tooltip.style.position = 'absolute';
        tooltip.style.top = (rect.top - 60) + 'px';
        tooltip.style.left = rect.left + 'px';
        tooltip.style.zIndex = '9999';
        
        document.body.appendChild(tooltip);
        
        // Remove tooltip after 5 seconds
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 5000);
    }

    addMessage(content, sender) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const formattedContent = content.replace(/\n/g, '<br>');
        
        messageDiv.className = `message-bubble ${sender}-message`;
        messageDiv.innerHTML = `
            <div class="message-content">${formattedContent}</div>
            <div class="message-time">${time}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
        
        // Update badge
        if (sender === 'ai' && !this.chatOpen) {
            this.updateBadge();
        }
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typingIndicator';
        typingDiv.className = 'message-bubble ai-message';
        typingDiv.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <span>Jeeves is typing...</span>
            </div>
        `;
        
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return 'typingIndicator';
    }

    removeTypingIndicator(id) {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    highlightElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.style.transition = 'all 0.3s ease';
            element.style.boxShadow = '0 0 0 3px rgba(133, 187, 101, 0.5)';
            element.style.zIndex = '9999';
            
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            setTimeout(() => {
                element.style.boxShadow = '';
            }, 3000);
        }
    }

    adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    }

    saveMessage(message) {
        this.messages.push({ ...message, read: this.chatOpen });
        localStorage.setItem('aiChatHistory', JSON.stringify(this.messages.slice(-50)));
    }

    loadMessages() {
        try {
            const saved = localStorage.getItem('aiChatHistory');
            if (saved) {
                this.messages = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
            this.messages = [];
        }
        
        // Load positions
        this.loadTogglePosition();
        this.loadChatPosition();
    }

    markMessagesAsRead() {
        this.messages.forEach(msg => msg.read = true);
        this.updateBadge();
    }

    updateBadge() {
        const unreadCount = this.messages.filter(msg => !msg.read).length;
        const badge = document.querySelector('.chat-badge');
        if (badge) {
            badge.textContent = unreadCount > 0 ? unreadCount : '';
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    }
    collectPageContext() {
        try {
            const context = {
                url: window.location.href,
                pathname: window.location.pathname,
                title: document.title,
                timestamp: new Date().toISOString()
            };
            
            // Collect form fields (for checkout or login pages)
            const forms = document.querySelectorAll('form');
            if (forms.length > 0) {
                context.forms = Array.from(forms).map((form, index) => {
                    const fields = Array.from(form.querySelectorAll('input, select, textarea'));
                    return {
                        id: form.id || `form-${index}`,
                        fields: fields.map(field => ({
                            id: field.id,
                            name: field.name,
                            type: field.type || field.tagName.toLowerCase(),
                            placeholder: field.placeholder || '',
                            value: field.value || '',
                            label: this.getFieldLabel(field)
                        }))
                    };
                });
            }
            
            // Collect common elements
            context.commonElements = {};
            
            // Check for common elements
            const commonSelectors = {
                searchBar: '#searchInput, input[type="search"], [placeholder*="search"]',
                cartIcon: '.cart-icon-container, .fa-shopping-cart',
                profileButton: '#profilePic, .profile-pic',
                loginButton: '.sign-in, .login-btn, [href*="login"]',
                registerButton: '.register, .register-btn, [href*="register"]'
            };
            
            for (const [key, selector] of Object.entries(commonSelectors)) {
                const element = document.querySelector(selector);
                if (element) {
                    context.commonElements[key] = {
                        exists: true,
                        text: element.textContent?.trim() || element.placeholder || element.value || '',
                        type: element.tagName.toLowerCase()
                    };
                }
            }
            
            return context;
        } catch (error) {
            console.error('Error collecting page context:', error);
            return {
                url: window.location.href,
                pathname: window.location.pathname,
                title: document.title,
                timestamp: new Date().toISOString(),
                error: 'Failed to collect full context'
            };
        }
    }
    detectPageType(path) {
        if (path.includes('login')) return 'login';
        if (path.includes('register')) return 'registration';
        if (path.includes('forget')) return 'password_reset';
        if (path.includes('checkout') || path.includes('payment')) return 'checkout';
        if (path.includes('merchant')) return 'merchant_dashboard';
        if (path.includes('product-details')) return 'product_details';
        if (path.includes('homepage') || path === '/' || path === '/homepage.html') return 'homepage';
        return 'unknown';
    }
    getFieldLabel(field) {
        if (!field) return '';
        
        // Try label by "for" attribute
        if (field.id) {
            const label = document.querySelector(`label[for="${field.id}"]`);
            if (label) return label.textContent.trim();
        }
        
        // Try aria-label
        if (field.getAttribute('aria-label')) {
            return field.getAttribute('aria-label');
        }
        
        // Try parent label
        const parent = field.parentElement;
        if (parent) {
            const labels = parent.querySelectorAll('label');
            for (const label of labels) {
                if (label.textContent.trim()) {
                    return label.textContent.trim();
                }
            }
        }
        
        return field.placeholder || field.name || '';
    }
    
    
    collectCommonElements() {
        const elements = {};
        
        // Look for common elements
        const commonSelectors = {
            searchBar: '#searchInput, input[type="search"], [placeholder*="search"]',
            cartIcon: '.cart-icon-container, .fa-shopping-cart, [class*="cart"]',
            profileButton: '#profilePic, .profile-pic, [class*="profile"]',
            loginButton: '.sign-in, .login, [href*="login"]',
            registerButton: '.register, [href*="register"]'
        };
        
        for (const [key, selector] of Object.entries(commonSelectors)) {
            const element = document.querySelector(selector);
            if (element) {
                elements[key] = {
                    exists: true,
                    text: element.textContent?.trim() || element.placeholder || element.value || '',
                    type: element.tagName.toLowerCase()
                };
            }
        }
        
        return elements;
    }
    
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
});