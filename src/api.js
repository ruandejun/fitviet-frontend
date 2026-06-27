// Utility to fetch cookies
export function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://c69.us';

// Global fetch wrapper with automatic CSRF token injection
export async function apiRequest(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    
    const method = (options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        const csrf = getCookie('csrftoken');
        if (csrf) {
            headers['X-CSRFToken'] = csrf;
        }
    }

    const finalUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : url;

    const response = await fetch(finalUrl, {
        ...options,
        headers,
    });

    return response;
}
