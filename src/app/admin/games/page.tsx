'use client';

import { useEffect, useState, useCallback } from 'react';
import { ensureCsrfToken } from '@/utils/csrf';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Gamepad2,
  Users,
  DollarSign,
  Loader2,
  Power,
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Mail,
  Lock,
  Phone,
  Hash,
  Type,
} from 'lucide-react';

/* -------- Types -------- */
interface GameField {
  _id?: string;
  name: string;
  type: 'email' | 'password' | 'phone' | 'number' | 'text';
  required: boolean;
  placeholder: string;
}

interface GameData {
  _id: string;
  name: string;
  slug: string;
  category: string;
  icon: string;
  status: 'active' | 'inactive';
  fields: GameField[];
  listingsCount: number;
  revenue: number;
  sales: number;
  createdAt: string;
}

interface GameStats {
  totalGames: number;
  activeGames: number;
  inactiveGames: number;
  totalListings: number;
  totalRevenue: number;
  totalCommission: number;
}

const FIELD_TYPES: { value: GameField['type']; label: string; icon: React.ReactNode }[] = [
  { value: 'email', label: 'Email', icon: <Mail className="h-3.5 w-3.5" /> },
  { value: 'password', label: 'Password', icon: <Lock className="h-3.5 w-3.5" /> },
  { value: 'phone', label: 'Phone', icon: <Phone className="h-3.5 w-3.5" /> },
  { value: 'number', label: 'Number', icon: <Hash className="h-3.5 w-3.5" /> },
  { value: 'text', label: 'Text', icon: <Type className="h-3.5 w-3.5" /> },
];

const DEFAULT_FIELDS: GameField[] = [
  { name: 'Email', type: 'email', required: true, placeholder: 'Account email' },
  { name: 'Password', type: 'password', required: true, placeholder: 'Account password' },
];

const fieldTypeIcon = (type: string) => {
  const found = FIELD_TYPES.find(f => f.value === type);
  return found?.icon || <Type className="h-3.5 w-3.5" />;
};

