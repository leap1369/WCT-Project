// ai-chat.js
class AIChatAssistant {
    constructor() {
        this.isOpen = false;
        this.chatHistory = [];
        this.isProcessing = false;
        
        this.init();
    }
    
    init() {
        this.createChatUI();
        this.setupEventListeners();
        this.loadChatHistory();
        
        console.log('🤖 AI Chat Assistant initialized');
    }
    
    createChatUI() {
        // Remove existing chat if any
        const existingChat = document.getElementById('aiChatContainer');
        if (existingChat) existingChat.remove();
        
        // Create chat container
        const chatContainer = document.createElement('div');
        chatContainer.id = 'aiChatContainer';
        chatContainer.innerHTML = `
            <!-- Chat Button -->
            <button class="ai-chat-button" id="aiChatButton">
                <i class="fas fa-robot"></i>
            </button>
            
            <!-- Chat Modal -->
            <div class="ai-chat-modal" id="aiChatModal">
                <div class="ai-chat-header">
                    <h3><i class="fas fa-robot"></i> AI Assistant</h3>
                    <button class="close-ai-chat" id="closeAIChat">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <!-- Suggestions -->
                <div class="ai-suggestions" id="aiSuggestions">
                    <div class="ai-suggestion-chip" data-query="Take me to login">Login</div>
                    <div class="ai-suggestion-chip" data-query="Show me my cart">Cart</div>
                    <div class="ai-suggestion-chip" data-query="Where is search?">Search</div>
                    <div class="ai-suggestion-chip" data-query="Go to homepage">Homepage</div>
                </div>
                
                <!-- Chat Messages -->
                <div class="ai-chat-messages" id="aiChatMessages">
                    <div class="ai-message ai-response">
                        👋 Hello! I'm your AI shopping assistant. How can I help you today?
                        <div class="ai-action-hint">
                            <i class="fas fa-lightbulb"></i> Try: "Show me the cart" or "Take me to login"
                        </div>
                    </div>
                </div>
                
                <!-- Typing Indicator -->
                <div class="ai-typing-indicator" id="aiTyping">
                    <div class="ai-typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
                
                <!-- Chat Input -->
                <div class="ai-chat-input-container">
                    <div class="ai-chat-input-wrapper">
                        <input type="text" 
                               id="aiChatInput" 
                               placeholder="Ask me anything..." 
                               autocomplete="off">
                        <button id="aiSendBtn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(chatContainer);
        
        // Add CSS if not already added
        if (!document.querySelector('link[href*="ai-chat.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'ai-chat.css';
            document.head.appendChild(link);
        }
    }
    
    setupEventListeners() {
        // Chat button
        document.getElementById('aiChatButton').addEventListener('click', () => this.toggleChat());
        
        // Close button
        document.getElementById('closeAIChat').addEventListener('click', () => this.closeChat());
        
        // Send button
        document.getElementById('aiSendBtn').addEventListener('click', () => this.sendMessage());
        
        // Input enter key
        document.getElementById('aiChatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isProcessing) {
                this.sendMessage();
            }
        });
        
        // Suggestion chips
        document.querySelectorAll('.ai-suggestion-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const query = e.target.getAttribute('data-query');
                this.sendMessage(query);
            });
        });
        
        // Close chat when clicking outside
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('aiChatModal');
            const button = document.getElementById('aiChatButton');
            
            if (this.isOpen && 
                !modal.contains(e.target) && 
                !button.contains(e.target)) {
                this.closeChat();
            }
        });
    }
    
    toggleChat() {
        this.isOpen = !this.isOpen;
        const modal = document.getElementById('aiChatModal');
        
        if (this.isOpen) {
            modal.classList.add('open');
            document.getElementById('aiChatInput').focus();
            this.scrollToBottom();
        } else {
            modal.classList.remove('open');
        }
    }
    
    openChat() {
        this.isOpen = true;
        document.getElementById('aiChatModal').classList.add('open');
        document.getElementById('aiChatInput').focus();
        this.scrollToBottom();
    }
    
    closeChat() {
        this.isOpen = false;
        document.getElementById('aiChatModal').classList.remove('open');
    }
    
    async sendMessage(predefinedMessage = null) {
        const input = document.getElementById('aiChatInput');
        const message = predefinedMessage || input.value.trim();
        
        if (!message || this.isProcessing) return;
        
        // Clear input if not predefined
        if (!predefinedMessage) {
            input.value = '';
        }
        
        // Add user message to chat
        this.addMessage(message, 'user');
        
        // Show typing indicator
        this.showTyping(true);
        
        // Set processing state
        this.isProcessing = true;
        document.getElementById('aiSendBtn').disabled = true;
        
        try {
            // Send to AI backend
            const response = await this.queryAI(message);
            
            // Hide typing indicator
            this.showTyping(false);
            
            // Add AI response to chat
            this.addMessage(response.message, 'ai', response);
            
            // Handle AI action
            if (response.action !== 'none') {
                this.handleAIAction(response);
            }
            
            // Save to history
            this.saveToHistory(message, response);
            
        } catch (error) {
            console.error('AI query error:', error);
            this.addMessage("Sorry, I'm having trouble connecting to the AI service. Please try again.", 'ai');
        } finally {
            this.isProcessing = false;
            document.getElementById('aiSendBtn').disabled = false;
            this.scrollToBottom();
        }
    }
    
    async queryAI(message) {
        const currentPage = window.location.pathname || '/';
        
        const response = await fetch('/api/ai/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                currentPage: currentPage
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'AI query failed');
        }
        
        return data.data;
    }
    
    addMessage(text, sender, aiResponse = null) {
        const messagesContainer = document.getElementById('aiChatMessages');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${sender === 'user' ? 'user-message' : 'ai-response'}`;
        
        let messageHTML = text;
        
        // Add action hint for AI responses
        if (sender === 'ai' && aiResponse) {
            const actionText = this.getActionText(aiResponse.action);
            if (actionText) {
                messageHTML += `<div class="ai-action-hint"><i class="fas fa-magic"></i> ${actionText}</div>`;
            }
        }
        
        messageDiv.innerHTML = messageHTML;
        messagesContainer.appendChild(messageDiv);
        
        this.scrollToBottom();
    }
    
