'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ensureCsrfToken } from '@/utils/csrf';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  DollarSign,
  Users,
  Image,
  MapPin,
  Phone,
  Wifi,
  WifiOff,
  Bell,
  Settings,
  Percent,
  TrendingUp,
  CalendarDays,
  Wallet,
  Save,
  Zap,
  ShieldOff,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useSocket } from '@/lib/socket-context';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';

interface Deposit {
  _id: string;
  user: {
    username: string;
    email: string;
    phone?: string;
    profile?: {
      phone?: string;
      province?: string;
    };
  };
  // New fields
  paymentMethod?: string;
  amount?: number;
  senderFullName?: string;
  senderPhoneOrEmail?: string;
  depositDate?: string;
  receiptImage?: string;
  gameTitle?: string;
  // Legacy fields
  accountName?: string;
  walletNumber?: string;
  paidAmount?: number;
  creditedAmount?: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface Withdrawal {
  _id: string;
  user: { username: string; email: string };
  amount: number;
  method: string;
  countryCode?: string;
  phoneNumber?: string;
  accountDetails?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

interface CommissionTransaction {
  _id: string;
  buyer: { username: string } | null;
  seller: { username: string } | null;
  listing: { title: string; price: number } | null;
  amount: number;
  commissionPercent: number;
  commissionAmount: number;
  sellerNetAmount: number;
  payoutStatus: string;
  paidOutAt: string | null;
  status: string;
  createdAt: string;
}

interface CommissionData {
  adminCommissionBalance: number;
  totalCommission: number;
  totalTransactionsWithCommission: number;
  avgCommission: number;
  commissionTrend: { date: string; total: number; count: number }[];
  pendingPayouts: number;
  pendingPayoutsAmount: number;
  currentCommissionPercent: number;
  currentPayoutDelay: number;
  transactions: CommissionTransaction[];
  pagination: { total: number; page: number; limit: number };
}

interface SiteSettingsData {
  commissionPercent: number;
  sellerPayoutDelayDays: number;
  adminCommissionBalance: number;
}

interface ExemptSeller {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  isSeller: boolean;
  commissionExempt: boolean;
  stats?: { totalVolume?: number; successfulTrades?: number };
}

export default function OrdersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals' | 'commission' | 'exemptions' | 'settings'>('deposits');
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAmounts, setEditingAmounts] = useState<{ [id: string]: number }>({});

  // Commission & Settings state
  const [commissionData, setCommissionData] = useState<CommissionData | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettingsData | null>(null);
  const [settingsForm, setSettingsForm] = useState({ commissionPercent: 10, sellerPayoutDelayDays: 7 });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Seller exemptions state
  const [exemptSellers, setExemptSellers] = useState<ExemptSeller[]>([]);
  const [exemptSearch, setExemptSearch] = useState('');
  const [exemptLoading, setExemptLoading] = useState(false);

