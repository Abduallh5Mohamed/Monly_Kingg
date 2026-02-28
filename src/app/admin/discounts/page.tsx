'use client';

import { useState, useEffect } from 'react';
import { ensureCsrfToken } from '@/utils/csrf';
import {
    Percent,
    Plus,
    Loader2,
    X,
    Save,
    AlertCircle,
    CheckCircle,
    Tag,
    Calendar,
    Ban,
    Package,
    Gamepad2,
    Lock,
    Users,
    ImagePlus,
    Clock,
    Sparkles,
    Bell,
    UserCheck,
} from 'lucide-react';

/* ── Types ── */
interface Game {
    _id: string;
    name: string;
    slug: string;
    icon?: string;
}

interface CampaignData {
    _id: string;
    title: string;
    description: string;
    type: 'mandatory' | 'voluntary';
    image: string;
    discountPercent: number;
    games: Game[];
    status: 'active' | 'expired' | 'cancelled';
    startDate: string;
    endDate: string;
    participatingCount: number;
    notifiedCount: number;
    createdBy: { username: string } | null;
    createdAt: string;
}

interface Stats {
    total: number;
    active: number;
    expired: number;
    cancelled: number;
    mandatory: number;
    voluntary: number;
}

interface DiscountItem {
    _id: string;
    listing: {
        _id: string;
        title: string;
        price: number;
        coverImage: string | null;
        images: string[];
        game: { name: string } | null;
        status: string;
    } | null;
    originalPrice: number;
    discountedPrice: number;
    discountPercent: number;
    reason: string;
    status: 'active' | 'expired' | 'cancelled';
    startDate: string;
    endDate: string | null;
    createdBy: { username: string } | null;
    createdAt: string;
}

