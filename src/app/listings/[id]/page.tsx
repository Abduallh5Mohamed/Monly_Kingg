'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ensureCsrfToken } from '@/utils/csrf';
import {
  ArrowLeft,
  ShoppingCart,
  MessageCircle,
  Flag,
  Star,
  Shield,
  CheckCircle2,
  Calendar,
  DollarSign,
  Gamepad2,
  User as UserIcon,
  Crown,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  coverImage: string;
  status: string;
  createdAt: string;
  details: any;
  discount?: {
    originalPrice: number;
    discountedPrice: number;
    discountPercent: number;
  };
  game: {
    _id: string;
    name: string;
    slug: string;
    icon: string;
    category: string;
  };
  seller: {
    _id: string;
    username: string;
    email: string;
    isSeller: boolean;
  };
}

export default function ListingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchListing();
    }
  }, [params.id]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/listings/${params.id}/public`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setListing(data.data);
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChat = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    // Navigate to chat with seller
    router.push(`/user/chat?seller=${listing?.seller._id}`);
  };

  const handleBuy = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setBuyError('');
    setShowBuyModal(true);
  };

  const handleConfirmBuy = async () => {
    if (!listing) return;
    setBuying(true);
    setBuyError('');
    try {
      const csrfToken = await ensureCsrfToken() || '';
      const res = await fetch('/api/v1/transactions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
        body: JSON.stringify({ listingId: listing._id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowBuyModal(false);
        router.push(`/user/transactions/${data.data.transactionId}`);
      } else if (res.status === 400 && data.required) {
        setBuyError(`Insufficient balance. You need ${data.required} EGP but have ${data.available} EGP.`);
      } else {
        setBuyError(data.message || 'Purchase failed. Please try again.');
      }
    } catch {
      setBuyError('Network error. Please try again.');
    } finally {
      setBuying(false);
    }
  };

  const handleReport = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setShowReportModal(true);
  };

  const handleRate = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setShowRatingModal(true);
  };

  const allImages = listing ? [listing.coverImage, ...listing.images].filter(Boolean) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060811] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-white/50 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-[#060811] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Listing Not Found</h2>
          <p className="text-white/50 mb-6">This listing may have been removed or doesn't exist.</p>
          <Button onClick={() => router.back()} className="bg-cyan-500 hover:bg-cyan-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060811]">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-cyan-600/[0.03] blur-[120px]" />
        <div className="absolute -top-[30%] -right-[15%] w-[50%] h-[50%] rounded-full bg-purple-600/[0.03] blur-[120px]" />
      </div>

      <div className="relative">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-[#0a0d16]/90 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div className="flex items-center gap-2">
                {listing.status === 'available' && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Available
                  </span>
                )}
                {listing.status === 'sold' && (
                  <span className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                    Sold
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Images & Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <div className="bg-[#0a0d16]/80 backdrop-blur-xl rounded-3xl border border-white/[0.06] overflow-hidden">
                {/* Main Image */}
                <div className="relative aspect-video bg-[#060811]">
                  <img
                    src={allImages[selectedImageIndex] || '/assets/placeholder.jpg'}
                    alt={listing.title}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setShowImageModal(true)}
                  />
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setSelectedImageIndex((selectedImageIndex - 1 + allImages.length) % allImages.length)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/70 transition-all"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setSelectedImageIndex((selectedImageIndex + 1) % allImages.length)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/70 transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnail Strip */}
                {allImages.length > 1 && (
                  <div className="p-4 flex gap-2 overflow-x-auto">
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${idx === selectedImageIndex
                          ? 'border-cyan-500 ring-2 ring-cyan-500/20'
                          : 'border-white/10 hover:border-white/30'
                          }`}
                      >
                        <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="bg-[#0a0d16]/80 backdrop-blur-xl rounded-3xl border border-white/[0.06] p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Description
                </h2>
                <p className="text-white/70 leading-relaxed whitespace-pre-wrap">
                  {listing.description || 'No description provided.'}
                </p>
              </div>

              {/* Account Details */}
              {listing.details && Object.keys(listing.details).length > 0 && (
                <div className="bg-[#0a0d16]/80 backdrop-blur-xl rounded-3xl border border-white/[0.06] p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-cyan-400" />
                    Account Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(listing.details).map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-white font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Purchase & Seller Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Title & Game */}
              <div className="bg-[#0a0d16]/80 backdrop-blur-xl rounded-3xl border border-white/[0.06] p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Gamepad2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-white mb-2 line-clamp-2">{listing.title}</h1>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                      <Gamepad2 className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium text-cyan-400">{listing.game.name}</span>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="mt-6 pt-6 border-t border-white/[0.06]">
                  {listing.discount ? (
                    /* With Discount */
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-4xl font-bold text-white">EGP {listing.discount.discountedPrice}</span>
                        <span className="text-white/50 text-sm">EGP</span>
                        <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">
                          -{listing.discount.discountPercent}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg text-white/40 line-through">EGP {listing.discount.originalPrice}</span>
                        <span className="text-xs text-green-400 font-medium">
                          Save EGP {(listing.discount.originalPrice - listing.discount.discountedPrice).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* No Discount */
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-4xl font-bold text-white">EGP {listing.price}</span>
                      <span className="text-white/50 text-sm">EGP</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {listing.status === 'available' && (
                    user && user.id === listing.seller._id ? (
                      /* Owner viewing their own listing */
                      <div className="text-center py-4 rounded-xl bg-white/[0.03] border border-white/10">
                        <p className="text-white/50 text-sm">This is your listing</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Button
                          onClick={handleBuy}
                          className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-base rounded-xl shadow-lg shadow-cyan-500/20"
                        >
                          <ShoppingCart className="w-5 h-5 mr-2" />
                          Buy Now
                        </Button>

                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            onClick={handleChat}
                            variant="outline"
                            className="h-11 bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-cyan-500/30 text-white rounded-xl"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={handleRate}
                            variant="outline"
                            className="h-11 bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-yellow-500/30 text-white rounded-xl"
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={handleReport}
                            variant="outline"
                            className="h-11 bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-red-500/30 text-white rounded-xl"
                          >
                            <Flag className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  )}

                  {listing.status === 'in_progress' && (
                    <div className="text-center py-4">
                      <p className="text-yellow-400 font-medium">Transaction in progress</p>
                    </div>
                  )}

                  {listing.status === 'sold' && (
                    <div className="text-center py-4">
                      <p className="text-red-400 font-medium">This account has been sold</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Seller Info */}
              <div className="bg-[#0a0d16]/80 backdrop-blur-xl rounded-3xl border border-white/[0.06] p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-cyan-400" />
                  Seller Information
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {listing.seller.username[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{listing.seller.username}</span>
                      {listing.seller.isSeller && (
                        <Crown className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                    <span className="text-white/50 text-sm">Verified Seller</span>
                  </div>
                </div>
                <Link
                  href={`/user/seller/${listing.seller._id}`}
                  className="block text-center py-2.5 px-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-cyan-500/30 text-white text-sm font-medium transition-all"
                >
                  View Profile
                </Link>
              </div>

              {/* Posted Date */}
              <div className="bg-[#0a0d16]/80 backdrop-blur-xl rounded-3xl border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Posted {new Date(listing.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={allImages[selectedImageIndex]}
            alt={listing.title}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Buy Confirmation Modal */}
      {showBuyModal && listing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0d16] rounded-2xl border border-white/10 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-2">Confirm Purchase</h3>
            <p className="text-white/50 text-sm mb-6">Funds will be held in escrow until you confirm receipt of account credentials.</p>
            <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4 mb-4 space-y-3">
              {/* Listing name */}
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-sm">Listing</span>
                <span className="text-white text-sm font-medium truncate max-w-[180px]">{listing.title}</span>
              </div>

              {listing.discount ? (
                <>
                  {/* Original price */}
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Price</span>
                    <span className="text-white/40 line-through text-sm">{listing.discount.originalPrice.toFixed(2)} EGP</span>
                  </div>
                  {/* Discount row */}
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">Discount ({listing.discount.discountPercent}%)</span>
                    <span className="text-green-400 text-sm font-medium">
                      - {(listing.discount.originalPrice - listing.discount.discountedPrice).toFixed(2)} EGP
                    </span>
                  </div>
                  {/* Divider */}
                  <div className="border-t border-white/10" />
                  {/* Total */}
                  <div className="flex justify-between items-center">
                    <span className="text-white font-semibold">Total</span>
                    <span className="text-cyan-400 font-bold text-xl">{listing.discount.discountedPrice.toFixed(2)} EGP</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">Price</span>
                  <span className="text-cyan-400 font-bold text-lg">{listing.price} EGP</span>
                </div>
              )}
            </div>
            {buyError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                <p className="text-red-400 text-sm">{buyError}</p>
                {buyError.includes('balance') && (
                  <button onClick={() => { setShowBuyModal(false); router.push('/user/payments'); }}
                    className="text-cyan-400 text-sm underline mt-1">Top up balance →</button>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={() => setShowBuyModal(false)} variant="outline"
                className="flex-1 bg-white/[0.03] border-white/10 text-white hover:bg-white/[0.06]">
                Cancel
              </Button>
              <Button onClick={handleConfirmBuy} disabled={buying}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold">
                {buying ? 'Processing…' : 'Confirm Buy'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal Placeholder */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0d16] rounded-2xl border border-white/10 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Report Listing</h3>
            <p className="text-white/70 mb-6">Report functionality coming soon...</p>
            <Button onClick={() => setShowReportModal(false)} className="w-full">
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Rating Modal Placeholder */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0d16] rounded-2xl border border-white/10 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Rate Seller</h3>
            <p className="text-white/70 mb-6">Rating functionality coming soon...</p>
            <Button onClick={() => setShowRatingModal(false)} className="w-full">
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
