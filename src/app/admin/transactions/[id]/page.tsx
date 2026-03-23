'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Clock, CheckCircle2, XCircle, AlertTriangle, ShieldCheck,
    User, CreditCard, Package, Calendar, Hash, Shield, Eye, MessageSquare,
    Wallet, Percent, ArrowRightLeft, FileText, Loader2, Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ensureCsrfToken } from '@/utils/csrf';
import Link from 'next/link';

type TxStatus = 'pending_seller_approval' | 'waiting_seller' | 'waiting_buyer' | 'completed' | 'rejected_by_seller' | 'disputed' | 'refunded' | 'auto_confirmed';

interface Credential { key: string; value: string; }
interface TimelineEntry { event: string; note: string; timestamp: string; }
interface Transaction {
    _id: string;
    amount: number;
    originalAmount?: number;
    discountPercent?: number;
    status: TxStatus;
    createdAt: string;
    autoConfirmAt?: string;
    credentials: Credential[];
    disputeReason?: string;
    resolvedNote?: string;
    timeline: TimelineEntry[];
    listing: {
        _id: string; title: string; coverImage: string; price: number;
        details?: Record<string, any>; game?: { _id: string; title: string } | string;
        images?: string[];
    };
    buyer: { _id: string; username: string; avatar?: string; email?: string };
    seller: { _id: string; username: string; avatar?: string; email?: string };
    sellerRequest?: {
        fullName: string; idType: string;
        idImage: string; faceImageFront: string; faceImageLeft: string; faceImageRight: string;
    };
}

