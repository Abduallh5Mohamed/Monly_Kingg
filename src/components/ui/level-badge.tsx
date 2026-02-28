'use client';

import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: number;
  rank?: string;
  rankColor?: string;
  rankIcon?: string;
  size?: 'sm' | 'md' | 'lg';
  showLevel?: boolean;
  showRank?: boolean;
  className?: string;
}

const RANK_DEFAULTS: Record<string, { color: string; icon: string }> = {
  'Starter': { color: '#9CA3AF', icon: '🌱' },
  'Bronze': { color: '#CD7F32', icon: '🥉' },
  'Silver': { color: '#C0C0C0', icon: '🥈' },
  'Gold': { color: '#FFD700', icon: '🥇' },
  'Platinum': { color: '#E5E4E2', icon: '💎' },
  'Diamond': { color: '#B9F2FF', icon: '💠' },
  'Master Seller': { color: '#FF4500', icon: '👑' },
};

export function LevelBadge({
  level,
  rank = 'Starter',
  rankColor,
  rankIcon,
  size = 'md',
  showLevel = true,
  showRank = true,
  className,
}: LevelBadgeProps) {
  const defaults = RANK_DEFAULTS[rank] || RANK_DEFAULTS['Starter'];
  const color = rankColor || defaults.color;
  const icon = rankIcon || defaults.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold border whitespace-nowrap',
        sizeClasses[size],
        className
      )}
      style={{
        borderColor: `${color}40`,
        backgroundColor: `${color}15`,
        color: color,
      }}
    >
      <span>{icon}</span>
      {showLevel && <span>Lv.{level}</span>}
      {showRank && <span className="opacity-80">{rank}</span>}
    </span>
  );
}

interface LevelProgressBarProps {
  percent: number;
  rankColor?: string;
  height?: 'sm' | 'md' | 'lg';
  showPercent?: boolean;
  className?: string;
}

export function LevelProgressBar({
  percent,
  rankColor = '#9CA3AF',
  height = 'md',
  showPercent = true,
  className,
}: LevelProgressBarProps) {
  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-white/[0.06] rounded-full overflow-hidden', heightClasses[height])}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${Math.min(100, Math.max(0, percent))}%`,
            backgroundColor: rankColor,
          }}
        />
      </div>
      {showPercent && (
        <p className="text-[10px] text-white/40 mt-1 text-right">{percent}%</p>
      )}
    </div>
  );
}
