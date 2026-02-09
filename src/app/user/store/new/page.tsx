'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Plus,
    Upload,
    X,
    Image as ImageIcon,
    Loader2,
    Gamepad2,
    DollarSign,
    FileText,
    ImagePlus,
    Sparkles,
    CheckCircle,
} from 'lucide-react';

const GAMES = [
    'Valorant', 'PUBG', 'FIFA / FC', 'League of Legends', 'Call of Duty',
    'Apex Legends', 'Counter-Strike 2', 'Fortnite', 'Overwatch 2', 'Star Citizen'
];

interface UploadedImage {
    id: string;
    url: string;
    file?: File;
    uploading?: boolean;
}

export default function NewListingPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const imagesInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [form, setForm] = useState({
        title: '',
        game: '',
        description: '',
        price: '',
    });

    const [images, setImages] = useState<UploadedImage[]>([]);
    const [coverImage, setCoverImage] = useState<UploadedImage | null>(null);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);

    useEffect(() => {
        if (!authLoading && (!user || !user.isSeller)) {
            router.push('/user/dashboard');
        }
    }, [user, authLoading, router]);

    const uploadFile = async (file: File): Promise<string | null> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'listing');

        try {
            const res = await fetch('/api/v1/uploads', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });
            const data = await res.json();
            if (data.success && data.data?.url) {
                return data.data.url;
            }
            return null;
        } catch (err) {
            console.error('Upload error:', err);
            return null;
        }
    };

    const handleImagesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadingImages(true);
        const newImages: UploadedImage[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const tempId = `temp-${Date.now()}-${i}`;
            const previewUrl = URL.createObjectURL(file);

            // Add preview immediately
            newImages.push({ id: tempId, url: previewUrl, file, uploading: true });
        }

        setImages(prev => [...prev, ...newImages]);

        // Upload files
        for (let i = 0; i < newImages.length; i++) {
            const img = newImages[i];
            if (img.file) {
                const uploadedUrl = await uploadFile(img.file);
                if (uploadedUrl) {
                    setImages(prev => prev.map(p =>
                        p.id === img.id ? { ...p, url: uploadedUrl, uploading: false } : p
                    ));
                } else {
                    setImages(prev => prev.filter(p => p.id !== img.id));
                }
            }
        }

        setUploadingImages(false);
        if (imagesInputRef.current) imagesInputRef.current.value = '';
    };

    const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingCover(true);
        const previewUrl = URL.createObjectURL(file);
        setCoverImage({ id: 'cover', url: previewUrl, file, uploading: true });

        const uploadedUrl = await uploadFile(file);
        if (uploadedUrl) {
            setCoverImage({ id: 'cover', url: uploadedUrl, uploading: false });
        } else {
            setCoverImage(null);
            setError('Failed to upload cover image');
        }

        setUploadingCover(false);
        if (coverInputRef.current) coverInputRef.current.value = '';
    };

    const removeImage = (id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
    };

    const removeCover = () => {
        setCoverImage(null);
    };

    const handleSubmit = async () => {
        if (!form.title || !form.game || !form.price) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const imageUrls = images.filter(img => !img.uploading).map(img => img.url);
            const coverUrl = coverImage && !coverImage.uploading ? coverImage.url : '';

            const res = await fetch('/api/v1/listings', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title,
                    game: form.game,
                    description: form.description,
                    price: Number(form.price),
                    images: imageUrls,
                    coverImage: coverUrl,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/user/store');
                }, 1500);
            } else {
                setError(data.message || 'Failed to create listing');
            }
        } catch (err) {
            console.error(err);
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0b14]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (success) {
        return (
            <UserDashboardLayout>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <CheckCircle className="w-10 h-10 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Listing Created Successfully!</h2>
                        <p className="text-white/50">Redirecting to your store...</p>
                    </div>
                </div>
            </UserDashboardLayout>
        );
    }

    return (
        <UserDashboardLayout>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                <Plus className="w-5 h-5 text-white" />
                            </div>
                            New Listing
                        </h1>
                        <p className="text-white/50 mt-1">Create a new game account listing</p>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <div className="space-y-8">
                    {/* Cover Image Section */}
                    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Cover Image</h3>
                                <p className="text-sm text-white/40">Main image displayed for your listing</p>
                            </div>
                        </div>

                        <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleCoverSelect}
                            className="hidden"
                        />

                        {coverImage ? (
                            <div className="relative rounded-xl overflow-hidden aspect-video bg-white/5">
                                <img
                                    src={coverImage.url}
                                    alt="Cover"
                                    className="w-full h-full object-cover"
                                />
                                {coverImage.uploading && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                                    </div>
                                )}
                                <button
                                    onClick={removeCover}
                                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => coverInputRef.current?.click()}
                                disabled={uploadingCover}
                                className="w-full aspect-video rounded-xl border-2 border-dashed border-white/20 hover:border-cyan-500/50 bg-white/[0.02] hover:bg-cyan-500/5 transition-all flex flex-col items-center justify-center gap-3 text-white/40 hover:text-cyan-400"
                            >
                                {uploadingCover ? (
                                    <Loader2 className="w-10 h-10 animate-spin" />
                                ) : (
                                    <>
                                        <Upload className="w-10 h-10" />
                                        <span className="text-sm font-medium">Click to upload cover image</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Gallery Images Section */}
                    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                <ImagePlus className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Gallery Images</h3>
                                <p className="text-sm text-white/40">Additional screenshots and images</p>
                            </div>
                        </div>

                        <input
                            ref={imagesInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImagesSelect}
                            className="hidden"
                        />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {images.map((img) => (
                                <div key={img.id} className="relative rounded-xl overflow-hidden aspect-square bg-white/5">
                                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                                    {img.uploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => removeImage(img.id)}
                                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={() => imagesInputRef.current?.click()}
                                disabled={uploadingImages}
                                className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-cyan-500/50 bg-white/[0.02] hover:bg-cyan-500/5 transition-all flex flex-col items-center justify-center gap-2 text-white/40 hover:text-cyan-400"
                            >
                                {uploadingImages ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <Plus className="w-6 h-6" />
                                        <span className="text-xs font-medium">Add</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Details Section */}
                    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 space-y-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Listing Details</h3>
                                <p className="text-sm text-white/40">Provide information about your account</p>
                            </div>
                        </div>

                        {/* Game Selection */}
                        <div>
                            <label className="flex items-center gap-2 text-sm text-white/70 mb-2">
                                <Gamepad2 className="w-4 h-4" />
                                Game <span className="text-red-400">*</span>
                            </label>
                            <select
                                value={form.game}
                                onChange={(e) => setForm(prev => ({ ...prev, game: e.target.value }))}
                                className="w-full h-14 rounded-xl bg-white/5 border border-white/10 px-4 text-base text-white focus:outline-none focus:border-cyan-400/50 transition-colors appearance-none cursor-pointer"
                            >
                                <option value="" className="bg-[#0f1419]">Select a game</option>
                                {GAMES.map((g) => (
                                    <option key={g} value={g} className="bg-[#0f1419]">{g}</option>
                                ))}
                            </select>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="flex items-center gap-2 text-sm text-white/70 mb-2">
                                <Sparkles className="w-4 h-4" />
                                Account Title <span className="text-red-400">*</span>
                            </label>
                            <input
                                value={form.title}
                                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="e.g. Radiant Valorant Account with 50+ Skins"
                                className="w-full h-14 rounded-xl bg-white/5 border border-white/10 px-4 text-base text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors"
                            />
                        </div>

                        {/* Price */}
                        <div>
                            <label className="flex items-center gap-2 text-sm text-white/70 mb-2">
                                <DollarSign className="w-4 h-4" />
                                Price (USD) <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="number"
                                value={form.price}
                                onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                                placeholder="49.99"
                                className="w-full h-14 rounded-xl bg-white/5 border border-white/10 px-4 text-base text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="flex items-center gap-2 text-sm text-white/70 mb-2">
                                <FileText className="w-4 h-4" />
                                Account Description
                            </label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Describe the account details, rank, skins, items, achievements, etc..."
                                rows={5}
                                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-4 text-base text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 transition-colors resize-none"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !form.title || !form.game || !form.price}
                        className="w-full h-14 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-lg shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Creating Listing...
                            </>
                        ) : (
                            <>
                                <Plus className="w-5 h-5 mr-2" />
                                Create Listing
                            </>
                        )}
                    </Button>

                    <p className="text-center text-white/30 text-sm pb-8">
                        Your listing will be available for buyers immediately after creation
                    </p>
                </div>
            </div>
        </UserDashboardLayout>
    );
}
