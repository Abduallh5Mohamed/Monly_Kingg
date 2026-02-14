'use client';

import { useState, useEffect } from 'react';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import {
  CheckCircle2, Upload, X, Calendar, CreditCard, FileText, Clock, DollarSign,
  Users, XCircle, Loader2, Wallet, ArrowDownToLine, Smartphone, ChevronLeft,
  ChevronRight, Plus, AlertCircle, Phone, Globe, ArrowDownCircle, ArrowUpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Deposit {
  _id: string;
  amount: number;
  paymentMethod: string;
  senderFullName?: string;
  senderPhoneOrEmail?: string;
  depositDate?: string;
  gameTitle?: string;
  receiptImage?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface Withdrawal {
  _id: string;
  amount: number;
  method: string;
  countryCode?: string;
  phoneNumber?: string;
  accountDetails?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

const methodLabels: Record<string, { label: string; icon: any; color: string }> = {
  vodafone_cash: { label: 'Vodafone Cash', icon: Smartphone, color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  instapay: { label: 'InstaPay', icon: CreditCard, color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
};

const statusConfig: Record<string, { icon: any; label: string; color: string }> = {
  pending: { icon: Clock, label: 'Pending', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  approved: { icon: CheckCircle2, label: 'Approved', color: 'text-green-400 bg-green-400/10 border-green-400/30' },
  rejected: { icon: XCircle, label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/30' },
};

const countryCodes = [
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+962', country: 'Jordan', flag: '🇯🇴' },
  { code: '+961', country: 'Lebanon', flag: '🇱🇧' },
  { code: '+963', country: 'Syria', flag: '🇸🇾' },
  { code: '+964', country: 'Iraq', flag: '🇮🇶' },
  { code: '+967', country: 'Yemen', flag: '🇾🇪' },
  { code: '+970', country: 'Palestine', flag: '🇵🇸' },
  { code: '+212', country: 'Morocco', flag: '🇲🇦' },
  { code: '+213', country: 'Algeria', flag: '🇩🇿' },
  { code: '+216', country: 'Tunisia', flag: '🇹🇳' },
  { code: '+218', country: 'Libya', flag: '🇱🇾' },
  { code: '+249', country: 'Sudan', flag: '🇸🇩' },
];

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  // Deposit states
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);

  // Deposit Form state
  const [depositPaymentMethod, setDepositPaymentMethod] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSenderFullName, setDepositSenderFullName] = useState('');
  const [depositSenderPhoneOrEmail, setDepositSenderPhoneOrEmail] = useState('');
  const [depositDate, setDepositDate] = useState('');
  const [depositGameTitle, setDepositGameTitle] = useState('');
  const [depositReceiptImage, setDepositReceiptImage] = useState<File | null>(null);
  const [depositReceiptPreview, setDepositReceiptPreview] = useState<string>('');
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [showDepositSuccessModal, setShowDepositSuccessModal] = useState(false);
  const [showDepositErrorModal, setShowDepositErrorModal] = useState(false);
  const [depositErrorMessage, setDepositErrorMessage] = useState('');

  // Withdraw states
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [withdrawTotalPages, setWithdrawTotalPages] = useState(1);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [withdrawCountryCode, setWithdrawCountryCode] = useState('+20');
  const [withdrawPhoneNumber, setWithdrawPhoneNumber] = useState('');

  // Fetch deposits from database
  useEffect(() => {
    if (activeTab === 'deposit') {
      fetchDeposits();
      const interval = setInterval(fetchDeposits, 15000);
      const handleDataUpdate = () => fetchDeposits();
      window.addEventListener('userDataUpdated', handleDataUpdate);
      return () => {
        clearInterval(interval);
        window.removeEventListener('userDataUpdated', handleDataUpdate);
      };
    }
  }, [activeTab]);

  // Fetch withdrawals from database
  useEffect(() => {
    if (activeTab === 'withdraw') {
      fetchWithdrawals();
    }
  }, [activeTab, withdrawPage]);

  const fetchDeposits = async () => {
    setDepositsLoading(true);
    try {
      const response = await fetch('/api/v1/deposits/my-requests?limit=50', {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok && data.data) {
        setDeposits(data.data);
      }
    } catch (error) {
      console.error('Error fetching deposits:', error);
    } finally {
      setDepositsLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    setWithdrawalsLoading(true);
    try {
      const res = await fetch(`/api/v1/withdrawals/my-requests?page=${withdrawPage}&limit=10`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.data) {
        setWithdrawals(data.data);
        setWithdrawTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  const handleDepositFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDepositReceiptImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDepositReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDepositRemoveImage = () => {
    setDepositReceiptImage(null);
    setDepositReceiptPreview('');
  };

  const handleDepositSubmit = async () => {
    setDepositError('');

    // Validate required fields
    if (!depositPaymentMethod || !depositAmount || !depositSenderFullName || !depositSenderPhoneOrEmail || !depositDate || !depositReceiptImage) {
      setDepositError('All fields are required (payment method, amount, sender name, sender phone/email, deposit date, and receipt image)');
      return;
    }

    if (Number(depositAmount) < 100) {
      setDepositError('Minimum deposit amount is 100 LE');
      return;
    }

    setDepositSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('paymentMethod', depositPaymentMethod);
      formData.append('amount', depositAmount);
      formData.append('senderFullName', depositSenderFullName);
      formData.append('senderPhoneOrEmail', depositSenderPhoneOrEmail);
      formData.append('depositDate', depositDate);
      if (depositGameTitle) {
        formData.append('gameTitle', depositGameTitle);
      }
      formData.append('receipt', depositReceiptImage);

      const response = await fetch('/api/v1/deposits/request', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setShowDepositSuccessModal(true);
        setShowDepositModal(false);
        resetDepositForm();
        setTimeout(() => {
          setShowDepositSuccessModal(false);
          fetchDeposits();
          window.dispatchEvent(new Event('userDataUpdated'));
        }, 2500);
      } else {
        setDepositErrorMessage(data.message || 'Failed to submit deposit request');
        setShowDepositErrorModal(true);
        setTimeout(() => {
          setShowDepositErrorModal(false);
        }, 2500);
      }
    } catch (error) {
      console.error('Error submitting deposit:', error);
      setDepositErrorMessage('Network error, please try again');
      setShowDepositErrorModal(true);
      setTimeout(() => {
        setShowDepositErrorModal(false);
      }, 2500);
    } finally {
      setDepositSubmitting(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');

    if (!withdrawAmount || !withdrawMethod || !withdrawCountryCode || !withdrawPhoneNumber) {
      setWithdrawError('All fields are required');
      return;
    }
    if (Number(withdrawAmount) < 500) {
      setWithdrawError('Minimum withdrawal amount is 500 LE');
      return;
    }
    if (!/^\d{11}$/.test(withdrawPhoneNumber)) {
      setWithdrawError('Phone number must be exactly 11 digits');
      return;
    }

    setWithdrawSubmitting(true);
    try {
      const res = await fetch('/api/v1/withdrawals/request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(withdrawAmount),
          method: withdrawMethod,
          countryCode: withdrawCountryCode,
          phoneNumber: withdrawPhoneNumber,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setWithdrawSuccess('Withdrawal request submitted successfully!');
        setShowWithdrawForm(false);
        resetWithdrawForm();
        setTimeout(() => {
          setWithdrawSuccess('');
          fetchWithdrawals();
        }, 3000);
      } else {
        setWithdrawError(data.message || 'Failed to submit request');
      }
    } catch (err) {
      setWithdrawError('Network error, please try again');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const resetDepositForm = () => {
    setDepositPaymentMethod('');
    setDepositAmount('');
    setDepositSenderFullName('');
    setDepositSenderPhoneOrEmail('');
    setDepositDate('');
    setDepositGameTitle('');
    setDepositReceiptImage(null);
    setDepositReceiptPreview('');
    setDepositError('');
  };

  const resetWithdrawForm = () => {
    setWithdrawAmount('');
    setWithdrawMethod('');
    setWithdrawCountryCode('+20');
    setWithdrawPhoneNumber('');
    setWithdrawError('');
  };

  return (
    <UserDashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e14] via-[#1a1f2e] to-[#0f1419] p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#f5f5dc] mb-2">
            💰 Payment Center
          </h1>
          <p className="text-gray-400">Manage your deposits and withdrawals</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'deposit'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 scale-105'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
              }`}
          >
            <ArrowDownCircle className="w-5 h-5" />
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'withdraw'
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 scale-105'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
              }`}
          >
            <ArrowUpCircle className="w-5 h-5" />
            Withdraw
          </button>
        </div>

        {/* Deposit Tab Content */}
        {activeTab === 'deposit' && (
          <div className="space-y-6">
            {/* New Deposit Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => setShowDepositModal(true)}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/30 transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Deposit
              </Button>
            </div>

            {/* Deposits List */}
            {depositsLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : deposits.length === 0 ? (
              <div className="bg-gradient-to-br from-[#1a1d2e]/90 to-[#252841]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
                <ArrowDownCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#f5f5dc] mb-2">No Deposits Yet</h3>
                <p className="text-gray-400 mb-6">You haven't submitted any deposit requests yet.</p>
                <Button
                  onClick={() => setShowDepositModal(true)}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Your First Deposit
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {deposits.map((deposit) => {
                  const StatusIcon = statusConfig[deposit.status].icon;
                  const statusStyle = statusConfig[deposit.status].color;

                  return (
                    <div
                      key={deposit._id}
                      className="bg-gradient-to-br from-[#1a1d2e]/90 to-[#252841]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-cyan-500/30 transition-all duration-300 shadow-xl"
                    >
                      {/* Deposit Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusStyle}`}>
                            <StatusIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusStyle}`}>
                                {statusConfig[deposit.status].label}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-[#f5f5dc]">
                              {deposit.gameTitle || 'Deposit Request'}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {deposit.paymentMethod === 'vodafone_cash' ? '💳 Vodafone Cash' : '⚡ InstaPay'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Deposit Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pl-15">
                        {deposit.senderFullName && (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">
                              Sender: <span className="text-[#f5f5dc]">{deposit.senderFullName}</span>
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400">
                            {new Date(deposit.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {deposit.depositDate && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">
                              Deposit: {new Date(deposit.depositDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="flex items-center gap-2 pl-15">
                        <span className="text-gray-400 text-sm">Amount:</span>
                        <span className="text-2xl font-bold text-cyan-400">
                          {deposit.amount.toLocaleString()} LE
                        </span>
                      </div>

                      {/* Receipt Image */}
                      {deposit.receiptImage && (
                        <div className="mt-4 pl-15">
                          <p className="text-sm text-gray-400 mb-2 font-medium">RECEIPT IMAGE</p>
                          <div className="inline-block">
                            <div className="relative group">
                              <a
                                href={deposit.receiptImage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-32 h-40 bg-white/5 rounded-lg border border-white/10 overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-all"
                              >
                                <img
                                  src={deposit.receiptImage}
                                  alt="Receipt"
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Withdraw Tab Content */}
        {activeTab === 'withdraw' && (
          <div className="space-y-6">
            {/* Success Message */}
            {withdrawSuccess && (
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-400">{withdrawSuccess}</p>
              </div>
            )}

            {/* Error Message */}
            {withdrawError && (
              <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{withdrawError}</p>
              </div>
            )}

            {/* New Request Button / Form Toggle */}
            <div className="flex justify-end">
              <Button
                onClick={() => setShowWithdrawForm(!showWithdrawForm)}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/30 transition-all"
              >
                {showWithdrawForm ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    New Request
                  </>
                )}
              </Button>
            </div>

            {/* Withdraw Form (Inline) */}
            {showWithdrawForm && (
              <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-[#f5f5dc] mb-6 flex items-center gap-2">
                  <ArrowUpCircle className="w-6 h-6 text-emerald-400" />
                  New Withdrawal Request
                </h3>
                <form onSubmit={handleWithdrawSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-semibold text-[#f5f5dc] mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        Amount (LE) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="Enter amount"
                        min="500"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#f5f5dc] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder-gray-500 text-base"
                      />
                      <p className="text-xs text-gray-400 mt-1.5 ml-1">⚠️ Minimum: 500 LE</p>
                    </div>

                    {/* Method */}
                    <div>
                      <label className="block text-sm font-semibold text-[#f5f5dc] mb-2 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-400" />
                        Payment Method <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={withdrawMethod}
                        onChange={(e) => setWithdrawMethod(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#f5f5dc] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-base"
                      >
                        <option value="" className="bg-[#1a1d2e] text-gray-400">-- Select Method --</option>
                        <option value="vodafone_cash" className="bg-[#1a1d2e] text-[#f5f5dc]">📱 Vodafone Cash</option>
                        <option value="instapay" className="bg-[#1a1d2e] text-[#f5f5dc]">⚡ InstaPay</option>
                      </select>
                    </div>

                    {/* Country Code */}
                    <div>
                      <label className="block text-sm font-semibold text-[#f5f5dc] mb-2 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-400" />
                        Country Code <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={withdrawCountryCode}
                        onChange={(e) => setWithdrawCountryCode(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#f5f5dc] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-base"
                      >
                        {countryCodes.map((country) => (
                          <option key={country.code} value={country.code} className="bg-[#1a1d2e] text-[#f5f5dc]">
                            {country.flag} {country.code} ({country.country})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-sm font-semibold text-[#f5f5dc] mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-emerald-400" />
                        Phone Number <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={withdrawPhoneNumber}
                        onChange={(e) => setWithdrawPhoneNumber(e.target.value)}
                        placeholder="11 digits"
                        maxLength={11}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#f5f5dc] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder-gray-500 text-base"
                      />
                      <p className="text-xs text-gray-400 mt-1.5 ml-1">📱 Must be exactly 11 digits</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowWithdrawForm(false);
                        resetWithdrawForm();
                      }}
                      variant="outline"
                      className="border-white/10 text-gray-300 hover:bg-white/5"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={withdrawSubmitting}
                      className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/30"
                    >
                      {withdrawSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Submit Request
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Withdrawals List */}
            {withdrawalsLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="bg-gradient-to-br from-[#1a1d2e]/90 to-[#252841]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
                <ArrowUpCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#f5f5dc] mb-2">No Withdrawals Yet</h3>
                <p className="text-gray-400 mb-6">You haven't submitted any withdrawal requests yet.</p>
                <Button
                  onClick={() => setShowWithdrawForm(true)}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Your First Withdrawal
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {withdrawals.map((withdrawal) => {
                  const StatusIcon = statusConfig[withdrawal.status].icon;
                  const statusStyle = statusConfig[withdrawal.status].color;
                  const MethodInfo = withdrawal.method ? methodLabels[withdrawal.method] : null;
                  const MethodIcon = MethodInfo?.icon || Wallet;

                  return (
                    <div
                      key={withdrawal._id}
                      className="bg-gradient-to-br from-[#1a1d2e]/90 to-[#252841]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300 shadow-xl"
                    >
                      {/* Withdrawal Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusStyle}`}>
                            <StatusIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusStyle}`}>
                                {statusConfig[withdrawal.status].label}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-[#f5f5dc]">
                              Withdrawal Request
                            </h3>
                            <p className="text-sm text-gray-400 flex items-center gap-1">
                              <MethodIcon className="w-4 h-4" />
                              {MethodInfo?.label || withdrawal.method}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Withdrawal Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pl-15">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400">
                            {new Date(withdrawal.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {withdrawal.phoneNumber && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">
                              {withdrawal.countryCode} {withdrawal.phoneNumber}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="flex items-center gap-2 pl-15 mb-3">
                        <span className="text-gray-400 text-sm">Amount:</span>
                        <span className="text-2xl font-bold text-emerald-400">
                          {withdrawal.amount.toLocaleString()} LE
                        </span>
                      </div>

                      {/* Rejection Reason */}
                      {withdrawal.status === 'rejected' && withdrawal.rejectionReason && (
                        <div className="mt-4 pl-15 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <p className="text-sm font-semibold text-red-400 mb-1">Rejection Reason:</p>
                          <p className="text-sm text-gray-300">{withdrawal.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Pagination */}
                {withdrawTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <Button
                      onClick={() => setWithdrawPage((p) => Math.max(1, p - 1))}
                      disabled={withdrawPage === 1}
                      variant="outline"
                      className="border-white/10 text-gray-300 hover:bg-white/5 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-gray-400 text-sm">
                      Page {withdrawPage} of {withdrawTotalPages}
                    </span>
                    <Button
                      onClick={() => setWithdrawPage((p) => Math.min(withdrawTotalPages, p + 1))}
                      disabled={withdrawPage >= withdrawTotalPages}
                      variant="outline"
                      className="border-white/10 text-gray-300 hover:bg-white/5 disabled:opacity-30"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Deposit Modal */}
        {showDepositModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-[#1a1d2e] to-[#252841] border border-white/10 rounded-2xl max-w-4xl w-full shadow-2xl my-8">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <ArrowDownCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#f5f5dc]">Deposit Request</h2>
                    <p className="text-sm text-gray-400">Submit your payment details</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDepositModal(false);
                    resetDepositForm();
                  }}
                  className="text-gray-400 hover:text-[#f5f5dc] hover:bg-white/5 rounded-lg p-2 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Payment Method */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-[#f5f5dc] mb-2 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-cyan-400" />
                      Payment Method <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={depositPaymentMethod}
                      onChange={(e) => setDepositPaymentMethod(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#f5f5dc] focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all text-base"
                    >
                      <option value="" className="bg-[#1a1d2e] text-gray-400">-- Select Payment Method --</option>
                      <option value="vodafone_cash" className="bg-[#1a1d2e] text-[#f5f5dc]">💳 Vodafone Cash</option>
                      <option value="instapay" className="bg-[#1a1d2e] text-[#f5f5dc]">⚡ InstaPay</option>
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-semibold text-[#f5f5dc] mb-2 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-cyan-400" />
                      Amount (LE) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Enter amount"
                      min="100"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#f5f5dc] focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all placeholder-gray-500 text-base"
                    />
                    <p className="text-xs text-gray-400 mt-1.5 ml-1">⚠️ Minimum: 100 LE</p>
                  </div>

                  {/* Game Title (Optional) */}
                  <div>
                    <label className="block text-sm font-semibold text-[#f5f5dc] mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                      Game Title (Optional)
                    </label>
                    <select
                      value={depositGameTitle}
                      onChange={(e) => setDepositGameTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#f5f5dc] focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all text-base"
                    >
                      <option value="" className="bg-[#1a1d2e] text-gray-400">-- Not Specified --</option>
                      <option value="PUBG Mobile" className="bg-[#1a1d2e] text-[#f5f5dc]">🎮 PUBG Mobile</option>
                      <option value="FIFA 23" className="bg-[#1a1d2e] text-[#f5f5dc]">⚽ FIFA 23</option>
                      <option value="Call of Duty Mobile" className="bg-[#1a1d2e] text-[#f5f5dc]">🔫 Call of Duty Mobile</option>
                      <option value="Valorant" className="bg-[#1a1d2e] text-[#f5f5dc]">🎯 Valorant</option>
                      <option value="League of Legends" className="bg-[#1a1d2e] text-[#f5f5dc]">🏆 League of Legends</option>
                      <option value="Fortnite" className="bg-[#1a1d2e] text-[#f5f5dc]">🎪 Fortnite</option>
                      <option value="Apex Legends" className="bg-[#1a1d2e] text-[#f5f5dc]">🎲 Apex Legends</option>
                    </select>
                  </div>

                  {/* Sender Full Name */}
                  <div>
                    <label className="block text-sm font-semibold text-[#f5f5dc] mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      Sender Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={depositSenderFullName}
                      onChange={(e) => setDepositSenderFullName(e.target.value)}
                      placeholder="Full name of wallet owner"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#f5f5dc] focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder-gray-500 text-base"
                    />
                  </div>

                  {/* Sender Phone or Email */}
                  <div>
                    <label className="block text-sm font-semibold text-[#f5f5dc] mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-orange-400" />
                      Sender Phone/Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={depositSenderPhoneOrEmail}
                      onChange={(e) => setDepositSenderPhoneOrEmail(e.target.value)}
                      placeholder="Phone or email used for transfer"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#f5f5dc] focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all placeholder-gray-500 text-base"
                    />
                    <p className="text-xs text-gray-400 mt-1.5 ml-1">📱 Phone or email you used to send payment</p>
                  </div>

                  {/* Deposit Date */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-[#f5f5dc] mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-pink-400" />
                      Deposit Date & Time <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={depositDate}
                      onChange={(e) => setDepositDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#f5f5dc] focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 focus:outline-none transition-all text-base"
                    />
                  </div>

                  {/* Receipt Upload */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-[#f5f5dc] mb-2 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-yellow-400" />
                      Receipt Image <span className="text-red-400">*</span>
                    </label>

                    {!depositReceiptPreview ? (
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center hover:border-cyan-500/50 hover:bg-white/5 transition-all cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDepositFileChange}
                          className="hidden"
                          id="deposit-receipt-upload"
                        />
                        <label htmlFor="deposit-receipt-upload" className="cursor-pointer">
                          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-cyan-400" />
                          </div>
                          <p className="text-[#f5f5dc] font-semibold text-lg mb-2">
                            Click to upload receipt image
                          </p>
                          <p className="text-sm text-gray-400">
                            PNG, JPG, JPEG • Max 10MB
                          </p>
                        </label>
                      </div>
                    ) : (
                      <div className="relative group">
                        <img
                          src={depositReceiptPreview}
                          alt="Receipt preview"
                          className="w-full h-80 object-contain bg-white/5 rounded-xl border border-white/10 p-4"
                        />
                        <button
                          type="button"
                          onClick={handleDepositRemoveImage}
                          className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-lg transition-all shadow-lg opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg p-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-cyan-400 text-sm font-medium">✓ Image uploaded successfully</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error Message */}
                  {depositError && (
                    <div className="md:col-span-2 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-400">{depositError}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between gap-3 p-6 border-t border-white/10 bg-white/[0.02]">
                <p className="text-xs text-gray-400">
                  All fields marked with <span className="text-red-400">*</span> are required
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDepositModal(false);
                      resetDepositForm();
                    }}
                    className="border-white/10 text-gray-300 hover:bg-white/5 px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDepositSubmit}
                    disabled={!depositPaymentMethod || !depositAmount || !depositSenderFullName || !depositSenderPhoneOrEmail || !depositDate || !depositReceiptImage || depositSubmitting}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed px-8"
                  >
                    {depositSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Success Modal */}
        {showDepositSuccessModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300" />

            {/* Modal Content */}
            <div className="relative z-10 animate-in zoom-in duration-500">
              <div className="bg-gradient-to-br from-[#1a1d2e] to-[#252841] border border-cyan-500/30 rounded-3xl p-8 shadow-2xl shadow-cyan-500/20 min-w-[320px] text-center">
                {/* Animated Check Icon */}
                <div className="mb-6 relative">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-4 border-cyan-500/50 flex items-center justify-center animate-in zoom-in-75 duration-700 delay-150">
                    <CheckCircle2 className="w-12 h-12 text-cyan-400 animate-in zoom-in-50 duration-500 delay-300" strokeWidth={3} />
                  </div>
                  {/* Outer ring animation */}
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-500/30 animate-ping" style={{ animationDuration: '1.5s' }} />
                </div>

                {/* Success Text */}
                <h3 className="text-2xl font-bold text-white mb-3 animate-in slide-in-from-bottom-2 duration-500 delay-200">
                  Success!
                </h3>
                <p className="text-gray-300 mb-2 animate-in slide-in-from-bottom-2 duration-500 delay-300">
                  Deposit request submitted successfully
                </p>
                <p className="text-sm text-gray-400 animate-in slide-in-from-bottom-2 duration-500 delay-400">
                  Admin will review it soon
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Error Modal */}
        {showDepositErrorModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300" />

            {/* Modal Content */}
            <div className="relative z-10 animate-in zoom-in duration-500">
              <div className="bg-gradient-to-br from-[#1a1d2e] to-[#252841] border border-red-500/30 rounded-3xl p-8 shadow-2xl shadow-red-500/20 min-w-[320px] text-center">
                {/* Animated X Icon */}
                <div className="mb-6 relative">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-red-500/20 to-rose-500/20 border-4 border-red-500/50 flex items-center justify-center animate-in zoom-in-75 duration-700 delay-150">
                    <XCircle className="w-12 h-12 text-red-400 animate-in zoom-in-50 duration-500 delay-300" strokeWidth={3} />
                  </div>
                  {/* Outer ring animation */}
                  <div className="absolute inset-0 rounded-full border-4 border-red-500/30 animate-ping" style={{ animationDuration: '1.5s' }} />
                </div>

                {/* Error Text */}
                <h3 className="text-2xl font-bold text-white mb-3 animate-in slide-in-from-bottom-2 duration-500 delay-200">
                  Error!
                </h3>
                <p className="text-gray-300 mb-2 animate-in slide-in-from-bottom-2 duration-500 delay-300">
                  {depositErrorMessage || 'Something went wrong'}
                </p>
                <p className="text-sm text-gray-400 animate-in slide-in-from-bottom-2 duration-500 delay-400">
                  Please try again
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserDashboardLayout>
  );
}