const statusConfig: Record<string, { color: string; bg: string }> = {
    active: { color: 'text-green-400', bg: 'bg-green-400/10' },
    expired: { color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    cancelled: { color: 'text-red-400', bg: 'bg-red-400/10' },
};

const typeConfig: Record<string, { color: string; bg: string; icon: typeof Lock; label: string }> = {
    mandatory: { color: 'text-orange-400', bg: 'bg-orange-400/10', icon: Lock, label: 'Mandatory' },
    voluntary: { color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Users, label: 'Voluntary' },
};

export default function AdminDiscountsPage() {
    const [activeTab, setActiveTab] = useState<'campaigns' | 'individual'>('campaigns');

    // Campaign state
    const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
    const [campaignStats, setCampaignStats] = useState<Stats | null>(null);
    const [campaignLoading, setCampaignLoading] = useState(true);
    const [campaignFilter, setCampaignFilter] = useState('all');
    const [campaignTypeFilter, setCampaignTypeFilter] = useState('all');

    // Individual discounts (legacy)
    const [discounts, setDiscounts] = useState<DiscountItem[]>([]);
    const [discountLoading, setDiscountLoading] = useState(false);
    const [discountFilter, setDiscountFilter] = useState('all');

    // Create modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // Games
    const [allGames, setAllGames] = useState<Game[]>([]);

    // Form
    const [formType, setFormType] = useState<'mandatory' | 'voluntary'>('mandatory');
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formDiscount, setFormDiscount] = useState(20);
    const [formEndDate, setFormEndDate] = useState('');
    const [formImage, setFormImage] = useState('');
    const [formSelectedGames, setFormSelectedGames] = useState<string[]>([]);
    const [imageUploading, setImageUploading] = useState(false);

    useEffect(() => { fetchGames(); }, []);

    useEffect(() => {
        if (activeTab === 'campaigns') {
            fetchCampaigns();
            fetchCampaignStats();
        } else {
            fetchDiscounts();
        }
    }, [activeTab, campaignFilter, campaignTypeFilter, discountFilter]);

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    const fetchGames = async () => {
        try {
            const res = await fetch('/api/v1/games');
            const data = await res.json();
            if (data.data) setAllGames(data.data);
        } catch { }
    };

    const fetchCampaigns = async () => {
        setCampaignLoading(true);
        try {
            const params = new URLSearchParams();
            if (campaignFilter !== 'all') params.set('status', campaignFilter);
            if (campaignTypeFilter !== 'all') params.set('type', campaignTypeFilter);
            const res = await fetch(`/api/v1/campaigns?${params}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setCampaigns(data.data);
        } catch { }
        finally { setCampaignLoading(false); }
    };

    const fetchCampaignStats = async () => {
        try {
            const res = await fetch('/api/v1/campaigns/stats', { credentials: 'include' });
            const data = await res.json();
            if (data.success) setCampaignStats(data.data);
        } catch { }
    };

    const fetchDiscounts = async () => {
        setDiscountLoading(true);
        try {
            const res = await fetch(`/api/v1/discounts?status=${discountFilter}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setDiscounts(data.data);
        } catch { }
        finally { setDiscountLoading(false); }
    };

    const resetForm = () => {
        setFormType('mandatory');
        setFormTitle('');
        setFormDescription('');
        setFormDiscount(20);
        setFormEndDate('');
        setFormImage('');
        setFormSelectedGames([]);
    };

    const handleCreateCampaign = async () => {
        if (!formTitle.trim()) return setToast({ type: 'error', msg: 'Campaign title is required' });
        if (formSelectedGames.length === 0) return setToast({ type: 'error', msg: 'Select at least one game' });
        if (!formEndDate) return setToast({ type: 'error', msg: 'End date is required' });

        setSaving(true);
        try {
            const csrf = await ensureCsrfToken() || '';
            const res = await fetch('/api/v1/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrf },
                credentials: 'include',
                body: JSON.stringify({
                    title: formTitle,
                    description: formDescription,
                    type: formType,
                    discountPercent: formDiscount,
                    gameIds: formSelectedGames,
                    endDate: formEndDate,
                    image: formImage,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setToast({ type: 'success', msg: formType === 'voluntary' ? 'Campaign created & notifications sent!' : 'Mandatory discount created!' });
                setShowCreateModal(false);
                resetForm();
                fetchCampaigns();
                fetchCampaignStats();
            } else {
                setToast({ type: 'error', msg: data.message || 'Failed' });
            }
        } catch {
            setToast({ type: 'error', msg: 'Network error' });
        } finally { setSaving(false); }
    };

    const handleCancelCampaign = async (id: string) => {
        try {
            const csrf = await ensureCsrfToken() || '';
            const res = await fetch(`/api/v1/campaigns/${id}/cancel`, { method: 'PUT', credentials: 'include', headers: { 'X-XSRF-TOKEN': csrf } });
            const data = await res.json();
            if (data.success) {
                setToast({ type: 'success', msg: 'Campaign cancelled' });
                fetchCampaigns();
                fetchCampaignStats();
            }
        } catch { setToast({ type: 'error', msg: 'Failed' }); }
    };

    const handleCancelDiscount = async (id: string) => {
        try {
            const csrf = await ensureCsrfToken() || '';
            const res = await fetch(`/api/v1/discounts/${id}/cancel`, { method: 'PUT', credentials: 'include', headers: { 'X-XSRF-TOKEN': csrf } });
            const data = await res.json();
            if (data.success) {
                setToast({ type: 'success', msg: 'Discount cancelled' });
                fetchDiscounts();
            }
        } catch { setToast({ type: 'error', msg: 'Failed' }); }
    };

    const toggleGame = (id: string) => {
        setFormSelectedGames(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageUploading(true);
        try {
            const csrf = await ensureCsrfToken() || '';
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', 'ads');
            const res = await fetch('/api/v1/uploads', { method: 'POST', credentials: 'include', headers: { 'X-XSRF-TOKEN': csrf }, body: fd });
            const data = await res.json();
            if (data.url || data.data?.url) setFormImage(data.url || data.data.url);
        } catch { setToast({ type: 'error', msg: 'Image upload failed' }); }
        finally { setImageUploading(false); }
    };

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl border ${toast.type === 'success' ? 'bg-green-500/15 border-green-500/20 text-green-400' : 'bg-red-500/15 border-red-500/20 text-red-400'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                            <Percent className="w-5 h-5 text-white" />
                        </div>
                        Discount Management
                    </h1>
                    <p className="text-sm text-white/40 mt-1">Mandatory or voluntary discount campaigns</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowCreateModal(true); }}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="w-4 h-4" />
                    New Campaign
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
                <button
                    onClick={() => setActiveTab('campaigns')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'campaigns' ? 'bg-white/10 text-white border border-white/10' : 'text-white/40 hover:text-white/60'
                        }`}
                >
                    <Sparkles className="w-4 h-4" />
                    Discount Campaigns
                </button>
                <button
                    onClick={() => setActiveTab('individual')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'individual' ? 'bg-white/10 text-white border border-white/10' : 'text-white/40 hover:text-white/60'
                        }`}
                >
                    <Tag className="w-4 h-4" />
                    Individual Discounts
                </button>
            </div>

            {/* ═══ CAMPAIGNS TAB ═══ */}
            {activeTab === 'campaigns' && (
                <>
                    {campaignStats && (
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                            {[
                                { label: 'All', value: campaignStats.total, color: 'text-white', icon: Tag },
                                { label: 'Active', value: campaignStats.active, color: 'text-green-400', icon: CheckCircle },
                                { label: 'Expired', value: campaignStats.expired, color: 'text-yellow-400', icon: Calendar },
                                { label: 'Cancelled', value: campaignStats.cancelled, color: 'text-red-400', icon: Ban },
                                { label: 'Mandatory', value: campaignStats.mandatory, color: 'text-orange-400', icon: Lock },
                                { label: 'Voluntary', value: campaignStats.voluntary, color: 'text-blue-400', icon: Users },
                            ].map((s, i) => (
                                <div key={i} className="bg-[#111318] border border-white/[0.06] rounded-xl p-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                                        <span className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</span>
                                    </div>
                                    <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                            {['all', 'active', 'expired', 'cancelled'].map(f => (
                                <button key={f} onClick={() => setCampaignFilter(f)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${campaignFilter === f ? 'bg-white/10 text-white border border-white/20' : 'text-white/40 hover:text-white/60 border border-transparent'}`}>
                                    {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'expired' ? 'Expired' : 'Cancelled'}
                                </button>
                            ))}
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-1">
                            {['all', 'mandatory', 'voluntary'].map(f => (
                                <button key={f} onClick={() => setCampaignTypeFilter(f)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${campaignTypeFilter === f ? 'bg-white/10 text-white border border-white/20' : 'text-white/40 hover:text-white/60 border border-transparent'}`}>
                                    {f === 'all' && 'All Types'}
                                    {f === 'mandatory' && <><Lock className="w-3 h-3" /> Mandatory</>}
                                    {f === 'voluntary' && <><Users className="w-3 h-3" /> Voluntary</>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Campaign List */}
                    {campaignLoading ? (
                        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-white/30 animate-spin" /></div>
                    ) : campaigns.length === 0 ? (
                        <div className="text-center py-20">
                            <Sparkles className="w-12 h-12 text-white/10 mx-auto mb-3" />
                            <p className="text-white/30 text-sm">No discount campaigns yet</p>
                            <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="mt-4 text-emerald-400 text-sm hover:underline">Create your first campaign</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {campaigns.map(c => {
                                const sc = statusConfig[c.status];
                                const tc = typeConfig[c.type];
                                const TypeIcon = tc.icon;
                                const endDate = new Date(c.endDate);
                                const isExpiring = c.status === 'active' && endDate.getTime() - Date.now() < 24 * 3600000;

                                return (
                                    <div key={c._id} className="bg-[#111318] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-all">
                                        <div className="flex items-start gap-4">
                                            {/* Image */}
                                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/[0.02] flex-shrink-0 border border-white/[0.04]">
                                                {c.image ? (
                                                    <img src={c.image} alt={c.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/10 to-green-600/10">
                                                        <Percent className="w-8 h-8 text-emerald-500/30" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-sm font-bold text-white">{c.title}</h3>
                                                    <span className={`${tc.bg} ${tc.color} text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1`}>
                                                        <TypeIcon className="w-3 h-3" /> {tc.label}
                                                    </span>
                                                    <span className={`${sc.bg} ${sc.color} text-[10px] font-bold px-2 py-0.5 rounded-md`}>
                                                        {c.status === 'active' ? 'Active' : c.status === 'expired' ? 'Expired' : 'Cancelled'}
                                                    </span>
                                                    {isExpiring && (
                                                        <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-md animate-pulse flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> Ending soon
                                                        </span>
                                                    )}
                                                </div>

                                                {c.description && <p className="text-[11px] text-white/30 mt-1 line-clamp-1">{c.description}</p>}

                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    {c.games.map(g => (
                                                        <span key={g._id} className="text-[10px] text-white/40 bg-white/[0.04] px-2 py-0.5 rounded-md flex items-center gap-1">
                                                            <Gamepad2 className="w-3 h-3" /> {g.name}
                                                        </span>
                                                    ))}
                                                </div>

                                                {c.type === 'voluntary' && (
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <span className="text-[10px] text-blue-400/60 flex items-center gap-1"><Bell className="w-3 h-3" /> Notified {c.notifiedCount} sellers</span>
                                                        <span className="text-[10px] text-green-400/60 flex items-center gap-1"><UserCheck className="w-3 h-3" /> {c.participatingCount} participating</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Discount */}
                                            <div className="flex-shrink-0 text-center">
                                                <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-lg font-black px-4 py-2 rounded-xl">
                                                    -{c.discountPercent}%
                                                </div>
                                                <p className="text-[9px] text-white/20 mt-1">{c.type === 'mandatory' ? 'Off commission' : 'Off price'}</p>
                                            </div>

                                            {/* Date + Actions */}
                                            <div className="flex-shrink-0 text-right space-y-1">
                                                <p className="text-[10px] text-white/20">Ends: {endDate.toLocaleDateString('en-US')}</p>
                                                <p className="text-[10px] text-white/15">By {c.createdBy?.username || 'Admin'}</p>
                                                {c.status === 'active' && (
                                                    <button onClick={() => handleCancelCampaign(c._id)} className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-white/30 hover:bg-red-500/15 hover:text-red-400 transition-all mt-1" title="Cancel">
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ═══ INDIVIDUAL DISCOUNTS TAB ═══ */}
            {activeTab === 'individual' && (
                <>
                    <div className="flex items-center gap-2">
                        {['all', 'active', 'expired', 'cancelled'].map(f => (
                            <button key={f} onClick={() => setDiscountFilter(f)}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${discountFilter === f ? 'bg-white/10 text-white border border-white/20' : 'text-white/40 hover:text-white/60 border border-transparent'}`}>
                                {f}
                            </button>
                        ))}
                    </div>

                    {discountLoading ? (
                        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-white/30 animate-spin" /></div>
                    ) : discounts.length === 0 ? (
                        <div className="text-center py-20">
                            <Tag className="w-12 h-12 text-white/10 mx-auto mb-3" />
                            <p className="text-white/30 text-sm">No individual discounts</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {discounts.map(d => {
                                const sc = statusConfig[d.status];
                                return (
                                    <div key={d._id} className="bg-[#111318] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/[0.02] flex-shrink-0">
                                                {d.listing?.coverImage || d.listing?.images?.[0] ? (
                                                    <img src={d.listing?.coverImage || d.listing?.images[0]} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-white/10" /></div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-semibold text-white truncate">{d.listing?.title || 'Deleted'}</h3>
                                                    <span className={`${sc.bg} ${sc.color} text-[10px] font-bold px-2 py-0.5 rounded-md capitalize`}>{d.status}</span>
                                                </div>
                                                {d.listing?.game && (
                                                    <span className="text-[11px] text-white/30 flex items-center gap-1 mt-0.5"><Gamepad2 className="w-3 h-3" /> {d.listing.game.name}</span>
                                                )}
                                            </div>
                                            <div className="text-right flex-shrink-0 hidden sm:block">
                                                <p className="text-xs text-white/30 line-through">{d.originalPrice.toFixed(2)} EGP</p>
                                                <p className="text-lg font-black text-emerald-400">{d.discountedPrice.toFixed(2)} EGP</p>
                                            </div>
                                            <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-black px-3 py-1.5 rounded-lg flex-shrink-0">-{d.discountPercent}%</div>
                                            {d.status === 'active' && (
                                                <button onClick={() => handleCancelDiscount(d._id)} className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-white/30 hover:bg-red-500/15 hover:text-red-400 transition-all flex-shrink-0">
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ═══ CREATE CAMPAIGN MODAL ═══ */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-6">
                    <div className="bg-[#131620] border border-white/[0.08] rounded-2xl max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-[#131620] flex items-center justify-between px-6 py-4 border-b border-white/[0.06] z-10">
                            <h3 className="text-lg font-bold text-white">Create New Discount Campaign</h3>
                            <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Type selection */}
                            <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-3 block">Discount Type *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setFormType('mandatory')}
                                        className={`relative p-4 rounded-xl border transition-all text-right ${formType === 'mandatory' ? 'bg-orange-500/10 border-orange-500/30 shadow-lg shadow-orange-500/10' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'}`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formType === 'mandatory' ? 'bg-orange-500/20' : 'bg-white/[0.04]'}`}>
                                                <Lock className={`w-5 h-5 ${formType === 'mandatory' ? 'text-orange-400' : 'text-white/30'}`} />
                                            </div>
                                            <div>
                                                <h4 className={`text-sm font-bold ${formType === 'mandatory' ? 'text-orange-400' : 'text-white/60'}`}>Mandatory Discount</h4>
                                                <p className="text-[10px] text-white/30">Off platform commission</p>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-white/25 leading-relaxed">Discount is from the commission rate. Buyer price stays the same but the platform takes a lower commission.</p>
                                        {formType === 'mandatory' && <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center"><CheckCircle className="w-3 h-3 text-white" /></div>}
                                    </button>

                                    <button
                                        onClick={() => setFormType('voluntary')}
                                        className={`relative p-4 rounded-xl border transition-all text-right ${formType === 'voluntary' ? 'bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/10' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'}`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formType === 'voluntary' ? 'bg-blue-500/20' : 'bg-white/[0.04]'}`}>
                                                <Users className={`w-5 h-5 ${formType === 'voluntary' ? 'text-blue-400' : 'text-white/30'}`} />
                                            </div>
                                            <div>
                                                <h4 className={`text-sm font-bold ${formType === 'voluntary' ? 'text-blue-400' : 'text-white/60'}`}>Voluntary Discount</h4>
                                                <p className="text-[10px] text-white/30">Seller chooses to join</p>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-white/25 leading-relaxed">Sellers get notified. They can choose to join and select how many accounts to include.</p>
                                        {formType === 'voluntary' && <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"><CheckCircle className="w-3 h-3 text-white" /></div>}
                                    </button>
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">Campaign Title *</label>
                                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g., Summer Sale, Ramadan Offers..."
                                    className="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder:text-white/20" />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">Description (optional)</label>
                                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Brief description..."
                                    rows={2} className="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder:text-white/20 resize-none" />
                            </div>

                            {/* Image */}
                            <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">Campaign Image (optional)</label>
                                {formImage ? (
                                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/[0.06]">
                                        <img src={formImage} alt="" className="w-full h-full object-cover" />
                                        <button onClick={() => setFormImage('')} className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <label className="flex items-center justify-center gap-3 w-full h-24 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-white/15 bg-white/[0.02] cursor-pointer transition-all">
                                        {imageUploading ? <Loader2 className="w-5 h-5 text-white/30 animate-spin" /> : <><ImagePlus className="w-5 h-5 text-white/20" /><span className="text-sm text-white/30">Click to upload image</span></>}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={imageUploading} />
                                    </label>
                                )}
                            </div>

                            {/* Games */}
                            <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2 block">Select Games * <span className="text-white/20">({formSelectedGames.length} selected)</span></label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                                    {allGames.map(game => {
                                        const sel = formSelectedGames.includes(game._id);
                                        return (
                                            <button key={game._id} onClick={() => toggleGame(game._id)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all border ${sel ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60 hover:border-white/10'}`}>
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${sel ? 'bg-emerald-500' : 'bg-white/[0.06]'}`}>
                                                    {sel && <CheckCircle className="w-3 h-3 text-white" />}
                                                </div>
                                                <Gamepad2 className="w-3.5 h-3.5 flex-shrink-0" />
                                                <span className="text-xs font-medium truncate">{game.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Discount slider */}
                            <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-3 block">
                                    Discount Rate: <span className="text-emerald-400 text-lg font-black ml-2">{formDiscount}%</span>
                                    {formType === 'mandatory' && <span className="text-[10px] text-orange-400/60 mr-2">(Off platform commission)</span>}
                                    {formType === 'voluntary' && <span className="text-[10px] text-blue-400/60 mr-2">(Off account price)</span>}
                                </label>
                                <input type="range" min={1} max={formType === 'mandatory' ? 100 : 99} value={formDiscount} onChange={e => setFormDiscount(parseInt(e.target.value))}
                                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                                <div className="flex justify-between text-[10px] text-white/20 mt-1">
                                    <span>1%</span><span>25%</span><span>50%</span><span>75%</span><span>{formType === 'mandatory' ? '100%' : '99%'}</span>
                                </div>
                            </div>

                            {/* Info box */}
                            <div className={`rounded-xl p-4 border ${formType === 'mandatory' ? 'bg-orange-500/5 border-orange-500/15' : 'bg-blue-500/5 border-blue-500/15'}`}>
                                {formType === 'mandatory' ? (
                                    <div className="flex items-start gap-3">
                                        <Lock className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-bold text-orange-400 mb-1">How does mandatory discount work?</h4>
                                            <ul className="text-[11px] text-white/30 space-y-1 list-disc list-inside">
                                                <li>100% = platform commission rate only</li>
                                                <li>Example: if commission is 10% and you set 50% discount, platform takes 5% instead of 10%</li>
                                                <li>Buyer price stays the same</li>
                                                <li>Discount applies automatically to all accounts in selected games</li>
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-3">
                                        <Users className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-bold text-blue-400 mb-1">How does voluntary discount work?</h4>
                                            <ul className="text-[11px] text-white/30 space-y-1 list-disc list-inside">
                                                <li>Notification is sent to all sellers with accounts in these games</li>
                                                <li>Seller chooses to join or not</li>
                                                <li>If accepted, they select how many accounts to include</li>
                                                <li>Discount is directly off the account price</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* End date */}
                            <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1.5 block">End Date *</label>
                                <input type="datetime-local" value={formEndDate} onChange={e => setFormEndDate(e.target.value)}
                                    className="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 [color-scheme:dark]" />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-[#131620] flex gap-3 px-6 py-4 border-t border-white/[0.06]">
                            <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 text-sm font-medium transition-all">Cancel</button>
                            <button
                                onClick={handleCreateCampaign}
                                disabled={saving || !formTitle || formSelectedGames.length === 0 || !formEndDate}
                                className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${formType === 'mandatory' ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:shadow-orange-500/30' : 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:shadow-blue-500/30'}`}
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {formType === 'mandatory' ? 'Create Mandatory Discount' : 'Create & Notify Sellers'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
