'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Store, User, Mail, Phone, MapPin, Calendar, Globe,
    TrendingUp, BarChart3, Package, ShoppingBag, DollarSign,
    MessageSquare, FileImage, CheckCircle2, Loader2, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserProfile {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
    phone?: string;
    address?: string;
    bio?: string;
    fullName?: string;
    stats?: { totalVolume: number; level: number; successfulTrades: number; failedTrades: number };
    isSeller?: boolean;
    sellerApprovedAt?: string;
    createdAt?: string;
    isOnline?: boolean;
    lastSeenAt?: string;
    wallet?: { balance: number; hold: number };
}

interface SellerRequest {
    _id: string;
    user: UserProfile;
    idType: string;
    idImage: string;
    faceImageFront: string;
    faceImageLeft: string;
    faceImageRight: string;
    fullName: string;
    status: string;
    reviewedAt?: string;
    applicationCount?: number;
}

interface ListingItem {
    _id: string;
    title: string;
    price: number;
    status: string;
    game?: { name: string };
    createdAt: string;
}

interface ChatItem {
    _id: string;
    chatNumber: string;
    type: string;
    lastMessage?: { content: string; timestamp: string };
    participants: { _id: string; username: string; avatar?: string }[];
    updatedAt: string;
}

interface SellerDetail extends SellerRequest {
    listings: ListingItem[];
    chats: ChatItem[];
    sellerStats?: {
        totalListings: number;
        activeListings: number;
        soldListings: number;
        totalRevenue: number;
    };
}

