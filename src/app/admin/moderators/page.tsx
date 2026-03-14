'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Shield, ShieldCheck, Loader2, Plus, Trash2, Settings2, Users,
    ShoppingCart, Package, Store, TrendingUp, MessageSquare, BarChart3,
    Gamepad2, Bell, Megaphone, ImageIcon, Percent, Lock, UserCog,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ensureCsrfToken } from '@/utils/csrf';

/* ─── Admin-only keys that must NEVER appear in moderator permission UI ─── */
const ADMIN_ONLY_KEYS = ['users', 'moderators'];

/* ─── Permission definitions (admin-only sections excluded) ─── */
const PERMISSION_META: Record<string, { label: string; description: string; icon: any }> = {
    orders: { label: 'Orders', description: 'View orders, instant payout', icon: ShoppingCart },
    products: { label: 'Products', description: 'Manage product listings', icon: Package },
    sellers: { label: 'Sellers', description: 'Seller requests & exemptions', icon: Store },
    seller_levels: { label: 'Seller Levels', description: 'Level & rank configuration', icon: TrendingUp },
    games: { label: 'Games', description: 'Create / edit games', icon: Gamepad2 },
    chats: { label: 'Chats', description: 'Monitor conversations', icon: MessageSquare },
    analytics: { label: 'Analytics', description: 'Stats, activity, commission', icon: BarChart3 },
    settings: { label: 'Settings', description: 'Site settings (commission etc.)', icon: Settings2 },
    security: { label: 'Security', description: 'Security management', icon: Lock },
    notifications: { label: 'Notifications', description: 'Send notifications', icon: Bell },
    promotions: { label: 'Promotions', description: 'Manage promotions', icon: Megaphone },
    ads: { label: 'Ads', description: 'Manage advertisements', icon: ImageIcon },
    discounts: { label: 'Discounts', description: 'Manage discounts', icon: Percent },
};

interface Moderator {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
    moderatorPermissions: string[];
    createdAt: string;
}