export default function GamesPage() {
  const [games, setGames] = useState<GameData[]>([]);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameData | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formFields, setFormFields] = useState<GameField[]>([...DEFAULT_FIELDS]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Action states
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  /* -------- Fetching -------- */
  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/v1/admin/games?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setGames(data.data);
    } catch {
      console.error('Failed to fetch games');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await fetch('/api/v1/admin/games/stats', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {
      console.error('Failed to fetch stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchGames(); }, [fetchGames]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  /* -------- Modal helpers -------- */
  const openAddModal = () => {
    setEditingGame(null);
    setFormName('');
    setFormCategory('');
    setFormIcon('');
    setFormStatus('active');
    setFormFields([...DEFAULT_FIELDS.map(f => ({ ...f }))]);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (game: GameData) => {
    setEditingGame(game);
    setFormName(game.name);
    setFormCategory(game.category);
    setFormIcon(game.icon);
    setFormStatus(game.status);
    setFormFields(game.fields?.length ? game.fields.map(f => ({ ...f })) : [...DEFAULT_FIELDS.map(f => ({ ...f }))]);
    setFormError('');
    setModalOpen(true);
  };

  /* -------- Fields management -------- */
  const addField = () => {
    setFormFields(prev => [...prev, { name: '', type: 'text', required: true, placeholder: '' }]);
  };

  const removeField = (index: number) => {
    setFormFields(prev => prev.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: keyof GameField, value: string | boolean) => {
    setFormFields(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  /* -------- Submit -------- */
  const handleSubmit = async () => {
    if (!formName.trim()) {
      setFormError('Game name is required');
      return;
    }
    // Validate fields
    const validFields = formFields.filter(f => f.name.trim());
    if (validFields.length === 0) {
      setFormError('At least one field is required');
      return;
    }

    try {
      setFormLoading(true);
      setFormError('');
      const csrfToken = await ensureCsrfToken() || '';
      const isEdit = !!editingGame;
      const url = isEdit ? `/api/v1/admin/games/${editingGame!._id}` : '/api/v1/admin/games';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
        body: JSON.stringify({
          name: formName.trim(),
          category: formCategory.trim(),
          icon: formIcon.trim(),
          status: formStatus,
          fields: validFields,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.message || 'Failed');
        return;
      }
      setModalOpen(false);
      showSuccess(isEdit ? 'Game updated successfully' : 'Game created successfully');
      fetchGames();
      fetchStats();
    } catch {
      setFormError('Network error');
    } finally {
      setFormLoading(false);
    }
  };

  /* -------- Actions -------- */
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;
    try {
      setDeleteLoading(id);
      const csrfToken = await ensureCsrfToken() || '';
      const res = await fetch(`/api/v1/admin/games/${id}`, {
        method: 'DELETE', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
      });
      const data = await res.json();
      if (!res.ok || !data.success) { alert(data.message || 'Failed to delete'); return; }
      showSuccess('Game deleted');
      fetchGames();
      fetchStats();
    } catch { alert('Network error'); } finally { setDeleteLoading(null); }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      setToggleLoading(id);
      const csrfToken = await ensureCsrfToken() || '';
      const res = await fetch(`/api/v1/admin/games/${id}/toggle-status`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
      });
      const data = await res.json();
      if (data.success) { showSuccess(data.message); fetchGames(); fetchStats(); }
    } catch { alert('Network error'); } finally { setToggleLoading(null); }
  };

  return (
    <div className="space-y-6">
      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Games Management</h1>
          <p className="text-white/40 text-sm">Manage available games and their account fields</p>
        </div>
        <Button onClick={openAddModal} className="bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.06] w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add New Game
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">Total Games</p>
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.totalGames ?? 0}
                </p>
                <p className="text-xs text-emerald-400 mt-1">{stats?.activeGames ?? 0} active / {stats?.inactiveGames ?? 0} inactive</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Gamepad2 className="h-5 w-5 text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">Total Listings</p>
                <p className="text-2xl font-bold text-white">
                  {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.totalListings ?? 0}
                </p>
                <p className="text-xs text-white/40 mt-1">Across all games</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">Commission</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `EGP ${(stats?.totalCommission ?? 0).toLocaleString()}`}
                </p>
                <p className="text-xs text-white/40 mt-1">From all game sales</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Games Table */}
      <Card className="bg-[#131620] border-white/[0.06]">
        <CardHeader className="border-b border-white/[0.06] py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white text-sm font-semibold">All Games</CardTitle>
              <CardDescription className="text-white/40 text-xs">Manage your game catalog</CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#1a1d2e] border border-white/[0.06] text-white text-xs rounded-lg px-3 h-9 outline-none [color-scheme:dark]"
              >
                <option value="all" className="bg-[#1a1d2e] text-white">All Status</option>
                <option value="active" className="bg-[#1a1d2e] text-white">Active</option>
                <option value="inactive" className="bg-[#1a1d2e] text-white">Inactive</option>
              </select>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  placeholder="Search games..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30 text-sm h-9 rounded-lg"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
          ) : games.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/40">
              <Gamepad2 className="h-10 w-10 mb-3" />
              <p className="text-sm">No games found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Game</th>
                    <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Category</th>
                    <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Fields</th>
                    <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Listings</th>
                    <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Revenue</th>
                    <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((game) => (
                    <tr key={game._id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                            <Gamepad2 className="h-5 w-5 text-white/70" />
                          </div>
                          <div>
                            <span className="text-white/90 font-medium text-sm block">{game.name}</span>
                            <span className="text-white/30 text-xs">{game.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {game.category ? (
                          <Badge className="bg-white/[0.04] text-white/60 border border-white/[0.06] font-normal text-xs">{game.category}</Badge>
                        ) : <span className="text-white/30 text-xs">—</span>}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(game.fields || []).slice(0, 3).map((f, i) => (
                            <Badge key={i} className="bg-violet-500/10 text-violet-300 border-0 text-[10px] font-normal gap-1 px-1.5">
                              {fieldTypeIcon(f.type)}
                              {f.name}
                            </Badge>
                          ))}
                          {(game.fields || []).length > 3 && (
                            <Badge className="bg-white/[0.04] text-white/40 border-0 text-[10px]">+{game.fields.length - 3}</Badge>
                          )}
                          {(!game.fields || game.fields.length === 0) && <span className="text-white/30 text-xs">No fields</span>}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white/80 text-sm">{game.listingsCount}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white/90 font-medium text-sm">EGP {game.revenue.toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={`border-0 text-xs font-medium ${game.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {game.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditModal(game)} className="w-8 h-8 p-0 text-white/40 hover:text-white/80 hover:bg-white/[0.04]">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => handleToggleStatus(game._id)}
                            disabled={toggleLoading === game._id}
                            className={`w-8 h-8 p-0 ${game.status === 'active' ? 'text-white/40 hover:text-amber-400 hover:bg-amber-500/10' : 'text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                            title={game.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {toggleLoading === game._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => handleDelete(game._id)}
                            disabled={deleteLoading === game._id}
                            className="w-8 h-8 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                          >
                            {deleteLoading === game._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Performing Games */}
      {games.length > 0 && (
        <Card className="bg-[#131620] border-white/[0.06]">
          <CardHeader className="border-b border-white/[0.06] py-4">
            <CardTitle className="text-white text-sm font-semibold">Top Performing Games</CardTitle>
            <CardDescription className="text-white/40 text-xs">Games with the most revenue</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...games].sort((a, b) => b.revenue - a.revenue).slice(0, 4).map((game, index) => (
                <div key={game._id} className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                      <Gamepad2 className="h-5 w-5 text-white/70" />
                    </div>
                    <Badge className="bg-amber-500/10 text-amber-400 border-0 text-xs">#{index + 1}</Badge>
                  </div>
                  <h3 className="text-white/90 font-medium text-sm mb-0.5">{game.name}</h3>
                  <p className="text-white/40 text-xs mb-3">{game.category || 'No category'}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-semibold text-sm">EGP {game.revenue.toLocaleString()}</span>
                    <span className="text-white/40 text-xs">{game.sales} sales</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================== Add / Edit Modal ==================== */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#131620] border-white/[0.06] text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editingGame ? 'Edit Game' : 'Add New Game'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {formError}
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Game Name *</label>
                <Input placeholder="e.g. PUBG Mobile" value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30 text-sm" />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Category</label>
                <Input placeholder="e.g. Battle Royale" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30 text-sm" />
              </div>
              <div>
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Icon (emoji)</label>
                <Input placeholder="e.g. 🎮" value={formIcon} onChange={(e) => setFormIcon(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-white/60 text-xs font-medium mb-1.5 block">Status</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full bg-[#1a1d2e] border border-white/[0.06] text-white text-sm rounded-lg px-3 h-9 outline-none [color-scheme:dark]">
                  <option value="active" className="bg-[#1a1d2e] text-white">Active</option>
                  <option value="inactive" className="bg-[#1a1d2e] text-white">Inactive</option>
                </select>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.06]" />

            {/* Account Fields Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-white text-sm font-semibold">Account Fields</h3>
                  <p className="text-white/40 text-[11px] mt-0.5">Fields shown to sellers when listing an account. Data will be encrypted.</p>
                </div>
                <Button size="sm" variant="ghost" onClick={addField}
                  className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 text-xs h-7 px-2">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Field
                </Button>
              </div>

              {formFields.length === 0 ? (
                <div className="text-center py-6 text-white/30 text-sm border border-dashed border-white/[0.06] rounded-lg">
                  No fields added. Click &quot;Add Field&quot; to start.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {formFields.map((field, index) => (
                    <div key={index} className="flex items-start gap-2 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                      <div className="flex items-center text-white/20 mt-2">
                        <GripVertical className="h-4 w-4" />
                      </div>

                      <div className="flex-1 grid grid-cols-2 gap-2">
                        {/* Field name */}
                        <Input
                          placeholder="Field name"
                          value={field.name}
                          onChange={(e) => updateField(index, 'name', e.target.value)}
                          className="bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30 text-xs h-8"
                        />
                        {/* Field type */}
                        <select
                          value={field.type}
                          onChange={(e) => updateField(index, 'type', e.target.value)}
                          className="bg-[#1a1d2e] border border-white/[0.06] text-white text-xs rounded-lg px-2 h-8 outline-none [color-scheme:dark]"
                        >
                          {FIELD_TYPES.map(ft => (
                            <option key={ft.value} value={ft.value} className="bg-[#1a1d2e] text-white">{ft.label}</option>
                          ))}
                        </select>
                        {/* Placeholder */}
                        <Input
                          placeholder="Placeholder text"
                          value={field.placeholder}
                          onChange={(e) => updateField(index, 'placeholder', e.target.value)}
                          className="bg-white/[0.04] border-white/[0.06] text-white placeholder:text-white/30 text-xs h-8"
                        />
                        {/* Required toggle */}
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(index, 'required', e.target.checked)}
                              className="rounded border-white/20 bg-white/[0.04] text-violet-500 focus:ring-violet-500/30"
                            />
                            <span className="text-white/50 text-xs">Required</span>
                          </label>
                        </div>
                      </div>

                      {/* Remove button */}
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => removeField(index)}
                        className="w-7 h-7 p-0 text-white/30 hover:text-red-400 hover:bg-red-500/10 mt-0.5 flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="text-white/60 hover:text-white hover:bg-white/[0.04]">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={formLoading} className="bg-violet-600 hover:bg-violet-700 text-white">
              {formLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingGame ? 'Save Changes' : 'Create Game'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
