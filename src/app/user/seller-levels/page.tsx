'use client';

import { useState, useEffect } from 'react';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { LevelBadge, LevelProgressBar } from '@/components/ui/level-badge';
import {
  TrendingUp,
  Trophy,
  Target,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lock,
  CheckCircle,
  Star,
} from 'lucide-react';

interface LevelProgress {
  userId: string;
  username: string;
  avatar: string | null;
  currentLevel: number;
  isOverridden: boolean;
  totalVolume: number;
  successfulTrades: number;
  rank: { name: string; color: string; icon: string };
  progress: {
    percent: number;
    currentLevelSales: number;
    requiredForNext: number;
    remaining: number;
  };
  maxLevel: number;
  currency: string;
}

interface LevelTableRow {
  level: number;
  salesToNext: number;
  totalRequired: number;
  rank: string;
  rankColor: string;
  rankIcon: string;
}

export default function SellerLevelsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [progress, setProgress] = useState<LevelProgress | null>(null);
  const [table, setTable] = useState<LevelTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableRange, setTableRange] = useState({ from: 1, to: 100 });
  const [showFullTable, setShowFullTable] = useState(false);

  useEffect(() => {
    fetchProgress();
    fetchTable();
  }, []);

  useEffect(() => {
    fetchTable();
  }, [tableRange]);

  const fetchProgress = async () => {
    try {
      const res = await fetch('/api/v1/seller/level-progress', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setProgress(data.data);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to load level progress', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTable = async () => {
    setTableLoading(true);
    try {
      const res = await fetch(`/api/v1/seller/levels-table?from=${tableRange.from}&to=${tableRange.to}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setTable(data.data.table || []);
      }
    } catch {
      // silent
    } finally {
      setTableLoading(false);
    }
  };

  const rangeOptions = [
    { from: 1, to: 100, label: '1–100' },
    { from: 101, to: 200, label: '101–200' },
    { from: 201, to: 300, label: '201–300' },
    { from: 301, to: 400, label: '301–400' },
    { from: 401, to: 500, label: '401–500' },
  ];

  const allRanks = [
    { name: 'Starter', minLevel: 1, maxLevel: 20, color: '#9CA3AF', icon: '🌱' },
    { name: 'Bronze', minLevel: 21, maxLevel: 50, color: '#CD7F32', icon: '🥉' },
    { name: 'Silver', minLevel: 51, maxLevel: 100, color: '#C0C0C0', icon: '🥈' },
    { name: 'Gold', minLevel: 101, maxLevel: 200, color: '#FFD700', icon: '🥇' },
    { name: 'Platinum', minLevel: 201, maxLevel: 300, color: '#E5E4E2', icon: '💎' },
    { name: 'Diamond', minLevel: 301, maxLevel: 400, color: '#B9F2FF', icon: '💠' },
    { name: 'Master Seller', minLevel: 401, maxLevel: 500, color: '#FF4500', icon: '👑' },
  ];

  if (loading) {
    return (
      <UserDashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-white/30" />
        </div>
      </UserDashboardLayout>
    );
  }

  return (
    <UserDashboardLayout>
      <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
        {/* Hero — Current Level */}
        {progress && (
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 md:p-8">
            {/* Background glow */}
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-10"
              style={{ backgroundColor: progress.rank.color }}
            />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-white/40 text-sm mb-1">Your Seller Level</p>
                  <div className="flex items-center gap-3">
                    <span className="text-5xl font-bold text-white">{progress.currentLevel}</span>
                    <div className="flex flex-col">
                      <LevelBadge
                        level={progress.currentLevel}
                        rank={progress.rank.name}
                        rankColor={progress.rank.color}
                        rankIcon={progress.rank.icon}
                        size="lg"
                        showLevel={false}
                      />
                      <span className="text-white/30 text-xs mt-1">of {progress.maxLevel} max</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-xs">Total Sales</p>
                  <p className="text-white text-xl font-bold">{progress.totalVolume.toLocaleString()} {progress.currency}</p>
                  <p className="text-white/30 text-xs mt-1">{progress.successfulTrades} successful trades</p>
                </div>
              </div>

              {/* Progress to next level */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Progress to Level {progress.currentLevel + 1}</span>
                  <span className="text-white font-medium">{progress.progress.percent}%</span>
                </div>
                <LevelProgressBar
                  percent={progress.progress.percent}
                  rankColor={progress.rank.color}
                  height="lg"
                  showPercent={false}
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/30">
                    {progress.progress.currentLevelSales.toLocaleString()} / {progress.progress.requiredForNext.toLocaleString()} {progress.currency}
                  </span>
                  <span className="text-white/50 flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {progress.progress.remaining.toLocaleString()} {progress.currency} remaining
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rank Tiers */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Rank System
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {allRanks.map((rank) => {
              const isCurrentRank = progress && progress.rank.name === rank.name;
              const isAchieved = progress && progress.currentLevel >= rank.minLevel;
              const isLocked = progress && progress.currentLevel < rank.minLevel;

              return (
                <div
                  key={rank.name}
                  className={`relative rounded-lg border p-4 transition-all ${
                    isCurrentRank
                      ? 'border-white/20 bg-white/[0.06]'
                      : isLocked
                        ? 'border-white/[0.04] bg-white/[0.01] opacity-50'
                        : 'border-white/[0.06] bg-white/[0.02]'
                  }`}
                  style={isCurrentRank ? { borderColor: `${rank.color}40` } : {}}
                >
                  {isCurrentRank && (
                    <div className="absolute -top-2 -right-2">
                      <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                    </div>
                  )}
                  <div className="text-2xl mb-2">{rank.icon}</div>
                  <p className="text-white font-medium text-sm" style={{ color: isLocked ? undefined : rank.color }}>
                    {rank.name}
                  </p>
                  <p className="text-white/30 text-xs mt-1">
                    Level {rank.minLevel} – {rank.maxLevel}
                  </p>
                  <div className="mt-2">
                    {isCurrentRank ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                        Current
                      </span>
                    ) : isAchieved ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-white/20" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Levels Table */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              Level Requirements
            </h2>
            <button
              onClick={() => setShowFullTable(!showFullTable)}
              className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1 transition-colors"
            >
              {showFullTable ? 'Show Less' : 'Show Full Table'}
              {showFullTable ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {showFullTable && (
            <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
              {rangeOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setTableRange({ from: opt.from, to: opt.to })}
                  className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-all ${
                    tableRange.from === opt.from
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                  }`}
                >
                  Lv {opt.label}
                </button>
              ))}
            </div>
          )}

          <div className={`overflow-x-auto ${showFullTable ? 'max-h-[500px]' : 'max-h-[300px]'} overflow-y-auto`}>
            <table className="w-full">
              <thead className="sticky top-0 bg-[#0a0c10] z-10">
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left p-2.5 text-xs font-medium text-white/40">Level</th>
                  <th className="text-left p-2.5 text-xs font-medium text-white/40">To Next</th>
                  <th className="text-left p-2.5 text-xs font-medium text-white/40">Total Needed</th>
                  <th className="text-left p-2.5 text-xs font-medium text-white/40">Rank</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center">
                      <Loader2 className="h-5 w-5 animate-spin text-white/30 mx-auto" />
                    </td>
                  </tr>
                ) : (
                  table.map((row) => {
                    const isCurrent = progress && progress.currentLevel === row.level;
                    return (
                      <tr
                        key={row.level}
                        className={`border-b border-white/[0.03] hover:bg-white/[0.02] ${
                          isCurrent ? 'bg-white/[0.04]' : ''
                        }`}
                      >
                        <td className="p-2.5">
                          <span className={`text-sm font-medium ${isCurrent ? 'text-yellow-500' : 'text-white'}`}>
                            {isCurrent && '→ '}Lv {row.level}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className="text-white/60 text-sm">{row.salesToNext.toLocaleString()} EGP</span>
                        </td>
                        <td className="p-2.5">
                          <span className="text-white/40 text-sm">{row.totalRequired.toLocaleString()} EGP</span>
                        </td>
                        <td className="p-2.5">
                          <LevelBadge
                            level={row.level}
                            rank={row.rank}
                            rankColor={row.rankColor}
                            rankIcon={row.rankIcon}
                            size="sm"
                            showLevel={false}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  );
}
