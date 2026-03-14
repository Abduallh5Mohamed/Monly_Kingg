'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, User, Mail, Phone, MapPin, Shield, ShieldCheck, ShieldAlert,
    Wallet, TrendingUp, Clock, Calendar, Globe, Monitor, Activity,
    CreditCard, Package, AlertTriangle, CheckCircle2, XCircle, Eye,
    Star, Hash, Loader2, Image as ImageIcon, Fingerprint, Ban, ArrowRightLeft,
    LogIn, LogOut, Key, RefreshCw, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthLog {
    action: string; success: boolean; ip: string; userAgent: string; createdAt: string;
}
interface Session {
    ip: string; userAgent: string; createdAt: string; expiresAt: string;
}
interface SellerRequest {
    fullName: string; idType: string; idImage: string;
    faceImageFront: string; faceImageLeft: string; faceImageRight: string;
    status: string; rejectionReason?: string; applicationCount: number;
    reviewedAt?: string; createdAt: string;
    reviewedBy?: { username: string };
    rejectionHistory?: { reason: string; rejectedAt: string; fullName: string; idType: string }[];
}
interface DepositRecord {
    _id: string; amount: number; status: string; paymentMethod: string;
    senderFullName: string; senderPhoneOrEmail: string; depositDate: string;
    receiptImage: string; createdAt: string; adminNote?: string;
}
interface WithdrawRecord {
    _id: string; amount: number; method: string; countryCode: string;
    phoneNumber: string; status: string; rejectionReason?: string;
    reviewedBy?: { username: string }; reviewedAt?: string; createdAt: string;
}
interface TxRecord {
    _id: string; amount: number; status: string; createdAt: string;
    buyer: { _id: string; username: string };
    seller: { _id: string; username: string };
}
interface UserDetail {
    _id: string; username: string; email: string; fullName?: string;
    phone?: string; address?: string; avatar?: string; bio?: string;
    role: string; verified: boolean; profileCompleted: boolean;
    googleId?: string; isSeller: boolean; sellerApprovedAt?: string;
    isOnline: boolean; lastSeenAt: string;
    createdAt: string; updatedAt: string;
    wallet: { balance: number; hold: number };
    stats: { totalVolume: number; level: number; successfulTrades: number; failedTrades: number };
    twoFA: { enabled: boolean };
    security: {
        failedLoginAttempts: number; lockUntil?: string;
        lastUsernameChange?: string; lastPhoneChange?: string;
        lastLogin?: { ip: string; userAgent: string; at: string };
        knownIPs: string[];
        authLogs: AuthLog[];
    };
    activeSessions: Session[];
    sellerRequest?: SellerRequest;
    transactions: { asBuyer: number; asSeller: number; disputed: number; recent: TxRecord[] };
    deposits: { stats: { _id: string; count: number; total: number }[]; recent: DepositRecord[] };
    withdrawals: { stats: { _id: string; count: number; total: number }[]; recent: WithdrawRecord[] };
    listings: { total: number; active: number; sold: number };
    badges: { badgeId: string; earnedAt: string }[];
}

const authActionIcons: Record<string, any> = {
    login: LogIn, login_failed: ShieldAlert, logout: LogOut,
    refresh: RefreshCw, verify: CheckCircle2, resend_code: Mail, default: Key,
};

const depositStatusColors: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    approved: 'text-green-400 bg-green-400/10 border-green-400/30',
    rejected: 'text-red-400 bg-red-400/10 border-red-400/30',
};

const txStatusColors: Record<string, string> = {
    waiting_seller: 'text-yellow-400', waiting_buyer: 'text-blue-400',
    completed: 'text-green-400', disputed: 'text-red-400',
    refunded: 'text-orange-400', auto_confirmed: 'text-emerald-400',
};