export default function ModeratorsPage() {
    const { toast } = useToast();
    const [moderators, setModerators] = useState<Moderator[]>([]);
    const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Create moderator dialog
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newModUsername, setNewModUsername] = useState('');
    const [newModEmail, setNewModEmail] = useState('');
    const [newModPassword, setNewModPassword] = useState('');
    const [createError, setCreateError] = useState('');

    // Edit permissions dialog
    const [editMod, setEditMod] = useState<Moderator | null>(null);
    const [editPerms, setEditPerms] = useState<string[]>([]);

    /* ─── Fetch moderators ─── */
    const fetchModerators = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/admin/moderators', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                // Strip admin-only keys from each moderator's permissions
                const cleaned = (data.data.moderators || []).map((m: Moderator) => ({
                    ...m,
                    moderatorPermissions: (m.moderatorPermissions || []).filter((p: string) => !ADMIN_ONLY_KEYS.includes(p))
                }));
                setModerators(cleaned);
                // Filter admin-only keys out of available permissions list
                setAvailablePermissions(
                    (data.data.availablePermissions || []).filter((p: string) => !ADMIN_ONLY_KEYS.includes(p))
                );
            }
        } catch {
            toast({ title: 'Error', description: 'Failed to load moderators', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchModerators(); }, [fetchModerators]);

    /* ─── Create moderator account ─── */
    const handleCreateModerator = async () => {
        if (!newModUsername.trim() || !newModEmail.trim() || !newModPassword.trim()) {
            setCreateError('All fields are required');
            return;
        }
        if (newModPassword.length < 6) {
            setCreateError('Password must be at least 6 characters');
            return;
        }
        setCreateError('');
        setSaving(true);
        try {
            const csrf = await ensureCsrfToken();
            const res = await fetch('/api/v1/admin/moderators', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrf ? { 'X-XSRF-TOKEN': csrf } : {}),
                },
                body: JSON.stringify({
                    username: newModUsername.trim(),
                    email: newModEmail.trim(),
                    password: newModPassword,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: 'Moderator created', description: `Account "${data.data.username}" created successfully` });
                setShowAddDialog(false);
                setNewModUsername('');
                setNewModEmail('');
                setNewModPassword('');
                fetchModerators();
            } else {
                setCreateError(data.message || 'Failed to create moderator');
            }
        } catch (err: any) {
            setCreateError(err.message || 'Failed to create moderator');
        } finally {
            setSaving(false);
        }
    };

    /* ─── Save permissions ─── */
    const handleSavePermissions = async () => {
        if (!editMod) return;
        setSaving(true);
        try {
            const csrf = await ensureCsrfToken();
            const res = await fetch(`/api/v1/admin/moderators/${editMod._id}/permissions`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrf ? { 'X-XSRF-TOKEN': csrf } : {}),
                },
                body: JSON.stringify({ permissions: editPerms }),
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: 'Permissions saved' });
                setEditMod(null);
                fetchModerators();
            } else {
                throw new Error(data.message);
            }
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    /* ─── Remove moderator ─── */
    const handleRemove = async (mod: Moderator) => {
        if (!confirm(`Remove moderator role from "${mod.username}"?`)) return;
        try {
            const csrf = await ensureCsrfToken();
            const res = await fetch(`/api/v1/admin/moderators/${mod._id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrf ? { 'X-XSRF-TOKEN': csrf } : {}),
                },
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: 'Removed', description: `${mod.username} is no longer a moderator` });
                fetchModerators();
            } else {
                throw new Error(data.message);
            }
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    };

    /* ─── Toggle perm in edit dialog ─── */
    const togglePerm = (key: string) => {
        setEditPerms(prev =>
            prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
        );
    };

    const selectAllPerms = () => setEditPerms([...availablePermissions]);
    const clearAllPerms = () => setEditPerms([]);

    /* ─── Render ─── */
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Moderators</h1>
                    <p className="text-white/60">Assign moderators and control what they can access</p>
                </div>
                <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                    <Plus className="h-4 w-4 mr-2" /> Add Moderator
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-[#131620] border-white/[0.06]">
                    <CardContent className="pt-5 pb-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Shield className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">{moderators.length}</div>
                                <p className="text-white/50 text-xs">Total Moderators</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#131620] border-white/[0.06]">
                    <CardContent className="pt-5 pb-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <ShieldCheck className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-400">
                                    {moderators.filter(m => m.moderatorPermissions.length > 0).length}
                                </div>
                                <p className="text-white/50 text-xs">With Permissions</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#131620] border-white/[0.06]">
                    <CardContent className="pt-5 pb-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-yellow-500/10">
                                <Settings2 className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-yellow-400">{availablePermissions.length}</div>
                                <p className="text-white/50 text-xs">Available Permissions</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Moderators Table */}
            <Card className="bg-[#131620] border-white/[0.06]">
                <CardHeader className="border-b border-white/[0.06] pb-4">
                    <CardTitle className="text-white">All Moderators</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/[0.06] hover:bg-transparent">
                                <TableHead className="text-white/50 pl-5">User</TableHead>
                                <TableHead className="text-white/50">Email</TableHead>
                                <TableHead className="text-white/50">Permissions</TableHead>
                                <TableHead className="text-white/50 text-right pr-5">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {moderators.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-white/40 py-12">
                                        No moderators yet. Click "Add Moderator" to get started.
                                    </TableCell>
                                </TableRow>
                            ) : moderators.map(mod => (
                                <TableRow key={mod._id} className="border-white/[0.06] hover:bg-white/[0.03]">
                                    <TableCell className="pl-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                {(mod.username || mod.email).charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-white font-medium text-sm">{mod.username}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-white/60 text-sm">{mod.email}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1.5 max-w-md">
                                            {mod.moderatorPermissions.length === 0 ? (
                                                <span className="text-white/30 text-xs">No permissions</span>
                                            ) : mod.moderatorPermissions.map(p => {
                                                const meta = PERMISSION_META[p];
                                                return (
                                                    <Badge key={p} className="bg-blue-500/15 text-blue-300 border-blue-500/20 text-[10px]">
                                                        {meta?.label ?? p}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-5">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => { setEditMod(mod); setEditPerms([...mod.moderatorPermissions]); }}
                                                className="border-white/[0.06] text-white/70 hover:bg-white/10 text-xs h-8"
                                            >
                                                <Settings2 className="h-3.5 w-3.5 mr-1" /> Permissions
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleRemove(mod)}
                                                className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs h-8"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ═══ Create Moderator Dialog ═══ */}
            <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) { setCreateError(''); setNewModUsername(''); setNewModEmail(''); setNewModPassword(''); } }}>
                <DialogContent className="bg-[#131620] border-white/[0.06] text-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create Moderator Account</DialogTitle>
                        <DialogDescription className="text-white/50">
                            Create a new account with moderator access. The moderator can log in using these credentials.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-white/60">Username</label>
                            <Input
                                placeholder="Enter username…"
                                value={newModUsername}
                                onChange={e => setNewModUsername(e.target.value)}
                                className="bg-white/5 border-white/[0.06] text-white placeholder:text-white/30"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-white/60">Email</label>
                            <Input
                                type="email"
                                placeholder="Enter email…"
                                value={newModEmail}
                                onChange={e => setNewModEmail(e.target.value)}
                                className="bg-white/5 border-white/[0.06] text-white placeholder:text-white/30"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-white/60">Password</label>
                            <Input
                                type="password"
                                placeholder="Min. 6 characters"
                                value={newModPassword}
                                onChange={e => setNewModPassword(e.target.value)}
                                className="bg-white/5 border-white/[0.06] text-white placeholder:text-white/30"
                            />
                        </div>

                        {createError && (
                            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                                {createError}
                            </div>
                        )}
                    </div>
                    <DialogFooter className="mt-2">
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}
                            className="border-white/[0.06] text-white/60 hover:bg-white/10">Cancel</Button>
                        <Button
                            onClick={handleCreateModerator}
                            disabled={saving || !newModUsername.trim() || !newModEmail.trim() || !newModPassword.trim()}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            Create Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ Edit Permissions Dialog ═══ */}
            <Dialog open={!!editMod} onOpenChange={() => setEditMod(null)}>
                <DialogContent className="bg-[#131620] border-white/[0.06] text-white max-w-xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Permissions — {editMod?.username}
                        </DialogTitle>
                        <DialogDescription className="text-white/50">
                            Select which admin sections this moderator can access
                        </DialogDescription>
                    </DialogHeader>

                    {/* Select all / Clear */}
                    <div className="flex items-center gap-2 mb-2">
                        <Button size="sm" variant="outline" onClick={selectAllPerms}
                            className="border-white/[0.06] text-white/60 hover:bg-white/10 text-xs h-7">Select All</Button>
                        <Button size="sm" variant="outline" onClick={clearAllPerms}
                            className="border-white/[0.06] text-white/60 hover:bg-white/10 text-xs h-7">Clear All</Button>
                        <span className="ml-auto text-white/40 text-xs">{editPerms.length}/{availablePermissions.length} selected</span>
                    </div>

                    {/* Permission grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {availablePermissions.map(key => {
                            const meta = PERMISSION_META[key] || { label: key, description: '', icon: Shield };
                            const Icon = meta.icon;
                            const active = editPerms.includes(key);
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => togglePerm(key)}
                                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${active
                                        ? 'bg-blue-500/10 border-blue-500/30'
                                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                                        }`}
                                >
                                    <div className={`p-1.5 rounded-md mt-0.5 ${active ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                                        <Icon className={`h-4 w-4 ${active ? 'text-blue-400' : 'text-white/40'}`} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className={`text-sm font-medium ${active ? 'text-blue-300' : 'text-white/70'}`}>
                                            {meta.label}
                                        </div>
                                        <div className="text-[11px] text-white/40 leading-tight">{meta.description}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setEditMod(null)}
                            className="border-white/[0.06] text-white/60 hover:bg-white/10">Cancel</Button>
                        <Button onClick={handleSavePermissions} disabled={saving}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save Permissions
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
