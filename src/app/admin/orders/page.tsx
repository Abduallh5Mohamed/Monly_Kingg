'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';

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

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals'>('deposits');
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'deposits') {
        const res = await fetch('/api/v1/deposits/all?limit=50', { credentials: 'include' });
        const data = await res.json();
        if (data.data) setDeposits(data.data);
      } else {
        const res = await fetch('/api/v1/withdrawals/all?limit=50', { credentials: 'include' });
        const data = await res.json();
        if (data.data) setWithdrawals(data.data);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDeposit = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/v1/deposits/${id}/approve`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (res.ok) {
        fetchData();
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
      const res = await fetch(`/api/v1/deposits/${id}/reject`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by admin' }),
      });
      if (res.ok) {
        fetchData();
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
      const res = await fetch(`/api/v1/withdrawals/${id}/approve`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (res.ok) {
        fetchData();
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
      const res = await fetch(`/api/v1/withdrawals/${id}/reject`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Reject error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingDeposits = deposits.filter(d => d.status === 'pending').length;
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
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Financial Operations</h1>
          <p className="text-white/60">Manage deposits and withdrawals</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
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
      </div>

      {/* Stats Cards */}
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

      {/* Search */}
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
                        {(deposit.amount || deposit.paidAmount || 0).toLocaleString()} LE
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
    </div>
  );
}
