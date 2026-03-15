'use client';

import { useState, useEffect, useRef } from 'react';
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
    Gamepad2,
    User as UserIcon,
    Crown,
    ChevronLeft,
    ChevronRight,
    X,
    FileText,
    MessageSquare,
    Loader2,
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

interface SellerRating {
    _id: string;
    rating: number;
    comment: string | null;
    rater: { _id: string; username: string; avatar: string | null };
    createdAt: string;
}

interface RatingStats {
    averageRating: number;
    totalRatings: number;
    distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export default function ListingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const ratingsRef = useRef<HTMLDivElement>(null);

    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showImageModal, setShowImageModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [buying, setBuying] = useState(false);
    const [buyError, setBuyError] = useState('');

    // Inline ratings state
    const [sellerRatings, setSellerRatings] = useState<SellerRating[]>([]);
    const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
    const [ratingsLoading, setRatingsLoading] = useState(false);
    const [ratingsPage, setRatingsPage] = useState(1);
    const [ratingsTotalPages, setRatingsTotalPages] = useState(1);

    // Rating form state
    const [showRatingForm, setShowRatingForm] = useState(false);
    const [ratingValue, setRatingValue] = useState(0);
    const [ratingHover, setRatingHover] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [ratingLoading, setRatingLoading] = useState(false);
    const [ratingError, setRatingError] = useState('');
    const [ratingSuccess, setRatingSuccess] = useState('');
    const [hasCompletedPurchaseWithSeller, setHasCompletedPurchaseWithSeller] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchListing();
        }
    }, [params.id]);

    // Fetch ratings when listing is loaded
    useEffect(() => {
        if (listing?.seller?._id) {
            fetchSellerRatings();
        }
    }, [listing?.seller?._id, ratingsPage]);

    useEffect(() => {
        let isActive = true;

        const checkRatingEligibility = async () => {
            if (!user || !listing?.seller?._id || user.id === listing.seller._id) {
                if (isActive) {
                    setHasCompletedPurchaseWithSeller(false);
                }
                return;
            }

            try {
                const res = await fetch('/api/v1/transactions/mine?role=buyer&status=completed&limit=100', {
                    credentials: 'include',
                });

                if (!res.ok) {
                    if (isActive) {
                        setHasCompletedPurchaseWithSeller(false);
                    }
                    return;
                }

                const data = await res.json();
                const transactions: Array<{ seller?: { _id?: string } | string }> =
                    Array.isArray(data?.data) ? data.data : [];

                const canRateSeller = transactions.some((tx) => {
                    const txSellerId = typeof tx.seller === 'string' ? tx.seller : tx.seller?._id;
                    return txSellerId === listing.seller._id;
                });

                if (isActive) {
                    setHasCompletedPurchaseWithSeller(canRateSeller);
                }
            } catch {
                if (isActive) {
                    setHasCompletedPurchaseWithSeller(false);
                }
            }
        };

        checkRatingEligibility();

        return () => {
            isActive = false;
        };
    }, [user?.id, listing?.seller?._id]);

    useEffect(() => {
        if (
            showRatingForm &&
            (!user || !listing?.seller?._id || user.id === listing.seller._id || !hasCompletedPurchaseWithSeller)
        ) {
            setShowRatingForm(false);
        }
    }, [showRatingForm, user?.id, listing?.seller?._id, hasCompletedPurchaseWithSeller]);

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

    const fetchSellerRatings = async () => {
        if (!listing?.seller?._id) return;
        try {
            setRatingsLoading(true);
            const res = await fetch(`/api/v1/ratings/${listing.seller._id}?page=${ratingsPage}&limit=5`, {
                credentials: 'include',
            });
            const data = await res.json();
            if (data.data) {
                setSellerRatings(data.data);
                setRatingStats(data.stats);
                setRatingsTotalPages(data.totalPages || 1);
            }
        } catch (err) {
            console.error('Failed to fetch seller ratings:', err);
        } finally {
            setRatingsLoading(false);
        }
    };

    const handleChat = () => {
        if (!user) { router.push('/login'); return; }
        router.push(`/user/chat?seller=${listing?.seller._id}`);
    };

    const handleBuy = () => {
        if (!user) { router.push('/login'); return; }
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
        if (!user) { router.push('/login'); return; }
        setShowReportModal(true);
    };

    // Star button scrolls to ratings section
    const handleScrollToRatings = () => {
        ratingsRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSubmitRating = async () => {
        if (!listing || ratingValue === 0) return;
        setRatingLoading(true);
        setRatingError('');
        setRatingSuccess('');
        try {
            const csrfToken = await ensureCsrfToken() || '';
            const res = await fetch(`/api/v1/ratings/${listing.seller._id}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
                body: JSON.stringify({ rating: ratingValue, comment: ratingComment || undefined }),
            });
            const data = await res.json();
            if (res.ok) {
                setRatingSuccess(data.message || 'Rating submitted successfully!');
                setRatingValue(0);
                setRatingComment('');
                setTimeout(() => {
                    setShowRatingForm(false);
                    setRatingSuccess('');
                    fetchSellerRatings();
                }, 1500);
            } else {
                setRatingError(data.message || 'Failed to submit rating');
            }
        } catch {
            setRatingError('Network error. Please try again.');
        } finally {
            setRatingLoading(false);
        }
    };

    const handleDeleteRating = async (ratingId: string) => {
        if (!confirm('Are you sure you want to delete your rating?')) return;
        try {
            const csrfToken = await ensureCsrfToken() || '';
            await fetch(`/api/v1/ratings/${ratingId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'X-XSRF-TOKEN': csrfToken },
            });
            fetchSellerRatings();
        } catch (err) {
            console.error('Failed to delete rating:', err);
        }
    };

    const StarDisplay = ({ count, size = 'w-4 h-4' }: { count: number; size?: string }) => (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`${size} ${s <= count ? 'text-yellow-400 fill-yellow-400' : 'text-white/15'}`} />
            ))}
        </div>
    );

    const allImages = listing ? [listing.coverImage, ...listing.images].filter(Boolean) : [];
    const canRate = Boolean(user && listing && user.id !== listing.seller._id && hasCompletedPurchaseWithSeller);

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
                                        <div className="mb-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-4xl font-bold text-white">EGP {listing.discount.discountedPrice}</span>
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
                                        <div className="flex items-baseline gap-2 mb-6">
                                            <span className="text-4xl font-bold text-white">EGP {listing.price}</span>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    {listing.status === 'available' && (
                                        user && user.id === listing.seller._id ? (
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
                                                    <Button onClick={handleChat} variant="outline" className="h-11 bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-cyan-500/30 text-white rounded-xl">
                                                        <MessageCircle className="w-4 h-4" />
                                                    </Button>
                                                    <Button onClick={handleScrollToRatings} variant="outline" className="h-11 bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-yellow-500/30 text-white rounded-xl">
                                                        <Star className="w-4 h-4" />
                                                        {ratingStats && ratingStats.totalRatings > 0 && (
                                                            <span className="ml-1 text-xs text-yellow-400">{ratingStats.totalRatings}</span>
                                                        )}
                                                    </Button>
                                                    <Button onClick={handleReport} variant="outline" className="h-11 bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-red-500/30 text-white rounded-xl">
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
                                <div className="flex items-center gap-3 mb-3">
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
                                {/* Seller average rating mini-badge */}
                                {ratingStats && ratingStats.totalRatings > 0 && (
                                    <button onClick={handleScrollToRatings} className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-yellow-500/5 border border-yellow-500/15 hover:bg-yellow-500/10 transition-colors w-full">
                                        <StarDisplay count={Math.round(ratingStats.averageRating)} size="w-3.5 h-3.5" />
                                        <span className="text-yellow-400 font-bold text-sm">{ratingStats.averageRating}</span>
                                        <span className="text-white/40 text-xs">({ratingStats.totalRatings} rating{ratingStats.totalRatings !== 1 ? 's' : ''})</span>
                                    </button>
                                )}
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

                    {/* ═══════════════════════════════════════════════════════════════ */}
                    {/* Seller Ratings & Reviews Section (inline, below listing) */}
                    {/* ═══════════════════════════════════════════════════════════════ */}
                    <div ref={ratingsRef} className="mt-10 scroll-mt-24">
                        <div className="bg-[#0a0d16]/80 backdrop-blur-xl rounded-3xl border border-white/[0.06] p-6 lg:p-8">
                            {/* Section header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Star className="w-5 h-5 text-yellow-400" />
                                    Seller Ratings & Reviews
                                </h2>
                                {canRate && (
                                    <Button
                                        onClick={() => {
                                            setShowRatingForm(!showRatingForm);
                                            setRatingError('');
                                            setRatingSuccess('');
                                            setRatingValue(0);
                                            setRatingComment('');
                                        }}
                                        size="sm"
                                        className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-semibold"
                                    >
                                        <Star className="w-4 h-4 mr-1.5" />
                                        {showRatingForm ? 'Cancel' : 'Write Review'}
                                    </Button>
                                )}
                            </div>

                            {/* Stats summary + distribution */}
                            {ratingStats && ratingStats.totalRatings > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 mb-8 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                    {/* Left: big average */}
                                    <div className="flex flex-col items-center justify-center gap-1">
                                        <span className="text-5xl font-bold text-white">{ratingStats.averageRating}</span>
                                        <StarDisplay count={Math.round(ratingStats.averageRating)} size="w-5 h-5" />
                                        <span className="text-white/40 text-sm mt-1">{ratingStats.totalRatings} review{ratingStats.totalRatings !== 1 ? 's' : ''}</span>
                                    </div>
                                    {/* Right: distribution bars */}
                                    <div className="space-y-2">
                                        {[5, 4, 3, 2, 1].map((star) => {
                                            const count = ratingStats.distribution[star as keyof typeof ratingStats.distribution] || 0;
                                            const pct = ratingStats.totalRatings > 0 ? (count / ratingStats.totalRatings) * 100 : 0;
                                            return (
                                                <div key={star} className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1 w-10">
                                                        <span className="text-white/70 text-sm font-medium">{star}</span>
                                                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                                    </div>
                                                    <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-white/40 text-xs w-6 text-right">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Rating Form (inline, toggleable) */}
                            {showRatingForm && canRate && (
                                <div className="mb-8 p-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.03]">
                                    <h3 className="text-lg font-bold text-white mb-4">Your Review</h3>

                                    {/* Stars */}
                                    <div className="flex justify-center gap-3 mb-3">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setRatingValue(star)}
                                                onMouseEnter={() => setRatingHover(star)}
                                                onMouseLeave={() => setRatingHover(0)}
                                                className="transition-transform hover:scale-125 focus:outline-none"
                                            >
                                                <Star
                                                    className={`w-10 h-10 transition-colors ${
                                                        star <= (ratingHover || ratingValue)
                                                            ? 'text-yellow-400 fill-yellow-400'
                                                            : 'text-white/20'
                                                    }`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-center text-sm text-white/50 mb-4">
                                        {ratingValue === 0 ? 'Tap to rate' : ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][ratingValue]}
                                    </p>

                                    {/* Comment */}
                                    <textarea
                                        value={ratingComment}
                                        onChange={(e) => setRatingComment(e.target.value)}
                                        placeholder="Share your experience (optional)..."
                                        maxLength={500}
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 focus:border-yellow-500/50 focus:outline-none transition-all text-sm resize-none mb-1"
                                    />
                                    <p className="text-right text-xs text-white/30 mb-4">{ratingComment.length}/500</p>

                                    {ratingError && (
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                                            <p className="text-red-400 text-sm">⚠️ {ratingError}</p>
                                        </div>
                                    )}
                                    {ratingSuccess && (
                                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
                                            <p className="text-green-400 text-sm">✅ {ratingSuccess}</p>
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleSubmitRating}
                                        disabled={ratingValue === 0 || ratingLoading}
                                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-semibold disabled:opacity-50"
                                    >
                                        {ratingLoading ? 'Submitting…' : 'Submit Review'}
                                    </Button>
                                </div>
                            )}

                            {/* Ratings List */}
                            {ratingsLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
                                </div>
                            ) : sellerRatings.length === 0 ? (
                                <div className="text-center py-12">
                                    <Star className="w-12 h-12 mx-auto mb-3 text-white/10" />
                                    <p className="text-white/40 text-lg">No reviews yet</p>
                                    <p className="text-white/20 text-sm mt-1">Be the first to review this seller</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {sellerRatings.map((r) => (
                                        <div key={r._id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                                        <span className="text-white font-bold text-xs">
                                                            {r.rater?.username?.[0]?.toUpperCase() || '?'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium text-sm">{r.rater?.username || 'Unknown'}</p>
                                                        <p className="text-white/30 text-xs">
                                                            {new Date(r.createdAt).toLocaleDateString('en-US', {
                                                                year: 'numeric', month: 'short', day: 'numeric',
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <StarDisplay count={r.rating} size="w-3.5 h-3.5" />
                                                    {user && user.id === r.rater?._id && (
                                                        <button
                                                            onClick={() => handleDeleteRating(r._id)}
                                                            className="ml-1 text-white/20 hover:text-red-400 transition-colors"
                                                            title="Delete your rating"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {r.comment && (
                                                <div className="flex items-start gap-2 ml-12">
                                                    <MessageSquare className="w-3.5 h-3.5 text-white/20 mt-0.5 flex-shrink-0" />
                                                    <p className="text-white/60 text-sm leading-relaxed">{r.comment}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Pagination */}
                                    {ratingsTotalPages > 1 && (
                                        <div className="flex items-center justify-center gap-3 pt-4">
                                            <Button
                                                onClick={() => setRatingsPage(Math.max(1, ratingsPage - 1))}
                                                disabled={ratingsPage <= 1}
                                                variant="outline"
                                                size="sm"
                                                className="bg-white/[0.03] border-white/10 text-white hover:bg-white/[0.06] disabled:opacity-30"
                                            >
                                                Previous
                                            </Button>
                                            <span className="text-white/50 text-sm">
                                                Page {ratingsPage} of {ratingsTotalPages}
                                            </span>
                                            <Button
                                                onClick={() => setRatingsPage(Math.min(ratingsTotalPages, ratingsPage + 1))}
                                                disabled={ratingsPage >= ratingsTotalPages}
                                                variant="outline"
                                                size="sm"
                                                className="bg-white/[0.03] border-white/10 text-white hover:bg-white/[0.06] disabled:opacity-30"
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
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
                            <div className="flex justify-between items-center">
                                <span className="text-white/70 text-sm">Listing</span>
                                <span className="text-white text-sm font-medium truncate max-w-[180px]">{listing.title}</span>
                            </div>
                            {listing.discount ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/70 text-sm">Price</span>
                                        <span className="text-white/40 line-through text-sm">{listing.discount.originalPrice.toFixed(2)} EGP</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/70 text-sm">Discount ({listing.discount.discountPercent}%)</span>
                                        <span className="text-green-400 text-sm font-medium">
                                            - {(listing.discount.originalPrice - listing.discount.discountedPrice).toFixed(2)} EGP
                                        </span>
                                    </div>
                                    <div className="border-t border-white/10" />
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

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0a0d16] rounded-2xl border border-white/10 p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-white mb-4">Report Listing</h3>
                        <p className="text-white/70 mb-6">Report functionality coming soon...</p>
                        <Button onClick={() => setShowReportModal(false)} className="w-full">Close</Button>
                    </div>
                </div>
            )}
        </div>
    );
}