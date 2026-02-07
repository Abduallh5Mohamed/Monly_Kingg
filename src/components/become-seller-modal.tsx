'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import {
  X,
  Upload,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Store,
  CreditCard,
  FileImage,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface SellerRequestData {
  status: 'pending' | 'approved' | 'rejected' | null;
  rejectionReason?: string;
  createdAt?: string;
}

export function BecomeSellerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'info' | 'form' | 'status'>('info');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [requestStatus, setRequestStatus] = useState<SellerRequestData>({ status: null });
  const [formData, setFormData] = useState({
    fullName: '',
    idType: 'national_id' as 'national_id' | 'passport',
    idImageFront: null as File | null,
    idImageBack: null as File | null,
  });
  const [frontPreview, setFrontPreview] = useState('');
  const [backPreview, setBackPreview] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      checkSellerStatus();
    }
  }, [isOpen, user]);

  const checkSellerStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch('/api/v1/seller/my-request', { credentials: 'include' });
      const data = await res.json();
      if (data.data) {
        setRequestStatus(data.data);
        setStep('status');
      } else {
        setStep('info');
      }
    } catch {
      setStep('info');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB allowed', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (side === 'front') {
        setFormData(p => ({ ...p, idImageFront: file }));
        setFrontPreview(base64);
      } else {
        setFormData(p => ({ ...p, idImageBack: file }));
        setBackPreview(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!formData.fullName.trim()) {
      toast({ title: 'Missing Info', description: 'Please enter your full name', variant: 'destructive' });
      return;
    }
    if (!formData.idImageFront) {
      toast({ title: 'Missing Document', description: 'Please upload front side of your ID', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/seller/request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          idType: formData.idType,
          idImageFront: frontPreview,
          idImageBack: backPreview || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Request Submitted!', description: 'Your application is under review' });
        setRequestStatus({ status: 'pending' });
        setStep('status');
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1419]/95 backdrop-blur-xl shadow-2xl shadow-cyan-500/10">
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-white/60" />
        </button>

        {/* Header gradient */}
        <div className="relative px-8 pt-8 pb-6 border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/5" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Store className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Become a Seller</h2>
              <p className="text-sm text-white/50">Verify your identity to start selling</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {checkingStatus ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Checking status...</p>
            </div>
          ) : step === 'status' ? (
            /* Status View */
            <div className="flex flex-col items-center text-center py-6">
              {requestStatus.status === 'pending' && (
                <>
                  <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6 border-2 border-yellow-500/30">
                    <Clock className="w-10 h-10 text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Application Pending</h3>
                  <p className="text-muted-foreground max-w-sm">Your seller request is being reviewed by our team. This usually takes 24-48 hours.</p>
                  <div className="mt-6 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 w-full">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <p className="text-xs text-yellow-300/80">We&apos;ll notify you once your application is reviewed.</p>
                    </div>
                  </div>
                </>
              )}
              {requestStatus.status === 'approved' && (
                <>
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 border-2 border-green-500/30">
                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">You&apos;re Approved!</h3>
                  <p className="text-muted-foreground max-w-sm">Congratulations! You can now list your accounts for sale.</p>
                  <Button onClick={onClose} className="mt-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 px-8">
                    Start Selling
                  </Button>
                </>
              )}
              {requestStatus.status === 'rejected' && (
                <>
                  <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border-2 border-red-500/30">
                    <XCircle className="w-10 h-10 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Application Rejected</h3>
                  <p className="text-muted-foreground max-w-sm mb-2">Unfortunately, your application was not approved.</p>
                  {requestStatus.rejectionReason && (
                    <p className="text-sm text-red-300/80 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 w-full">
                      Reason: {requestStatus.rejectionReason}
                    </p>
                  )}
                  <Button onClick={() => { setStep('form'); setRequestStatus({ status: null }); }} className="mt-6 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 px-8">
                    Resubmit Application
                  </Button>
                </>
              )}
            </div>
          ) : step === 'info' ? (
            /* Info View */
            <div>
              <div className="space-y-4 mb-8">
                {[
                  { icon: <CreditCard className="w-5 h-5" />, title: 'Identity Verification', desc: 'Upload a photo of your national ID or passport' },
                  { icon: <ShieldCheck className="w-5 h-5" />, title: 'Admin Review', desc: 'Our team verifies your documents within 24-48h' },
                  { icon: <Store className="w-5 h-5" />, title: 'Start Selling', desc: 'Once approved, list your gaming accounts instantly' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={() => setStep('form')} className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 font-bold py-6 text-base shadow-lg shadow-cyan-500/20">
                Start Verification
              </Button>
            </div>
          ) : (
            /* Form View */
            <div className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Full Name (as on ID)</label>
                <Input
                  placeholder="Enter your full legal name"
                  value={formData.fullName}
                  onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                  className="bg-white/5 border-white/10 focus:border-primary h-12 rounded-xl"
                />
              </div>

              {/* ID Type */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Document Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'national_id', label: 'National ID', icon: <CreditCard className="w-4 h-4" /> },
                    { value: 'passport', label: 'Passport', icon: <FileImage className="w-4 h-4" /> },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFormData(p => ({ ...p, idType: opt.value as any }))}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                        formData.idType === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20'
                      }`}
                    >
                      {opt.icon}
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Front */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Front Side <span className="text-red-400">*</span>
                </label>
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'front')} />
                  {frontPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-primary/30 group">
                      <img src={frontPreview} alt="Front" className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-sm font-medium">Click to change</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/15 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/25 transition-all">
                      <Upload className="w-6 h-6 text-white/30 mb-2" />
                      <p className="text-xs text-white/40">Click to upload front side</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Upload Back (optional) */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Back Side <span className="text-white/30">(optional)</span>
                </label>
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'back')} />
                  {backPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-primary/30 group">
                      <img src={backPreview} alt="Back" className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-sm font-medium">Click to change</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition-all">
                      <Upload className="w-5 h-5 text-white/20 mb-1" />
                      <p className="text-[10px] text-white/30">Click to upload back side</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep('info')} className="rounded-xl border-white/10 text-white/60 hover:bg-white/5 flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 font-bold flex-[2] py-6 shadow-lg shadow-cyan-500/20"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</> : 'Submit Application'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
