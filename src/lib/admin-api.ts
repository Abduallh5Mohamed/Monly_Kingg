// Admin API service for frontend
// استخدام relative URL للمرور من خلال Next.js proxy
const API_BASE = '/api/v1';

interface UserFilters {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
}

interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
}

class AdminApiService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = `${API_BASE}/admin`;
    }

    // Get auth token from localStorage/cookies
    getAuthToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        }
        return null;
    }

    // Get CSRF token from cookie (set by /api/v1/auth/csrf-token endpoint)
    getCsrfToken(): string | null {
        if (typeof document === 'undefined') return null;
        const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : null;
    }

    // Common request headers
    getHeaders(): Record<string, string> {
        const token = this.getAuthToken();
        const csrf = this.getCsrfToken();
        return {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(csrf && { 'X-XSRF-TOKEN': csrf }),
        };
    }

    // Lazily fetch and store the CSRF token if the cookie is missing
    async ensureCsrfToken(): Promise<string | null> {
        let token = this.getCsrfToken();
        if (token) return token;
        try {
            const res = await fetch('/api/v1/auth/csrf-token', { credentials: 'include' });
            const data = await res.json();
            if (data?.csrfToken) {
                document.cookie = `XSRF-TOKEN=${data.csrfToken}; path=/; max-age=900; SameSite=Lax`;
                return data.csrfToken;
            }
        } catch { /* silent */ }
        return null;
    }

    // Get request options with credentials (ensures CSRF token is present for mutations)
    getRequestOptions(options: RequestInit = {}): RequestInit {
        return {
            ...options,
            credentials: 'include',
            headers: {
                ...this.getHeaders(),
                ...(options.headers || {})
            }
        };
    }

    // Fetch wrapper: handles silent token refresh + retry on 401
    private async apiFetch(url: string, opts: RequestInit = {}): Promise<Response> {
        const method = (opts.method || 'GET').toUpperCase();
        const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);
        if (isMutation) await this.ensureCsrfToken();
        let response = await fetch(url, this.getRequestOptions(opts));
        if (response.status === 401) {
            try {
                const refreshed = await fetch('/api/v1/auth/refresh', {
                    method: 'POST',
                    credentials: 'include',
                });
                if (refreshed.ok) {
                    if (isMutation) await this.ensureCsrfToken();
                    response = await fetch(url, this.getRequestOptions(opts));
                }
            } catch { /* silent */ }
        }
        return response;
    }

    // Handle API response
    async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Network error' }));
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }
        return response.json();
    }

    // Get all users with pagination and filters
    async getUsers(params: UserFilters = {}): Promise<ApiResponse<any>> {
        const {
            page = 1,
            limit = 10,
            search = '',
            role = 'all'
        } = params;

        const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            search,
            role
        });

        const response = await this.apiFetch(`${this.baseUrl}/users?${queryParams}`);
        return this.handleResponse(response);
    }

    // Get admin dashboard statistics
    async getStats(): Promise<ApiResponse<any>> {
        const response = await this.apiFetch(`${this.baseUrl}/stats`);
        return this.handleResponse(response);
    }

    // Delete user
    async deleteUser(userId: string): Promise<ApiResponse<any>> {
        const response = await this.apiFetch(`${this.baseUrl}/users/${userId}`, { method: 'DELETE' });
        return this.handleResponse(response);
    }

    // Toggle user active status
    async toggleUserStatus(userId: string): Promise<ApiResponse<any>> {
        const response = await this.apiFetch(`${this.baseUrl}/users/${userId}/toggle-status`, { method: 'PUT' });
        return this.handleResponse(response);
    }

    // Update user role
    async updateUserRole(userId: string, role: string): Promise<ApiResponse<any>> {
        const response = await this.apiFetch(`${this.baseUrl}/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role })
        });
        return this.handleResponse(response);
    }

    // Get recent activity
    async getRecentActivity(limit: number = 10): Promise<ApiResponse<any>> {
        const response = await this.apiFetch(`${this.baseUrl}/activity?limit=${limit}`);
        return this.handleResponse(response);
    }

    // ─── Seller Levels ───────────────────────────────────────────────────────

    async getSellerLevels(params: { page?: number; limit?: number; search?: string; rank?: string } = {}): Promise<ApiResponse<any>> {
        const { page = 1, limit = 20, search = '', rank = '' } = params;
        const queryParams = new URLSearchParams({ page: page.toString(), limit: limit.toString(), search, rank });
        const response = await this.apiFetch(`${this.baseUrl}/seller-levels?${queryParams}`);
        return this.handleResponse(response);
    }

    async setSellerLevel(userId: string, level: number): Promise<ApiResponse<any>> {
        const response = await this.apiFetch(`${this.baseUrl}/seller-levels/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ level })
        });
        return this.handleResponse(response);
    }

    async removeSellerLevelOverride(userId: string): Promise<ApiResponse<any>> {
        const response = await this.apiFetch(`${this.baseUrl}/seller-levels/${userId}/override`, { method: 'DELETE' });
        return this.handleResponse(response);
    }

    async getLevelConfig(): Promise<ApiResponse<any>> {
        const response = await this.apiFetch(`${this.baseUrl}/seller-levels/config`);
        return this.handleResponse(response);
    }

    async updateLevelConfig(config: { multiplier?: number; exponent?: number; maxLevel?: number; ranks?: any[] }): Promise<ApiResponse<any>> {
        const response = await this.apiFetch(`${this.baseUrl}/seller-levels/config`, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
        return this.handleResponse(response);
    }

    async recalculateAllLevels(): Promise<ApiResponse<any>> {
        const response = await this.apiFetch(`${this.baseUrl}/seller-levels/recalculate`, { method: 'POST' });
        return this.handleResponse(response);
    }

    async getLevelStats(): Promise<ApiResponse<any>> {
        const response = await this.apiFetch(`${this.baseUrl}/seller-levels/stats`);
        return this.handleResponse(response);
    }

    async getLevelsTable(from: number = 1, to: number = 100): Promise<ApiResponse<any>> {
        const response = await this.apiFetch(`${this.baseUrl}/seller-levels/table?from=${from}&to=${to}`);
        return this.handleResponse(response);
    }
}

// Create and export singleton instance
export const adminApi = new AdminApiService();