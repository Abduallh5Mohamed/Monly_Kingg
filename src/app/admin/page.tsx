'use client';

import { useState, useEffect } from 'react';
import { StatCard } from '@/components/admin/stat-card';
import { UsersTable } from '@/components/admin/users-table';
import { LiveActivity } from '@/components/admin/live-activity';
import { FeatureBanner } from '@/components/admin/feature-banner';
import { adminApi } from '@/lib/admin-api';
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserPlus,
  TrendingUp,
  Activity
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  verifiedUsers: number;
  adminUsers: number;
  newUsersToday: number;
  userGrowth: number;
  verificationRate: number;
  registrationTrend: Array<{ date: string; count: number }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getStats();
      if (response.success) {
        setStats(response.data);
      } else {
        setError('Failed to fetch statistics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
      console.error('Stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-7 bg-white/[0.04] rounded-md w-40 mb-2"></div>
          <div className="h-4 bg-white/[0.04] rounded w-72"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/[0.04] rounded-lg animate-pulse border border-white/[0.04]"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-white/[0.06] text-white text-sm rounded-lg hover:bg-white/[0.1] transition-colors border border-white/[0.06]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-white/40 text-sm">Platform overview and recent activity</p>
      </div>

      {/* Feature Banner */}
      <FeatureBanner />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers.toLocaleString() || '0'}
          icon={Users}
          trend={{
            value: stats?.userGrowth || 0,
            isPositive: (stats?.userGrowth || 0) >= 0
          }}
          gradient="from-blue-500 to-indigo-600"
        />
        <StatCard
          title="Verified Users"
          value={stats?.verifiedUsers.toLocaleString() || '0'}
          icon={UserCheck}
          trend={{
            value: stats?.verificationRate || 0,
            isPositive: (stats?.verificationRate || 0) > 80
          }}
          gradient="from-emerald-500 to-green-600"
        />
        <StatCard
          title="New Today"
          value={stats?.newUsersToday.toString() || '0'}
          icon={UserPlus}
          trend={{
            value: stats?.userGrowth || 0,
            isPositive: (stats?.userGrowth || 0) >= 0
          }}
          gradient="from-violet-500 to-purple-600"
        />
        <StatCard
          title="Admin Users"
          value={stats?.adminUsers.toString() || '0'}
          icon={ShieldCheck}
          trend={{
            value: stats?.adminUsers ? (stats.adminUsers / stats.totalUsers * 100) : 0,
            isPositive: true
          }}
          gradient="from-amber-500 to-orange-600"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users Table - Takes 2 columns */}
        <div className="lg:col-span-2">
          <UsersTable />
        </div>

        {/* Live Activity - Takes 1 column */}
        <div className="lg:col-span-1">
          <LiveActivity />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Verification Rate"
          value={`${stats?.verificationRate || 0}%`}
          icon={Activity}
          trend={{
            value: stats?.verificationRate || 0,
            isPositive: (stats?.verificationRate || 0) > 80
          }}
          gradient="from-indigo-500 to-blue-600"
        />
        <StatCard
          title="Growth Rate"
          value={`${stats?.userGrowth || 0}%`}
          icon={TrendingUp}
          trend={{
            value: stats?.userGrowth || 0,
            isPositive: (stats?.userGrowth || 0) >= 0
          }}
          gradient="from-teal-500 to-emerald-600"
        />
        <StatCard
          title="Active Ratio"
          value={`${stats?.totalUsers ? ((stats.verifiedUsers / stats.totalUsers) * 100).toFixed(1) : 0}%`}
          icon={Users}
          trend={{
            value: stats?.totalUsers ? ((stats.verifiedUsers / stats.totalUsers) * 100) : 0,
            isPositive: stats?.totalUsers ? ((stats.verifiedUsers / stats.totalUsers) * 100) > 70 : false
          }}
          gradient="from-rose-500 to-pink-600"
        />
      </div>
    </div>
  );
}
