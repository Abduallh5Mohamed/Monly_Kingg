'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Upload,
    X,
    Image as ImageIcon,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Gamepad2,
    DollarSign,
    FileText,
    Star,
    Sparkles,
    Shield,
    Crown,
} from 'lucide-react';

interface Game {
    _id: string;
    name: string;
}

export default function NewListingPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(false);
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
    });

    // Images state
    const [accountImages, setAccountImages] = useState<File[]>([]);
    const [accountPreviews, setAccountPreviews] = useState<string[]>([]);
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);

    // Drag states
    const [isDraggingAccount, setIsDraggingAccount] = useState(false);
    const [isDraggingCover, setIsDraggingCover] = useState(false);

    // Refs for file inputs
    const accountInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!authLoading && (!user || !user.isSeller)) {
            router.push('/user/dashboard');
        }
    }, [user, authLoading]);

    useEffect(() => {
        fetchGames();
    }, []);

    const fetchGames = async () => {
        try {
            const res = await fetch('/api/v1/games', { credentials: 'include' });
            const data = await res.json();
            if (data.data) setGames(data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const processAccountFiles = useCallback((files: File[]) => {
        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        const newFiles = [...accountImages, ...imageFiles].slice(0, 10);
        setAccountImages(newFiles);

        // Revoke old previews
        accountPreviews.forEach(p => URL.revokeObjectURL(p));
        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        setAccountPreviews(newPreviews);
    }, [accountImages, accountPreviews]);

    const handleAccountImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        processAccountFiles(files);
    };

    const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        setCoverImage(file);
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setCoverPreview(URL.createObjectURL(file));
    };

    const removeAccountImage = (index: number) => {
        const newImages = accountImages.filter((_, i) => i !== index);
        URL.revokeObjectURL(accountPreviews[index]);
        const newPreviews = accountPreviews.filter((_, i) => i !== index);
        setAccountImages(newImages);
        setAccountPreviews(newPreviews);
    };

    const removeCoverImage = () => {
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setCoverImage(null);
        setCoverPreview(null);
    };

    // Drag and drop handlers for account images
    const handleAccountDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingAccount(true);
    };
    const handleAccountDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingAccount(false);
    };
    const handleAccountDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingAccount(false);
        const files = Array.from(e.dataTransfer.files);
        processAccountFiles(files);
    };

    // Drag and drop handlers for cover image
    const handleCoverDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingCover(true);
    };
    const handleCoverDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingCover(false);
    };
    const handleCoverDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingCover(false);
        const file = e.dataTransfer.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        setCoverImage(file);
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setCoverPreview(URL.createObjectURL(file));
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
        if (!formData.description.trim()) {
            setError('Please add a description for the account');
            return;
        }
        if (!formData.rank.trim()) {
            setError('Please enter the account rank');
            return;
        }
        if (!formData.skinsCount.trim()) {
            setError('Please enter skins / items count');
            return;
        }
        if (accountImages.length === 0) {
            setError('Please upload at least one account image');
            return;
        }

        setLoading(true);

        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('game', formData.gameId);
            data.append('description', formData.description);
            data.append('price', formData.price);

            const details: Record<string, string> = {};
            if (formData.rank) details.rank = formData.rank;
            if (formData.skinsCount) details.skinsCount = formData.skinsCount;
            data.append('details', JSON.stringify(details));

            accountImages.forEach((file) => {
                data.append('accountImages', file);
            });

            if (coverImage) {
                data.append('coverImage', coverImage);
            }

            const res = await fetch('/api/v1/listings', {
                method: 'POST',
                credentials: 'include',
                body: data,
            });

            const result = await res.json();

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/user/store');
                }, 2000);
            } else {
                setError(result.message || 'Failed to create listing');
            }
        } catch (err) {
            console.error(err);
            setError('An error occurred while creating the listing');
        } finally {
            setLoading(false);
        }
    };

    // Calculate form completeness
    const completedFields = [
        formData.title.trim(),
        formData.gameId,
        formData.price,
        formData.description.trim(),
        formData.rank.trim(),
        formData.skinsCount.trim(),
        accountImages.length > 0,
    ].filter(Boolean).length;
    const totalFields = 7;
    const progressPercent = Math.round((completedFields / totalFields) * 100);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a0b14] via-[#0e1118] to-[#1a1d2e] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                        <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-cyan-400" />
                    </div>
                    <p className="text-white/40 text-sm animate-pulse">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user?.isSeller) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0b14] via-[#0e1118] to-[#1a1d2e] relative">
            {/* Decorative background elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.03] blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/[0.03] blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/[0.02] blur-[150px]" />
            </div>

            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 bg-[#0a0b14]/80 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <button
                        onClick={() => router.push('/user/store')}
                        className="flex items-center gap-2.5 text-white/50 hover:text-white transition-all duration-300 group"
                    >
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium hidden sm:inline">Back to Store</span>
                    </button>

                    <div className="flex items-center gap-3">
                        {/* Progress indicator */}
                        <div className="hidden sm:flex items-center gap-3">
                            <div className="text-xs text-white/40">
                                <span className="text-cyan-400 font-bold">{completedFields}</span>/{totalFields} fields
                            </div>
                            <div className="w-32 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-full text-xs font-bold border ${progressPercent === 100
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-white/5 text-white/40 border-white/10'
                            }`}>
                            {progressPercent}%
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-24">
                {/* Page Header */}
                <div className="mb-10 sm:mb-14">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                                Create New Listing
                            </h1>
                            <p className="text-white/40 text-sm mt-1">
                                Fill in the details below to list your account for sale
                            </p>
                        </div>
                    </div>
                </div>

                {/* Success Overlay */}
                {success && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500">
                                <CheckCircle2 className="w-10 h-10 text-green-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Listing Created!</h3>
                            <p className="text-white/50 text-sm">Redirecting to your store...</p>
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/[0.05] backdrop-blur-sm p-5 flex items-start gap-4 animate-in slide-in-from-top duration-300">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="flex-1 pt-1">
                            <p className="text-sm text-red-300 font-medium">{error}</p>
                        </div>
                        <button
                            onClick={() => setError('')}
                            className="w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-red-400/60 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* ─── Section 1: Basic Information ─── */}
                    <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                        <div className="px-6 sm:px-8 py-5 border-b border-white/[0.06] flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/10 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Basic Information</h2>
                                <p className="text-xs text-white/30">Tell buyers about this account</p>
                            </div>
                        </div>

                        <div className="p-6 sm:p-8 space-y-6">
                            {/* Title */}
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-medium text-white/70 mb-2.5">
                                    Account Title <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Radiant Valorant Account with 50+ Skins"
                                    className="w-full h-13 px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 focus:border-cyan-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-500/10 focus:outline-none transition-all duration-200 text-sm"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Game */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-white/70 mb-2.5">
                                        <Gamepad2 className="w-4 h-4 text-cyan-400/60" />
                                        Game <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        name="gameId"
                                        value={formData.gameId}
                                        onChange={handleInputChange}
                                        className="w-full h-13 px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-cyan-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-500/10 focus:outline-none transition-all duration-200 text-sm appearance-none cursor-pointer"
                                        required
                                    >
                                        <option value="" className="bg-[#0f1419]">Select a game</option>
                                        {games.map((game) => (
                                            <option key={game._id} value={game._id} className="bg-[#0f1419]">
                                                {game.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Price */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-white/70 mb-2.5">
                                        <DollarSign className="w-4 h-4 text-green-400/60" />
                                        Price (USD) <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleInputChange}
                                        placeholder="49.99"
                                        min="0"
                                        step="0.01"
                                        className="w-full h-13 px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 focus:border-cyan-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-500/10 focus:outline-none transition-all duration-200 text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-medium text-white/70 mb-2.5">
                                    Description <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Describe the account in detail — rank, skins, achievements, hours played, special items, etc..."
                                    rows={5}
                                    className="w-full px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 focus:border-cyan-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-500/10 focus:outline-none transition-all duration-200 resize-none text-sm leading-relaxed"
                                    required
                                />
                            </div>
                        </div>
                    </section>

                    {/* ─── Section 2: Account Details ─── */}
                    <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                        <div className="px-6 sm:px-8 py-5 border-b border-white/[0.06] flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/10 flex items-center justify-center">
                                <Crown className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Account Details</h2>
                                <p className="text-xs text-white/30">Rank, stats, and important info</p>
                            </div>
                        </div>

                        <div className="p-6 sm:p-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Rank */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-white/70 mb-2.5">
                                        <Shield className="w-4 h-4 text-yellow-400/60" />
                                        Rank <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="rank"
                                        value={formData.rank}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Radiant, Global Elite, Diamond..."
                                        className="w-full h-13 px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 focus:border-cyan-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-500/10 focus:outline-none transition-all duration-200 text-sm"
                                        required
                                    />
                                </div>

                                {/* Skins Count */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-white/70 mb-2.5">
                                        <Star className="w-4 h-4 text-orange-400/60" />
                                        Skins / Items Count <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="skinsCount"
                                        value={formData.skinsCount}
                                        onChange={handleInputChange}
                                        placeholder="e.g. 45 skins, 12 agents..."
                                        className="w-full h-13 px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/25 focus:border-cyan-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-500/10 focus:outline-none transition-all duration-200 text-sm"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ─── Section 3: Account Images ─── */}
                    <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                        <div className="px-6 sm:px-8 py-5 border-b border-white/[0.06] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/10 flex items-center justify-center">
                                    <ImageIcon className="w-4 h-4 text-green-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">
                                        Account Screenshots <span className="text-red-400">*</span>
                                    </h2>
                                    <p className="text-xs text-white/30">Show buyers what they're getting</p>
                                </div>
                            </div>
                            <div className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                                accountImages.length > 0
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                    : 'bg-white/5 text-white/30 border-white/10'
                            }`}>
                                {accountImages.length} / 10
                            </div>
                        </div>

                        <div className="p-6 sm:p-8 space-y-5">
                            {/* Drop Zone */}
                            <div
                                onDragOver={handleAccountDragOver}
                                onDragLeave={handleAccountDragLeave}
                                onDrop={handleAccountDrop}
                                onClick={() => accountInputRef.current?.click()}
                                className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center transition-all duration-300 ${
                                    isDraggingAccount
                                        ? 'border-cyan-400/60 bg-cyan-500/[0.06] scale-[1.01]'
                                        : accountImages.length >= 10
                                        ? 'border-white/5 bg-white/[0.01] opacity-50 cursor-not-allowed'
                                        : 'border-white/[0.12] bg-white/[0.02] hover:border-cyan-400/30 hover:bg-white/[0.03]'
                                }`}
                            >
                                <input
                                    ref={accountInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleAccountImagesChange}
                                    className="hidden"
                                    disabled={accountImages.length >= 10}
                                />
                                <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all ${
                                    isDraggingAccount
                                        ? 'bg-cyan-500/20 border border-cyan-500/30'
                                        : 'bg-white/[0.04] border border-white/[0.08]'
                                }`}>
                                    <Upload className={`w-6 h-6 ${isDraggingAccount ? 'text-cyan-400' : 'text-white/30'}`} />
                                </div>
                                <p className="text-sm text-white/60 mb-1 font-medium">
                                    {isDraggingAccount ? 'Drop images here' : 'Click to upload or drag & drop'}
                                </p>
                                <p className="text-xs text-white/30">
                                    PNG, JPG, WEBP up to 10MB each · Max 10 images
                                </p>
                            </div>

                            {/* Image Previews Grid */}
                            {accountPreviews.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {accountPreviews.map((preview, index) => (
                                        <div
                                            key={index}
                                            className="relative group aspect-square rounded-xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-all duration-200"
                                        >
                                            <img
                                                src={preview}
                                                alt={`Account screenshot ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            {/* Overlay on hover */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                            {/* Remove button */}
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); removeAccountImage(index); }}
                                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                                            >
                                                <X className="w-3.5 h-3.5 text-white" />
                                            </button>
                                            {/* Image number */}
                                            <div className="absolute bottom-0 left-0 right-0 py-1.5 px-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-white/60 font-medium">#{index + 1}</span>
                                                    {index === 0 && !coverImage && (
                                                        <span className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> Cover
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ─── Section 4: Cover Image (Optional) ─── */}
                    <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
                        <div className="px-6 sm:px-8 py-5 border-b border-white/[0.06] flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/10 flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-amber-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    Cover Image
                                    <span className="ml-2 text-xs font-normal text-white/30 bg-white/5 px-2 py-0.5 rounded-full">Optional</span>
                                </h2>
                                <p className="text-xs text-white/30 mt-0.5">
                                    This is the main image buyers see first. If not uploaded, the first account screenshot will be used.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 sm:p-8">
                            {!coverPreview ? (
                                <div
                                    onDragOver={handleCoverDragOver}
                                    onDragLeave={handleCoverDragLeave}
                                    onDrop={handleCoverDrop}
                                    onClick={() => coverInputRef.current?.click()}
                                    className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center transition-all duration-300 ${
                                        isDraggingCover
                                            ? 'border-amber-400/60 bg-amber-500/[0.06] scale-[1.01]'
                                            : 'border-white/[0.12] bg-white/[0.02] hover:border-amber-400/30 hover:bg-white/[0.03]'
                                    }`}
                                >
                                    <input
                                        ref={coverInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleCoverImageChange}
                                        className="hidden"
                                    />
                                    <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all ${
                                        isDraggingCover
                                            ? 'bg-amber-500/20 border border-amber-500/30'
                                            : 'bg-white/[0.04] border border-white/[0.08]'
                                    }`}>
                                        <ImageIcon className={`w-6 h-6 ${isDraggingCover ? 'text-amber-400' : 'text-white/30'}`} />
                                    </div>
                                    <p className="text-sm text-white/60 mb-1 font-medium">
                                        {isDraggingCover ? 'Drop cover image here' : 'Click to upload cover image'}
                                    </p>
                                    <p className="text-xs text-white/30">
                                        Recommended: 1200×630px · PNG, JPG up to 10MB
                                    </p>
                                </div>
                            ) : (
                                <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] group">
                                    <img
                                        src={coverPreview}
                                        alt="Cover preview"
                                        className="w-full aspect-[16/9] object-cover"
                                    />
                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    {/* Remove button */}
                                    <button
                                        type="button"
                                        onClick={removeCoverImage}
                                        className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-red-500/80 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                                    >
                                        <X className="w-5 h-5 text-white" />
                                    </button>
                                    {/* Cover label */}
                                    <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
                                        <span className="text-xs text-white/80 font-medium">Cover Image</span>
                                    </div>
                                </div>
                            )}

                            {/* Hint when no cover and has account images */}
                            {!coverPreview && accountPreviews.length > 0 && (
                                <div className="mt-4 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/10 px-5 py-3.5 flex items-start gap-3">
                                    <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-cyan-300/70 leading-relaxed">
                                        No cover image? No problem! The first account screenshot will be automatically used as the cover.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ─── Submit ─── */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                        <Button
                            type="button"
                            onClick={() => router.push('/user/store')}
                            variant="outline"
                            className="w-full sm:w-auto h-12 rounded-xl border-white/10 text-white/50 hover:text-white hover:bg-white/5 px-8"
                            disabled={loading}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="w-full sm:w-auto h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-10 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading || success}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Creating Listing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Publish Listing
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </main>
        </div>
    );
}
