'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ensureCsrfToken } from '@/utils/csrf';
import {
    ArrowLeft,
    Star,
    User as UserIcon,
    Crown,
    MessageSquare,
    X,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Rating {
    _id: string;
    rating: number;
    comment: string | null;
    rater: {
        _id: string;
        username: string;
        avatar: string | null;
    };
    createdAt: string;
    updatedAt: string;
}

interface RatingStats {
    averageRating: number;
    totalRatings: number;
    distribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
}

interface SellerInfo {
    _id: string;
    username: string;
    avatar: string | null;
    isSeller: boolean;
}

export default function SellerRatingsPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const sellerId = params.sellerId as string;

    const [ratings, setRatings] = useState<Rating[]>([]);
    const [stats, setStats] = useState<RatingStats | null>(null);
    const [seller, setSeller] = useState<SellerInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Rating form state
    const [showRatingForm, setShowRatingForm] = useState(false);
    const [ratingValue, setRatingValue] = useState(0);
    const [ratingHover, setRatingHover] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    useEffect(() => {
        if (sellerId) {
            fetchRatings();
            fetchSellerInfo();
        }
    }, [sellerId, page]);

    const fetchSellerInfo = async () => {
        try {
            const res = await fetch(`/api/v1/users/${sellerId}/public`, { credentials: 'include' });
            const data = await res.json();
            if (data.data) setSeller(data.data);
        } catch (err) {
            console.error('Failed to fetch seller info:', err);
        }
    };

    const fetchRatings = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/ratings/${sellerId}?page=${page}&limit=10`, { credentials: 'include' });
            const data = await res.json();
            if (data.data) {
                setRatings(data.data);
                setStats(data.stats);
                setTotalPages(data.totalPages || 1);
            }
        } catch (err) {
            console.error('Failed to fetch ratings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitRating = async () => {
        if (ratingValue === 0) return;
        setSubmitting(true);
        setFormError('');
        setFormSuccess('');
        try {
            const csrfToken = await ensureCsrfToken() || '';
            const res = await fetch(`/api/v1/ratings/${sellerId}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
                body: JSON.stringify({ rating: ratingValue, comment: ratingComment || undefined }),
            });
            const data = await res.json();
            if (res.ok) {
                setFormSuccess(data.message || 'Rating submitted!');
                setRatingValue(0);
                setRatingComment('');
                setTimeout(() => {
                    setShowRatingForm(false);
                    setFormSuccess('');
                    fetchRatings();
                }, 1500);
            } else {
                setFormError(data.message || 'Failed to submit rating');
            }
        } catch {
            setFormError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRating = async (ratingId: string) => {
        if (!confirm('Are you sure you want to delete this rating?')) return;
        try {
            const csrfToken = await ensureCsrfToken() || '';
            const res = await fetch(`/api/v1/ratings/${ratingId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'X-XSRF-TOKEN': csrfToken },
            });
            if (res.ok) {
                fetchRatings();
            }
        } catch (err) {
            console.error('Failed to delete rating:', err);
        }
    };

    const StarDisplay = ({ count, size = 'w-4 h-4' }: { count: number; size?: string }) => (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <Star
                    key={s}
                    className={`${size} ${s <= count ? 'text-yellow-400 fill-yellow-400' : 'text-white/15'}`}
                />
            ))}
        </div>
    );

    const canRate = user && user.id !== sellerId;

    return (
        <div className="min-h-screen bg-[#060811]">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[40%] -left-[20%] w-[60%] h-[60%] rounded-full bg-yellow-600/[0.02] blur-[120px]" />
                <div className="absolute -bottom-[30%] -right-[15%] w-[50%] h-[50%] rounded-full bg-orange-600/[0.02] blur-[120px]" />
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
                            <h1 className="text-lg font-bold text-white flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-400" />
                                Seller Ratings
                            </h1>
                            <div className="w-16" />
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8 max-w-3xl">
                    {/* Seller Info Card */}
                    <div className="bg-[#0a0d16]/80 backdrop-blur-xl rounded-3xl border border-white/[0.06] p-6 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                    <span className="text-white font-bold text-xl">
                                        {seller?.username?.[0]?.toUpperCase() || '?'}
                                    </span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold text-white">{seller?.username || 'Loading...'}</h2>
                                        {seller?.isSeller && <Crown className="w-5 h-5 text-yellow-400" />}
                                    </div>
                                    {stats && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <StarDisplay count={Math.round(stats.averageRating)} />
                                            <span className="text-yellow-400 font-bold text-sm">{stats.averageRating}</span>
                                            <span className="text-white/40 text-sm">({stats.totalRatings} rating{stats.totalRatings !== 1 ? 's' : ''})</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {canRate && (
                                <Button
                                    onClick={() => { setShowRatingForm(!showRatingForm); setFormError(''); setFormSuccess(''); }}
                                    className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-semibold"
                                >
                                    <Star className="w-4 h-4 mr-2" />
                                    Rate
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Rating Form */}
                    {showRatingForm && (
                        <div className="bg-[#0a0d16]/80 backdrop-blur-xl rounded-3xl border border-yellow-500/20 p-6 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-400" />
                                Write a Review
                            </h3>

                            {/* Stars */}
                            <div className="flex justify-center gap-3 mb-4">
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

                            {formError && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                                    <p className="text-red-400 text-sm">⚠️ {formError}</p>
                                </div>
                            )}
                            {formSuccess && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
                                    <p className="text-green-400 text-sm">✅ {formSuccess}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button onClick={() => setShowRatingForm(false)} variant="outline"
                                    className="flex-1 bg-white/[0.03] border-white/10 text-white hover:bg-white/[0.06]">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSubmitRating}
                                    disabled={ratingValue === 0 || submitting}
                                    className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-semibold disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting…' : 'Submit Review'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Stats Distribution */}
                    {stats && stats.totalRatings > 0 && (
                        <div className="bg-[#0a0d16]/80 backdrop-blur-xl rounded-3xl border border-white/[0.06] p-6 mb-6">
                            <h3 className="text-lg font-bold text-white mb-4">Rating Distribution</h3>
                            <div className="space-y-2">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = stats.distribution[star as keyof typeof stats.distribution] || 0;
                                    const pct = stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0;
                                    return (
                                        <div key={star} className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 w-12">
                                                <span className="text-white/70 text-sm font-medium">{star}</span>
                                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                            </div>
                                            <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-white/40 text-xs w-8 text-right">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Ratings List */}
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
                        </div>
                    ) : ratings.length === 0 ? (
                        <div className="text-center py-16">
                            <Star className="w-16 h-16 mx-auto mb-4 text-white/10" />
                            <p className="text-white/40 text-lg">No ratings yet</p>
                            <p className="text-white/20 text-sm mt-1">Be the first to rate this seller</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {ratings.map((r) => (
                                <div key={r._id} className="bg-[#0a0d16]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 hover:border-white/10 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                                <span className="text-white font-bold text-sm">
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
                                                    className="ml-2 text-white/20 hover:text-red-400 transition-colors"
                                                    title="Delete your rating"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {r.comment && (
                                        <div className="flex items-start gap-2 ml-[52px]">
                                            <MessageSquare className="w-3.5 h-3.5 text-white/20 mt-0.5 flex-shrink-0" />
                                            <p className="text-white/60 text-sm leading-relaxed">{r.comment}</p>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-3 pt-4">
                                    <Button
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page <= 1}
                                        variant="outline"
                                        className="bg-white/[0.03] border-white/10 text-white hover:bg-white/[0.06] disabled:opacity-30"
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-white/50 text-sm">
                                        Page {page} of {totalPages}
                                    </span>
                                    <Button
                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                        disabled={page >= totalPages}
                                        variant="outline"
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
    );
}
