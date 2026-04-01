// Utility functions for validation, error handling, and UI
import { VALIDATION, UI_CONFIG } from './config.js';

// Form Validation
export function validateUsername(username) {
    if (!username || username.length < VALIDATION.username.minLength) {
        return { valid: false, message: VALIDATION.username.message };
    }
    if (username.length > VALIDATION.username.maxLength) {
        return { valid: false, message: VALIDATION.username.message };
    }
    if (!VALIDATION.username.pattern.test(username)) {
        return { valid: false, message: VALIDATION.username.message };
    }
    return { valid: true };
}

export function validatePassword(password) {
    if (!password || password.length < VALIDATION.password.minLength) {
        return { valid: false, message: VALIDATION.password.message };
    }
    return { valid: true };
}

export function validateEmail(email) {
    if (!email || !VALIDATION.email.pattern.test(email)) {
        return { valid: false, message: VALIDATION.email.message };
    }
    return { valid: true };
}

export function validateEventForm(data) {
    const errors = [];
    
    if (!data.title || data.title.length < VALIDATION.eventTitle.minLength || 
        data.title.length > VALIDATION.eventTitle.maxLength) {
        errors.push('Title: ' + VALIDATION.eventTitle.message);
    }
    
    if (!data.description || data.description.length < VALIDATION.eventDescription.minLength || 
        data.description.length > VALIDATION.eventDescription.maxLength) {
        errors.push('Description: ' + VALIDATION.eventDescription.message);
    }
    
    if (!data.location || data.location.length < VALIDATION.eventLocation.minLength || 
        data.location.length > VALIDATION.eventLocation.maxLength) {
        errors.push('Location: ' + VALIDATION.eventLocation.message);
    }
    
    const maxPart = parseInt(data.maxParticipants);
    if (isNaN(maxPart) || maxPart < VALIDATION.maxParticipants.minValue || 
        maxPart > VALIDATION.maxParticipants.maxValue) {
        errors.push('Participants: ' + VALIDATION.maxParticipants.message);
    }
    
    return { valid: errors.length === 0, errors };
}

// Error Notifications
export function showError(message) {
    const errorDiv = document.getElementById('errorNotification');
    if (!errorDiv) {
        const div = document.createElement('div');
        div.id = 'errorNotification';
        document.body.appendChild(div);
    }
    
    const el = document.getElementById('errorNotification');
    el.innerHTML = `
        <div class="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-[9999] flex items-center gap-3">
            <span>⚠️</span>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" class="ml-2 font-bold">✕</button>
        </div>
    `;
    
    setTimeout(() => {
        if (el.firstChild) el.firstChild.remove();
    }, 5000);
}

export function showSuccess(message) {
    const successDiv = document.getElementById('successNotification');
    if (!successDiv) {
        const div = document.createElement('div');
        div.id = 'successNotification';
        document.body.appendChild(div);
    }
    
    const el = document.getElementById('successNotification');
    el.innerHTML = `
        <div class="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[9999] flex items-center gap-3">
            <span>✓</span>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" class="ml-2 font-bold">✕</button>
        </div>
    `;
    
    setTimeout(() => {
        if (el.firstChild) el.firstChild.remove();
    }, 3000);
}

// Loading indicator
export function showLoading(message = UI_CONFIG.loadingMessage) {
    const loadingDiv = document.getElementById('loadingIndicator');
    if (!loadingDiv) {
        const div = document.createElement('div');
        div.id = 'loadingIndicator';
        document.body.appendChild(div);
    }
    
    const el = document.getElementById('loadingIndicator');
    el.innerHTML = `
        <div class="fixed inset-0 bg-black/30 flex items-center justify-center z-[9998]">
            <div class="bg-white rounded-lg p-6 flex flex-col items-center gap-3">
                <div class="animate-spin h-8 w-8 border-4 border-pink-500 border-t-transparent rounded-full"></div>
                <p class="text-gray-700 font-semibold">${message}</p>
            </div>
        </div>
    `;
}

export function hideLoading() {
    const el = document.getElementById('loadingIndicator');
    if (el && el.firstChild) el.firstChild.remove();
}

// Button loading state
export function setButtonLoading(buttonId, loading = true) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    if (loading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
        btn.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span>Loading...';
    } else {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText || btn.textContent;
    }
}

// Clear form
export function clearForm(formInputIds) {
    formInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.type === 'checkbox') el.checked = false;
            else el.value = '';
        }
    });
}

// Safe API error message
export function getErrorMessage(error, defaultKey = 'createEventFailed') {
    if (error.message === 'Unauthorized') {
        return UI_CONFIG.errorMessages.unauthorized;
    }
    return UI_CONFIG.errorMessages[defaultKey] || 'An error occurred. Please try again.';
}