const statusConfig: Record<TxStatus, { icon: any; label: string; color: string; bg: string }> = {
    pending_seller_approval: { icon: Clock, label: 'Pending Seller Approval', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' },
    waiting_seller: { icon: Clock, label: 'Waiting Seller', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
    waiting_buyer: { icon: Clock, label: 'Waiting Buyer', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' },
    completed: { icon: CheckCircle2, label: 'Completed', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
    rejected_by_seller: { icon: XCircle, label: 'Rejected by Seller', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
    disputed: { icon: AlertTriangle, label: 'Disputed', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
    refunded: { icon: XCircle, label: 'Refunded', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
    auto_confirmed: { icon: ShieldCheck, label: 'Auto Confirmed', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' },
};

const timelineIcons: Record<string, any> = {
    purchase_initiated: Clock,
    credentials_submitted: FileText,
    confirmed: CheckCircle2,
    completed: CheckCircle2,
    disputed: AlertTriangle,
    refunded: XCircle,
    auto_confirmed: ShieldCheck,
    dispute_resolved_release: CheckCircle2,
    dispute_resolved_refund: XCircle,
};

export default function AdminTransactionDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [tx, setTx] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [resolving, setResolving] = useState(false);
    const [resolveAction, setResolveAction] = useState<'release' | 'refund' | null>(null);
    const [resolveNote, setResolveNote] = useState('');
    const [imageModal, setImageModal] = useState<string | null>(null);

    const fetchTx = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/transactions/admin/${id}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setTx(data.data);
            else setError(data.message || 'Failed to load');
        } catch { setError('Network error'); }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { fetchTx(); }, [fetchTx]);

    const handleResolve = async (decision: 'release' | 'refund') => {
        if (!resolveNote.trim()) { alert('Please add a note'); return; }
        setResolving(true);
        try {
            const csrfToken = await ensureCsrfToken();
            const res = await fetch(`/api/v1/transactions/${id}/resolve`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
                body: JSON.stringify({ decision, note: resolveNote }),
            });
            const data = await res.json();
            if (data.success) { setResolveAction(null); setResolveNote(''); fetchTx(); }
            else alert(data.message);
        } catch { alert('Network error'); }
        finally { setResolving(false); }
    };

    const formatDate = (d: string) => {
        const date = new Date(d);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
            date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
    );

    if (error || !tx) return (
        <div className="text-center py-20">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-white/50">{error || 'Transaction not found'}</p>
            <Button onClick={() => router.back()} variant="ghost" className="mt-4 text-cyan-400">
                <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
            </Button>
        </div>
    );

    const config = statusConfig[tx.status];
    const StatusIcon = config.icon;

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button onClick={() => router.push('/admin/transactions')} variant="ghost" className="text-white/50 hover:text-white h-10 w-10 p-0">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Hash className="w-4 h-4 text-white/30" />
                        <span className="text-xs font-mono text-white/40">{tx._id}</span>
                    </div>
                    <h1 className="text-xl font-bold text-white">Transaction Details</h1>
                </div>
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${config.bg} ${config.color}`}>
                    <StatusIcon className="w-4 h-4" />
                    {config.label}
                </span>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column - Main Info */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Price Card */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                        <h3 className="text-sm font-medium text-white/40 mb-4 flex items-center gap-2">
                            <Wallet className="w-4 h-4" /> Price Details
                        </h3>
                        <div className="space-y-3">
                            {tx.originalAmount && tx.discountPercent ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/50">Original Price</span>
                                        <span className="text-white/50 line-through">{tx.originalAmount} EGP</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-green-400 flex items-center gap-1"><Percent className="w-3 h-3" /> Discount ({tx.discountPercent}%)</span>
                                        <span className="text-green-400">-{(tx.originalAmount - tx.amount).toFixed(0)} EGP</span>
                                    </div>
                                    <div className="border-t border-white/[0.06] pt-3 flex justify-between items-center">
                                        <span className="text-white font-semibold text-lg">Final Amount</span>
                                        <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">{tx.amount} EGP</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <span className="text-white font-semibold text-lg">Amount</span>
                                    <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">{tx.amount} EGP</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Listing Details */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                        <h3 className="text-sm font-medium text-white/40 mb-4 flex items-center gap-2">
                            <Package className="w-4 h-4" /> Listing Details
                        </h3>
                        <div className="flex gap-4">
                            {tx.listing?.coverImage && (
                                <img src={tx.listing.coverImage} alt="" className="w-20 h-20 rounded-xl object-cover border border-white/[0.08]" />
                            )}
                            <div className="flex-1 space-y-2">
                                <h4 className="text-white font-semibold">{tx.listing?.title || 'Deleted Listing'}</h4>
                                <p className="text-xs text-white/40">Listing Price: {tx.listing?.price} EGP</p>
                                {tx.listing?.details && Object.keys(tx.listing.details).length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {Object.entries(tx.listing.details).map(([key, val]) => (
                                            <span key={key} className="text-[10px] px-2 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/50">
                                                {key}: {String(val)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Listing Images */}
                        {tx.listing?.images && tx.listing.images.length > 0 && (
                            <div className="mt-4">
                                <p className="text-xs text-white/30 mb-2">Account Images</p>
                                <div className="flex gap-2 flex-wrap">
                                    {tx.listing.images.map((img, i) => (
                                        <img
                                            key={i} src={img} alt=""
                                            onClick={() => setImageModal(img)}
                                            className="w-16 h-16 rounded-lg object-cover border border-white/[0.08] cursor-pointer hover:border-cyan-500/30 transition-colors"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Credentials (if submitted) */}
                    {tx.credentials && tx.credentials.length > 0 && (
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-white/40 mb-4 flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Account Credentials
                            </h3>
                            <div className="space-y-2">
                                {tx.credentials.map((cred, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.06]">
                                        <span className="text-xs text-white/40 font-medium">{cred.key}</span>
                                        <span className="text-sm text-white font-mono">{cred.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dispute Info */}
                    {tx.disputeReason && (
                        <div className="bg-red-500/[0.05] border border-red-500/20 rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> Dispute Reason
                            </h3>
                            <p className="text-white/70 text-sm">{tx.disputeReason}</p>
                        </div>
                    )}

                    {tx.resolvedNote && (
                        <div className="bg-blue-500/[0.05] border border-blue-500/20 rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Admin Resolution
                            </h3>
                            <p className="text-white/70 text-sm">{tx.resolvedNote}</p>
                        </div>
                    )}

                    {/* Admin Resolve Actions */}
                    {tx.status === 'disputed' && (
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-white/40 mb-4 flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Resolve Dispute
                            </h3>
                            {!resolveAction ? (
                                <div className="flex gap-3">
                                    <Button onClick={() => setResolveAction('release')} className="bg-green-600 hover:bg-green-700 text-white flex-1">
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Release to Seller
                                    </Button>
                                    <Button onClick={() => setResolveAction('refund')} className="bg-red-600 hover:bg-red-700 text-white flex-1">
                                        <XCircle className="w-4 h-4 mr-2" /> Refund Buyer
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-white/60">
                                        {resolveAction === 'release' ? '🟢 Release funds to seller' : '🔴 Refund to buyer'}
                                    </p>
                                    <textarea
                                        value={resolveNote}
                                        onChange={(e) => setResolveNote(e.target.value)}
                                        placeholder="Add a resolution note..."
                                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/30 min-h-[80px] resize-none"
                                    />
                                    <div className="flex gap-2">
                                        <Button onClick={() => handleResolve(resolveAction)} disabled={resolving} className={resolveAction === 'release' ? 'bg-green-600 hover:bg-green-700 text-white flex-1' : 'bg-red-600 hover:bg-red-700 text-white flex-1'}>
                                            {resolving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                            Confirm {resolveAction === 'release' ? 'Release' : 'Refund'}
                                        </Button>
                                        <Button onClick={() => { setResolveAction(null); setResolveNote(''); }} variant="ghost" className="text-white/40">
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column - People & Timeline */}
                <div className="space-y-6">

                    {/* Buyer */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                        <h3 className="text-xs font-medium text-white/40 mb-3 uppercase tracking-wider">Buyer</h3>
                        <Link href={`/admin/users/${tx.buyer?._id}`} className="flex items-center gap-3 hover:bg-white/[0.03] rounded-xl p-1 -m-1 transition-colors group">
                            {tx.buyer?.avatar ? (
                                <img src={tx.buyer.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-white/[0.1]" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                                    {tx.buyer?.username?.[0]?.toUpperCase() || 'B'}
                                </div>
                            )}
                            <div>
                                <p className="text-white font-medium text-sm group-hover:text-cyan-400 transition-colors">{tx.buyer?.username || '—'}</p>
                                <p className="text-xs text-white/30">{tx.buyer?.email || ''}</p>
                            </div>
                        </Link>
                    </div>

                    {/* Seller */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                        <h3 className="text-xs font-medium text-white/40 mb-3 uppercase tracking-wider">Seller</h3>
                        <Link href={`/admin/users/${tx.seller?._id}`} className="flex items-center gap-3 hover:bg-white/[0.03] rounded-xl p-1 -m-1 transition-colors group">
                            {tx.seller?.avatar ? (
                                <img src={tx.seller.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-white/[0.1]" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                                    {tx.seller?.username?.[0]?.toUpperCase() || 'S'}
                                </div>
                            )}
                            <div>
                                <p className="text-white font-medium text-sm group-hover:text-cyan-400 transition-colors">{tx.seller?.username || '—'}</p>
                                <p className="text-xs text-white/30">{tx.seller?.email || ''}</p>
                            </div>
                        </Link>

                        {/* Seller ID Card & Face Photos */}
                        {tx.sellerRequest && (
                            <div className="mt-4 space-y-3">
                                <div className="border-t border-white/[0.06] pt-3">
                                    <p className="text-xs text-white/30 mb-1">Full Name</p>
                                    <p className="text-sm text-white/80">{tx.sellerRequest.fullName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-white/30 mb-1">ID Type</p>
                                    <p className="text-sm text-white/80 capitalize">{tx.sellerRequest.idType}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-white/30 mb-2">ID Document</p>
                                    <img
                                        src={tx.sellerRequest.idImage} alt="ID"
                                        onClick={() => setImageModal(tx.sellerRequest!.idImage)}
                                        className="w-full rounded-lg border border-white/[0.08] cursor-pointer hover:border-cyan-500/30 transition-colors"
                                    />
                                </div>
                                <div>
                                    <p className="text-xs text-white/30 mb-2">Face Photos</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Front', src: tx.sellerRequest.faceImageFront },
                                            { label: 'Left', src: tx.sellerRequest.faceImageLeft },
                                            { label: 'Right', src: tx.sellerRequest.faceImageRight },
                                        ].map(photo => (
                                            <div key={photo.label} className="text-center">
                                                <img
                                                    src={photo.src} alt={photo.label}
                                                    onClick={() => setImageModal(photo.src)}
                                                    className="w-full aspect-square rounded-lg object-cover border border-white/[0.08] cursor-pointer hover:border-cyan-500/30 transition-colors"
                                                />
                                                <span className="text-[9px] text-white/30 mt-1">{photo.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Date & Time */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                        <h3 className="text-xs font-medium text-white/40 mb-3 uppercase tracking-wider">Dates</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/40">Created</span>
                                <span className="text-white/70">{formatDate(tx.createdAt)}</span>
                            </div>
                            {tx.autoConfirmAt && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40">Auto Confirm</span>
                                    <span className="text-white/70">{formatDate(tx.autoConfirmAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                        <h3 className="text-xs font-medium text-white/40 mb-4 uppercase tracking-wider">Timeline</h3>
                        <div className="space-y-0">
                            {tx.timeline.map((entry, i) => {
                                const TlIcon = timelineIcons[entry.event] || Clock;
                                const isLast = i === tx.timeline.length - 1;
                                return (
                                    <div key={i} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isLast ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/[0.05] text-white/30'}`}>
                                                <TlIcon className="w-3.5 h-3.5" />
                                            </div>
                                            {!isLast && <div className="w-px h-8 bg-white/[0.06]" />}
                                        </div>
                                        <div className="pb-6">
                                            <p className={`text-sm font-medium ${isLast ? 'text-white' : 'text-white/60'}`}>
                                                {entry.event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </p>
                                            {entry.note && <p className="text-xs text-white/30 mt-0.5">{entry.note}</p>}
                                            <p className="text-[10px] text-white/20 mt-0.5">{formatDate(entry.timestamp)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Modal */}
            {imageModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setImageModal(null)}>
                    <div className="relative max-w-3xl max-h-[90vh]">
                        <img src={imageModal} alt="" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
                        <button onClick={() => setImageModal(null)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
