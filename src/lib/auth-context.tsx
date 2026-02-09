'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, UserData, ApiResponse, AuthResponse } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<boolean>;
  resendCode: (email: string, password: string) => Promise<boolean>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  // Cache the auth check to prevent multiple calls
  const [lastAuthCheck, setLastAuthCheck] = useState<number>(0);
  const AUTH_CACHE_DURATION = 30000; // 30 seconds

  useEffect(() => {
    // Skip auth check during navigation if recently checked
    const now = Date.now();
    if (user && (now - lastAuthCheck) < AUTH_CACHE_DURATION) {
      setLoading(false);
      return;
    }

    // Check authentication status on page load
    // Only check if we might have a session (cookie exists)
    const hasCookie = document.cookie.includes('access_token') || document.cookie.includes('refresh_token');
    if (hasCookie) {
      checkAuthStatus();
    } else {
      setLoading(false);
    }
  }, [pathname]); // Only re-check on route change

  const checkAuthStatus = async () => {
    try {
      const response = await apiClient.refreshToken();
      if (response.success && response.data) {
        setUser(response.data.userData);
        setLastAuthCheck(Date.now());
      }
    } catch (error) {
      // No active session - silent
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);

      const response = await apiClient.login({ email, password });

      if (response.success && response.data) {
        setUser(response.data.userData);
        
        console.log('🔍 Login Response:', {
          username: response.data.userData.username,
          profileCompleted: response.data.userData.profileCompleted,
          type: typeof response.data.userData.profileCompleted
        });
        
        toast({
          title: 'Login Successful!',
          description: `Welcome back, ${response.data.userData.username}`,
          variant: 'default',
        });

        // Check if profile needs to be completed
        if (response.data.userData.profileCompleted !== true) {
          console.log('➡️ Redirecting to /complete-profile');
          router.push('/complete-profile');
        } else if (response.data.userData.role === 'admin') {
          console.log('➡️ Redirecting to /admin/dashboard');
          router.push('/admin/dashboard');
        } else {
          console.log('➡️ Redirecting to /user/dashboard');
          router.push('/user/dashboard');
        }
        return true;
      } else {
        toast({
          title: 'Login Error',
          description: response.message || 'Invalid email or password',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: 'Please try again',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);

      const response = await apiClient.register({ username, email, password });

      if (response.success && response.data) {
        toast({
          title: 'Account Created Successfully!',
          description: 'Please check your email to verify your account',
          variant: 'default',
        });

        // Redirect user to email verification page
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return true;
      } else {
        toast({
          title: 'Registration Error',
          description: response.message || 'Failed to create account',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: 'Please try again',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (email: string, code: string): Promise<boolean> => {
    try {
      setLoading(true);

      const response = await apiClient.verifyEmail(email, code);

      if (response.success && response.data) {
        setUser(response.data.userData);
        
        console.log('🔍 Verify Email Response:', {
          username: response.data.userData.username,
          profileCompleted: response.data.userData.profileCompleted,
          type: typeof response.data.userData.profileCompleted
        });
        
        toast({
          title: 'Account Verified Successfully!',
          description: `Welcome, ${response.data.userData.username}`,
          variant: 'default',
        });

        // Check if profile needs to be completed
        // Redirect to complete-profile if profileCompleted is false, undefined, or null
        if (response.data.userData.profileCompleted !== true) {
          console.log('➡️ Redirecting to /complete-profile');
          router.push('/complete-profile');
        } else {
          // Redirect user to dashboard
          console.log('➡️ Redirecting to /user/dashboard');
          router.push('/user/dashboard');
        }
        return true;
      } else {
        toast({
          title: 'Verification Error',
          description: response.message || 'Invalid verification code',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: 'Please try again',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);

      const response = await apiClient.resendCode(email, password);

      if (response.success) {
        toast({
          title: 'Code Sent',
          description: 'A new verification code has been sent to your email',
          variant: 'default',
        });
        return true;
      } else {
        toast({
          title: 'Failed to Send Code',
          description: response.message || 'Failed to send verification code',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: 'Please try again',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);

      await apiClient.logout();
      setUser(null);

      toast({
        title: 'Logged Out',
        description: 'You have been logged out successfully',
        variant: 'default',
      });

      // Redirect user to login page
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if request fails, clear local data
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    verifyEmail,
    resendCode,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}