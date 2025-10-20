'use client';

import { useState, useEffect } from 'react';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { CheckCircle2, Upload, X, Calendar, CreditCard, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Payment {
  _id: string;
  title: string;
  amount: number;
  currency: string;
  paymentType: string;
  destination?: string;
  hours?: string;
  date: string;
  status: 'paid' | 'pending' | 'rejected';
  receiptImage?: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState('');
  const [selectedPaymentService, setSelectedPaymentService] = useState('');
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockPayments: Payment[] = [
      {
        _id: '1',
        title: 'PUBG Mobile Account - Conqueror Tier',
        amount: 6500,
        currency: 'LE',
        paymentType: 'Bank Transfer',
        destination: 'Level 85 - M416 Glacier',
        date: 'September 15, 2025 at 08:18:50 AM',
        status: 'paid',
        receiptImage: '/receipts/pubg-receipt.jpg'
      },
      {
        _id: '2',
        title: 'FIFA 23 Ultimate Team - Icon Account',
        amount: 28515,
        currency: 'LE',
        paymentType: 'Bank Transfer',
        hours: '5 Icons + 2M Coins',
        date: 'September 08, 2025 at 07:24:33 PM',
        status: 'paid',
        receiptImage: '/receipts/fifa-receipt.jpg'
      }
    ];
    setPayments(mockPayments);
  }, []);

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
    if (!selectedPaymentType || !selectedPaymentService || !receiptImage) {
      alert('Please fill all required fields and upload receipt image');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement API call to submit permission request
      const formData = new FormData();
      formData.append('semester', selectedSemester);
      formData.append('paymentType', selectedPaymentType);
      formData.append('paymentService', selectedPaymentService);
      formData.append('receipt', receiptImage);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert('Payment permission request submitted successfully!');
      setShowPermissionModal(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting permission:', error);
      alert('Failed to submit permission request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedSemester('');
    setSelectedPaymentType('');
    setSelectedPaymentService('');
    setReceiptImage(null);
    setReceiptPreview('');
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

        {/* Payments List */}
        <div className="space-y-6">
          {payments.map((payment) => (
            <div
              key={payment._id}
              className="bg-gradient-to-br from-[#1a1d2e]/90 to-[#252841]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-cyan-500/30 transition-all duration-300 shadow-xl"
            >
              {/* Payment Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                        ✓ paid
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#f5f5dc]">
                      {payment.title}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pl-15">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">{payment.paymentType}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400">{payment.date}</span>
                </div>
                {payment.destination && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">
                      Details: <span className="text-[#f5f5dc] font-medium">{payment.destination}</span>
                    </span>
                  </div>
                )}
                {payment.hours && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">
                      Items: <span className="text-[#f5f5dc] font-medium">{payment.hours}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="flex items-center gap-2 pl-15">
                <span className="text-gray-400 text-sm">Amount:</span>
                <span className="text-2xl font-bold text-[#f5f5dc]">
                  {payment.amount.toLocaleString()} {payment.currency}
                </span>
              </div>

              {/* Receipt Images */}
              {payment.receiptImage && (
                <div className="mt-4 pl-15">
                  <p className="text-sm text-gray-400 mb-2 font-medium">RECEIPTS IMAGES</p>
                  <div className="inline-block">
                    <div className="relative group">
                      <div className="w-32 h-40 bg-white/5 rounded-lg border border-white/10 overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-all">
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-12 h-12 text-gray-500" />
                        </div>
                      </div>
                      <div className="absolute -bottom-6 left-0 right-0 text-center">
                        <span className="text-xs text-green-400 font-semibold">Accepted</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Permission Request Modal */}
        {showPermissionModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-[#1a1d2e] to-[#252841] border border-white/10 rounded-2xl max-w-2xl w-full shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold text-[#f5f5dc]">Permission Request</h2>
                <button
                  onClick={() => {
                    setShowPermissionModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-[#f5f5dc] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Game Title */}
                <div>
                  <label className="block text-sm font-medium text-[#f5f5dc] mb-2">
                    Game Title <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f5f5dc] focus:border-cyan-500/50 focus:outline-none transition-all"
                  >
                    <option value="" className="bg-[#1a1d2e] text-gray-400">-- Not Specified --</option>
                    <option value="PUBG Mobile" className="bg-[#1a1d2e] text-[#f5f5dc]">PUBG Mobile</option>
                    <option value="FIFA 23" className="bg-[#1a1d2e] text-[#f5f5dc]">FIFA 23</option>
                    <option value="Call of Duty Mobile" className="bg-[#1a1d2e] text-[#f5f5dc]">Call of Duty Mobile</option>
                    <option value="Valorant" className="bg-[#1a1d2e] text-[#f5f5dc]">Valorant</option>
                    <option value="League of Legends" className="bg-[#1a1d2e] text-[#f5f5dc]">League of Legends</option>
                    <option value="Fortnite" className="bg-[#1a1d2e] text-[#f5f5dc]">Fortnite</option>
                    <option value="Apex Legends" className="bg-[#1a1d2e] text-[#f5f5dc]">Apex Legends</option>
                  </select>
                </div>

                {/* Payment Type */}
                <div>
                  <label className="block text-sm font-medium text-[#f5f5dc] mb-2">
                    Payment Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedPaymentType}
                    onChange={(e) => setSelectedPaymentType(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f5f5dc] focus:border-cyan-500/50 focus:outline-none transition-all"
                  >
                    <option value="" className="bg-[#1a1d2e] text-gray-400">-- Not Specified --</option>
                    <option value="Bank Transfer" className="bg-[#1a1d2e] text-[#f5f5dc]">Bank Transfer</option>
                    <option value="Cash" className="bg-[#1a1d2e] text-[#f5f5dc]">Cash</option>
                    <option value="Vodafone Cash" className="bg-[#1a1d2e] text-[#f5f5dc]">Vodafone Cash</option>
                    <option value="Instapay" className="bg-[#1a1d2e] text-[#f5f5dc]">Instapay</option>
                    <option value="Fawry" className="bg-[#1a1d2e] text-[#f5f5dc]">Fawry</option>
                  </select>
                </div>

                {/* Account Type */}
                <div>
                  <label className="block text-sm font-medium text-[#f5f5dc] mb-2">
                    Account Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedPaymentService}
                    onChange={(e) => setSelectedPaymentService(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f5f5dc] focus:border-cyan-500/50 focus:outline-none transition-all"
                  >
                    <option value="" className="bg-[#1a1d2e] text-gray-400">-- Not Specified --</option>
                    <option value="Premium Account" className="bg-[#1a1d2e] text-[#f5f5dc]">Premium Account</option>
                    <option value="Ranked Account" className="bg-[#1a1d2e] text-[#f5f5dc]">Ranked Account</option>
                    <option value="Fresh Account" className="bg-[#1a1d2e] text-[#f5f5dc]">Fresh Account</option>
                    <option value="Smurf Account" className="bg-[#1a1d2e] text-[#f5f5dc]">Smurf Account</option>
                    <option value="Ultimate Team" className="bg-[#1a1d2e] text-[#f5f5dc]">Ultimate Team</option>
                    <option value="Other" className="bg-[#1a1d2e] text-[#f5f5dc]">Other</option>
                  </select>
                </div>

                {/* Receipt Upload */}
                <div>
                  <label className="block text-sm font-medium text-[#f5f5dc] mb-2">
                    Receipt Image <span className="text-red-400">*</span>
                  </label>
                  
                  {!receiptPreview ? (
                    <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-cyan-500/50 transition-all cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="receipt-upload"
                      />
                      <label htmlFor="receipt-upload" className="cursor-pointer">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-[#f5f5dc] font-medium mb-1">
                          Click to upload receipt image
                        </p>
                        <p className="text-sm text-gray-500">
                          PNG, JPG, JPEG up to 10MB
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="w-full h-64 object-contain bg-white/5 rounded-xl border border-white/10"
                      />
                      <button
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-lg transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Info Message */}
                {(!selectedPaymentType || !selectedPaymentService) && (
                  <div className="flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                    <FileText className="w-8 h-8 text-cyan-400 flex-shrink-0" />
                    <p className="text-sm text-[#f5f5dc]">
                      Please specify the options of payment permission.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPermissionModal(false);
                    resetForm();
                  }}
                  className="border-white/10 text-gray-300 hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitPermission}
                  disabled={!selectedPaymentType || !selectedPaymentService || !receiptImage || isSubmitting}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserDashboardLayout>
  );
}
