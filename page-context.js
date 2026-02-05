// page-context.js - Enhanced page analysis
class PageContextAnalyzer {
    constructor() {
        this.currentPage = window.location.pathname;
    }
    
    // Analyze current page for AI context
    analyzePage() {
        const analysis = {
            pageType: this.getPageType(),
            url: window.location.href,
            title: document.title,
            keyElements: this.getKeyElements(),
            forms: this.getFormAnalysis(),
            interactiveElements: this.getInteractiveElements(),
            pageSpecificInfo: this.getPageSpecificInfo()
        };
        
        return analysis;
    }
    
    getPageType() {
        const path = window.location.pathname.toLowerCase();
        
        if (path.includes('login')) return 'login';
        if (path.includes('register')) return 'registration';
        if (path.includes('forget')) return 'password_reset';
        if (path.includes('checkout')) return 'checkout';
        if (path.includes('payment')) return 'payment';
        if (path.includes('merchant')) return 'merchant_dashboard';
        if (path.includes('product-details')) return 'product_details';
        if (path.includes('homepage') || path === '/') return 'homepage';
        
        return 'unknown';
    }
    
    getKeyElements() {
        const elements = {};
        const pageType = this.getPageType();
        
        switch(pageType) {
            case 'login':
                elements.email = this.getElementInfo('input[type="email"]');
                elements.password = this.getElementInfo('input[type="password"]');
                elements.loginButton = this.getElementInfo('button:contains("Login"), button:contains("Sign In")');
                break;
                
            case 'checkout':
                elements.shippingAddress = this.getElementInfo('[name*="address"], [placeholder*="address"]');
                elements.zipCode = this.getElementInfo('[name*="zip"], [name*="postal"], [placeholder*="zip"], [placeholder*="postal"]');
                elements.paymentMethod = this.getElementInfo('[name*="payment"], select[name*="payment"]');
                elements.placeOrderButton = this.getElementInfo('button:contains("Place Order"), button:contains("Checkout")');
                break;
                
            case 'homepage':
                elements.searchBar = this.getElementInfo('#searchInput, [placeholder*="search"]');
                elements.cartIcon = this.getElementInfo('.cart-icon-container, .fa-shopping-cart');
                elements.categories = this.getElementInfo('#categoriesContainer, .categories');
                break;
        }
        
        return elements;
    }
    
    getFormAnalysis() {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map(form => ({
            id: form.id,
            action: form.action,
            method: form.method,
            fields: this.getFormFields(form)
        }));
    }
    
    getFormFields(form) {
        return Array.from(form.querySelectorAll('input, select, textarea')).map(field => ({
            id: field.id,
            name: field.name,
            type: field.type || field.tagName.toLowerCase(),
            placeholder: field.placeholder || '',
            label: this.getFieldLabel(field),
            required: field.required,
            value: field.value || '',
            options: field.options ? Array.from(field.options).map(opt => opt.text) : []
        }));
    }
    
    getFieldLabel(field) {
        if (!field.id && !field.name) return '';
        
        // Try label for attribute
        if (field.id) {
            const label = document.querySelector(`label[for="${field.id}"]`);
            if (label) return label.textContent.trim();
        }
        
        // Try preceding label text
        const parent = field.parentElement;
        if (parent) {
            const labels = parent.querySelectorAll('label');
            for (const label of labels) {
                if (label.textContent.trim()) return label.textContent.trim();
            }
        }
        
        // Try aria-label
        return field.getAttribute('aria-label') || field.getAttribute('aria-describedby') || '';
    }
    
    getElementInfo(selector) {
        const element = document.querySelector(selector);
        if (!element) return null;
        
        return {
            selector: selector,
            placeholder: element.placeholder || '',
            type: element.type || element.tagName.toLowerCase(),
            id: element.id,
            name: element.name,
            text: element.textContent?.trim() || element.value || ''
        };
    }
    
    getInteractiveElements() {
        return {
            buttons: Array.from(document.querySelectorAll('button, [role="button"]')).slice(0, 10).map(btn => ({
                text: btn.textContent?.trim(),
                id: btn.id,
                class: btn.className
            })),
            links: Array.from(document.querySelectorAll('a[href]')).slice(0, 10).map(link => ({
                text: link.textContent?.trim(),
                href: link.href,
                target: link.target
            }))
        };
    }
    
    getPageSpecificInfo() {
        const pageType = this.getPageType();
        const info = {};
        
        switch(pageType) {
            case 'checkout':
                info.shippingFields = [
                    'Full Name', 'Address', 'City', 'Zip/Postal Code', 'Phone Number'
                ];
                info.paymentMethods = ['Cash on Delivery', 'Credit Card', 'PayPal', 'KHQR'];
                info.requiredFields = ['Name', 'Address', 'Phone'];
                break;
                
            case 'registration':
                info.requiredFields = ['Email', 'Password', 'Confirm Password'];
                info.passwordRequirements = 'Minimum 6 characters';
                break;
                
            case 'merchant_dashboard':
                info.sections = ['Dashboard', 'Products', 'Orders', 'Analytics'];
                info.primaryActions = ['Add Product', 'View Orders', 'Export Data'];
                break;
        }
        
        return info;
    }
}

// Export for use
window.PageContextAnalyzer = PageContextAnalyzer;