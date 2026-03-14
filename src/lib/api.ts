// API client للتواصل مع الباك إند
import { toast } from "@/hooks/use-toast";

const API_BASE_URL = '/api/v1';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  role: string;
  isSeller?: boolean;
  fullName?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  bio?: string;
  profileCompleted?: boolean;
  moderatorPermissions?: string[];
}

interface AuthResponse {
  message: string;
  userData: UserData;
  expiresIn: number;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout: number = 30000
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const url = `${API_BASE_URL}${endpoint}`;

      // احصل على CSRF token إذا كان متاحاً
      const csrfToken = this.getCsrfToken();

      const response = await fetch(url, {
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
          ...(csrfToken && { 'X-XSRF-TOKEN': csrfToken }),
          ...options.headers,
        },
        ...options,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || `HTTP ${response.status}`,
          errors: data.errors,
        };
      }

      return {
        success: true,
        data,
        message: data.message,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('API Error:', error);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            message: 'Request timeout - الطلب استغرق وقتاً طويلاً',
          };
        }
        return {
          success: false,
          message: error.message,
        };
      }

      return {
        success: false,
        message: 'Network error - خطأ في الاتصال',
      };
    }
  }

  private getCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN' || name === process.env.CSRF_COOKIE_NAME) {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  async getCsrfTokenFromServer(): Promise<string | null> {
    try {
      const response = await this.request('/auth/csrf-token');
      if (response.success) {
        // SECURITY FIX: [CRIT-01] CSRF token is cookie-only; read it from document.cookie.
        return this.getCsrfToken();
      }
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
    }
    return null;
  }

  async login(data: LoginData): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async register(data: RegisterData): Promise<ApiResponse<{ message: string; user: UserData }>> {
    return this.request<{ message: string; user: UserData }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyEmail(email: string, code: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async resendCode(email: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  async refreshToken(): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();
export type { LoginData, RegisterData, UserData, AuthResponse, ApiResponse };