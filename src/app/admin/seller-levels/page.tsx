'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/admin-api';
import { useToast } from '@/hooks/use-toast';
import { LevelBadge, LevelProgressBar } from '@/components/ui/level-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  RefreshCw,
  Settings2,
  BarChart3,
  Users,
  Table2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  RotateCcw,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Save,
  Plus,
  Trash2,
  Eye,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RankConfig {
  _id?: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  color: string;
  icon: string;
}

interface LevelConfigData {
  _id: string;
  multiplier: number;
  exponent: number;
  maxLevel: number;
  currency: string;
  ranks: RankConfig[];
}

interface SellerLevelInfo {
  _id: string;
  username: string;
  email: string;
  avatar: string | null;
  stats: {
    totalVolume: number;
    level: number;
    rank: string;
    levelOverride: number | null;
    successfulTrades: number;
  };
  levelInfo: {
    level: number;
    rank: { name: string; color: string; icon: string };
    isOverridden: boolean;
    progressPercent: number;
    remaining: number;
  };
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SellerLevelsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'sellers' | 'config' | 'stats' | 'table'>('sellers');

  const tabs = [
    { id: 'sellers' as const, label: 'All Sellers', icon: Users },
    { id: 'config' as const, label: 'Level Config', icon: Settings2 },
    { id: 'stats' as const, label: 'Statistics', icon: BarChart3 },
    { id: 'table' as const, label: 'Levels Table', icon: Table2 },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <TrendingUp className="h-7 w-7 text-yellow-500" />
              Seller Levels
            </h1>
            <p className="text-white/50 mt-1 text-sm">Manage seller level system, ranks, and progression</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/[0.03] rounded-lg p-1 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/[0.08] text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'sellers' && <SellersTab />}
        {activeTab === 'config' && <ConfigTab />}
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'table' && <LevelsTableTab />}
      </div>
    </div>
  );
}

// ─── Sellers Tab ────────────────────────────────────────────────────────────

