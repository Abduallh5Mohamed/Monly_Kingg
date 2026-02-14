'use client';

import { useState, useEffect } from 'react';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
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
    Trophy,
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

            const interval = setInterval(fetchProfile, 15000);

            const handleDataUpdate = () => {
                fetchProfile();
            };
            window.addEventListener('userDataUpdated', handleDataUpdate);

            return () => {
                clearInterval(interval);
                window.removeEventListener('userDataUpdated', handleDataUpdate);
            };
        }
    }, [user]);

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
            const res = await fetch('/api/v1/users/profile', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: editedProfile.username,
                    phone: editedProfile.phone,
                    address: editedProfile.address,
                    bio: editedProfile.bio,
                    avatar: avatarPreview || undefined,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setProfile(data.data);
                setIsEditing(false);
                setAvatarPreview('');
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

    return (
        <UserDashboardLayout>
            <div className="min-h-screen bg-gradient-to-br from-[#0a0e14] via-[#1a1f2e] to-[#0f1419] p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-[#f5f5dc]">My Profile</h1>
                        <p className="text-gray-400 mt-1">Manage your account information and settings</p>
                    </div>
                    {!isEditing && (
                        <Button
                            onClick={handleEditToggle}
                            className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg shadow-cyan-500/30 transition-all"
                        >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit Profile
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Profile Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-gradient-to-br from-[#1a1d2e]/90 to-[#252841]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">
                            {/* Avatar */}
                            <div className="flex flex-col items-center mb-6">
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-cyan-500/50 shadow-lg shadow-cyan-500/30">
                                        <img
                                            src={avatarPreview || profile.avatar}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    {isEditing && (
                                        <label
                                            htmlFor="avatar-upload"
                                            className="absolute bottom-0 right-0 bg-gradient-to-r from-cyan-500 to-cyan-600 p-2 rounded-full cursor-pointer hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-lg"
                                        >
                                            <Camera className="w-4 h-4 text-white" />
                                            <input
                                                id="avatar-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleAvatarChange}
                                            />
                                        </label>
                                    )}
                                </div>
                                <h2 className="text-2xl font-bold text-[#f5f5dc] mt-4">{profile.username}</h2>
                                {profile.verified && (
                                    <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-xs text-cyan-300">
                                        <Shield className="w-3 h-3" /> Verified
                                    </span>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="space-y-3 border-t border-white/10 pt-6">
                                <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-xl border border-purple-500/30">
                                    <div className="flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-purple-400" />
                                        <span className="text-sm text-gray-300">Level</span>
                                    </div>
                                    <span className="text-lg font-bold text-purple-400">{profile.stats.level}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="w-5 h-5 text-emerald-400" />
                                        <span className="text-sm text-gray-300">Balance</span>
                                    </div>
                                    <span className="text-lg font-bold text-emerald-400">
                                        ${profile.wallet.balance.toLocaleString()}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-cyan-400" />
                                        <span className="text-sm text-gray-300">Rating</span>
                                    </div>
                                    <span className="text-lg font-bold text-cyan-400">{profile.stats.rating} ⭐</span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-gray-400" />
                                        <span className="text-sm text-gray-300">Member Since</span>
                                    </div>
                                    <span className="text-sm font-medium text-[#f5f5dc]">
                                        {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            {/* Activity Summary */}
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <h3 className="text-sm font-semibold text-[#f5f5dc] mb-3">Activity Summary</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                                        <div className="text-2xl font-bold text-cyan-400">{profile.stats.totalPurchases}</div>
                                        <div className="text-xs text-gray-400 mt-1">Purchases</div>
                                    </div>
                                    {profile.isSeller && (
                                        <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                                            <div className="text-2xl font-bold text-purple-400">{profile.stats.totalSales}</div>
                                            <div className="text-xs text-gray-400 mt-1">Sales</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Personal Information Card */}
                        <div className="bg-gradient-to-br from-[#1a1d2e]/90 to-[#252841]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-[#f5f5dc]">Personal Information</h3>
                                {isEditing && (
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleSaveProfile}
                                            disabled={saving}
                                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30"
                                        >
                                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                            Save
                                        </Button>
                                        <Button
                                            onClick={handleEditToggle}
                                            variant="outline"
                                            className="border-white/10 text-gray-300 hover:bg-white/5"
                                        >
                                            <X className="w-4 h-4 mr-2" />
                                            Cancel
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Username */}
                                <div>
                                    <label className="block text-sm font-medium text-[#f5f5dc] mb-2">
                                        <User className="w-4 h-4 inline mr-2" />
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        value={isEditing ? editedProfile.username : profile.username}
                                        onChange={(e) => setEditedProfile({ ...editedProfile, username: e.target.value })}
                                        disabled={!isEditing || !canChangeUsername()}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f5f5dc] focus:border-cyan-500/50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    {isEditing && !canChangeUsername() && (
                                        <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Can change in {getDaysUntilUsernameChange()} days
                                        </p>
                                    )}
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-sm font-medium text-[#f5f5dc] mb-2">
                                        <Phone className="w-4 h-4 inline mr-2" />
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={isEditing ? (editedProfile.phone || '') : (profile.phone || '')}
                                        onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                                        disabled={!isEditing || !canChangePhone()}
                                        placeholder="Enter phone number"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f5f5dc] focus:border-cyan-500/50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-white/30"
                                    />
                                    {isEditing && !canChangePhone() && profile.phone && (
                                        <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Can change in {getDaysUntilPhoneChange()} days
                                        </p>
                                    )}
                                </div>

                                {/* Address */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-[#f5f5dc] mb-2">
                                        <MapPin className="w-4 h-4 inline mr-2" />
                                        Address
                                    </label>
                                    <input
                                        type="text"
                                        value={isEditing ? (editedProfile.address || '') : (profile.address || '')}
                                        onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })}
                                        disabled={!isEditing}
                                        placeholder="Enter your address"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f5f5dc] focus:border-cyan-500/50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-white/30"
                                    />
                                </div>

                                {/* Bio */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-[#f5f5dc] mb-2">Bio</label>
                                    <textarea
                                        value={isEditing ? (editedProfile.bio || '') : (profile.bio || '')}
                                        onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                                        disabled={!isEditing}
                                        placeholder="Tell us about yourself..."
                                        maxLength={500}
                                        rows={3}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#f5f5dc] focus:border-cyan-500/50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-white/30 resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* My Listings or Favorites */}
                        <div className="bg-gradient-to-br from-[#1a1d2e]/90 to-[#252841]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-xl font-bold text-[#f5f5dc] mb-4 flex items-center gap-2">
                                {profile.isSeller ? (
                                    <>
                                        <Package className="w-5 h-5 text-cyan-400" />
                                        My Listings ({myListings.length})
                                    </>
                                ) : (
                                    <>
                                        <Heart className="w-5 h-5 text-pink-400" />
                                        My Favorites ({favorites.length})
                                    </>
                                )}
                            </h3>

                            {profile.isSeller && myListings.length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>No listings yet</p>
                                </div>
                            )}

                            {!profile.isSeller && favorites.length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>No favorites yet</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(profile.isSeller ? myListings : favorites).map((listing) => (
                                    <div
                                        key={listing._id}
                                        className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                                                <span className="text-2xl">{listing.game?.icon || '🎮'}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold text-white truncate">{listing.title}</h4>
                                                <p className="text-xs text-gray-400 mt-1">{listing.game?.name}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-sm font-bold text-cyan-400">${listing.price}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(listing.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </UserDashboardLayout>
    );
}