  // Global socket from SocketProvider
  const { isConnected, on } = useSocket();
  const { toast } = useToast();

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // ─── Real-time socket listeners ────────────────
  useEffect(() => {
    if (!isConnected) return;

    const unsubs: (() => void)[] = [];

    // New deposit arrives → prepend to list + show toast
    unsubs.push(on('new_deposit', (deposit: Deposit) => {
      setDeposits(prev => {
        // Avoid duplicates
        if (prev.some(d => d._id === deposit._id)) return prev;
        return [deposit, ...prev];
      });
      toast({
        title: '💰 New Deposit Request',
        description: `${deposit.user?.username || 'User'} — ${deposit.amount || 0} EGP`,
        duration: 6000,
      });
      // Play notification sound
      try { new Audio('/assets/notification.mp3').play().catch(() => { }); } catch { }
    }));

    // New withdrawal arrives
    unsubs.push(on('new_withdrawal', (withdrawal: Withdrawal) => {
      setWithdrawals(prev => {
        if (prev.some(w => w._id === withdrawal._id)) return prev;
        return [withdrawal, ...prev];
      });
      toast({
        title: '💸 New Withdrawal Request',
        description: `${withdrawal.user?.username || 'User'} — ${withdrawal.amount || 0} EGP`,
        duration: 6000,
      });
      try { new Audio('/assets/notification.mp3').play().catch(() => { }); } catch { }
    }));

    // Deposit status changed (by another admin tab)
    unsubs.push(on('deposit_updated', (deposit: Deposit) => {
      setDeposits(prev => prev.map(d => d._id === deposit._id ? { ...d, ...deposit } : d));
    }));

    // Withdrawal status changed
    unsubs.push(on('withdrawal_updated', (withdrawal: Withdrawal) => {
      setWithdrawals(prev => prev.map(w => w._id === withdrawal._id ? { ...w, ...withdrawal } : w));
    }));

    // Cleanup all listeners on unmount / reconnect
    return () => unsubs.forEach(fn => fn());
  }, [isConnected, on, toast]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'deposits') {
        const res = await fetch('/api/v1/deposits/all?limit=50', { credentials: 'include' });
        const data = await res.json();
        if (data.data) setDeposits(data.data);
      } else if (activeTab === 'withdrawals') {
        const res = await fetch('/api/v1/withdrawals/all?limit=50', { credentials: 'include' });
        const data = await res.json();
        if (data.data) setWithdrawals(data.data);
      } else if (activeTab === 'commission') {
        const res = await fetch('/api/v1/admin/commission?limit=50', { credentials: 'include' });
        const data = await res.json();
        if (data.data) setCommissionData(data.data);
      } else if (activeTab === 'settings') {
        setSettingsLoading(true);
        const res = await fetch('/api/v1/admin/settings', { credentials: 'include' });
        const data = await res.json();
        if (data.data) {
          setSiteSettings(data.data);
          setSettingsForm({
            commissionPercent: data.data.commissionPercent,
            sellerPayoutDelayDays: data.data.sellerPayoutDelayDays,
          });
        }
        setSettingsLoading(false);
      } else if (activeTab === 'exemptions') {
        setExemptLoading(true);
        const res = await fetch(`/api/v1/admin/exempt-sellers?search=${encodeURIComponent(exemptSearch)}`, { credentials: 'include' });
        const data = await res.json();
        if (data.data) setExemptSellers(data.data);
        setExemptLoading(false);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch('/api/v1/admin/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSiteSettings(data.data);
        toast({
          title: 'Settings Saved',
          description: `Commission: ${data.data.commissionPercent}%, Payout Delay: ${data.data.sellerPayoutDelayDays} days`,
          duration: 4000,
        });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to save settings',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Save settings error:', error);
      toast({ title: 'Error', description: 'Failed to save settings', duration: 4000 });
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleApproveDeposit = async (id: string) => {
    setActionLoading(id);
    try {
      const deposit = deposits.find(d => d._id === id);
      const amount = editingAmounts[id] ?? (deposit?.amount || deposit?.paidAmount || 0);

      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/v1/deposits/${id}/approve`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setEditingAmounts(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        // Optimistic update — socket will also fire but this is instant
        setDeposits(prev => prev.map(d => d._id === id ? { ...d, ...data.data } : d));
      }
    } catch (error) {
      console.error('Approve error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectDeposit = async (id: string) => {
    setActionLoading(id);
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/v1/deposits/${id}/reject`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ reason: 'Rejected by admin' }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setDeposits(prev => prev.map(d => d._id === id ? { ...d, ...data.data } : d));
      }
    } catch (error) {
      console.error('Reject error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    setActionLoading(id);
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/v1/withdrawals/${id}/approve`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'X-XSRF-TOKEN': csrfToken,
        },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setWithdrawals(prev => prev.map(w => w._id === id ? { ...w, ...data.data } : w));
      }
    } catch (error) {
      console.error('Approve error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setActionLoading(id);
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/v1/withdrawals/${id}/reject`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setWithdrawals(prev => prev.map(w => w._id === id ? { ...w, ...data.data } : w));
      }
    } catch (error) {
      console.error('Reject error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingDeposits = deposits.filter(d => d.status === 'pending').length;

  // Instant release handler
  const handleInstantRelease = async (txId: string) => {
    if (!confirm('Release funds to seller immediately? This cannot be undone.')) return;
    setActionLoading(txId);
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/v1/admin/transactions/${txId}/instant-release`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-XSRF-TOKEN': csrfToken },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'Payout Released', description: data.message, duration: 4000 });
        fetchData(); // refresh commission data
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to release', duration: 4000 });
      }
    } catch { toast({ title: 'Error', description: 'Network error', duration: 4000 }); }
    finally { setActionLoading(null); }
  };

  // Toggle commission exemption handler
  const handleToggleExempt = async (userId: string) => {
    setActionLoading(userId);
    try {
      const csrfToken = await ensureCsrfToken();
      const res = await fetch(`/api/v1/admin/users/${userId}/commission-exempt`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'X-XSRF-TOKEN': csrfToken },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'Updated', description: data.message, duration: 4000 });
        setExemptSellers(prev => prev.map(s => s._id === userId ? { ...s, commissionExempt: data.data.commissionExempt } : s));
      } else {
        toast({ title: 'Error', description: data.message || 'Failed', duration: 4000 });
      }
    } catch { toast({ title: 'Error', description: 'Network error', duration: 4000 }); }
    finally { setActionLoading(null); }
  };

  // Search exempt sellers
  const handleExemptSearch = () => { fetchData(); };
  const approvedDeposits = deposits.filter(d => d.status === 'approved').length;
  const totalDepositsAmount = deposits.filter(d => d.status === 'approved').reduce((sum, d) => sum + (d.amount || d.paidAmount || d.creditedAmount || 0), 0);

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
  const approvedWithdrawals = withdrawals.filter(w => w.status === 'approved').length;
  const totalWithdrawalsAmount = withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0);

  const filteredDeposits = deposits.filter(d =>
    d.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.walletNumber && d.walletNumber.includes(searchTerm)) ||
    (d.senderFullName && d.senderFullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.senderPhoneOrEmail && d.senderPhoneOrEmail.includes(searchTerm)) ||
    (d.user.phone && d.user.phone.includes(searchTerm)) ||
    (d.user.profile?.phone && d.user.profile.phone.includes(searchTerm))
  );

  const filteredWithdrawals = withdrawals.filter(w =>
    w.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.phoneNumber && w.phoneNumber.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
            Financial Operations
            {/* Real-time connection indicator */}
            {isConnected ? (
              <span className="flex items-center gap-1.5 text-xs font-normal text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                <Wifi className="w-3 h-3 animate-pulse" />
                Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-normal text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                <WifiOff className="w-3 h-3" />
                Connecting...
              </span>
            )}
          </h1>
          <p className="text-white/60">Manage deposits and withdrawals • Real-time updates enabled</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => setActiveTab('deposits')}
          className={`rounded-xl px-6 py-3 font-bold transition-all ${activeTab === 'deposits'
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20'
            : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
        >
          <ArrowUpCircle className="w-4 h-4 mr-2" />
          Deposits
        </Button>
        <Button
          onClick={() => setActiveTab('withdrawals')}
          className={`rounded-xl px-6 py-3 font-bold transition-all ${activeTab === 'withdrawals'
            ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20'
            : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
        >
          <ArrowDownCircle className="w-4 h-4 mr-2" />
          Withdrawals
        </Button>
        <Button
          onClick={() => setActiveTab('commission')}
          className={`rounded-xl px-6 py-3 font-bold transition-all ${activeTab === 'commission'
            ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
            : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          style={{ display: isAdmin ? undefined : 'none' }}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Earned Commission
        </Button>
        <Button
          onClick={() => setActiveTab('settings')}
          className={`rounded-xl px-6 py-3 font-bold transition-all ${activeTab === 'settings'
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
            : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          style={{ display: isAdmin ? undefined : 'none' }}
        >
          <Settings className="w-4 h-4 mr-2" />
          Transaction Settings
        </Button>
        <Button
          onClick={() => setActiveTab('exemptions')}
          className={`rounded-xl px-6 py-3 font-bold transition-all ${activeTab === 'exemptions'
            ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/20'
            : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          style={{ display: isAdmin ? undefined : 'none' }}
        >
          <ShieldOff className="w-4 h-4 mr-2" />
          Seller Exemptions
        </Button>
      </div>

      {/* Stats Cards - Deposits/Withdrawals */}
      {(activeTab === 'deposits' || activeTab === 'withdrawals') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeTab === 'deposits' ? (
            <>
              <Card className="bg-[#131620] border-white/[0.06]">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-yellow-400">{pendingDeposits}</div>
                  <p className="text-white/60 text-sm flex items-center gap-1.5 mt-1">
                    <Clock className="w-4 h-4" />
                    Pending Deposits
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-[#131620] border-white/[0.06]">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-400">{approvedDeposits}</div>
                  <p className="text-white/60 text-sm flex items-center gap-1.5 mt-1">
                    <CheckCircle className="w-4 h-4" />
                    Approved
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-[#131620] border-white/[0.06]">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-400">{deposits.length}</div>
                  <p className="text-white/60 text-sm flex items-center gap-1.5 mt-1">
                    <Users className="w-4 h-4" />
                    Total Deposits
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-[#131620] border-white/[0.06]">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-emerald-400">{totalDepositsAmount.toLocaleString()} LE</div>
                  <p className="text-white/60 text-sm flex items-center gap-1.5 mt-1">
                    <DollarSign className="w-4 h-4" />
                    Total Amount
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="bg-[#131620] border-white/[0.06]">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-yellow-400">{pendingWithdrawals}</div>
                  <p className="text-white/60 text-sm flex items-center gap-1.5 mt-1">
                    <Clock className="w-4 h-4" />
                    Pending Withdrawals
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-[#131620] border-white/[0.06]">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-400">{approvedWithdrawals}</div>
                  <p className="text-white/60 text-sm flex items-center gap-1.5 mt-1">
                    <CheckCircle className="w-4 h-4" />
                    Approved
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-[#131620] border-white/[0.06]">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-400">{withdrawals.length}</div>
                  <p className="text-white/60 text-sm flex items-center gap-1.5 mt-1">
                    <Users className="w-4 h-4" />
                    Total Withdrawals
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-[#131620] border-white/[0.06]">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-orange-400">{totalWithdrawalsAmount.toLocaleString()} LE</div>
                  <p className="text-white/60 text-sm flex items-center gap-1.5 mt-1">
                    <DollarSign className="w-4 h-4" />
                    Total Amount
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Search - only for deposits/withdrawals */}
      {(activeTab === 'deposits' || activeTab === 'withdrawals') && (
        <>
          <Card className="bg-[#131620] border-white/[0.06]">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Search by username, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/[0.06] text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="bg-[#131620] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-white">
                {activeTab === 'deposits' ? 'Deposit Requests' : 'Withdrawal Requests'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              ) : activeTab === 'deposits' ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/60">User Info</TableHead>
                      <TableHead className="text-white/60">Payment Method</TableHead>
                      <TableHead className="text-white/60">Amount</TableHead>
                      <TableHead className="text-white/60">Sender Info</TableHead>
                      <TableHead className="text-white/60">Deposit Date</TableHead>
                      <TableHead className="text-white/60">Game</TableHead>
                      <TableHead className="text-white/60">Receipt</TableHead>
                      <TableHead className="text-white/60">Status</TableHead>
                      <TableHead className="text-white/60">Request Date</TableHead>
                      <TableHead className="text-white/60 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeposits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-white/40 py-8">
                          No deposits found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDeposits.map((deposit) => (
                        <TableRow key={deposit._id} className="border-white/[0.06] hover:bg-white/5">
                          {/* User Info */}
                          <TableCell className="text-white">
                            <div className="space-y-1">
                              <div className="font-medium">{deposit.user.username}</div>
                              <div className="text-xs text-white/40">{deposit.user.email}</div>
                              {(deposit.user.phone || deposit.user.profile?.phone) && (
                                <div className="text-xs text-cyan-400">
                                  📱 {deposit.user.phone || deposit.user.profile?.phone}
                                </div>
                              )}
                              {deposit.user.profile?.province && (
                                <div className="text-xs text-purple-400">
                                  📍 {deposit.user.profile.province}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Payment Method */}
                          <TableCell className="text-white/70">
                            <Badge className={
                              deposit.paymentMethod === 'vodafone_cash'
                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                : deposit.paymentMethod === 'instapay'
                                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                  : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                            }>
                              {deposit.paymentMethod === 'vodafone_cash' ? 'Vodafone Cash' :
                                deposit.paymentMethod === 'instapay' ? 'InstaPay' :
                                  deposit.walletNumber ? 'Legacy' : 'N/A'}
                            </Badge>
                          </TableCell>

                          {/* Amount */}
                          <TableCell className="text-white font-semibold">
                            {deposit.status === 'pending' ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={editingAmounts[deposit._id] ?? (deposit.amount || deposit.paidAmount || 0)}
                                  onChange={(e) => setEditingAmounts({
                                    ...editingAmounts,
                                    [deposit._id]: parseFloat(e.target.value) || 0
                                  })}
                                  className="w-28 bg-white/5 border-cyan-500/30 text-white h-8"
                                  min="500"
                                />
                                <span className="text-white/60">LE</span>
                              </div>
                            ) : (
                              <span>{(deposit.amount || deposit.paidAmount || 0).toLocaleString()} LE</span>
                            )}
                          </TableCell>

                          {/* Sender Info */}
                          <TableCell className="text-white/70">
                            {deposit.senderFullName ? (
                              <div className="space-y-1">
                                <div className="font-medium text-white">{deposit.senderFullName}</div>
                                <div className="text-xs text-cyan-400">{deposit.senderPhoneOrEmail}</div>
                              </div>
                            ) : (
                              <span className="text-white/40">-</span>
                            )}
                          </TableCell>

                          {/* Deposit Date */}
                          <TableCell className="text-white/60 text-sm">
                            {deposit.depositDate
                              ? new Date(deposit.depositDate).toLocaleString()
                              : '-'}
                          </TableCell>

                          {/* Game Title */}
                          <TableCell className="text-white/60 text-sm">
                            {deposit.gameTitle || '-'}
                          </TableCell>

                          {/* Receipt Image */}
                          <TableCell>
                            {deposit.receiptImage ? (
                              <a
                                href={deposit.receiptImage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 text-xs underline"
                              >
                                View Receipt
                              </a>
                            ) : (
                              <span className="text-white/40 text-xs">No receipt</span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge
                              className={
                                deposit.status === 'approved'
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                  : deposit.status === 'pending'
                                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                              }
                            >
                              {deposit.status}
                            </Badge>
                          </TableCell>

                          {/* Request Date */}
                          <TableCell className="text-white/60 text-sm">
                            {new Date(deposit.createdAt).toLocaleString()}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            {deposit.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveDeposit(deposit._id)}
                                  disabled={actionLoading === deposit._id}
                                  className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                                >
                                  {actionLoading === deposit._id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <><CheckCircle className="w-4 h-4 mr-1" /> Approve</>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleRejectDeposit(deposit._id)}
                                  disabled={actionLoading === deposit._id}
                                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                                >
                                  <XCircle className="w-4 h-4 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/60">User</TableHead>
                      <TableHead className="text-white/60">Amount</TableHead>
                      <TableHead className="text-white/60">Method</TableHead>
                      <TableHead className="text-white/60">Phone</TableHead>
                      <TableHead className="text-white/60">Status</TableHead>
                      <TableHead className="text-white/60">Date</TableHead>
                      <TableHead className="text-white/60 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWithdrawals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-white/40 py-8">
                          No withdrawals found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWithdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal._id} className="border-white/[0.06] hover:bg-white/5">
                          <TableCell className="text-white">
                            <div>
                              <div className="font-medium">{withdrawal.user.username}</div>
                              <div className="text-xs text-white/40">{withdrawal.user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-white font-semibold">{withdrawal.amount} LE</TableCell>
                          <TableCell className="text-white/70 capitalize">{withdrawal.method.replace('_', ' ')}</TableCell>
                          <TableCell className="text-white/70">
                            {withdrawal.phoneNumber ? `${withdrawal.countryCode} ${withdrawal.phoneNumber}` : withdrawal.accountDetails}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                withdrawal.status === 'approved'
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                  : withdrawal.status === 'pending'
                                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                              }
                            >
                              {withdrawal.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white/60 text-sm">
                            {new Date(withdrawal.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {withdrawal.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveWithdrawal(withdrawal._id)}
                                  disabled={actionLoading === withdrawal._id}
                                  className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                                >
                                  {actionLoading === withdrawal._id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <><CheckCircle className="w-4 h-4 mr-1" /> Approve</>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleRejectWithdrawal(withdrawal._id)}
                                  disabled={actionLoading === withdrawal._id}
                                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                                >
                                  <XCircle className="w-4 h-4 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════════════ COMMISSION TAB ═══════════════════════ */}
      {activeTab === 'commission' && (
        <>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : commissionData ? (
            <>
              {/* Commission Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-[#131620] border-white/[0.06]">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-purple-400">
                      {commissionData.adminCommissionBalance.toLocaleString()} LE
                    </div>
                    <p className="text-white/60 text-sm flex items-center gap-1.5 mt-1">
                      <Wallet className="w-4 h-4" />
                      Admin Commission Balance
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-[#131620] border-white/[0.06]">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-400">
                      {commissionData.totalCommission.toLocaleString()} LE
                    </div>
                    <p className="text-white/60 text-sm flex items-center gap-1.5 mt-1">
                      <TrendingUp className="w-4 h-4" />
                      Total Commission Earned
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-[#131620] border-white/[0.06]">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-cyan-400">
                      {commissionData.totalTransactionsWithCommission}
                    </div>
                    <p className="text-white/60 text-sm flex items-center gap-1.5 mt-1">
                      <DollarSign className="w-4 h-4" />
                      Transactions with Commission
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-[#131620] border-white/[0.06]">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-400">
                      {commissionData.pendingPayouts} ({commissionData.pendingPayoutsAmount.toLocaleString()} LE)
                    </div>
                    <p className="text-white/60 text-sm flex items-center gap-1.5 mt-1">
                      <Clock className="w-4 h-4" />
                      Pending Payouts
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Commission Trend (last 7 days) */}
              <Card className="bg-[#131620] border-white/[0.06]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    Commission Trend (Last 7 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2">
                    {commissionData.commissionTrend.map((day) => (
                      <div key={day.date} className="text-center">
                        <div className="text-xs text-white/40 mb-1">
                          {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                        </div>
                        <div className="bg-purple-500/10 rounded-lg p-2 border border-purple-500/20">
                          <div className="text-sm font-bold text-purple-400">
                            {day.total.toLocaleString()}
                          </div>
                          <div className="text-xs text-white/40">{day.count} tx</div>
                        </div>
                        <div className="text-xs text-white/30 mt-1">{day.date.slice(5)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Commission Transactions Table */}
              <Card className="bg-[#131620] border-white/[0.06]">
                <CardHeader>
                  <CardTitle className="text-white">Commission Transactions</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-white/60">Transaction</TableHead>
                        <TableHead className="text-white/60">Buyer</TableHead>
                        <TableHead className="text-white/60">Seller</TableHead>
                        <TableHead className="text-white/60">Amount</TableHead>
                        <TableHead className="text-white/60">Commission %</TableHead>
                        <TableHead className="text-white/60">Commission</TableHead>
                        <TableHead className="text-white/60">Seller Net</TableHead>
                        <TableHead className="text-white/60">Payout Status</TableHead>
                        <TableHead className="text-white/60">Date</TableHead>
                        <TableHead className="text-white/60 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissionData.transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center text-white/40 py-8">
                            No commission transactions yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        commissionData.transactions.map((tx) => (
                          <TableRow key={tx._id} className="border-white/[0.06] hover:bg-white/5">
                            <TableCell className="text-white/70 text-xs font-mono">
                              {tx.listing?.title || 'N/A'}
                            </TableCell>
                            <TableCell className="text-white">{tx.buyer?.username || 'N/A'}</TableCell>
                            <TableCell className="text-white">{tx.seller?.username || 'N/A'}</TableCell>
                            <TableCell className="text-white font-semibold">{tx.amount} LE</TableCell>
                            <TableCell>
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                {tx.commissionPercent}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-green-400 font-semibold">+{tx.commissionAmount} LE</TableCell>
                            <TableCell className="text-white/70">{tx.sellerNetAmount} LE</TableCell>
                            <TableCell>
                              <Badge className={
                                tx.payoutStatus === 'paid_out'
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                  : tx.payoutStatus === 'pending_payout'
                                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                              }>
                                {tx.payoutStatus === 'paid_out' ? 'Paid Out' :
                                  tx.payoutStatus === 'pending_payout' ? 'Pending' : tx.payoutStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white/60 text-sm">
                              {new Date(tx.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {tx.payoutStatus === 'pending_payout' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleInstantRelease(tx._id)}
                                  disabled={actionLoading === tx._id}
                                  className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
                                >
                                  {actionLoading === tx._id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <><Zap className="w-4 h-4 mr-1" /> Instant Release</>
                                  )}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-[#131620] border-white/[0.06]">
              <CardContent className="py-16 text-center text-white/40">
                No commission data available
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══════════════════════ SETTINGS TAB ═══════════════════════ */}
      {activeTab === 'settings' && (
        <>
          {settingsLoading || loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Commission Settings */}
              <Card className="bg-[#131620] border-white/[0.06]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Percent className="w-5 h-5 text-purple-400" />
                    Commission Rate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-white/60 text-sm">
                    Percentage deducted from each completed sale as platform commission.
                    The commission is deducted from the transaction amount before the seller receives payment.
                  </p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={settingsForm.commissionPercent}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        commissionPercent: parseFloat(e.target.value) || 0,
                      }))}
                      className="w-32 bg-white/5 border-white/[0.06] text-white text-lg font-bold"
                    />
                    <span className="text-white/60 text-lg font-bold">%</span>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                    <p className="text-purple-300 text-sm">
                      Example: For a 100 LE sale with {settingsForm.commissionPercent}% commission:
                    </p>
                    <p className="text-white text-sm mt-1">
                      Platform earns: <span className="font-bold text-green-400">{(100 * settingsForm.commissionPercent / 100).toFixed(2)} LE</span>
                      {' '}| Seller receives: <span className="font-bold text-cyan-400">{(100 - 100 * settingsForm.commissionPercent / 100).toFixed(2)} LE</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Payout Delay Settings */}
              <Card className="bg-[#131620] border-white/[0.06]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-cyan-400" />
                    Seller Payout Delay
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-white/60 text-sm">
                    Number of days to hold seller&apos;s payment after a transaction is confirmed.
                    The seller will receive their funds after this waiting period.
                    Set to 0 for instant payout.
                  </p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      max={90}
                      value={settingsForm.sellerPayoutDelayDays}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        sellerPayoutDelayDays: parseInt(e.target.value) || 0,
                      }))}
                      className="w-32 bg-white/5 border-white/[0.06] text-white text-lg font-bold"
                    />
                    <span className="text-white/60 text-lg font-bold">Days</span>
                  </div>
                  <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/20">
                    <p className="text-cyan-300 text-sm">
                      {settingsForm.sellerPayoutDelayDays === 0
                        ? 'Sellers will receive instant payment after buyer confirmation.'
                        : `Sellers will receive their funds ${settingsForm.sellerPayoutDelayDays} day${settingsForm.sellerPayoutDelayDays > 1 ? 's' : ''} after buyer confirmation.`
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Current Balance Info */}
              {siteSettings && (
                <Card className="bg-[#131620] border-white/[0.06] lg:col-span-2">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm">Admin Commission Balance</p>
                        <p className="text-3xl font-bold text-purple-400 mt-1">
                          {siteSettings.adminCommissionBalance.toLocaleString()} LE
                        </p>
                      </div>
                      <div className="text-right text-white/40 text-sm">
                        Current: {siteSettings.commissionPercent}% commission, {siteSettings.sellerPayoutDelayDays} day delay
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Save Button */}
              <div className="lg:col-span-2 flex justify-end">
                <Button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all"
                >
                  {settingsSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════ SELLER EXEMPTIONS TAB ═══════════════════════ */}
      {activeTab === 'exemptions' && (
        <>
          {/* Search */}
          <Card className="bg-[#131620] border-white/[0.06]">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="Search sellers by username or email..."
                    value={exemptSearch}
                    onChange={(e) => setExemptSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleExemptSearch()}
                    className="pl-10 bg-white/5 border-white/[0.06] text-white"
                  />
                </div>
                <Button onClick={handleExemptSearch} className="bg-white/10 hover:bg-white/15 text-white">
                  <Search className="w-4 h-4 mr-2" /> Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-[#131620] border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <ShieldOff className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Commission Exemptions</h3>
                  <p className="text-white/60 text-sm">
                    Exempt sellers will receive 100% of the sale amount with no commission deducted.
                    Toggle the shield icon to enable/disable exemption for each seller.
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <span className="text-amber-400 text-sm font-medium">
                      {exemptSellers.filter(s => s.commissionExempt).length} exempt seller(s)
                    </span>
                    <span className="text-white/40 text-sm">
                      {exemptSellers.length} total sellers shown
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sellers Table */}
          <Card className="bg-[#131620] border-white/[0.06]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                Sellers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {exemptLoading || loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/60">Seller</TableHead>
                      <TableHead className="text-white/60">Email</TableHead>
                      <TableHead className="text-white/60">Total Volume</TableHead>
                      <TableHead className="text-white/60">Trades</TableHead>
                      <TableHead className="text-white/60">Status</TableHead>
                      <TableHead className="text-white/60 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exemptSellers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-white/40 py-8">
                          {exemptSearch ? 'No sellers match your search' : 'No sellers found. Try searching.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      exemptSellers.map((seller) => (
                        <TableRow key={seller._id} className="border-white/[0.06] hover:bg-white/5">
                          <TableCell className="text-white">
                            <div className="flex items-center gap-2">
                              {seller.avatar ? (
                                <img src={seller.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 text-xs font-bold">
                                  {seller.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="font-medium">{seller.username}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-white/60 text-sm">{seller.email}</TableCell>
                          <TableCell className="text-white/70 font-medium">
                            {(seller.stats?.totalVolume || 0).toLocaleString()} LE
                          </TableCell>
                          <TableCell className="text-white/70">
                            {seller.stats?.successfulTrades || 0}
                          </TableCell>
                          <TableCell>
                            {seller.commissionExempt ? (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                <ShieldOff className="w-3 h-3 mr-1" /> Exempt
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                                <Percent className="w-3 h-3 mr-1" /> Normal
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleToggleExempt(seller._id)}
                              disabled={actionLoading === seller._id}
                              className={seller.commissionExempt
                                ? 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 border border-gray-500/30'
                                : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
                              }
                            >
                              {actionLoading === seller._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : seller.commissionExempt ? (
                                <><ShieldCheck className="w-4 h-4 mr-1" /> Remove Exemption</>
                              ) : (
                                <><ShieldOff className="w-4 h-4 mr-1" /> Make Exempt</>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
