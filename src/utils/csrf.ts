/**
 * Get CSRF token from cookies
 * The token is set by the backend in the XSRF-TOKEN cookie
 */
export function getCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;

    const cookieName = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || 'XSRF-TOKEN';
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + cookieName + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Fetch a new CSRF token from the server
 * This will also set the cookie automatically
 */
export async function fetchCsrfToken(): Promise<string | null> {
    try {
        console.log('🔐 Fetching new CSRF token from server...');
        const res = await fetch('/api/v1/auth/csrf-token', {
            method: 'GET',
            credentials: 'include'  // Important: send cookies with request
        });

        if (res.ok) {
            const data = await res.json();
            console.log('✅ CSRF token received from server');

            // Give browser a moment to set the cookie
            await new Promise(resolve => setTimeout(resolve, 50));

            return data.csrfToken;
        } else {
            console.error('❌ Failed to fetch CSRF token, status:', res.status);
        }
    } catch (err) {
        console.error('❌ Failed to fetch CSRF token:', err);
    }

    return null;
}

/**
 * Get CSRF token, fetching a new one if not available in cookies
 * Always fetches fresh token for maximum reliability
 */
export async function ensureCsrfToken(): Promise<string | null> {
    // First try to get from cookie
    let token = getCsrfToken();

    console.log('🔐 Checking CSRF token...');
    console.log('   Cookie token:', token ? 'Found' : 'Not found');

    // Always fetch fresh token if cookie token is missing or on explicit refresh
    if (!token) {
        console.log('🔐 Fetching fresh CSRF token...');
        await fetchCsrfToken(); // This sets the cookie on the backend

        // IMPORTANT: Read token from cookie, not from fetch response
        // The backend sets the cookie, and we must use that exact value
        token = getCsrfToken();
        console.log('🔐 After fetch - Cookie token:', token ? 'Set ✓' : 'Not set ✗');
    }

    console.log('🔐 Final CSRF token:', token ? '✓ Valid' : '✗ Invalid');
    return token;
}
