'use client';

import { LucideIcon, ArrowUp, ArrowDown } from 'lucide-react';
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
    <Card className="relative overflow-hidden border border-white/[0.06] bg-[#131620] p-5">
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br",
            gradient
          )}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          
          {trend && (
            <div className={cn(
              "flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-md",
              trend.isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
            )}>
              {trend.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(trend.value).toFixed(1)}%
            </div>
          )}
        </div>
        
        <div>
          <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </Card>
  );
}
