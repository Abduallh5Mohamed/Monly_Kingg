'use client';

import { useState, useEffect } from 'react';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { CheckCircle2, Upload, X, Calendar, CreditCard, FileText, Clock, DollarSign, Users, XCircle, Loader2 } from 'lucide-react';
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

export default function PaymentsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // Form state
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [senderFullName, setSenderFullName] = useState('');
  const [senderPhoneOrEmail, setSenderPhoneOrEmail] = useState('');
  const [depositDate, setDepositDate] = useState('');
  const [gameTitle, setGameTitle] = useState('');

  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch real deposits from database
  useEffect(() => {
    fetchDeposits();

    const interval = setInterval(fetchDeposits, 15000);

    const handleDataUpdate = () => {
      fetchDeposits();
    };
    window.addEventListener('userDataUpdated', handleDataUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('userDataUpdated', handleDataUpdate);
    };
  }, []);

  const fetchDeposits = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setReceiptImage(null);
    setReceiptPreview('');
  };

  const handleSubmitPermission = async () => {
    setError('');

    // Validate required fields
    if (!paymentMethod || !amount || !senderFullName || !senderPhoneOrEmail || !depositDate || !receiptImage) {
      setError('All fields are required (payment method, amount, sender name, sender phone/email, deposit date, and receipt image)');
      return;
    }

    if (Number(amount) < 100) {
      setError('Minimum deposit amount is 100 LE');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('paymentMethod', paymentMethod);
      formData.append('amount', amount);
      formData.append('senderFullName', senderFullName);
      formData.append('senderPhoneOrEmail', senderPhoneOrEmail);
      formData.append('depositDate', depositDate);
      if (gameTitle) {
        formData.append('gameTitle', gameTitle);
      }
      formData.append('receipt', receiptImage);

      const response = await fetch('/api/v1/deposits/request', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert('Deposit request submitted successfully! Admin will review it soon.');
        setShowPermissionModal(false);
        resetForm();
        fetchDeposits();
        window.dispatchEvent(new Event('userDataUpdated'));
      } else {
        setError(data.message || 'Failed to submit deposit request');
      }
    } catch (error) {
      console.error('Error submitting deposit:', error);
      setError('Network error, please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPaymentMethod('');
    setAmount('');
    setSenderFullName('');
    setSenderPhoneOrEmail('');
    setDepositDate('');
    setGameTitle('');
    setReceiptImage(null);
    setReceiptPreview('');
    setError('');
  };

  return (
    <UserDashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e14] via-[#1a1f2e] to-[#0f1419] p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#f5f5dc]">
              Payment History
            </h1>
            <p className="text-gray-400 mt-1">Manage your payment records and receipts</p>
          </div>
          <Button
            onClick={() => setShowPermissionModal(true)}
            className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg shadow-cyan-500/30 transition-all"
          >
            <Upload className="w-4 h-4 mr-2" />
            Add Permission
          </Button>
        </div>

        {/* Deposits List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : deposits.length === 0 ? (
          <div className="bg-gradient-to-br from-[#1a1d2e]/90 to-[#252841]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <Upload className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#f5f5dc] mb-2">No Deposits Yet</h3>
            <p className="text-gray-400 mb-6">You haven't submitted any deposit requests yet.</p>
            <Button
              onClick={() => setShowPermissionModal(true)}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg shadow-cyan-500/30"
            >
              <Upload className="w-4 h-4 mr-2" />
              Submit Your First Deposit
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {deposits.map((deposit) => (
              <div
                key={deposit._id}
                className="bg-gradient-to-br from-[#1a1d2e]/90 to-[#252841]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-cyan-500/30 transition-all duration-300 shadow-xl"
              >
                {/* Deposit Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-br rounded-xl flex items-center justify-center ${deposit.status === 'approved'
                      ? 'from-green-500/20 to-emerald-500/20'
                      : deposit.status === 'pending'
                        ? 'from-yellow-500/20 to-orange-500/20'
                        : 'from-red-500/20 to-pink-500/20'
                      }`}>
                      {deposit.status === 'approved' ? (
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      ) : deposit.status === 'pending' ? (
                        <Clock className="w-6 h-6 text-yellow-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${deposit.status === 'approved'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : deposit.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}>
                          {deposit.status === 'approved' ? '✓ Approved' : deposit.status === 'pending' ? '⏱ Pending Review' : '✗ Rejected'}
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
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">
                      Sender: <span className="text-[#f5f5dc]">{deposit.senderFullName || 'N/A'}</span>
                    </span>
                  </div>
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
                  <span className="text-2xl font-bold text-[#f5f5dc]">
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
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>';
                            }}
                          />
                        </a>
                        <div className="absolute -bottom-6 left-0 right-0 text-center">
                          <span className={`text-xs font-semibold ${deposit.status === 'approved' ? 'text-green-400' :
                            deposit.status === 'pending' ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                            {deposit.status === 'approved' ? 'Accepted' :
                              deposit.status === 'pending' ? 'Under Review' :
                                'Rejected'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Permission Request Modal */}
        {showPermissionModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-[#1a1d2e] to-[#252841] border border-white/10 rounded-2xl max-w-4xl w-full shadow-2xl my-8">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#f5f5dc]">Deposit Request</h2>
                    <p className="text-sm text-gray-400">Submit your payment details</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowPermissionModal(false);
                    resetForm();
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
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
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
                      <DollarSign className="w-4 h-4 text-green-400" />
                      Amount (LE) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      min="100"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#f5f5dc] focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all placeholder-gray-500 text-base"
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
                      value={gameTitle}
                      onChange={(e) => setGameTitle(e.target.value)}
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
                      value={senderFullName}
                      onChange={(e) => setSenderFullName(e.target.value)}
                      placeholder="Full name of wallet owner"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#f5f5dc] focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder-gray-500 text-base"
                    />
                  </div>

                  {/* Sender Phone or Email */}
                  <div>
                    <label className="block text-sm font-semibold text-[#f5f5dc] mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-orange-400" />
                      Sender Phone/Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={senderPhoneOrEmail}
                      onChange={(e) => setSenderPhoneOrEmail(e.target.value)}
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

                    {!receiptPreview ? (
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center hover:border-cyan-500/50 hover:bg-white/5 transition-all cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                          id="receipt-upload"
                        />
                        <label htmlFor="receipt-upload" className="cursor-pointer">
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
                          src={receiptPreview}
                          alt="Receipt preview"
                          className="w-full h-80 object-contain bg-white/5 rounded-xl border border-white/10 p-4"
                        />
                        <button
                          onClick={handleRemoveImage}
                          className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-lg transition-all shadow-lg opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg p-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-green-400 text-sm font-medium">✓ Image uploaded successfully</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="md:col-span-2 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  {/* Info Message */}
                  {!error && (!paymentMethod || !amount || !senderFullName || !senderPhoneOrEmail || !depositDate) && (
                    <div className="md:col-span-2 flex items-start gap-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                      <FileText className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[#f5f5dc] mb-1">Complete Required Fields</p>
                        <p className="text-xs text-gray-400">
                          Please fill all required fields marked with <span className="text-red-400">*</span> to submit your deposit request.
                        </p>
                      </div>
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
                      setShowPermissionModal(false);
                      resetForm();
                    }}
                    className="border-white/10 text-gray-300 hover:bg-white/5 px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitPermission}
                    disabled={!paymentMethod || !amount || !senderFullName || !senderPhoneOrEmail || !depositDate || !receiptImage || isSubmitting}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed px-8"
                  >
                    {isSubmitting ? (
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
      </div>
    </UserDashboardLayout>
  );
}
