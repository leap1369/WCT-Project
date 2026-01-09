// translation-script.js
// Google Translate Widget - Easy Implementation

// Initialize Google Translate
function googleTranslateElementInit() {
    // Check if widget already exists
    if (window.google && window.google.translate && window.google.translate.TranslateElement) {
        new google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'en,km,fr,ko,zh,es,ja',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
            multilanguagePage: true
        }, 'google_translate_element');
        
        // Apply custom styling
        applyTranslateStyles();
    }
}

// Load Google Translate script dynamically
function loadGoogleTranslate() {
    // Check if already loaded
    if (document.querySelector('script[src*="translate.google.com"]')) {
        return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.head.appendChild(script);
}

// Toggle translation widget visibility
function toggleTranslate() {
    const widget = document.querySelector('.goog-te-menu-frame');
    if (widget) {
        const isVisible = widget.style.display !== 'none';
        widget.style.display = isVisible ? 'none' : 'block';
        updateFloatingButtonText(isVisible);
    } else {
        // If widget not loaded yet, load it
        loadGoogleTranslate();
        setTimeout(() => {
            document.querySelector('.goog-te-menu-frame').style.display = 'block';
            updateFloatingButtonText(false);
        }, 1000);
    }
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
                padding: 8px 12px;
                border-radius: 6px;
                border: 1px solid #ddd;
                background: white;
                cursor: pointer;
                min-width: 140px;
            `;
        }
    }, 500);
}

// Save language preference
function saveLanguagePreference(lang) {
    localStorage.setItem('preferred-language', lang);
}

// Load saved language preference
function loadLanguagePreference() {
    const savedLang = localStorage.getItem('preferred-language');
    if (savedLang && window.google && window.google.translate && window.google.translate.TranslateElement) {
        try {
            // Change to saved language
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

// Detect language changes
function setupLanguageChangeDetection() {
    // Check for language changes every 2 seconds
    setInterval(() => {
        const iframe = document.querySelector('.goog-te-banner-frame');
        if (iframe) {
            const select = iframe.contentDocument?.querySelector('.goog-te-combo');
            if (select) {
                select.addEventListener('change', function() {
                    saveLanguagePreference(this.value);
                });
            }
        }
        
        // Also check main page select
        const mainSelect = document.querySelector('.goog-te-combo');
        if (mainSelect && !mainSelect.hasListener) {
            mainSelect.hasListener = true;
            mainSelect.addEventListener('change', function() {
                saveLanguagePreference(this.value);
            });
        }
    }, 2000);
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Load Google Translate
    loadGoogleTranslate();
    
    // Create floating button
    createFloatingButton();
    
    // Setup language detection
    setTimeout(setupLanguageChangeDetection, 3000);
});

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
        right: 20px;
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

// Export functions for global use
window.toggleTranslate = toggleTranslate;
window.loadGoogleTranslate = loadGoogleTranslate;
window.googleTranslateElementInit = googleTranslateElementInit;