export default function AdminUserDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [imageModal, setImageModal] = useState<string | null>(null);
    const [showAllLogs, setShowAllLogs] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'transactions' | 'deposits' | 'withdrawals'>('overview');

    const fetchUser = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/admin/users/${id}/detail`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setUser(data.data);
            else setError(data.message || 'Failed to load');
        } catch { setError('Network error'); }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { fetchUser(); }, [fetchUser]);

    const fmtDate = (d: string) => {
        if (!d) return '—';
        const date = new Date(d);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
            date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    const parseUA = (ua: string) => {
        if (!ua) return 'Unknown';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return ua.length > 30 ? ua.substring(0, 30) + '…' : ua;
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
    );

    if (error || !user) return (
        <div className="text-center py-20">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-white/50">{error || 'User not found'}</p>
            <Button onClick={() => router.back()} variant="ghost" className="mt-4 text-cyan-400">
                <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
            </Button>
        </div>
    );

    const depApproved = user.deposits.stats.find(s => s._id === 'approved');
    const depPending = user.deposits.stats.find(s => s._id === 'pending');

    const tabs = [
        { key: 'overview' as const, label: 'Overview' },
        { key: 'security' as const, label: 'Security & IPs' },
        { key: 'transactions' as const, label: 'Transactions' },
        { key: 'deposits' as const, label: 'Deposits' },
        { key: 'withdrawals' as const, label: 'Withdrawals' },
    ];

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Button onClick={() => router.back()} variant="ghost" className="text-white/50 hover:text-white h-10 w-10 p-0 mt-1">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                        {user.avatar ? (
                            <img src={user.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10" />
                        ) : (
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold border-2 border-white/10">
                                {user.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-white">{user.username}</h1>
                                {user.verified && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                                {user.isSeller && (
                                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">SELLER</span>
                                )}
                                {user.role === 'admin' && (
                                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">ADMIN</span>
                                )}
                            </div>
                            <p className="text-white/40 text-sm mt-0.5">{user.email}</p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className={`flex items-center gap-1 text-xs ${user.isOnline ? 'text-green-400' : 'text-white/30'}`}>
                                    <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
                                    {user.isOnline ? 'Online' : `Last seen ${fmtDate(user.lastSeenAt)}`}
                                </span>
                                <span className="text-xs text-white/20">ID: {user._id}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Balance', value: `${user.wallet.balance} EGP`, icon: Wallet, color: 'text-cyan-400' },
                    { label: 'Hold', value: `${user.wallet.hold} EGP`, icon: Ban, color: 'text-orange-400' },
                    { label: 'Volume', value: `${user.stats.totalVolume} EGP`, icon: TrendingUp, color: 'text-green-400' },
                    { label: 'Trades', value: `${user.stats.successfulTrades}/${user.stats.failedTrades}`, icon: ArrowRightLeft, color: 'text-blue-400' },
                    { label: 'Listings', value: `${user.listings.active}/${user.listings.total}`, icon: Package, color: 'text-purple-400' },
                    { label: 'Level', value: `${user.stats.level}`, icon: Star, color: 'text-yellow-400' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
                        <div className="flex items-center gap-2 mb-1.5">
                            <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                            <span className="text-[10px] text-white/30 uppercase tracking-wider">{stat.label}</span>
                        </div>
                        <p className="text-white font-bold text-lg">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                            ? 'bg-white/[0.08] text-white shadow-sm'
                            : 'text-white/40 hover:text-white/60'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Profile Info */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 space-y-4">
                        <h3 className="text-sm font-medium text-white/40 flex items-center gap-2 mb-4">
                            <User className="w-4 h-4" /> Profile Information
                        </h3>
                        {[
                            { icon: User, label: 'Full Name', value: user.fullName },
                            { icon: Mail, label: 'Email', value: user.email },
                            { icon: Phone, label: 'Phone', value: user.phone },
                            { icon: MapPin, label: 'Address', value: user.address },
                            { icon: Hash, label: 'Google ID', value: user.googleId },
                            { icon: Calendar, label: 'Joined', value: fmtDate(user.createdAt) },
                            { icon: Calendar, label: 'Updated', value: fmtDate(user.updatedAt) },
                        ].map(row => (
                            <div key={row.label} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                                <row.icon className="w-4 h-4 text-white/20 shrink-0" />
                                <span className="text-xs text-white/40 w-24 shrink-0">{row.label}</span>
                                <span className="text-sm text-white/80 break-all">{row.value || '—'}</span>
                            </div>
                        ))}
                        {user.bio && (
                            <div className="pt-2">
                                <p className="text-xs text-white/40 mb-1">Bio</p>
                                <p className="text-sm text-white/60 bg-white/[0.03] rounded-lg p-3">{user.bio}</p>
                            </div>
                        )}
                    </div>

                    {/* Seller Verification */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                        <h3 className="text-sm font-medium text-white/40 flex items-center gap-2 mb-4">
                            <Fingerprint className="w-4 h-4" /> Seller Verification
                        </h3>
                        {user.sellerRequest ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/60">Status</span>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${user.sellerRequest.status === 'approved' ? 'text-green-400 bg-green-400/10 border-green-400/30' : user.sellerRequest.status === 'rejected' ? 'text-red-400 bg-red-400/10 border-red-400/30' : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'}`}>
                                        {user.sellerRequest.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-white/40">Full Name</span>
                                        <span className="text-white/80">{user.sellerRequest.fullName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/40">ID Type</span>
                                        <span className="text-white/80 capitalize">{user.sellerRequest.idType?.replace('_', ' ')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/40">Applications</span>
                                        <span className="text-white/80">{user.sellerRequest.applicationCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-white/40">Submitted</span>
                                        <span className="text-white/80">{fmtDate(user.sellerRequest.createdAt)}</span>
                                    </div>
                                    {user.sellerRequest.reviewedAt && (
                                        <div className="flex justify-between">
                                            <span className="text-white/40">Reviewed</span>
                                            <span className="text-white/80">{fmtDate(user.sellerRequest.reviewedAt)}</span>
                                        </div>
                                    )}
                                </div>

                                {user.sellerRequest.rejectionReason && (
                                    <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
                                        <p className="text-red-400 text-xs font-medium mb-1">Rejection Reason</p>
                                        <p className="text-white/60 text-sm">{user.sellerRequest.rejectionReason}</p>
                                    </div>
                                )}

                                {/* ID Document */}
                                <div>
                                    <p className="text-xs text-white/30 mb-2">ID Document</p>
                                    <img
                                        src={user.sellerRequest.idImage} alt="ID"
                                        onClick={() => setImageModal(user.sellerRequest!.idImage)}
                                        className="w-full rounded-lg border border-white/[0.08] cursor-pointer hover:border-cyan-500/30 transition-colors"
                                    />
                                </div>

                                {/* Face Photos */}
                                <div>
                                    <p className="text-xs text-white/30 mb-2">Face Photos</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Front', src: user.sellerRequest.faceImageFront },
                                            { label: 'Left', src: user.sellerRequest.faceImageLeft },
                                            { label: 'Right', src: user.sellerRequest.faceImageRight },
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

                                {/* Rejection History */}
                                {user.sellerRequest.rejectionHistory && user.sellerRequest.rejectionHistory.length > 0 && (
                                    <div>
                                        <p className="text-xs text-white/30 mb-2">Rejection History</p>
                                        <div className="space-y-2">
                                            {user.sellerRequest.rejectionHistory.map((rej, i) => (
                                                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-xs">
                                                    <p className="text-red-400">{rej.reason}</p>
                                                    <p className="text-white/30 mt-1">{fmtDate(rej.rejectedAt)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-white/30 text-sm">No seller verification request</p>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="space-y-6">
                    {/* Security Overview */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Known IPs */}
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-white/40 flex items-center gap-2 mb-4">
                                <Globe className="w-4 h-4" /> Known IP Addresses ({user.security.knownIPs.length})
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {user.security.knownIPs.length > 0 ? user.security.knownIPs.map((ip, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.06]">
                                        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                        <span className="text-sm text-white font-mono">{ip}</span>
                                    </div>
                                )) : (
                                    <p className="text-white/30 text-sm">No IPs recorded</p>
                                )}
                            </div>
                        </div>

                        {/* Active Sessions */}
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-white/40 flex items-center gap-2 mb-4">
                                <Monitor className="w-4 h-4" /> Active Sessions ({user.activeSessions.length})
                            </h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {user.activeSessions.length > 0 ? user.activeSessions.map((s, i) => (
                                    <div key={i} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06] space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Monitor className="w-3 h-3 text-green-400" />
                                            <span className="text-xs text-white/70">{parseUA(s.userAgent)}</span>
                                        </div>
                                        <p className="text-xs text-white/40 font-mono">{s.ip || 'Unknown IP'}</p>
                                        <p className="text-[10px] text-white/20">Expires: {fmtDate(s.expiresAt)}</p>
                                    </div>
                                )) : (
                                    <p className="text-white/30 text-sm">No active sessions</p>
                                )}
                            </div>
                        </div>

                        {/* Security Status */}
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-white/40 flex items-center gap-2 mb-4">
                                <Shield className="w-4 h-4" /> Security Status
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40">2FA</span>
                                    <span className={user.twoFA.enabled ? 'text-green-400' : 'text-red-400'}>
                                        {user.twoFA.enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40">Email Verified</span>
                                    <span className={user.verified ? 'text-green-400' : 'text-red-400'}>
                                        {user.verified ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40">Failed Logins</span>
                                    <span className={`${user.security.failedLoginAttempts > 3 ? 'text-red-400' : 'text-white/70'}`}>
                                        {user.security.failedLoginAttempts}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/40">Account Lock</span>
                                    <span className={user.security.lockUntil ? 'text-red-400' : 'text-green-400'}>
                                        {user.security.lockUntil ? `Until ${fmtDate(user.security.lockUntil)}` : 'Not locked'}
                                    </span>
                                </div>
                                {user.security.lastLogin && (
                                    <>
                                        <div className="border-t border-white/[0.06] pt-3 mt-3">
                                            <p className="text-xs text-white/30 mb-2">Last Login</p>
                                            <p className="text-sm text-white/70 font-mono">{user.security.lastLogin.ip}</p>
                                            <p className="text-xs text-white/40">{parseUA(user.security.lastLogin.userAgent)}</p>
                                            <p className="text-[10px] text-white/20 mt-1">{fmtDate(user.security.lastLogin.at)}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Auth Logs */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-white/40 flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Auth Activity Log ({user.security.authLogs.length})
                            </h3>
                            {user.security.authLogs.length > 10 && (
                                <button
                                    onClick={() => setShowAllLogs(!showAllLogs)}
                                    className="text-xs text-cyan-400 hover:text-cyan-300"
                                >
                                    {showAllLogs ? 'Show less' : 'Show all'}
                                </button>
                            )}
                        </div>
                        <div className="space-y-0">
                            {(showAllLogs ? user.security.authLogs : user.security.authLogs.slice(0, 10)).map((log, i) => {
                                const Icon = authActionIcons[log.action] || authActionIcons.default;
                                return (
                                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${log.success ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-white/70 capitalize">{log.action?.replace(/_/g, ' ')}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${log.success ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                                                    {log.success ? 'OK' : 'FAIL'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-white/20 truncate">{parseUA(log.userAgent)}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs text-white/50 font-mono">{log.ip || '—'}</p>
                                            <p className="text-[10px] text-white/20">{fmtDate(log.createdAt)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'transactions' && (
                <div className="space-y-6">
                    {/* Transaction Summary */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'As Buyer', value: user.transactions.asBuyer, color: 'text-blue-400' },
                            { label: 'As Seller', value: user.transactions.asSeller, color: 'text-purple-400' },
                            { label: 'Disputed', value: user.transactions.disputed, color: 'text-red-400' },
                        ].map(s => (
                            <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                <p className="text-xs text-white/40 mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Recent Transactions */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                        <h3 className="text-sm font-medium text-white/40 mb-4">Recent Transactions</h3>
                        {user.transactions.recent.length > 0 ? (
                            <div className="space-y-0">
                                {user.transactions.recent.map(tx => {
                                    const isBuyer = tx.buyer?._id === user._id;
                                    return (
                                        <Link key={tx._id} href={`/admin/transactions/${tx._id}`}
                                            className="flex items-center gap-3 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] rounded-lg px-2 -mx-2 transition-colors">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isBuyer ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                                {isBuyer ? <CreditCard className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-white/70">{isBuyer ? 'Bought from' : 'Sold to'} <span className="text-white font-medium">{isBuyer ? tx.seller?.username : tx.buyer?.username}</span></span>
                                                </div>
                                                <p className="text-[10px] text-white/20 font-mono">{tx._id.slice(-8)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-white">{tx.amount} EGP</p>
                                                <p className={`text-[10px] capitalize ${txStatusColors[tx.status] || 'text-white/40'}`}>
                                                    {tx.status.replace(/_/g, ' ')}
                                                </p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-white/30 text-sm">No transactions yet</p>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'deposits' && (
                <div className="space-y-6">
                    {/* Deposit Summary */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-green-400">{depApproved?.total || 0} EGP</p>
                            <p className="text-xs text-white/40 mt-1">{depApproved?.count || 0} Approved</p>
                        </div>
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-yellow-400">{depPending?.total || 0} EGP</p>
                            <p className="text-xs text-white/40 mt-1">{depPending?.count || 0} Pending</p>
                        </div>
                    </div>

                    {/* Recent Deposits */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                        <h3 className="text-sm font-medium text-white/40 mb-4">Recent Deposits</h3>
                        {user.deposits.recent.length > 0 ? (
                            <div className="space-y-3">
                                {user.deposits.recent.map(dep => (
                                    <div key={dep._id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-lg font-bold text-white">{dep.amount} EGP</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${depositStatusColors[dep.status] || 'text-white/40 bg-white/5 border-white/10'}`}>
                                                {dep.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-white/30">Method</span>
                                                <p className="text-white/70 capitalize">{dep.paymentMethod?.replace('_', ' ')}</p>
                                            </div>
                                            <div>
                                                <span className="text-white/30">Sender</span>
                                                <p className="text-white/70">{dep.senderFullName}</p>
                                            </div>
                                            <div>
                                                <span className="text-white/30">Phone/Email</span>
                                                <p className="text-white/70 font-mono">{dep.senderPhoneOrEmail}</p>
                                            </div>
                                            <div>
                                                <span className="text-white/30">Date</span>
                                                <p className="text-white/70">{fmtDate(dep.depositDate || dep.createdAt)}</p>
                                            </div>
                                        </div>
                                        {dep.receiptImage && (
                                            <img
                                                src={dep.receiptImage} alt="Receipt"
                                                onClick={() => setImageModal(dep.receiptImage)}
                                                className="mt-3 w-24 h-24 rounded-lg object-cover border border-white/[0.08] cursor-pointer hover:border-cyan-500/30 transition-colors"
                                            />
                                        )}
                                        {dep.adminNote && (
                                            <p className="mt-2 text-xs text-white/40 bg-white/[0.03] rounded-lg p-2">{dep.adminNote}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-white/30 text-sm">No deposits yet</p>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'withdrawals' && (
                <div className="space-y-6">
                    {/* Withdrawal Summary */}
                    {(() => {
                        const wApproved = user.withdrawals.stats.find(s => s._id === 'approved');
                        const wPending = user.withdrawals.stats.find(s => s._id === 'pending');
                        const wRejected = user.withdrawals.stats.find(s => s._id === 'rejected');
                        return (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-green-400">{wApproved?.total || 0} <span className="text-sm font-normal">EGP</span></p>
                                    <p className="text-xs text-white/40 mt-1">{wApproved?.count || 0} Approved</p>
                                </div>
                                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-yellow-400">{wPending?.total || 0} <span className="text-sm font-normal">EGP</span></p>
                                    <p className="text-xs text-white/40 mt-1">{wPending?.count || 0} Pending</p>
                                </div>
                                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-red-400">{wRejected?.total || 0} <span className="text-sm font-normal">EGP</span></p>
                                    <p className="text-xs text-white/40 mt-1">{wRejected?.count || 0} Rejected</p>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Withdrawal List */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                        <h3 className="text-sm font-medium text-white/40 flex items-center gap-2 mb-4">
                            <ArrowUpCircle className="w-4 h-4" /> Withdrawal Requests ({user.withdrawals.recent.length})
                        </h3>
                        {user.withdrawals.recent.length > 0 ? (
                            <div className="space-y-3">
                                {user.withdrawals.recent.map(w => (
                                    <div key={w._id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                                                    <ArrowUpCircle className="w-5 h-5 text-orange-400" />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-bold text-white">{w.amount} EGP</p>
                                                    <p className="text-[10px] text-white/30 font-mono">{w._id.slice(-10)}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${w.status === 'approved' ? 'text-green-400 bg-green-400/10 border-green-400/30'
                                                    : w.status === 'rejected' ? 'text-red-400 bg-red-400/10 border-red-400/30'
                                                        : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
                                                }`}>{w.status.toUpperCase()}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-white/30">Method</span>
                                                <p className="text-white/70 capitalize">{w.method?.replace('_', ' ')}</p>
                                            </div>
                                            <div>
                                                <span className="text-white/30">Phone</span>
                                                <p className="text-white/70 font-mono">{w.countryCode} {w.phoneNumber}</p>
                                            </div>
                                            <div>
                                                <span className="text-white/30">Requested</span>
                                                <p className="text-white/70">{fmtDate(w.createdAt)}</p>
                                            </div>
                                            {w.reviewedAt && (
                                                <div>
                                                    <span className="text-white/30">Reviewed by</span>
                                                    <p className="text-white/70">{w.reviewedBy?.username || '—'} · {fmtDate(w.reviewedAt)}</p>
                                                </div>
                                            )}
                                        </div>
                                        {w.rejectionReason && (
                                            <div className="mt-3 p-2.5 bg-red-500/5 border border-red-500/15 rounded-lg">
                                                <p className="text-red-400 text-xs font-medium mb-0.5">Rejection Reason</p>
                                                <p className="text-white/60 text-xs">{w.rejectionReason}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-white/30 text-sm">No withdrawal requests yet</p>
                        )}
                    </div>
                </div>
            )}

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
