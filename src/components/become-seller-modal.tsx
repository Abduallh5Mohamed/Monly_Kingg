'use client';

import { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Camera,
  RotateCcw
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
    idImage: null as File | null,
    faceImageFront: null as File | null,
    faceImageLeft: null as File | null,
    faceImageRight: null as File | null,
  });
  const [idPreview, setIdPreview] = useState('');
  const [faceFrontPreview, setFaceFrontPreview] = useState('');
  const [faceLeftPreview, setFaceLeftPreview] = useState('');
  const [faceRightPreview, setFaceRightPreview] = useState('');
  
  // Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const [currentFaceCapture, setCurrentFaceCapture] = useState<'front' | 'left' | 'right' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'id') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB allowed', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setFormData(p => ({ ...p, idImage: file }));
      setIdPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async (face: 'front' | 'left' | 'right') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCurrentFaceCapture(face);
      setCameraActive(true);
    } catch (err) {
      toast({ title: 'Camera Error', description: 'Could not access camera', variant: 'destructive' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCurrentFaceCapture(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !currentFaceCapture) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    
    if (currentFaceCapture === 'front') {
      setFaceFrontPreview(base64);
    } else if (currentFaceCapture === 'left') {
      setFaceLeftPreview(base64);
    } else if (currentFaceCapture === 'right') {
      setFaceRightPreview(base64);
    }
    
    stopCamera();
    toast({ title: 'Photo Captured!', description: 'Face photo saved successfully' });
  };

  const handleSubmit = async () => {
    if (!formData.fullName.trim()) {
      toast({ title: 'Missing Info', description: 'Please enter your full name', variant: 'destructive' });
      return;
    }
    if (!formData.idImage) {
      toast({ title: 'Missing Document', description: 'Please upload your ID/Passport', variant: 'destructive' });
      return;
    }
    if (!formData.faceImageFront || !formData.faceImageLeft || !formData.faceImageRight) {
      toast({ title: 'Missing Face Photos', description: 'Please upload all 3 face photos (front, left, right)', variant: 'destructive' });
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
          idImage: idPreview,
          faceImageFront: faceFrontPreview,
          faceImageLeft: faceLeftPreview,
          faceImageRight: faceRightPreview,
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
                  { icon: <CreditCard className="w-5 h-5" />, title: 'ID/Passport Photo', desc: 'Upload clear photo of national ID or passport (single photo)' },
                  { icon: <FileImage className="w-5 h-5" />, title: 'Face Verification', desc: 'Upload 3 clear selfies: front, left side, and right side' },
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

              {/* Upload ID/Passport */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {formData.idType === 'passport' ? 'Passport Photo' : 'ID Card'} <span className="text-red-400">*</span>
                </label>
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'id')} />
                  {idPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-primary/30 group">
                      <img src={idPreview} alt="ID" className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-sm font-medium">Click to change</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/15 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/25 transition-all">
                      <Upload className="w-6 h-6 text-white/30 mb-2" />
                      <p className="text-xs text-white/40">Clear photo of {formData.idType === 'passport' ? 'passport' : 'ID card'}</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Face Photos Header */}
              <div className="pt-2">
                <h4 className="text-sm font-medium text-white/70 mb-1">Face Verification Photos <span className="text-red-400">*</span></h4>
                <p className="text-xs text-white/40 mb-3">Take live selfies from 3 angles using your camera</p>
              </div>

              {/* Camera Modal */}
              {cameraActive && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90">
                  <div className="relative w-full max-w-2xl mx-4 bg-[#0f1419] rounded-2xl border border-white/10 overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">
                        Capture {currentFaceCapture === 'front' ? 'Front' : currentFaceCapture === 'left' ? 'Left Side' : 'Right Side'} Selfie
                      </h3>
                      <button onClick={stopCamera} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="relative aspect-video bg-black">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    </div>
                    <div className="p-6 flex gap-3">
                      <Button onClick={stopCamera} variant="outline" className="flex-1 rounded-xl border-white/10">
                        Cancel
                      </Button>
                      <Button onClick={capturePhoto} className="flex-[2] rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500">
                        <Camera className="w-4 h-4 mr-2" />
                        Capture Photo
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Front Selfie */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Front Selfie</label>
                {faceFrontPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-primary/30">
                    <img src={faceFrontPreview} alt="Face Front" className="w-full h-32 object-cover" />
                    <button
                      onClick={() => startCamera('front')}
                      className="absolute inset-0 bg-black/50 hover:bg-black/60 transition-colors flex items-center justify-center"
                    >
                      <RotateCcw className="w-5 h-5 text-white mr-2" />
                      <span className="text-white text-sm font-medium">Retake</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startCamera('front')}
                    className="w-full flex flex-col items-center justify-center h-24 border-2 border-dashed border-white/15 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/30 transition-all"
                  >
                    <Camera className="w-6 h-6 text-primary mb-1" />
                    <p className="text-xs text-white/60">Open Camera - Face Forward</p>
                  </button>
                )}
              </div>

              {/* Left & Right Selfies */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Left Side</label>
                  {faceLeftPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-primary/30">
                      <img src={faceLeftPreview} alt="Face Left" className="w-full h-28 object-cover" />
                      <button
                        onClick={() => startCamera('left')}
                        className="absolute inset-0 bg-black/50 hover:bg-black/60 transition-colors flex items-center justify-center"
                      >
                        <RotateCcw className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startCamera('left')}
                      className="w-full flex flex-col items-center justify-center h-20 border-2 border-dashed border-white/10 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/30 transition-all"
                    >
                      <Camera className="w-4 h-4 text-primary mb-1" />
                      <p className="text-[9px] text-white/50">Left Profile</p>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Right Side</label>
                  {faceRightPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-primary/30">
                      <img src={faceRightPreview} alt="Face Right" className="w-full h-28 object-cover" />
                      <button
                        onClick={() => startCamera('right')}
                        className="absolute inset-0 bg-black/50 hover:bg-black/60 transition-colors flex items-center justify-center"
                      >
                        <RotateCcw className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startCamera('right')}
                      className="w-full flex flex-col items-center justify-center h-20 border-2 border-dashed border-white/10 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/30 transition-all"
                    >
                      <Camera className="w-4 h-4 text-primary mb-1" />
                      <p className="text-[9px] text-white/50">Right Profile</p>
                    </button>
                  )}
                </div>
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
