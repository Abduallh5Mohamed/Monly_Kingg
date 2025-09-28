'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, UserData, ApiResponse, AuthResponse } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

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

  useEffect(() => {
    // تحقق من حالة المصادقة عند تحميل الصفحة
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await apiClient.refreshToken();
      if (response.success && response.data) {
        setUser(response.data.userData);
      }
    } catch (error) {
      console.log('No active session');
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
        toast({
          title: 'تم تسجيل الدخول بنجاح!',
          description: `مرحباً بك، ${response.data.userData.username}`,
          variant: 'default',
        });
        
        // توجيه المستخدم للصفحة الرئيسية
        router.push('/');
        return true;
      } else {
        toast({
          title: 'خطأ في تسجيل الدخول',
          description: response.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'خطأ في الاتصال',
        description: 'يرجى المحاولة مرة أخرى',
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
          title: 'تم إنشاء الحساب بنجاح!',
          description: 'يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب',
          variant: 'default',
        });
        
        // توجيه المستخدم لصفحة التحقق من البريد الإلكتروني
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return true;
      } else {
        toast({
          title: 'خطأ في إنشاء الحساب',
          description: response.message || 'فشل في إنشاء الحساب',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'خطأ في الاتصال',
        description: 'يرجى المحاولة مرة أخرى',
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
        toast({
          title: 'تم تفعيل الحساب بنجاح!',
          description: `مرحباً بك، ${response.data.userData.username}`,
          variant: 'default',
        });
        
        // توجيه المستخدم للصفحة الرئيسية
        router.push('/');
        return true;
      } else {
        toast({
          title: 'خطأ في التفعيل',
          description: response.message || 'رمز التفعيل غير صحيح',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'خطأ في الاتصال',
        description: 'يرجى المحاولة مرة أخرى',
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
          title: 'تم إرسال الرمز',
          description: 'تم إرسال رمز تفعيل جديد إلى بريدك الإلكتروني',
          variant: 'default',
        });
        return true;
      } else {
        toast({
          title: 'خطأ في إرسال الرمز',
          description: response.message || 'فشل في إرسال رمز التفعيل',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'خطأ في الاتصال',
        description: 'يرجى المحاولة مرة أخرى',
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
        title: 'تم تسجيل الخروج',
        description: 'تم تسجيل خروجك بنجاح',
        variant: 'default',
      });
      
      // توجيه المستخدم لصفحة تسجيل الدخول
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // حتى لو فشل الطلب، امسح البيانات المحلية
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