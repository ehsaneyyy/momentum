// API Configuration
export const API_CONFIG = {
    BASE_URL: 'http://localhost:8000',
    endpoints: {
        token: '/users/token',
        signup: '/users/signup',
        me: '/users/me',
        events: '/events',
        eventDetail: (id) => `/events/${id}`,
        eventJoin: (id) => `/events/${id}/join`,
        eventLeave: (id) => `/events/${id}/leave`,
        eventDelete: (id) => `/events/${id}`,
        eventMessages: (id) => `/events/${id}/messages`,
        chatWs: (id) => `ws://localhost:8000/ws/chat/${id}`
    }
};

// Validation rules
export const VALIDATION = {
    username: {
        minLength: 3,
        maxLength: 20,
        pattern: /^[a-zA-Z0-9_-]+$/,
        message: 'Username must be 3-20 characters, alphanumeric, underscore, or hyphen'
    },
    password: {
        minLength: 6,
        message: 'Password must be at least 6 characters'
    },
    email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Invalid email format'
    },
    eventTitle: {
        minLength: 3,
        maxLength: 100,
        message: 'Title must be 3-100 characters'
    },
    eventDescription: {
        minLength: 10,
        maxLength: 500,
        message: 'Description must be 10-500 characters'
    },
    eventLocation: {
        minLength: 2,
        maxLength: 100,
        message: 'Location must be 2-100 characters'
    },
    maxParticipants: {
        minValue: 1,
        maxValue: 1000,
        message: 'Max participants must be between 1 and 1000'
    }
};

// UI Configuration
export const UI_CONFIG = {
    loadingMessage: 'Loading...',
    errorMessages: {
        loginFailed: 'Login failed. Please check your credentials.',
        signupFailed: 'Signup failed. Username or email may already exist.',
        createEventFailed: 'Failed to create event. Please try again.',
        joinEventFailed: 'Failed to join event. You may already be a participant or the event is full.',
        leaveEventFailed: 'Failed to leave event.',
        deleteEventFailed: 'Failed to delete event.',
        sendMessageFailed: 'Failed to send message.',
        unauthorized: 'Your session has expired. Please login again.'
    }
};

// Build full URL
export function getApiUrl(endpoint) {
    if (typeof endpoint === 'string') {
        return `${API_CONFIG.BASE_URL}${endpoint}`;
    }
    return endpoint;
}
