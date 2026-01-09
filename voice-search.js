// voice-search.js
// Simple Voice Search Implementation

class VoiceSearch {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.searchInput = document.getElementById('searchInput');
        this.micIcon = document.querySelector('.mic-icon');
        
        this.init();
    }
    
    init() {
        // Check if browser supports speech recognition
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showNotSupported();
            return;
        }
        
        this.setupRecognition();
        this.setupUI();
    }
    
    setupRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        
        // Set up event handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateMicIcon(true);
            this.showStatus('Listening... Speak now');
        };
        
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.handleSpeechResult(transcript);
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.updateMicIcon(false);
        };
        
        this.recognition.onerror = (event) => {
            this.isListening = false;
            this.updateMicIcon(false);
            this.showStatus('Error: ' + event.error);
            
            // Hide error after 3 seconds
            setTimeout(() => this.hideStatus(), 3000);
        };
    }
    
    setupUI() {
        // Add click handler to mic icon
        if (this.micIcon) {
            this.micIcon.style.cursor = 'pointer';
            this.micIcon.title = 'Click to start voice search';
            this.micIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleListening();
            });
            
            // Add hover effect
            this.micIcon.addEventListener('mouseenter', () => {
                if (!this.isListening) {
                    this.micIcon.style.color = '#4285f4';
                    this.micIcon.style.transform = 'scale(1.1)';
                }
            });
            
            this.micIcon.addEventListener('mouseleave', () => {
                if (!this.isListening) {
                    this.micIcon.style.color = '';
                    this.micIcon.style.transform = '';
                }
            });
        }
        
        // Create status element
        this.createStatusElement();
    }
    
    createStatusElement() {
        // Remove existing status if any
        const existingStatus = document.getElementById('voiceSearchStatus');
        if (existingStatus) existingStatus.remove();
        
        // Create status element
        const statusEl = document.createElement('div');
        statusEl.id = 'voiceSearchStatus';
        statusEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            z-index: 10000;
            display: none;
            align-items: center;
            gap: 15px;
            font-size: 18px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(statusEl);
    }
    
    showStatus(message) {
        const statusEl = document.getElementById('voiceSearchStatus');
        if (statusEl) {
            statusEl.innerHTML = `
                <i class="fas fa-microphone" style="color: #4285f4; font-size: 24px;"></i>
                <span>${message}</span>
            `;
            statusEl.style.display = 'flex';
        }
    }
    
    hideStatus() {
        const statusEl = document.getElementById('voiceSearchStatus');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }
    
    showNotSupported() {
        // Disable mic icon if not supported
        if (this.micIcon) {
            this.micIcon.style.opacity = '0.5';
            this.micIcon.style.cursor = 'not-allowed';
            this.micIcon.title = 'Voice search not supported in your browser';
        }
    }
    
    updateMicIcon(listening) {
        if (!this.micIcon) return;
        
        if (listening) {
            this.micIcon.innerHTML = '<i class="fas fa-microphone" style="color: #f44336;"></i>';
            this.micIcon.style.animation = 'pulse 1.5s infinite';
            this.micIcon.title = 'Listening... Click to stop';
        } else {
            this.micIcon.innerHTML = '<i class="fas fa-microphone"></i>';
            this.micIcon.style.animation = '';
            this.micIcon.title = 'Click to start voice search';
        }
    }
    
    toggleListening() {
        if (!this.recognition) return;
        
        if (this.isListening) {
            this.recognition.stop();
        } else {
            try {
                this.recognition.start();
            } catch (error) {
                this.showStatus('Please allow microphone access');
                setTimeout(() => this.hideStatus(), 3000);
            }
        }
    }
    
    handleSpeechResult(transcript) {
        // Update search input
        if (this.searchInput) {
            this.searchInput.value = transcript;
            
            // Trigger input event for any existing search handlers
            this.searchInput.dispatchEvent(new Event('input'));
            
            // Trigger enter key if you want auto-search
            setTimeout(() => {
                this.showStatus(`Searching for: "${transcript}"`);
                setTimeout(() => this.hideStatus(), 2000);
                
                // If you have a search function, call it here:
                // Example: performSearch(transcript);
            }, 500);
        }
    }
    
    // Optional: Keyboard shortcut (Ctrl+Shift+V for voice search)
    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                this.toggleListening();
            }
            
            // Escape key to stop listening
            if (e.key === 'Escape' && this.isListening) {
                this.recognition.stop();
            }
        });
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for page to fully load
    setTimeout(() => {
        window.voiceSearch = new VoiceSearch();
        
        // Optional: Setup keyboard shortcut
        window.voiceSearch.setupKeyboardShortcut();
        
        console.log('Voice search initialized');
    }, 1000);
});