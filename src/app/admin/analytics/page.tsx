'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/admin/stat-card';
import {
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Eye,
  MousePointer,
  UserPlus,
  Package,
  Loader2
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

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/v1/admin/stats', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch statistics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-2">Error loading analytics</p>
          <p className="text-white/60">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-white/60">Track your business performance and insights</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={Users}
          trend={{ value: stats.userGrowth, isPositive: stats.userGrowth >= 0 }}
          gradient="from-blue-500 to-cyan-600"
        />
        <StatCard
          title="Verified Users"
          value={stats.verifiedUsers.toLocaleString()}
          icon={ShoppingCart}
          trend={{ value: parseFloat(stats.verificationRate.toString()), isPositive: true }}
          gradient="from-green-500 to-emerald-600"
        />
        <StatCard
          title="New Users Today"
          value={stats.newUsersToday.toLocaleString()}
          icon={UserPlus}
          trend={{ value: stats.userGrowth, isPositive: stats.userGrowth >= 0 }}
          gradient="from-purple-500 to-pink-600"
        />
        <StatCard
          title="Admin Users"
          value={stats.adminUsers.toLocaleString()}
          icon={TrendingUp}
          gradient="from-orange-500 to-red-600"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Verification Rate</p>
                <p className="text-2xl font-bold text-white">{stats.verificationRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Eye className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">User Growth</p>
                <p className="text-2xl font-bold text-white">{stats.userGrowth.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">New Today</p>
                <p className="text-2xl font-bold text-white">{stats.newUsersToday}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Admins</p>
                <p className="text-2xl font-bold text-white">{stats.adminUsers}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Registration Trend */}
      <Card className="bg-[#1e2236] border-white/10">
        <CardHeader>
          <CardTitle className="text-white">User Registration Trend (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.registrationTrend.map((day, idx) => {
              const maxCount = Math.max(...stats.registrationTrend.map(d => d.count));
              const dateObj = new Date(day.date);
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

              return (
                <div key={idx} className="flex items-center gap-4">
                  <span className="text-white/60 text-sm w-24">{dayName}</span>
                  <div className="flex-1 h-8 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-end pr-3"
                      style={{ width: maxCount > 0 ? `${(day.count / maxCount) * 100}%` : '0%' }}
                    >
                      <span className="text-white text-xs font-semibold">{day.count} users</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
