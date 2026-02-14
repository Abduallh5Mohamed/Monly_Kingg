'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import {
    ArrowLeft,
    Loader2,
    CheckCircle2,
    AlertCircle,
    DollarSign,
    FileText,
    Save,
} from 'lucide-react';

interface Game {
    _id: string;
    name: string;
}

interface Listing {
    _id: string;
    title: string;
    game: { _id: string; name: string } | string;
    description: string;
    price: number;
    details: any;
    status: 'available' | 'sold';
}

export default function EditListingPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const listingId = params.id as string;

    const [games, setGames] = useState<Game[]>([]);
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        gameId: '',
        description: '',
        price: '',
        rank: '',
        skinsCount: '',
        status: 'available' as 'available' | 'sold',
    });

    useEffect(() => {
        if (!authLoading && (!user || !user.isSeller)) {
            router.push('/user/dashboard');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        fetchGames();
        fetchListing();
    }, [listingId]);

    const fetchGames = async () => {
        try {
            const res = await fetch('/api/v1/games', { credentials: 'include' });
            const data = await res.json();
            if (data.data) setGames(data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchListing = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/listings/my-listings/${listingId}`, { credentials: 'include' });
            const data = await res.json();
            if (data.data) {
                const l = data.data;
                setListing(l);
                setFormData({
                    title: l.title || '',
                    gameId: typeof l.game === 'object' ? l.game._id : l.game,
                    description: l.description || '',
                    price: l.price?.toString() || '',
                    rank: l.details?.rank || '',
                    skinsCount: l.details?.skinsCount || '',
                    status: l.status || 'available',
                });
            } else {
                setError(data.message || 'Failed to load listing');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load listing');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.title.trim()) {
            setError('Please enter an account title');
            return;
        }
        if (!formData.gameId) {
            setError('Please select a game');
            return;
        }
        if (!formData.price || Number(formData.price) <= 0) {
            setError('Please enter a valid price');
            return;
        }

        setSaving(true);

        try {
            const details: Record<string, string> = {};
            if (formData.rank) details.rank = formData.rank;
            if (formData.skinsCount) details.skinsCount = formData.skinsCount;

            const res = await fetch(`/api/v1/listings/${listingId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    game: formData.gameId,
                    description: formData.description,
                    price: Number(formData.price),
                    details,
                    status: formData.status,
                }),
            });

            const result = await res.json();

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/user/store');
                }, 1500);
            } else {
                setError(result.message || 'Failed to update listing');
            }
        } catch (err) {
            console.error(err);
            setError('An error occurred while updating');
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <UserDashboardLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
            </UserDashboardLayout>
        );
    }

    return (
        <UserDashboardLayout>
            <div className="min-h-screen bg-gradient-to-br from-[#0a0e14] via-[#1a1f2e] to-[#0f1419] pb-20">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <Button
                            onClick={() => router.push('/user/store')}
                            variant="ghost"
                            className="mb-4 text-white/60 hover:text-white"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to My Store
                        </Button>
                        <h1 className="text-3xl font-bold text-white mb-2">Edit Listing</h1>
                        <p className="text-gray-400">Update your account listing details</p>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                            <p className="text-green-400 font-medium">Listing updated successfully!</p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <p className="text-red-400 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Info Card */}
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-cyan-400" />
                                Basic Information
                            </h2>

                            <div className="space-y-5">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-2">
                                        Account Title <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                                        placeholder="e.g. Legendary League of Legends Account"
                                        required
                                    />
                                </div>

                                {/* Game */}
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-2">
                                        Game <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        name="gameId"
                                        value={formData.gameId}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all appearance-none cursor-pointer"
                                        required
                                    >
                                        <option value="">Select a game</option>
                                        {games.map((game) => (
                                            <option key={game._id} value={game._id} className="bg-[#1a1f2e]">
                                                {game.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Price */}
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-2">
                                        Price (€) <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                        <input
                                            type="number"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                                            placeholder="0.00"
                                            step="0.01"
                                            min="0"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-2">
                                        Description <span className="text-red-400">*</span>
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all resize-none"
                                        placeholder="Describe your account in detail..."
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Game Details Card */}
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6">
                            <h2 className="text-xl font-bold text-white mb-6">Account Details</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Rank */}
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-2">
                                        Rank / Level
                                    </label>
                                    <input
                                        type="text"
                                        name="rank"
                                        value={formData.rank}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                                        placeholder="e.g. Diamond 2"
                                    />
                                </div>

                                {/* Skins Count */}
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-2">
                                        Skins / Items Count
                                    </label>
                                    <input
                                        type="text"
                                        name="skinsCount"
                                        value={formData.skinsCount}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
                                        placeholder="e.g. 150+ skins"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6">
                            <h2 className="text-xl font-bold text-white mb-6">Listing Status</h2>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="available" className="bg-[#1a1f2e]">Available</option>
                                <option value="sold" className="bg-[#1a1f2e]">Sold</option>
                            </select>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                onClick={() => router.push('/user/store')}
                                variant="outline"
                                className="flex-1 h-12 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10"
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </UserDashboardLayout>
    );
}
