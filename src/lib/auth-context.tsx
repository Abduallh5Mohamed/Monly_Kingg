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
  logout: (redirectTo?: string, showToast?: boolean) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<boolean>;
  resendCode: (email: string, password: string) => Promise<boolean>;
  refreshAuth: () => Promise<void>; // Added to refresh user data
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

  // Idle timeout - 15 minutes
  const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Update last activity on user interaction
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  // Check for idle timeout
  useEffect(() => {
    if (!user) return;

    const checkIdleTimeout = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      if (timeSinceLastActivity >= IDLE_TIMEOUT) {
        console.log('🕐 Session timeout due to inactivity');
        toast({
          title: 'Session Expired',
          description: 'You have been logged out due to inactivity',
          variant: 'default',
        });
        logout('/', false); // Don't show double toast
      }
    };

    // Check every minute
    const interval = setInterval(checkIdleTimeout, 60000);
    return () => clearInterval(interval);
  }, [user, lastActivity]);

  useEffect(() => {
    // Always check auth on mount - cookies are httpOnly so document.cookie can't see them
    // The server will validate the tokens via the cookie header automatically
    checkAuthStatus();
  }, []); // Only on mount

  // Track route changes
  useEffect(() => {
    if (user) {
      setLastActivity(Date.now()); // Update activity on navigation
    }
  }, [pathname, user]);

  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking auth status...');
      const response = await apiClient.refreshToken();
      if (response.success && response.data) {
        console.log('✅ Auth status: User authenticated', response.data.userData);
        setUser(response.data.userData);
        setLastAuthCheck(Date.now());
        setLastActivity(Date.now()); // Reset activity on successful auth
      } else {
        // Failed to refresh - clear user
        console.log('❌ Auth status: Failed to refresh token', response.message);
        setUser(null);
      }
    } catch (error) {
      // No active session - clear user
      console.log('❌ Auth status: Error', error);
      setUser(null);
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

      console.log('📞 [Frontend] Calling verify email API...');
      const response = await apiClient.verifyEmail(email, code);

      console.log('📥 [Frontend] Full API Response:', {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        rawResponse: JSON.stringify(response)
      });

      if (response.success && response.data) {
        // Update user state first
        setUser(response.data.userData);

        console.log('🔍 [Frontend] Verify Email Response:', {
          username: response.data.userData?.username,
          profileCompleted: response.data.userData?.profileCompleted,
          type: typeof response.data.userData?.profileCompleted,
          hasUserData: !!response.data.userData,
          userDataKeys: response.data.userData ? Object.keys(response.data.userData) : []
        });

        toast({
          title: 'Account Verified Successfully!',
          description: `Welcome, ${response.data.userData.username}`,
          variant: 'default',
        });

        // Use setTimeout to ensure state is updated before navigation
        setTimeout(() => {
          // Check if profile needs to be completed
          const shouldCompleteProfile = response.data.userData.profileCompleted !== true;

          console.log('🎯 [Frontend] Redirect Decision:', {
            profileCompleted: response.data.userData.profileCompleted,
            shouldCompleteProfile,
            willRedirectTo: shouldCompleteProfile ? '/complete-profile' : '/user/dashboard'
          });

          // Redirect to complete-profile if profileCompleted is false, undefined, or null
          if (shouldCompleteProfile) {
            console.log('➡️ [Frontend] Redirecting to /complete-profile');
            // Use replace to prevent back navigation
            router.replace('/complete-profile');
          } else {
            // Redirect user to dashboard
            console.log('➡️ [Frontend] Redirecting to /user/dashboard');
            router.replace('/user/dashboard');
          }
        }, 100);

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

  const logout = async (redirectTo: string = '/login', showToast: boolean = true): Promise<void> => {
    try {
      setLoading(true);

      await apiClient.logout();
      setUser(null);

      if (showToast) {
        toast({
          title: 'Logged Out',
          description: 'You have been logged out successfully',
          variant: 'default',
        });
      }

      // Redirect user to specified path (default: login page)
      router.push(redirectTo);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if request fails, clear local data
      setUser(null);
      router.push(redirectTo);
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
    refreshAuth: checkAuthStatus,
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