'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';

/** Fetch and store the CSRF token in a cookie so admin mutations work */
async function fetchCsrfToken() {
  try {
    const res = await fetch('/api/v1/auth/csrf-token', { credentials: 'include' });
    const data = await res.json();
    if (data?.csrfToken) {
      document.cookie = `XSRF-TOKEN=${data.csrfToken}; path=/; max-age=900; SameSite=Lax`;
    }
  } catch {
    // non-fatal — admin will see 403 on mutations if this fails
  }
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && (!user || (user.role !== 'admin' && user.role !== 'moderator'))) {
      router.replace('/login');
    }
    // Fetch CSRF token as soon as admin/moderator is confirmed
    if (mounted && !loading && (user?.role === 'admin' || user?.role === 'moderator')) {
      fetchCsrfToken();
    }
  }, [user, loading, router, mounted]);

  // Don't render anything on server or before client mount — prevents hydration mismatch
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c10]">
      <AdminSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="md:ml-20 ml-0">
        <AdminHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="pt-20 px-4 md:px-8 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
