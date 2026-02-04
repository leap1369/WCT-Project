// translation-script.js - Fixed version
// Google Translate Widget - Easy Implementation

let googleTranslateInitialized = false;
let translateWidgetLoaded = false;

// Initialize Google Translate
function googleTranslateElementInit() {
    try {
        console.log('Google Translate Element Initializing...');
        
        if (!window.google || !window.google.translate || !window.google.translate.TranslateElement) {
            console.error('Google Translate API not available');
            return;
        }
        
        // Check if element exists
        const translateElement = document.getElementById('google_translate_element');
        if (!translateElement) {
            console.warn('Google Translate container not found');
            return;
        }
        
        new google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'en,km,fr,ko,zh,es,ja',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
            multilanguagePage: true
        }, 'google_translate_element');
        
        googleTranslateInitialized = true;
        console.log('Google Translate initialized successfully');
        
        // Apply custom styling
        applyTranslateStyles();
        
    } catch (error) {
        console.error('Error initializing Google Translate:', error);
    }
}

// Load Google Translate script dynamically
function loadGoogleTranslate() {
    console.log('Loading Google Translate...');
    
    // Check if already loaded
    if (document.querySelector('script[src*="translate.google.com"]')) {
        console.log('Google Translate already loaded');
        if (!googleTranslateInitialized && window.google && window.google.translate) {
            googleTranslateElementInit();
        }
        return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.onload = function() {
        console.log('Google Translate script loaded');
        translateWidgetLoaded = true;
    };
    script.onerror = function(error) {
        console.error('Failed to load Google Translate script:', error);
    };
    
    document.head.appendChild(script);
}

// Toggle translation widget visibility
function toggleTranslate() {
    console.log('Toggle translate called');
    
    if (!translateWidgetLoaded) {
        console.log('Widget not loaded, loading now...');
        loadGoogleTranslate();
        
        // Wait for widget to load then show it
        setTimeout(() => {
            const widget = document.querySelector('.goog-te-menu-frame');
            if (widget) {
                widget.style.display = 'block';
                console.log('Widget shown');
                updateFloatingButtonText(false);
            } else {
                console.warn('Widget still not available');
                // Create a fallback language selector
                createFallbackLanguageSelector();
            }
        }, 1500);
        return;
    }
    
    const widget = document.querySelector('.goog-te-menu-frame');
    if (widget) {
        const isVisible = widget.style.display !== 'none';
        widget.style.display = isVisible ? 'none' : 'block';
        console.log('Widget toggled:', widget.style.display);
        updateFloatingButtonText(isVisible);
    } else {
        console.log('Widget not found, initializing...');
        loadGoogleTranslate();
    }
}

// Fallback language selector if Google Translate fails
function createFallbackLanguageSelector() {
    const existingFallback = document.getElementById('fallbackLanguageSelector');
    if (existingFallback) {
        existingFallback.style.display = existingFallback.style.display === 'none' ? 'block' : 'none';
        return;
    }
    
    const languages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'km', name: 'ខ្មែរ (Khmer)', flag: '🇰🇭' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
        { code: 'zh', name: '中文', flag: '🇨🇳' },
        { code: 'ja', name: '日本語', flag: '🇯🇵' },
        { code: 'ko', name: '한국어', flag: '🇰🇷' }
    ];
    
    const selector = document.createElement('div');
    selector.id = 'fallbackLanguageSelector';
    selector.innerHTML = `
        <div style="position: fixed; bottom: 80px; left: 20px; background: white; border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,0.2); padding: 15px; z-index: 9999; max-width: 200px;">
            <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #333;">Select Language</h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${languages.map(lang => `
                    <button onclick="selectFallbackLanguage('${lang.code}')" 
                            style="background: ${lang.code === 'en' ? '#f0f8ff' : 'white'}; 
                                   border: 1px solid #ddd; 
                                   border-radius: 6px; 
                                   padding: 8px 12px; 
                                   cursor: pointer; 
                                   text-align: left; 
                                   display: flex; 
                                   align-items: center; 
                                   gap: 10px;">
                        <span style="font-size: 18px;">${lang.flag}</span>
                        <span style="font-size: 13px;">${lang.name}</span>
                    </button>
                `).join('')}
            </div>
            <div style="font-size: 11px; color: #888; margin-top: 10px;">
                Google Translate not available. Page refresh required.
            </div>
        </div>
    `;
    
    document.body.appendChild(selector);
    updateFloatingButtonText(false);
}

