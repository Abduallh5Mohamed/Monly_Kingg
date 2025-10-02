'use client';

import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient: string;
}

export function StatCard({ title, value, icon: Icon, trend, gradient }: StatCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden border-0 bg-gradient-to-br p-6",
      gradient
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black/20" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon className="h-6 w-6 text-white" />
          </div>
          
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full",
              trend.isPositive ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        
        <div>
          <p className="text-white/70 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
      </div>
    </Card>
  );
}