    getActionText(action) {
        const actionMap = {
            'navigate': 'Redirecting...',
            'highlight': 'Showing location...',
            'click': 'Performing action...',
            'none': ''
        };
        return actionMap[action] || '';
    }
    
    handleAIAction(response) {
        const { action, target, scrollTo, delay = 1000 } = response;
        
        // Execute action after delay
        setTimeout(() => {
            switch (action) {
                case 'navigate':
                    if (target && this.isValidURL(target)) {
                        window.location.href = target;
                    }
                    break;
                    
                case 'highlight':
                    if (target) {
                        this.highlightElement(target);
                    }
                    break;
                    
                case 'click':
                    if (target) {
                        this.clickElement(target);
                    }
                    break;
            }
            
            // Scroll to element if specified
            if (scrollTo) {
                this.scrollToElement(scrollTo);
            }
            
        }, delay);
    }
    
    highlightElement(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
            return;
        }
        
        // Scroll to element
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        // Add highlight effect
        element.classList.add('ai-highlight-glow');
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
            element.classList.remove('ai-highlight-glow');
        }, 3000);
    }
    
    clickElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.click();
        } else {
            console.warn(`Element not found for clicking: ${selector}`);
        }
    }
    
    scrollToElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }
    
    isValidURL(url) {
        try {
            new URL(url, window.location.origin);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    showTyping(show) {
        const typing = document.getElementById('aiTyping');
        typing.style.display = show ? 'block' : 'none';
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('aiChatMessages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    saveToHistory(userMessage, aiResponse) {
        this.chatHistory.push({
            user: userMessage,
            ai: aiResponse,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 50 messages
        if (this.chatHistory.length > 50) {
            this.chatHistory.shift();
        }
        
        // Save to localStorage
        localStorage.setItem('aiChatHistory', JSON.stringify(this.chatHistory));
    }
    
    loadChatHistory() {
        try {
            const saved = localStorage.getItem('aiChatHistory');
            if (saved) {
                this.chatHistory = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load chat history:', e);
        }
    }
}

// Initialize AI Chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other scripts to load
    setTimeout(() => {
        window.aiChatAssistant = new AIChatAssistant();
    }, 1000);
});