export default function SellerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [seller, setSeller] = useState<SellerDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [imageViewer, setImageViewer] = useState<{ open: boolean; images: string[]; currentIndex: number }>({
        open: false,
        images: [],
        currentIndex: 0,
    });

    useEffect(() => {
        fetchSellerDetail();
    }, [params.id]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!imageViewer.open) return;

            if (e.key === 'Escape') closeImageViewer();
            if (e.key === 'ArrowLeft') prevImage();
            if (e.key === 'ArrowRight') nextImage();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [imageViewer.open, imageViewer.currentIndex]);

    const fetchSellerDetail = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/seller/detail/${params.id}`, { credentials: 'include' });
            const data = await res.json();
            if (data.data) setSeller(data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const openImageViewer = (images: string[], startIndex: number = 0) => {
        setImageViewer({ open: true, images, currentIndex: startIndex });
    };

    const closeImageViewer = () => {
        setImageViewer({ open: false, images: [], currentIndex: 0 });
    };

    const nextImage = () => {
        setImageViewer(prev => ({
            ...prev,
            currentIndex: (prev.currentIndex + 1) % prev.images.length,
        }));
    };

    const prevImage = () => {
        setImageViewer(prev => ({
            ...prev,
            currentIndex: prev.currentIndex === 0 ? prev.images.length - 1 : prev.currentIndex - 1,
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    if (!seller) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Store className="w-16 h-16 text-white/20 mb-4" />
                <p className="text-white/50">Seller not found</p>
                <Button onClick={() => router.push('/admin/sellers')} className="mt-4 rounded-xl">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sellers
                </Button>
            </div>
        );
    }

    const allImages = [seller.idImage, seller.faceImageFront, seller.faceImageLeft, seller.faceImageRight];

    return (
        <div className="space-y-4 sm:space-y-5 md:space-y-6 pb-8 sm:pb-10">
            {/* Back Button */}
            <Button
                onClick={() => router.push('/admin/sellers')}
                variant="outline"
                className="rounded-xl border-white/10 text-white/60 hover:text-white text-sm"
            >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sellers
            </Button>

            {/* Header Card */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6 md:p-8">
                <div className="flex items-start gap-4 sm:gap-6">
                    {seller.user?.avatar ? (
                        <img
                            src={seller.user.avatar}
                            alt=""
                            className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl object-cover border-2 border-green-500/30 cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                            onClick={() => openImageViewer([seller.user!.avatar!], 0)}
                        />
                    ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                            <Store className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-green-400" />
                        </div>
                    )}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-2">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{seller.fullName}</h1>
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approved Seller
                            </span>
                            {seller.user?.isOnline && (
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    Online
                                </span>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-white/60 mb-1">@{seller.user?.username} · {seller.user?.email}</p>
                        {seller.reviewedAt && (
                            <p className="text-xs sm:text-sm text-white/40">Approved on {new Date(seller.reviewedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Package className="w-6 h-6" />} label="Total Listings" value={seller.sellerStats?.totalListings || 0} color="cyan" />
                <StatCard icon={<ShoppingBag className="w-6 h-6" />} label="Items Sold" value={seller.sellerStats?.soldListings || 0} color="green" />
                <StatCard icon={<DollarSign className="w-6 h-6" />} label="Total Revenue" value={`$${seller.sellerStats?.totalRevenue || 0}`} color="yellow" />
                <StatCard icon={<MessageSquare className="w-6 h-6" />} label="Active Chats" value={seller.chats?.length || 0} color="purple" />
            </div>

            {/* User Profile Details */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6 md:p-8">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-cyan-400" /> User Profile
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <InfoCard icon={<Mail className="w-4 h-4" />} label="Email" value={seller.user?.email} />
                    <InfoCard icon={<Phone className="w-4 h-4" />} label="Phone" value={seller.user?.phone || 'N/A'} />
                    <InfoCard icon={<MapPin className="w-4 h-4" />} label="Address" value={seller.user?.address || 'N/A'} />
                    <InfoCard icon={<Calendar className="w-4 h-4" />} label="Member Since" value={seller.user?.createdAt ? new Date(seller.user.createdAt).toLocaleDateString() : 'N/A'} />
                    <InfoCard icon={<TrendingUp className="w-4 h-4" />} label="Level" value={`Lv. ${seller.user?.stats?.level || 1}`} />
                    <InfoCard icon={<BarChart3 className="w-4 h-4" />} label="Successful Trades" value={`${seller.user?.stats?.successfulTrades || 0}`} />
                </div>
                {seller.user?.bio && (
                    <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-xs text-white/40 mb-1.5 sm:mb-2">Bio</p>
                        <p className="text-xs sm:text-sm text-white/80 leading-relaxed">{seller.user.bio}</p>
                    </div>
                )}
            </div>

            {/* Identity Documents */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6 md:p-8">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                    <FileImage className="w-5 h-5 text-cyan-400" /> Identity Documents
                </h2>

                {/* ID Document - Full Width */}
                <div className="mb-6">
                    <p className="text-sm text-white/50 mb-3 font-medium">
                        {seller.idType === 'national_id' ? 'National ID' : 'Passport'}
                    </p>
                    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.06] bg-black/20 shadow-lg">
                        <img
                            src={seller.idImage}
                            alt="ID"
                            className="w-full h-auto max-h-[200px] sm:max-h-[240px] md:max-h-[280px] object-contain cursor-pointer hover:scale-[1.02] transition-transform"
                            onClick={() => openImageViewer(allImages, 0)}
                        />
                    </div>
                </div>

                {/* Face Verification Photos */}
                <div>
                    <p className="text-sm text-white/50 mb-4 font-medium">Face Verification (3 Angles)</p>
                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                        {[
                            { label: 'Front', src: seller.faceImageFront, index: 1 },
                            { label: 'Left Side', src: seller.faceImageLeft, index: 2 },
                            { label: 'Right Side', src: seller.faceImageRight, index: 3 },
                        ].map((img) => (
                            <div key={img.label} className="group">
                                <p className="text-xs text-white/40 mb-2 text-center truncate">{img.label}</p>
                                <div className="relative overflow-hidden rounded-lg sm:rounded-xl border border-white/[0.06] bg-black/20 aspect-[3/4]">
                                    <img
                                        src={img.src}
                                        alt={img.label}
                                        className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                                        onClick={() => openImageViewer(allImages, img.index)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Listings */}
            {seller.listings && seller.listings.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6 md:p-8">
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                        <Package className="w-5 h-5 text-cyan-400" /> Listings ({seller.listings.length})
                    </h2>
                    <div className="overflow-x-auto -mx-4 sm:-mx-6 md:-mx-8">
                        <div className="inline-block min-w-full align-middle px-4 sm:px-6 md:px-8">
                            <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                                            <th className="text-left text-xs font-medium text-white/50 px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Title</th>
                                            <th className="text-left text-xs font-medium text-white/50 px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">Game</th>
                                            <th className="text-left text-xs font-medium text-white/50 px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Price</th>
                                            <th className="text-left text-xs font-medium text-white/50 px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Status</th>
                                            <th className="text-left text-xs font-medium text-white/50 px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {seller.listings.map((l) => (
                                            <tr key={l._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-white/80 max-w-[150px] sm:max-w-xs truncate">{l.title}</td>
                                                <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-white/60 hidden sm:table-cell">{l.game?.name || '-'}</td>
                                                <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-green-400 font-semibold whitespace-nowrap">${l.price}</td>
                                                <td className="px-4 sm:px-6 py-3 sm:py-4">
                                                    <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium whitespace-nowrap ${l.status === 'available'
                                                        ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                                        : 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
                                                        }`}>
                                                        {l.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs text-white/40 whitespace-nowrap hidden md:table-cell">{new Date(l.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Chats */}
            {seller.chats && seller.chats.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6 md:p-8">
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-cyan-400" /> Recent Chats ({seller.chats.length})
                    </h2>
                    <div className="space-y-2 sm:space-y-3">
                        {seller.chats.map((chat) => {
                            const otherUser = chat.participants?.find(p => p._id !== seller.user?._id);
                            return (
                                <div key={chat._id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/30">
                                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm text-white font-medium truncate">
                                            Chat #{chat.chatNumber} {otherUser ? `with @${otherUser.username}` : ''}
                                        </p>
                                        <p className="text-xs text-white/50 truncate mt-0.5">{chat.lastMessage?.content || 'No messages yet'}</p>
                                    </div>
                                    <span className="text-xs text-white/30 flex-shrink-0 hidden sm:block">{new Date(chat.updatedAt).toLocaleDateString()}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Image Viewer Modal */}
            {imageViewer.open && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
                    {/* Close Button */}
                    <button
                        onClick={closeImageViewer}
                        className="absolute top-4 right-4 md:top-6 md:right-6 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    >
                        <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </button>

                    {/* Navigation Buttons */}
                    {imageViewer.images.length > 1 && (
                        <>
                            <button
                                onClick={prevImage}
                                className="absolute left-2 md:left-6 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                            >
                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
                            </button>
                            <button
                                onClick={nextImage}
                                className="absolute right-2 md:right-6 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                            >
                                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
                            </button>
                        </>
                    )}

                    {/* Image Container */}
                    <div className="relative w-full max-w-5xl max-h-[85vh] flex items-center justify-center">
                        <img
                            src={imageViewer.images[imageViewer.currentIndex]}
                            alt="Preview"
                            className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl md:rounded-2xl shadow-2xl"
                        />

                        {/* Image Counter */}
                        {imageViewer.images.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/70 backdrop-blur-sm text-white text-sm font-medium border border-white/10">
                                {imageViewer.currentIndex + 1} / {imageViewer.images.length}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Helper Components ─── */
function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
    return (
        <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
            <div className="flex items-center gap-2 text-white/40 mb-1.5 sm:mb-2">
                {icon}
                <span className="text-xs">{label}</span>
            </div>
            <p className="text-xs sm:text-sm text-white/90 font-medium truncate">{value || 'N/A'}</p>
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
    const colorMap: Record<string, string> = {
        cyan: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 text-cyan-400',
        green: 'from-green-500/10 to-green-600/5 border-green-500/20 text-green-400',
        yellow: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 text-yellow-400',
        purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-400',
    };
    return (
        <div className={`p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br border ${colorMap[color]}`}>
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">{icon}<span className="text-xs sm:text-sm text-white/60">{label}</span></div>
            <p className="text-2xl sm:text-2xl md:text-3xl font-bold">{value}</p>
        </div>
    );
}