function selectFallbackLanguage(langCode) {
    console.log('Language selected:', langCode);
    alert(`Language changed to ${langCode}. Note: Full translation requires Google Translate.`);
    localStorage.setItem('preferred-language', langCode);
}

function updateFloatingButtonText(isVisible) {
    const btn = document.getElementById('floatTranslateBtn');
    if (btn) {
        const icon = isVisible ? 'fa-eye-slash' : 'fa-language';
        const text = isVisible ? 'Close' : 'Translate';
        btn.innerHTML = `
            <button onclick="toggleTranslate()" style="background: #4285f4; color: white; border: none; border-radius: 50px; padding: 12px 20px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 8px;">
                <i class="fas ${icon}"></i> ${text}
            </button>
        `;
    }
}

// Apply custom styles to Google Translate widget
function applyTranslateStyles() {
    // Remove Google branding
    const style = document.createElement('style');
    style.textContent = `
        .goog-logo-link, .goog-te-gadget span {
            display: none !important;
        }
        
        .goog-te-gadget {
            color: transparent !important;
            font-size: 0 !important;
        }
        
        .goog-te-banner-frame {
            display: none !important;
        }
        
        .goog-te-menu-frame {
            max-width: 300px !important;
            z-index: 10000 !important;
            border-radius: 8px !important;
            box-shadow: 0 5px 20px rgba(0,0,0,0.15) !important;
        }
        
        .goog-te-menu2 {
            max-width: 300px !important;
            overflow-x: hidden !important;
        }
        
        body {
            top: 0 !important;
        }
        
        /* Fix for translated text */
        font[face="Roboto"] {
            font-family: inherit !important;
        }
    `;
    document.head.appendChild(style);
    
    // Style the select dropdown
    setTimeout(() => {
        const select = document.querySelector('.goog-te-combo');
        if (select) {
            select.style.cssText = `
                padding: 8px 12px !important;
                border-radius: 6px !important;
                border: 1px solid #ddd !important;
                background: white !important;
                cursor: pointer !important;
                min-width: 140px !important;
                font-family: Arial, sans-serif !important;
                font-size: 14px !important;
            `;
        }
    }, 1000);
}

// Save language preference
function saveLanguagePreference(lang) {
    localStorage.setItem('preferred-language', lang);
}

// Load saved language preference
function loadLanguagePreference() {
    const savedLang = localStorage.getItem('preferred-language');
    if (savedLang && window.google && window.google.translate) {
        try {
            const select = document.querySelector('.goog-te-combo');
            if (select) {
                select.value = savedLang;
                select.dispatchEvent(new Event('change'));
            }
        } catch (e) {
            console.log('Could not restore language:', e);
        }
    }
}

// Create floating translation button
function createFloatingButton() {
    // Remove existing button if any
    const existingBtn = document.getElementById('floatTranslateBtn');
    if (existingBtn) existingBtn.remove();
    
    // Create new button
    const floatBtn = document.createElement('div');
    floatBtn.id = 'floatTranslateBtn';
    floatBtn.innerHTML = `
        <button onclick="toggleTranslate()" style="
            background: #4285f4;
            color: white;
            border: none;
            border-radius: 50px;
            padding: 12px 20px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            transition: all 0.3s ease;
        ">
            <i class="fas fa-language"></i> Translate
        </button>
    `;
    
    // Apply styles
    floatBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 9999;
    `;
    
    // Add hover effect
    floatBtn.querySelector('button').onmouseenter = function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
    };
    
    floatBtn.querySelector('button').onmouseleave = function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    };
    
    document.body.appendChild(floatBtn);
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing translation...');
    
    // Create floating button
    createFloatingButton();
    
    // Load Google Translate after a delay
    setTimeout(() => {
        loadGoogleTranslate();
        
        // Check for saved language preference
        loadLanguagePreference();
    }, 1000);
});

// Export functions for global use
window.toggleTranslate = toggleTranslate;
window.loadGoogleTranslate = loadGoogleTranslate;
window.googleTranslateElementInit = googleTranslateElementInit;
window.selectFallbackLanguage = selectFallbackLanguage;