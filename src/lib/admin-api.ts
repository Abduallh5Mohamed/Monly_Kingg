// Admin API service for frontend
const API_BASE = process.env.NODE_ENV === 'production'
    ? 'https://your-domain.com/api/v1'
    : 'http://localhost:5000/api/v1';

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

        const response = await fetch(`${this.baseUrl}/users?${queryParams}`, {
            headers: this.getHeaders()
        });

        return this.handleResponse(response);
    }

    // Get admin dashboard statistics
    async getStats(): Promise<ApiResponse<any>> {
        const response = await fetch(`${this.baseUrl}/stats`, {
            headers: this.getHeaders()
        });

        return this.handleResponse(response);
    }

    // Update user role
    async updateUserRole(userId: string, role: string): Promise<ApiResponse<any>> {
        const response = await fetch(`${this.baseUrl}/users/${userId}/role`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ role })
        });

        return this.handleResponse(response);
    }

    // Delete user
    async deleteUser(userId: string): Promise<ApiResponse<any>> {
        const response = await fetch(`${this.baseUrl}/users/${userId}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });

        return this.handleResponse(response);
    }

    // Toggle user active status
    async toggleUserStatus(userId: string): Promise<ApiResponse<any>> {
        const response = await fetch(`${this.baseUrl}/users/${userId}/toggle-status`, {
            method: 'PUT',
            headers: this.getHeaders()
        });

        return this.handleResponse(response);
    }

    // Get recent activity
    async getRecentActivity(limit: number = 10): Promise<ApiResponse<any>> {
        const response = await fetch(`${this.baseUrl}/activity?limit=${limit}`, {
            headers: this.getHeaders()
        });

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