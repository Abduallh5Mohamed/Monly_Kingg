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

    // Common request headers
    getHeaders(): Record<string, string> {
        const token = this.getAuthToken();
        return {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
        };
    }

    // Get request options with credentials
    getRequestOptions(options: RequestInit = {}): RequestInit {
        return {
            ...options,
            credentials: 'include', // إرسال الكوكيز
            headers: {
                ...this.getHeaders(),
                ...(options.headers || {})
            }
        };
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

        const response = await fetch(`${this.baseUrl}/users?${queryParams}`, 
            this.getRequestOptions()
        );

        return this.handleResponse(response);
    }

    // Get admin dashboard statistics
    async getStats(): Promise<ApiResponse<any>> {
        const response = await fetch(`${this.baseUrl}/stats`, 
            this.getRequestOptions()
        );

        return this.handleResponse(response);
    }

    // Update user role
    async updateUserRole(userId: string, role: string): Promise<ApiResponse<any>> {
        const response = await fetch(`${this.baseUrl}/users/${userId}/role`, 
            this.getRequestOptions({
                method: 'PUT',
                body: JSON.stringify({ role })
            })
        );

        return this.handleResponse(response);
    }

    // Delete user
    async deleteUser(userId: string): Promise<ApiResponse<any>> {
        const response = await fetch(`${this.baseUrl}/users/${userId}`, 
            this.getRequestOptions({ method: 'DELETE' })
        );

        return this.handleResponse(response);
    }

    // Toggle user active status
    async toggleUserStatus(userId: string): Promise<ApiResponse<any>> {
        const response = await fetch(`${this.baseUrl}/users/${userId}/toggle-status`, 
            this.getRequestOptions({ method: 'PUT' })
        );

        return this.handleResponse(response);
    }

    // Get recent activity
    async getRecentActivity(limit: number = 10): Promise<ApiResponse<any>> {
        const response = await fetch(`${this.baseUrl}/activity?limit=${limit}`, 
            this.getRequestOptions()
        );

        return this.handleResponse(response);
    }
}

// Create and export singleton instance
export const adminApi = new AdminApiService();

// Export individual functions for easier importing
export const {
    getUsers,
    getStats,
    updateUserRole,
    deleteUser,
    toggleUserStatus,
    getRecentActivity
} = adminApi;