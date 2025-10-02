'use client';

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
  Package
} from 'lucide-react';

const monthlyData = [
  { month: 'Jan', revenue: 12450, orders: 145, users: 89 },
  { month: 'Feb', revenue: 15680, orders: 178, users: 102 },
  { month: 'Mar', revenue: 18920, orders: 201, users: 125 },
  { month: 'Apr', revenue: 22340, orders: 234, users: 156 },
  { month: 'May', revenue: 25890, orders: 267, users: 178 },
];

const topProducts = [
  { name: 'PUBG Mobile Account', sales: 145, revenue: 6670.55 },
  { name: 'FIFA 24 Account', sales: 234, revenue: 15210.00 },
  { name: 'Valorant Account', sales: 89, revenue: 8009.11 },
  { name: 'League of Legends', sales: 67, revenue: 8040.00 },
  { name: 'Call of Duty', sales: 178, revenue: 13439.00 },
];

const topCustomers = [
  { name: 'Layla Ahmed', orders: 34, spent: 3200.00 },
  { name: 'Sara Mohamed', orders: 23, spent: 2340.50 },
  { name: 'Ahmed Hassan', orders: 12, spent: 1250.00 },
  { name: 'Nour Adel', orders: 15, spent: 1580.00 },
  { name: 'Hassan Mahmoud', orders: 8, spent: 890.00 },
];

export default function AnalyticsPage() {
  const currentRevenue = 25890;
  const previousRevenue = 22340;
  const revenueGrowth = ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1);

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
          title="Total Revenue"
          value={`$${currentRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: parseFloat(revenueGrowth), isPositive: true }}
          gradient="from-green-500 to-emerald-600"
        />
        <StatCard
          title="Total Orders"
          value="1,234"
          icon={ShoppingCart}
          trend={{ value: 8.3, isPositive: true }}
          gradient="from-purple-500 to-pink-600"
        />
        <StatCard
          title="Total Users"
          value="2,543"
          icon={Users}
          trend={{ value: 12.5, isPositive: true }}
          gradient="from-blue-500 to-cyan-600"
        />
        <StatCard
          title="Conversion Rate"
          value="3.2%"
          icon={TrendingUp}
          trend={{ value: 0.8, isPositive: true }}
          gradient="from-orange-500 to-red-600"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Page Views</p>
                <p className="text-2xl font-bold text-white">48,592</p>
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
                <p className="text-white/60 text-sm mb-1">Click Rate</p>
                <p className="text-2xl font-bold text-white">15.8%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <MousePointer className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">New Users</p>
                <p className="text-2xl font-bold text-white">892</p>
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
                <p className="text-white/60 text-sm mb-1">Products Sold</p>
                <p className="text-2xl font-bold text-white">1,156</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Package className="h-6 w-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="bg-[#1e2236] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((data, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <span className="text-white/60 text-sm w-12">{data.month}</span>
                  <div className="flex-1 h-8 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-end pr-3"
                      style={{ width: `${(data.revenue / 30000) * 100}%` }}
                    >
                      <span className="text-white text-xs font-semibold">${data.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Orders Chart */}
        <Card className="bg-[#1e2236] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Orders Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((data, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <span className="text-white/60 text-sm w-12">{data.month}</span>
                  <div className="flex-1 h-8 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-end pr-3"
                      style={{ width: `${(data.orders / 300) * 100}%` }}
                    >
                      <span className="text-white text-xs font-semibold">{data.orders}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="bg-[#1e2236] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{product.name}</p>
                    <p className="text-white/60 text-xs">{product.sales} sales</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-semibold">${product.revenue.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="bg-[#1e2236] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCustomers.map((customer, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{customer.name}</p>
                      <p className="text-white/60 text-xs">{customer.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-400 font-semibold">${customer.spent.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
