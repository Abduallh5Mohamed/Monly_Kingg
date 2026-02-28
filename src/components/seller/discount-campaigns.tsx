'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ensureCsrfToken } from '@/utils/csrf';
import { Button } from '@/components/ui/button';
import {
    Tag,
    Loader2,
    Clock,
    CheckCircle,
    XCircle,
    Percent,
    Calendar,
    Package,
    Gamepad2,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Shield,
    Users,
    Image as ImageIcon,
    ArrowRight,
    BadgeCheck,
    AlertTriangle,
} from 'lucide-react';

/* ─────────────── TYPES ─────────────── */

interface GameInfo {
    _id: string;
    name: string;
    slug: string;
    icon?: string;
}

interface EligibleListing {
    _id: string;
    title: string;
    price: number;
    coverImage?: string;
    images?: string[];
    game: GameInfo | string;
    status: string;
    isParticipating: boolean;
}

interface CampaignInvite {
    _id: string;
    title: string;
    description: string;
    discountPercent: number;
    image?: string;
    games: GameInfo[];
    endDate: string;
    eligibleListings: EligibleListing[];
    participatingCount: number;
}

interface MandatoryCampaign {
    _id: string;
    title: string;
    description: string;
    type: 'mandatory';
    image?: string;
    discountPercent: number;
    games: GameInfo[];
    endDate: string;
    listingCount: number;
}

/* ─────────────── COMPONENT ─────────────── */

