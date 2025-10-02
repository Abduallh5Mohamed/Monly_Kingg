'use client';

import { StatCard } from '@/components/admin/stat-card';
import { UsersTable } from '@/components/admin/users-table';
import { LiveActivity } from '@/components/admin/live-activity';
import { FeatureBanner } from '@/components/admin/feature-banner';
import {
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  MessageSquare
} from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white/60">Welcome back, Admin! Here's what's happening today.</p>
      </div>

      {/* Feature Banner */}
      <FeatureBanner />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value="2,543"
          icon={Users}
          trend={{ value: 12.5, isPositive: true }}
          gradient="from-blue-500 to-cyan-600"
        />
        <StatCard
          title="Total Orders"
          value="1,234"
          icon={ShoppingCart}
          trend={{ value: 8.3, isPositive: true }}
          gradient="from-purple-500 to-pink-600"
        />
        <StatCard
          title="Revenue"
          value="$45,678"
          icon={DollarSign}
          trend={{ value: 23.1, isPositive: true }}
          gradient="from-green-500 to-emerald-600"
        />
        <StatCard
          title="Active Games"
          value="156"
          icon={Package}
          trend={{ value: 5.4, isPositive: false }}
          gradient="from-orange-500 to-red-600"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Support Tickets"
          value="23"
          icon={MessageSquare}
          trend={{ value: 3.2, isPositive: false }}
          gradient="from-indigo-500 to-blue-600"
        />
        <StatCard
          title="Growth Rate"
          value="18.5%"
          icon={TrendingUp}
          trend={{ value: 4.7, isPositive: true }}
          gradient="from-teal-500 to-green-600"
        />
        <StatCard
          title="Avg Order Value"
          value="$37.89"
          icon={DollarSign}
          trend={{ value: 6.8, isPositive: true }}
          gradient="from-pink-500 to-rose-600"
        />
      </div>
    </div>
  );
}