function SellersTab() {
  const { toast } = useToast();
  const [sellers, setSellers] = useState<SellerLevelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rankFilter, setRankFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [ranks, setRanks] = useState<RankConfig[]>([]);
  const [recalculating, setRecalculating] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; seller: SellerLevelInfo | null }>({ open: false, seller: null });
  const [editLevel, setEditLevel] = useState('');

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSellerLevels({ page, limit: 20, search, rank: rankFilter });
      if (res.success) {
        setSellers(res.data.sellers);
        setPagination(res.data.pagination);
        setRanks(res.data.ranks || []);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, search, rankFilter]);

  useEffect(() => { fetchSellers(); }, [fetchSellers]);

  const handleRecalculate = async () => {
    if (!confirm('Are you sure you want to recalculate ALL seller levels? This may take a moment.')) return;
    setRecalculating(true);
    try {
      const res = await adminApi.recalculateAllLevels();
      toast({ title: 'Success', description: res.message || 'All levels recalculated' });
      fetchSellers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setRecalculating(false);
    }
  };

  const handleSetLevel = async () => {
    if (!editModal.seller) return;
    const level = parseInt(editLevel);
    if (isNaN(level) || level < 1 || level > 500) {
      toast({ title: 'Error', description: 'Level must be between 1 and 500', variant: 'destructive' });
      return;
    }
    try {
      await adminApi.setSellerLevel(editModal.seller._id, level);
      toast({ title: 'Success', description: `Level set to ${level}` });
      setEditModal({ open: false, seller: null });
      fetchSellers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemoveOverride = async (userId: string) => {
    if (!confirm('Remove manual override? Level will be auto-calculated from sales.')) return;
    try {
      await adminApi.removeSellerLevelOverride(userId);
      toast({ title: 'Success', description: 'Override removed' });
      fetchSellers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Search sellers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10 bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30"
          />
        </div>
        <select
          value={rankFilter}
          onChange={(e) => { setRankFilter(e.target.value); setPage(1); }}
          className="bg-white/[0.04] border border-white/[0.06] text-white rounded-md px-3 py-2 text-sm"
        >
          <option value="">All Ranks</option>
          {ranks.map((r) => (
            <option key={r.name} value={r.name}>{r.icon} {r.name}</option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRecalculate}
          disabled={recalculating}
          className="border-white/[0.06] text-white/70 hover:text-white"
        >
          {recalculating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Recalculate All
        </Button>
      </div>

      {/* Sellers Table */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Seller</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Level & Rank</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Total Sales</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Trades</th>
                <th className="text-left p-4 text-xs font-medium text-white/40 uppercase">Progress</th>
                <th className="text-right p-4 text-xs font-medium text-white/40 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-white/30 mx-auto" />
                  </td>
                </tr>
              ) : sellers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-white/30">No sellers found</td>
                </tr>
              ) : (
                sellers.map((seller) => (
                  <tr key={seller._id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-white/60 text-sm font-medium overflow-hidden">
                          {seller.avatar ? (
                            <img src={seller.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            seller.username?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{seller.username}</p>
                          <p className="text-white/30 text-xs">{seller.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <LevelBadge
                          level={seller.levelInfo.level}
                          rank={seller.levelInfo.rank.name}
                          rankColor={seller.levelInfo.rank.color}
                          rankIcon={seller.levelInfo.rank.icon}
                          size="sm"
                        />
                        {seller.levelInfo.isOverridden && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 rounded border border-yellow-500/20">
                            Override
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-white text-sm">{(seller.stats?.totalVolume || 0).toLocaleString()} EGP</p>
                    </td>
                    <td className="p-4">
                      <p className="text-white/70 text-sm">{seller.stats?.successfulTrades || 0}</p>
                    </td>
                    <td className="p-4 min-w-[160px]">
                      <LevelProgressBar
                        percent={seller.levelInfo.progressPercent}
                        rankColor={seller.levelInfo.rank.color}
                        height="sm"
                        showPercent={false}
                      />
                      <p className="text-[10px] text-white/30 mt-1">
                        {seller.levelInfo.remaining.toLocaleString()} EGP to next
                      </p>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditModal({ open: true, seller }); setEditLevel(seller.levelInfo.level.toString()); }}
                          className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors"
                          title="Set Level"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        {seller.levelInfo.isOverridden && (
                          <button
                            onClick={() => handleRemoveOverride(seller._id)}
                            className="p-1.5 rounded-md hover:bg-white/[0.06] text-yellow-500/60 hover:text-yellow-500 transition-colors"
                            title="Remove Override"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-white/30">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/40 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-white/50 px-2">{page} / {pagination.pages}</span>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/40 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Level Modal */}
      {editModal.open && editModal.seller && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setEditModal({ open: false, seller: null })}>
          <div className="bg-[#131620] border border-white/[0.06] rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-1">Set Seller Level</h3>
            <p className="text-white/40 text-sm mb-6">
              Manually set level for <span className="text-white">{editModal.seller.username}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/50 mb-1 block">Current Level</label>
                <LevelBadge
                  level={editModal.seller.levelInfo.level}
                  rank={editModal.seller.levelInfo.rank.name}
                  rankColor={editModal.seller.levelInfo.rank.color}
                  rankIcon={editModal.seller.levelInfo.rank.icon}
                />
              </div>
              <div>
                <label className="text-sm text-white/50 mb-1 block">New Level (1–500)</label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.06] text-white"
                />
              </div>
              <div className="flex items-center gap-2 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                <p className="text-xs text-yellow-500/80">
                  This will override auto-calculation. The seller&apos;s level won&apos;t change from sales until you remove the override.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={() => setEditModal({ open: false, seller: null })} className="border-white/[0.06] text-white/70">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSetLevel} className="bg-white text-black hover:bg-white/90">
                Set Level
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Config Tab ─────────────────────────────────────────────────────────────

function ConfigTab() {
  const { toast } = useToast();
  const [config, setConfig] = useState<LevelConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [multiplier, setMultiplier] = useState('40');
  const [exponent, setExponent] = useState('1.3');
  const [maxLevel, setMaxLevel] = useState('500');
  const [ranks, setRanks] = useState<RankConfig[]>([]);
  const [preview, setPreview] = useState<{ level: number; cost: number }[]>([]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getLevelConfig();
      if (res.success && res.data) {
        setConfig(res.data);
        setMultiplier(res.data.multiplier.toString());
        setExponent(res.data.exponent.toString());
        setMaxLevel(res.data.maxLevel.toString());
        setRanks(res.data.ranks || []);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  // Preview calculation
  useEffect(() => {
    const m = parseFloat(multiplier);
    const e = parseFloat(exponent);
    if (isNaN(m) || isNaN(e)) return;
    const levels = [1, 5, 10, 25, 50, 70, 100, 150, 200, 300, 400, 500];
    setPreview(levels.map(lv => ({ level: lv, cost: Math.floor(m * Math.pow(lv, e)) })));
  }, [multiplier, exponent]);

  const handleSave = async () => {
    const m = parseFloat(multiplier);
    const e = parseFloat(exponent);
    const ml = parseInt(maxLevel);
    if (isNaN(m) || isNaN(e) || isNaN(ml)) {
      toast({ title: 'Error', description: 'Invalid values', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateLevelConfig({ multiplier: m, exponent: e, maxLevel: ml, ranks });
      toast({ title: 'Success', description: 'Configuration saved' });
      fetchConfig();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addRank = () => {
    const lastRank = ranks[ranks.length - 1];
    const newMin = lastRank ? lastRank.maxLevel + 1 : 1;
    setRanks([...ranks, { name: 'New Rank', minLevel: newMin, maxLevel: newMin + 49, color: '#FFFFFF', icon: '⭐' }]);
  };

  const removeRank = (index: number) => {
    setRanks(ranks.filter((_, i) => i !== index));
  };

  const updateRank = (index: number, field: string, value: string | number) => {
    const updated = [...ranks];
    (updated[index] as any)[field] = value;
    setRanks(updated);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Formula Settings */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Level Formula</h3>
        <p className="text-white/40 text-sm mb-6">SalesToNext(level) = multiplier × level^exponent</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/50 mb-1 block">Multiplier (base cost in EGP)</label>
            <Input
              type="number"
              step="1"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              className="bg-white/[0.04] border-white/[0.06] text-white max-w-[200px]"
            />
          </div>
          <div>
            <label className="text-sm text-white/50 mb-1 block">Exponent (difficulty curve)</label>
            <Input
              type="number"
              step="0.1"
              value={exponent}
              onChange={(e) => setExponent(e.target.value)}
              className="bg-white/[0.04] border-white/[0.06] text-white max-w-[200px]"
            />
          </div>
          <div>
            <label className="text-sm text-white/50 mb-1 block">Max Level</label>
            <Input
              type="number"
              value={maxLevel}
              onChange={(e) => setMaxLevel(e.target.value)}
              className="bg-white/[0.04] border-white/[0.06] text-white max-w-[200px]"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="bg-white text-black hover:bg-white/90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Formula Preview</h3>
        <p className="text-white/40 text-sm mb-4">Cost to advance from each level to the next (EGP)</p>
        <div className="space-y-1.5">
          {preview.map((p) => (
            <div key={p.level} className="flex items-center justify-between py-1.5 px-3 rounded bg-white/[0.02]">
              <span className="text-white/60 text-sm">Lv {p.level} → {p.level + 1}</span>
              <span className="text-white font-medium text-sm">{p.cost.toLocaleString()} EGP</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ranks Configuration */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Rank Tiers</h3>
            <p className="text-white/40 text-sm">Define rank names, colors, and level ranges</p>
          </div>
          <Button variant="outline" size="sm" onClick={addRank} className="border-white/[0.06] text-white/70">
            <Plus className="h-4 w-4 mr-1" /> Add Rank
          </Button>
        </div>

        <div className="space-y-3">
          {ranks.map((rank, index) => (
            <div key={index} className="flex flex-wrap items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
              <div className="flex items-center gap-2 min-w-[120px]">
                <input
                  type="text"
                  value={rank.icon}
                  onChange={(e) => updateRank(index, 'icon', e.target.value)}
                  className="w-10 bg-transparent text-center text-lg border border-white/[0.06] rounded p-1"
                />
                <input
                  type="text"
                  value={rank.name}
                  onChange={(e) => updateRank(index, 'name', e.target.value)}
                  className="bg-transparent text-white text-sm font-medium border-b border-white/[0.1] focus:border-white/30 outline-none px-1 w-[130px]"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-white/50">
                <span>Lv</span>
                <input
                  type="number"
                  value={rank.minLevel}
                  onChange={(e) => updateRank(index, 'minLevel', parseInt(e.target.value))}
                  className="w-16 bg-white/[0.04] text-white text-center border border-white/[0.06] rounded p-1 text-sm"
                />
                <span>→</span>
                <input
                  type="number"
                  value={rank.maxLevel}
                  onChange={(e) => updateRank(index, 'maxLevel', parseInt(e.target.value))}
                  className="w-16 bg-white/[0.04] text-white text-center border border-white/[0.06] rounded p-1 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={rank.color}
                  onChange={(e) => updateRank(index, 'color', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-white/[0.06]"
                />
                <LevelBadge level={rank.minLevel} rank={rank.name} rankColor={rank.color} rankIcon={rank.icon} size="sm" />
              </div>
              <button onClick={() => removeRank(index)} className="ml-auto p-1.5 rounded hover:bg-red-500/10 text-white/20 hover:text-red-500 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stats Tab ──────────────────────────────────────────────────────────────

function StatsTab() {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.getLevelStats();
        if (res.success) setStats(res.data);
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>;
  if (!stats) return <p className="text-white/30 text-center py-10">No data available</p>;

  const maxCount = Math.max(...Object.values(stats.rankDistribution).map((r: any) => r.count), 1);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <p className="text-white/40 text-xs">Total Sellers</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.totalSellers}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <p className="text-white/40 text-xs">Formula</p>
          <p className="text-lg font-mono text-white mt-1">{stats.config?.multiplier} × Lv^{stats.config?.exponent}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <p className="text-white/40 text-xs">Currency</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.config?.currency || 'EGP'}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <p className="text-white/40 text-xs">Active Ranks</p>
          <p className="text-2xl font-bold text-white mt-1">{Object.keys(stats.rankDistribution).length}</p>
        </div>
      </div>

      {/* Rank Distribution */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Seller Distribution by Rank</h3>
        <div className="space-y-4">
          {Object.entries(stats.rankDistribution).map(([name, data]: [string, any]) => (
            <div key={name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{data.icon}</span>
                  <span className="text-white text-sm font-medium">{name}</span>
                  <span className="text-white/30 text-xs">Lv {data.minLevel}–{data.maxLevel}</span>
                </div>
                <span className="text-white/60 text-sm font-medium">{data.count}</span>
              </div>
              <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(data.count / maxCount) * 100}%`,
                    backgroundColor: data.color,
                    minWidth: data.count > 0 ? '8px' : '0',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Level Range Distribution */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Sellers by Level Range</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(stats.levelDistribution).map(([range, count]: [string, any]) => (
            <div key={range} className="bg-white/[0.03] rounded-lg p-3 text-center">
              <p className="text-white/40 text-xs">Lv {range}</p>
              <p className="text-white text-xl font-bold mt-1">{count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Levels Table Tab ───────────────────────────────────────────────────────

function LevelsTableTab() {
  const { toast } = useToast();
  const [table, setTable] = useState<any[]>([]);
  const [configInfo, setConfigInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({ from: 1, to: 100 });

  const fetchTable = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getLevelsTable(range.from, range.to);
      if (res.success) {
        setTable(res.data.table || []);
        setConfigInfo(res.data.config);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTable(); }, [range]);

  const rangeOptions = [
    { from: 1, to: 100, label: '1–100' },
    { from: 101, to: 200, label: '101–200' },
    { from: 201, to: 300, label: '201–300' },
    { from: 301, to: 400, label: '301–400' },
    { from: 401, to: 500, label: '401–500' },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        {rangeOptions.map((opt) => (
          <button
            key={opt.label}
            onClick={() => setRange({ from: opt.from, to: opt.to })}
            className={`px-3 py-1.5 rounded-md text-sm transition-all ${
              range.from === opt.from
                ? 'bg-white/[0.08] text-white font-medium'
                : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
            }`}
          >
            Lv {opt.label}
          </button>
        ))}
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#0f1117] z-10">
              <tr className="border-b border-white/[0.06]">
                <th className="text-left p-3 text-xs font-medium text-white/40 uppercase">Level</th>
                <th className="text-left p-3 text-xs font-medium text-white/40 uppercase">To Next Level</th>
                <th className="text-left p-3 text-xs font-medium text-white/40 uppercase">Cumulative Total</th>
                <th className="text-left p-3 text-xs font-medium text-white/40 uppercase">Rank</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-white/30 mx-auto" />
                  </td>
                </tr>
              ) : (
                table.map((row) => (
                  <tr key={row.level} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="p-3">
                      <span className="text-white font-medium text-sm">Lv {row.level}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-white/70 text-sm">{row.salesToNext.toLocaleString()} EGP</span>
                    </td>
                    <td className="p-3">
                      <span className="text-white/50 text-sm">{row.totalRequired.toLocaleString()} EGP</span>
                    </td>
                    <td className="p-3">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
