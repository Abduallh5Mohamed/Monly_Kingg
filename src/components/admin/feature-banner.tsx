'use client';

import { Card } from '@/components/ui/card';
import { BarChart3, Users, ShoppingCart, TrendingUp } from 'lucide-react';

export function FeatureBanner() {
  return (
    <Card className="relative overflow-hidden border border-white/[0.06] bg-[#131620]">
      {/* Subtle background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="relative z-10 px-6 md:px-8 py-6 md:py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left - Text */}
          <div className="flex-1">
            <p className="text-white/40 text-xs font-medium uppercase tracking-widest mb-2">Overview</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-1.5">
              Admin Control Center
            </h2>
            <p className="text-white/50 text-sm max-w-lg">
              Monitor platform performance, manage users, and oversee all marketplace operations from a single dashboard.
            </p>
          </div>

          {/* Right - Quick stats */}
          <div className="flex items-center gap-4 md:gap-6">
            {[
              { icon: Users, label: 'Users', value: 'Active', color: 'text-blue-400' },
              { icon: ShoppingCart, label: 'Orders', value: 'Live', color: 'text-emerald-400' },
              { icon: BarChart3, label: 'Revenue', value: 'Growing', color: 'text-violet-400' },
              { icon: TrendingUp, label: 'Growth', value: 'Positive', color: 'text-amber-400' },
            ].map((stat, i) => (
              <div key={i} className="text-center hidden sm:block">
                <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-1.5">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-white/30 text-[10px] uppercase tracking-wider">{stat.label}</p>
                <p className={`text-xs font-medium ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