export function DiscountCampaignsContent() {
    const { user } = useAuth();

    // Data
    const [invites, setInvites] = useState<CampaignInvite[]>([]);
    const [mandatoryCampaigns, setMandatoryCampaigns] = useState<MandatoryCampaign[]>([]);
    const [loading, setLoading] = useState(true);

    // UI
    const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
    const [selectedListings, setSelectedListings] = useState<Record<string, Set<string>>>({});
    const [joiningCampaign, setJoiningCampaign] = useState<string | null>(null);
    const [leavingCampaign, setLeavingCampaign] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [tab, setTab] = useState<'voluntary' | 'mandatory'>('voluntary');

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }
    }, [toast]);

    // Fetch data
    const fetchData = useCallback(async () => {
        if (!user?.isSeller) return;
        setLoading(true);
        try {
            const [invitesRes, activeRes] = await Promise.all([
                fetch('/api/v1/campaigns/my-invites', { credentials: 'include' }),
                fetch('/api/v1/campaigns/active', { credentials: 'include' }),
            ]);
            const [invitesData, activeData] = await Promise.all([invitesRes.json(), activeRes.json()]);

            if (invitesData.success) {
                setInvites(invitesData.data || []);
                const selections: Record<string, Set<string>> = {};
                (invitesData.data || []).forEach((inv: CampaignInvite) => {
                    selections[inv._id] = new Set(
                        inv.eligibleListings.filter(l => l.isParticipating).map(l => l._id)
                    );
                });
                setSelectedListings(selections);
            }

            if (activeData.success) {
                const mandatory = (activeData.data || []).filter((c: any) => c.type === 'mandatory');
                setMandatoryCampaigns(mandatory);
            }
        } catch (err) {
            console.error('Failed to fetch discounts:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /* ─── Listing selection toggle ─── */
    const toggleListing = (campaignId: string, listingId: string) => {
        setSelectedListings(prev => {
            const current = new Set(prev[campaignId] || []);
            if (current.has(listingId)) current.delete(listingId);
            else current.add(listingId);
            return { ...prev, [campaignId]: current };
        });
    };

    const selectAll = (campaignId: string, listings: EligibleListing[]) => {
        setSelectedListings(prev => ({
            ...prev,
            [campaignId]: new Set(listings.map(l => l._id)),
        }));
    };

    const deselectAll = (campaignId: string) => {
        setSelectedListings(prev => ({
            ...prev,
            [campaignId]: new Set(),
        }));
    };

    /* ─── Join campaign ─── */
    const handleJoin = async (campaignId: string) => {
        const selected = selectedListings[campaignId];
        if (!selected || selected.size === 0) {
            setToast({ type: 'error', msg: 'Select at least one account to join' });
            return;
        }
        setJoiningCampaign(campaignId);
        try {
            const csrf = await ensureCsrfToken() || '';
            const res = await fetch(`/api/v1/campaigns/${campaignId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrf },
                credentials: 'include',
                body: JSON.stringify({ listingIds: [...selected] }),
            });
            const data = await res.json();
            if (data.success) {
                setToast({ type: 'success', msg: data.message || `Joined with ${selected.size} accounts!` });
                await fetchData();
            } else {
                setToast({ type: 'error', msg: data.message || 'Failed to join' });
            }
        } catch {
            setToast({ type: 'error', msg: 'Network error' });
        } finally {
            setJoiningCampaign(null);
        }
    };

    /* ─── Leave campaign ─── */
    const handleLeave = async (campaignId: string) => {
        setLeavingCampaign(campaignId);
        try {
            const csrf = await ensureCsrfToken() || '';
            const res = await fetch(`/api/v1/campaigns/${campaignId}/leave`, {
                method: 'DELETE',
                headers: { 'X-XSRF-TOKEN': csrf },
                credentials: 'include',
            });
            const data = await res.json();
            if (data.success) {
                setToast({ type: 'success', msg: 'Left the campaign' });
                await fetchData();
            } else {
                setToast({ type: 'error', msg: data.message || 'Failed to leave' });
            }
        } catch {
            setToast({ type: 'error', msg: 'Network error' });
        } finally {
            setLeavingCampaign(null);
        }
    };

    /* ─── Helpers ─── */
    const getRemainingDays = (endDate: string) => {
        const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    };

    const getGameImage = (listing: EligibleListing) => {
        if (listing.coverImage) return listing.coverImage;
        if (listing.images?.length) return listing.images[0];
        return null;
    };

    const totalInvites = invites.length;
    const joinedCount = invites.filter(i => i.participatingCount > 0).length;
    const pendingCount = invites.filter(i => i.participatingCount === 0).length;

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl border transition-all ${toast.type === 'success'
                    ? 'bg-green-500/15 border-green-500/20 text-green-400'
                    : 'bg-red-500/15 border-red-500/20 text-red-400'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Invites', value: totalInvites, color: 'from-orange-500 to-amber-600', icon: Tag },
                    { label: 'Joined', value: joinedCount, color: 'from-green-500 to-emerald-600', icon: CheckCircle },
                    { label: 'Pending', value: pendingCount, color: 'from-yellow-500 to-orange-600', icon: Clock },
                    { label: 'Mandatory', value: mandatoryCampaigns.length, color: 'from-red-500 to-pink-600', icon: Shield },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Icon className="w-4 h-4 text-white/30" />
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                            </div>
                            <p className="text-xs text-white/40">{stat.label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Sub-Tabs */}
            <div className="flex gap-2">
                {(['voluntary', 'mandatory'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${tab === t
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                            }`}
                    >
                        {t === 'voluntary' ? <Sparkles className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        {t === 'voluntary' ? 'Voluntary Offers' : 'Mandatory Discounts'}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
                </div>
            ) : tab === 'voluntary' ? (
                /* ═══════ VOLUNTARY TAB ═══════ */
                invites.length === 0 ? (
                    <EmptyState
                        icon={Tag}
                        title="No discount invites yet"
                        description="When the admin creates a voluntary discount campaign for your games, it will appear here"
                    />
                ) : (
                    <div className="space-y-4">
                        {invites.map((invite) => {
                            const isExpanded = expandedCampaign === invite._id;
                            const remaining = getRemainingDays(invite.endDate);
                            const selected = selectedListings[invite._id] || new Set();
                            const isJoined = invite.participatingCount > 0;
                            const isJoining = joiningCampaign === invite._id;
                            const isLeaving = leavingCampaign === invite._id;

                            return (
                                <div key={invite._id} className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden transition-all hover:border-white/15">
                                    {/* Campaign Banner */}
                                    {invite.image && (
                                        <div className="h-32 sm:h-40 overflow-hidden relative">
                                            <img src={invite.image} alt={invite.title} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b14] via-transparent to-transparent" />
                                        </div>
                                    )}

                                    {/* Campaign Header */}
                                    <div className="p-5">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {isJoined ? (
                                                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/20 text-green-400 font-medium">
                                                            <BadgeCheck className="w-3 h-3" /> Joined
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/20 text-yellow-400 font-medium">
                                                            <Clock className="w-3 h-3" /> Pending
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/20 text-orange-400 font-medium">
                                                        <Percent className="w-3 h-3" /> {invite.discountPercent}% Off
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-white">{invite.title}</h3>
                                                {invite.description && (
                                                    <p className="text-sm text-white/40 mt-1 line-clamp-2">{invite.description}</p>
                                                )}
                                            </div>

                                            {/* Right info */}
                                            <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 text-right flex-shrink-0">
                                                <div className="flex items-center gap-1.5 text-xs text-white/40">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {remaining} days left
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-white/40">
                                                    <Package className="w-3.5 h-3.5" />
                                                    {invite.eligibleListings.length} eligible accounts
                                                </div>
                                            </div>
                                        </div>

                                        {/* Games */}
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {invite.games.map(g => (
                                                <span key={g._id} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/60">
                                                    <Gamepad2 className="w-3 h-3" />
                                                    {g.name}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Expand/Collapse */}
                                        <button
                                            onClick={() => setExpandedCampaign(isExpanded ? null : invite._id)}
                                            className="mt-4 flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
                                        >
                                            {isExpanded ? (
                                                <>
                                                    <ChevronUp className="w-4 h-4" /> Hide Accounts
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="w-4 h-4" /> Choose Accounts ({invite.eligibleListings.length})
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Expanded: Listing selection */}
                                    {isExpanded && (
                                        <div className="border-t border-white/[0.06] bg-white/[0.01]">
                                            {/* Select all / deselect all */}
                                            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                                                <p className="text-xs text-white/40">
                                                    {selected.size} of {invite.eligibleListings.length} selected
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => selectAll(invite._id, invite.eligibleListings)}
                                                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                                    >
                                                        Select All
                                                    </button>
                                                    <span className="text-white/10">|</span>
                                                    <button
                                                        onClick={() => deselectAll(invite._id)}
                                                        className="text-xs text-white/40 hover:text-white/60 transition-colors"
                                                    >
                                                        Deselect All
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Listings grid */}
                                            <div className="p-4 grid gap-2 max-h-[400px] overflow-y-auto">
                                                {invite.eligibleListings.map((listing) => {
                                                    const isSelected = selected.has(listing._id);
                                                    const discountedPrice = listing.price * (1 - invite.discountPercent / 100);
                                                    const img = getGameImage(listing);

                                                    return (
                                                        <button
                                                            key={listing._id}
                                                            type="button"
                                                            onClick={() => toggleListing(invite._id, listing._id)}
                                                            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected
                                                                ? 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500/50'
                                                                : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
                                                                }`}
                                                        >
                                                            {/* Checkbox */}
                                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected
                                                                ? 'bg-orange-500 border-orange-500'
                                                                : 'border-white/20'
                                                                }`}>
                                                                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                                            </div>

                                                            {/* Thumbnail */}
                                                            {img ? (
                                                                <img src={img} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                                                                    <ImageIcon className="w-5 h-5 text-white/20" />
                                                                </div>
                                                            )}

                                                            {/* Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-white truncate">{listing.title}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-xs text-white/30 line-through">EGP {listing.price.toFixed(2)}</span>
                                                                    <ArrowRight className="w-3 h-3 text-orange-400" />
                                                                    <span className="text-xs font-bold text-orange-400">EGP {discountedPrice.toFixed(2)}</span>
                                                                </div>
                                                            </div>

                                                            {/* Participating badge */}
                                                            {listing.isParticipating && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/20 flex-shrink-0">
                                                                    Active
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-3 px-5 py-4 border-t border-white/[0.06]">
                                                <Button
                                                    onClick={() => handleJoin(invite._id)}
                                                    disabled={isJoining || selected.size === 0}
                                                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 rounded-xl px-6"
                                                >
                                                    {isJoining ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    ) : (
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                    )}
                                                    {isJoined ? 'Update Selection' : 'Accept & Join'} ({selected.size})
                                                </Button>

                                                {isJoined && (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => handleLeave(invite._id)}
                                                        disabled={isLeaving}
                                                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl"
                                                    >
                                                        {isLeaving ? (
                                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                        ) : (
                                                            <XCircle className="w-4 h-4 mr-2" />
                                                        )}
                                                        Leave Campaign
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            ) : (
                /* ═══════ MANDATORY TAB ═══════ */
                mandatoryCampaigns.length === 0 ? (
                    <EmptyState
                        icon={Shield}
                        title="No mandatory discounts"
                        description="When the admin applies a mandatory discount on certain games, it will show here. These apply automatically to all matching listings."
                    />
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
                            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-amber-300">Mandatory Discounts</p>
                                <p className="text-xs text-white/40 mt-0.5">
                                    These discounts apply automatically to all matching game listings. They reduce the platform commission,
                                    meaning you keep the same sale price but the buyer benefits from lower fees.
                                </p>
                            </div>
                        </div>

                        {mandatoryCampaigns.map((campaign) => {
                            const remaining = getRemainingDays(campaign.endDate);
                            return (
                                <div key={campaign._id} className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
                                    {campaign.image && (
                                        <div className="h-32 overflow-hidden relative">
                                            <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b14] via-transparent to-transparent" />
                                        </div>
                                    )}
                                    <div className="p-5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/20 text-red-400 font-medium">
                                                <Shield className="w-3 h-3" /> Mandatory
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/20 text-orange-400 font-medium">
                                                <Percent className="w-3 h-3" /> {campaign.discountPercent}% Commission Reduction
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white">{campaign.title}</h3>
                                        {campaign.description && (
                                            <p className="text-sm text-white/40 mt-1">{campaign.description}</p>
                                        )}

                                        {/* Games */}
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {campaign.games.map(g => (
                                                <span key={g._id} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/60">
                                                    <Gamepad2 className="w-3 h-3" />
                                                    {g.name}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Info row */}
                                        <div className="flex items-center gap-4 mt-4 text-xs text-white/40">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {remaining} days remaining
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5" />
                                                {campaign.listingCount} listings affected
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
}

/* ─── Empty State ─── */
function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
    return (
        <div className="text-center py-20">
            <Icon className="w-14 h-14 mx-auto mb-4 text-white/10" />
            <p className="text-white/40 text-lg">{title}</p>
            <p className="text-white/20 text-sm mt-1">{description}</p>
        </div>
    );
}
