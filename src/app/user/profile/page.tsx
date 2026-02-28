'use client';

import { useState, useEffect } from 'react';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { ensureCsrfToken } from '@/utils/csrf';
import {
    User,
    Phone,
    MapPin,
    Calendar,
    Edit2,
    Save,
    X,
    Camera,
    Shield,
    Wallet,
    Clock,
    Heart,
    Package,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserProfile {
    id: string;
    username: string;
    email: string;
    phone: string;
    address: string;
    avatar: string;
    bio: string;
    isSeller: boolean;
    verified: boolean;
    createdAt: string;
    lastUsernameChange: string | null;
    lastPhoneChange: string | null;
    stats: {
        level: number;
        totalPurchases: number;
        totalSales: number;
        rating: number;
    };
    wallet: {
        balance: number;
    };
}

interface Listing {
    _id: string;
    title: string;
    price: number;
    game: { name: string; icon: string };
    status: string;
    createdAt: string;
}

export default function ProfilePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string>('');

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
    const [myListings, setMyListings] = useState<Listing[]>([]);
    const [favorites, setFavorites] = useState<Listing[]>([]);

    useEffect(() => {
        if (user) {
            fetchProfile();

            // Listen for updates from other components (e.g. after deposit, purchase)
            // NO polling here — the layout already handles periodic refresh
            const handleDataUpdate = () => {
                fetchProfile();
            };
            window.addEventListener('userDataUpdated', handleDataUpdate);

            return () => {
                window.removeEventListener('userDataUpdated', handleDataUpdate);
            };
        }
    }, [user?.username]);  // stable primitive dependency

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/users/profile', { credentials: 'include' });
            const data = await res.json();

            if (data.success) {
                setProfile(data.data.user);
                setEditedProfile({
                    username: data.data.user.username,
                    phone: data.data.user.phone,
                    address: data.data.user.address,
                    bio: data.data.user.bio,
                });
                setMyListings(data.data.myListings || []);
                setFavorites(data.data.favorites || []);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast({
                title: 'Error',
                description: 'Failed to load profile',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const canChangeUsername = () => {
        if (!profile?.lastUsernameChange) return true;
        const daysSince = (Date.now() - new Date(profile.lastUsernameChange).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince >= 20;
    };

    const canChangePhone = () => {
        if (!profile?.lastPhoneChange) return true;
        const daysSince = (Date.now() - new Date(profile.lastPhoneChange).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince >= 20;
    };

    const getDaysUntilUsernameChange = () => {
        if (!profile?.lastUsernameChange) return 0;
        const daysSince = (Date.now() - new Date(profile.lastUsernameChange).getTime()) / (1000 * 60 * 60 * 24);
        return Math.max(0, Math.ceil(20 - daysSince));
    };

    const getDaysUntilPhoneChange = () => {
        if (!profile?.lastPhoneChange) return 0;
        const daysSince = (Date.now() - new Date(profile.lastPhoneChange).getTime()) / (1000 * 60 * 60 * 24);
        return Math.max(0, Math.ceil(20 - daysSince));
    };

    const handleEditToggle = () => {
        if (isEditing) {
            setEditedProfile({
                username: profile?.username,
                phone: profile?.phone,
                address: profile?.address,
                bio: profile?.bio,
            });
            setAvatarPreview('');
        }
        setIsEditing(!isEditing);
    };

    const handleSaveProfile = async () => {
        if (!profile) return;

        // Validate username change
        if (editedProfile.username !== profile.username && !canChangeUsername()) {
            toast({
                title: 'Cannot Change Username',
                description: `You can change username in ${getDaysUntilUsernameChange()} days`,
                variant: 'destructive',
            });
            return;
        }

        // Validate phone change
        if (editedProfile.phone !== profile.phone && !canChangePhone()) {
            toast({
                title: 'Cannot Change Phone',
                description: `You can change phone in ${getDaysUntilPhoneChange()} days`,
                variant: 'destructive',
            });
            return;
        }

        setSaving(true);
        try {
            // Get fresh CSRF token
            const csrfToken = await ensureCsrfToken();

            if (!csrfToken) {
                toast({
                    title: 'Error',
                    description: 'Failed to get security token. Please refresh the page.',
                    variant: 'destructive',
                });
                setSaving(false);
                return;
            }

            console.log('🔐 Sending profile update with CSRF token');
            console.log('📤 Avatar preview length:', avatarPreview?.length || 0);
            console.log('📤 Avatar preview type:', typeof avatarPreview);
            console.log('📤 Avatar starts with data:image:', avatarPreview?.startsWith('data:image/'));

            const res = await fetch('/api/v1/users/profile', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': csrfToken
                },
                body: JSON.stringify({
                    username: editedProfile.username,
                    phone: editedProfile.phone,
                    address: editedProfile.address,
                    bio: editedProfile.bio,
                    avatar: avatarPreview || undefined,
                }),
            });

            console.log('📥 Profile update response status:', res.status);
            const data = await res.json();
            console.log('📥 Profile update response data:', data);
            console.log('📥 Avatar in response:', data.data?.avatar);

            if (data.success) {
                setProfile(data.data);
                setIsEditing(false);
                setAvatarPreview('');

                // Clear dashboard cache so profile image updates there too
                sessionStorage.removeItem('dashboard_data');
                sessionStorage.removeItem('dashboard_timestamp');

                toast({
                    title: 'Success',
                    description: 'Profile updated successfully',
                });
            } else {
                toast({
                    title: 'Error',
                    description: data.message || 'Failed to update profile',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            toast({
                title: 'Error',
                description: 'Network error',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast({
                    title: 'File Too Large',
                    description: 'Avatar must be less than 2MB',
                    variant: 'destructive',
                });
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    if (loading) {
        return (
            <UserDashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            </UserDashboardLayout>
        );
    }

    if (!profile) {
        return (
            <UserDashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <p className="text-white">Failed to load profile</p>
                    </div>
                </div>
            </UserDashboardLayout>
        );
    }

    const statusColors: Record<string, string> = {
        active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        available: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        sold: 'text-gray-400 bg-white/5 border-white/10',
        pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    };

    return (
        <UserDashboardLayout>
            <div className="min-h-screen bg-[#0d1117] p-4 md:p-6">
                <div className="max-w-5xl mx-auto space-y-5">

                    {/* ── Top Hero Card ─────────────────────────────── */}
                    <div className="relative rounded-2xl overflow-hidden border border-white/8 shadow-2xl">
                        {/* Gradient Banner */}
                        <div className="relative h-28 bg-gradient-to-r from-[#0d2137] via-[#1a1040] to-[#0a1f30]">
                            <div className="absolute inset-0 opacity-30"
                                style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #06b6d430 0%, transparent 50%), radial-gradient(circle at 80% 20%, #7c3aed30 0%, transparent 50%)' }}
                            />
                        </div>

                        {/* Card Body */}
                        <div className="bg-[#161b25] px-6 pb-5">
                            <div className="flex items-end justify-between -mt-10 mb-4">
                                {/* Avatar */}
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-[#161b25] shadow-xl">
                                        <img src={avatarPreview || profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    </div>
                                    {isEditing && (
                                        <label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 w-6 h-6 bg-cyan-500 hover:bg-cyan-400 rounded-lg flex items-center justify-center cursor-pointer transition-colors border-2 border-[#161b25]">
                                            <Camera className="w-3 h-3 text-white" />
                                            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                        </label>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="flex items-center gap-2 pb-1">
                                    {profile.verified && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-[11px] font-medium text-cyan-400">
                                            <Shield className="w-3 h-3" /> Verified
                                        </span>
                                    )}
                                    {!isEditing ? (
                                        <button onClick={handleEditToggle} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 transition-colors">
                                            <Edit2 className="w-3 h-3" /> Edit
                                        </button>
                                    ) : (
                                        <>
                                            <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-white h-7 px-3 text-xs rounded-lg">
                                                {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />} Save
                                            </Button>
                                            <button onClick={handleEditToggle} className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-400 transition-colors">
                                                <X className="w-3 h-3" /> Cancel
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Name & Info */}
                            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{profile.username}</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">{profile.email}</p>
                                    {profile.bio && !isEditing && (
                                        <p className="text-sm text-gray-400 mt-2 max-w-md">{profile.bio}</p>
                                    )}
                                </div>

                                {/* Stats pills */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                        <span className="text-xs text-gray-500">Lv.</span>
                                        <span className="text-sm font-bold text-purple-400">{profile.stats.level}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                        <span className="text-sm">⭐</span>
                                        <span className="text-sm font-bold text-yellow-400">{profile.stats.rating}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-sm font-bold text-emerald-400">${profile.wallet.balance.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Main Grid ────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                        {/* ── Left sidebar ── */}
                        <div className="lg:col-span-2 space-y-4">

                            {/* Personal Info Card */}
                            <div className="bg-[#161b25] border border-white/8 rounded-2xl overflow-hidden">
                                <div className="px-5 py-4 border-b border-white/5">
                                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                        <User className="w-4 h-4 text-cyan-500" /> Personal Info
                                    </h3>
                                </div>
                                <div className="p-5 space-y-4">
                                    {/* Username */}
                                    <div>
                                        <label className="text-[11px] text-gray-600 uppercase tracking-widest block mb-1.5">Username</label>
                                        {isEditing && canChangeUsername() ? (
                                            <input type="text" value={editedProfile.username || ''} onChange={(e) => setEditedProfile({ ...editedProfile, username: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none" />
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-white">{profile.username}</span>
                                                {isEditing && !canChangeUsername() && (
                                                    <span className="text-[10px] text-yellow-500/70 flex items-center gap-0.5">
                                                        <Clock className="w-2.5 h-2.5" /> {getDaysUntilUsernameChange()}d
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="text-[11px] text-gray-600 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> Phone
                                        </label>
                                        {isEditing && canChangePhone() ? (
                                            <input type="tel" value={editedProfile.phone || ''} onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                                                placeholder="Enter phone number" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none placeholder:text-white/20" />
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-white">{profile.phone || <span className="text-gray-600">—</span>}</span>
                                                {isEditing && !canChangePhone() && profile.phone && (
                                                    <span className="text-[10px] text-yellow-500/70 flex items-center gap-0.5">
                                                        <Clock className="w-2.5 h-2.5" /> {getDaysUntilPhoneChange()}d
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Address */}
                                    <div>
                                        <label className="text-[11px] text-gray-600 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> Address
                                        </label>
                                        {isEditing ? (
                                            <input type="text" value={editedProfile.address || ''} onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })}
                                                placeholder="Enter address" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none placeholder:text-white/20" />
                                        ) : (
                                            <span className="text-sm text-white">{profile.address || <span className="text-gray-600">—</span>}</span>
                                        )}
                                    </div>

                                    {/* Bio (edit only) */}
                                    {isEditing && (
                                        <div>
                                            <label className="text-[11px] text-gray-600 uppercase tracking-widest block mb-1.5">Bio</label>
                                            <textarea value={editedProfile.bio || ''} onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                                                placeholder="Tell us about yourself..." maxLength={500} rows={3}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none placeholder:text-white/20 resize-none" />
                                            <p className="text-[10px] text-gray-700 text-right mt-1">{(editedProfile.bio || '').length}/500</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Activity Card */}
                            <div className="bg-[#161b25] border border-white/8 rounded-2xl overflow-hidden">
                                <div className="px-5 py-4 border-b border-white/5">
                                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-purple-400" /> Activity
                                    </h3>
                                </div>
                                <div className="p-5 space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Purchases</span>
                                        <span className="font-semibold text-cyan-400">{profile.stats.totalPurchases}</span>
                                    </div>
                                    {profile.isSeller && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Sales</span>
                                            <span className="font-semibold text-purple-400">{profile.stats.totalSales}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Member Since</span>
                                        <span className="text-white/70">{new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Listings ── */}
                        <div className="lg:col-span-3">
                            <div className="bg-[#161b25] border border-white/8 rounded-2xl overflow-hidden h-full">
                                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                                        {profile.isSeller ? (
                                            <><Package className="w-4 h-4 text-cyan-400" /> My Listings</>
                                        ) : (
                                            <><Heart className="w-4 h-4 text-pink-400" /> My Favorites</>
                                        )}
                                    </h3>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-gray-500">
                                        {profile.isSeller ? myListings.length : favorites.length}
                                    </span>
                                </div>

                                <div className="p-4">
                                    {profile.isSeller && myListings.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-16 text-gray-700">
                                            <Package className="w-8 h-8 mb-2 opacity-30" />
                                            <p className="text-sm">No listings yet</p>
                                        </div>
                                    )}
                                    {!profile.isSeller && favorites.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-16 text-gray-700">
                                            <Heart className="w-8 h-8 mb-2 opacity-30" />
                                            <p className="text-sm">No favorites yet</p>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {(profile.isSeller ? myListings : favorites).map((listing) => (
                                            <div key={listing._id} className="flex items-center justify-between px-4 py-3 bg-white/3 hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl transition-all group cursor-pointer">
                                                {/* Left: title + game */}
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-white truncate group-hover:text-cyan-300 transition-colors">
                                                        {listing.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{listing.game?.name}</p>
                                                </div>

                                                {/* Right: price + status + date */}
                                                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                                                    <span className="text-sm font-bold text-cyan-400">EGP {listing.price.toLocaleString()}</span>
                                                    {listing.status && (
                                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${statusColors[listing.status] || statusColors.active}`}>
                                                            {listing.status}
                                                        </span>
                                                    )}
                                                    <span className="text-[11px] text-gray-600 hidden sm:block">
                                                        {new Date(listing.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </UserDashboardLayout>
    );
}
