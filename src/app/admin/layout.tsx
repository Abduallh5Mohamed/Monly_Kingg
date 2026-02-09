'use client';

import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Allow access without authentication for development
  // In production, you should uncomment the authentication check below
  
  /*
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not admin
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }
  */

  return (
    <div className="min-h-screen bg-[#0a0c10]">
      <AdminSidebar />
      <div className="md:ml-20 ml-0">
        <AdminHeader />
        <main className="pt-20 px-4 md:px-8 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
