'use client';

import { useState, useRef, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { User, Phone, MapPin, FileText, Upload, Loader2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function CompleteProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user, loading: authLoading, refreshAuth } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Egyptian Governorates (unique sorted list)
    const egyptianGovernorates = [
        'Alexandria',
        'Assiut',
        'Aswan',
        'Beheira',
        'Beni Suef',
        'Cairo',
        'Dakahlia',
        'Damietta',
        'Fayoum',
        'Gharbia',
        'Giza',
        'Ismailia',
        'Kafr El Sheikh',
        'Luxor',
        'Matrouh',
        'Minya',
        'Monufia',
        'New Valley',
        'North Sinai',
        'Port Said',
        'Qalyubia',
        'Qena',
        'Red Sea',
        'Sharqia',
        'Sohag',
        'South Sinai',
        'Suez'
    ];

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        address: '',
        bio: '',
    });

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auth guard: redirect if no user or profile already completed
    useEffect(() => {
        if (authLoading) return; // Wait for auth to load

        if (!user) {
            console.log('❌ No user found, redirecting to login');
            router.replace('/login');
            return;
        }

        if (user.profileCompleted === true) {
            console.log('✅ Profile already completed, redirecting to dashboard');
            router.replace('/user/dashboard');
            return;
        }

        console.log('✅ User authenticated and needs to complete profile');
    }, [user, authLoading, router]);

    const handleInputChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddressChange = (value: string) => {
        setFormData((prev) => ({ ...prev, address: value }));
    };

    // Get CSRF token from cookie
    const getCsrfToken = (): string | null => {
        if (typeof document === 'undefined') return null;
        const name = 'XSRF-TOKEN';
        const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        const token = match ? decodeURIComponent(match[3]) : null;
        console.log('🔍 [CSRF Debug] Token from cookie:', {
            cookieExists: !!match,
            tokenLength: token?.length || 0,
            allCookies: document.cookie.split(';').map(c => c.trim().split('=')[0])
        });
        return token;
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: 'File Too Large',
                description: 'Avatar must be less than 5MB',
                variant: 'destructive',
            });
            return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Invalid File Type',
                description: 'Please upload an image file',
                variant: 'destructive',
            });
            return;
        }

        setAvatarFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.fullName.trim()) {
            toast({
                title: 'Full Name Required',
                description: 'Please enter your full name in English',
                variant: 'destructive',
            });
            return;
        }

        if (!formData.phone.trim()) {
            toast({
                title: 'Phone Number Required',
                description: 'Please enter your phone number',
                variant: 'destructive',
            });
            return;
        }

        if (!formData.address.trim()) {
            toast({
                title: 'Governorate Required',
                description: 'Please select your governorate',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Get CSRF token first
            const csrfToken = getCsrfToken();

            if (!csrfToken) {
                toast({
                    title: 'Authentication Error',
                    description: 'Please log in again',
                    variant: 'destructive',
                });
                router.replace('/login');
                return;
            }

            // Create FormData for file upload
            const data = new FormData();
            data.append('fullName', formData.fullName.trim());
            if (formData.phone) data.append('phone', formData.phone);
            if (formData.address) data.append('address', formData.address);
            if (formData.bio) data.append('bio', formData.bio);
            if (avatarFile) data.append('avatar', avatarFile);

            console.log('📤 [Form Submit] Sending request:', {
                url: 'http://localhost:5000/api/v1/users/complete-profile',
                hasCSRF: !!csrfToken,
                csrfTokenPreview: csrfToken.substring(0, 10) + '...',
                formFields: Object.keys(formData)
            });

            const response = await fetch('http://localhost:5000/api/v1/users/complete-profile', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-XSRF-TOKEN': csrfToken
                },
                body: data,
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast({
                    title: 'Profile Completed!',
                    description: 'Welcome to your dashboard',
                    variant: 'default',
                });

                // Refresh auth state to get updated user data
                await refreshAuth();

                // Redirect to dashboard after a brief delay
                setTimeout(() => {
                    router.replace('/user/dashboard');
                }, 200);
            } else {
                toast({
                    title: 'Error',
                    description: result.message || 'Failed to complete profile',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Complete profile error:', error);
            toast({
                title: 'Connection Error',
                description: 'Please try again',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden">
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900" />

            {/* Animated Grid Pattern */}
            <div className="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-20" />

            {/* Glowing Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse delay-1000" />

            <Header />

            {/* Show loading while auth is being checked */}
            {authLoading ? (
                <main className="relative container mx-auto px-4 z-30 pt-32 pb-16 flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mx-auto mb-4" />
                        <p className="text-lg text-white/70">Loading...</p>
                    </div>
                </main>
            ) : (
                <main className="relative container mx-auto px-4 z-30 pt-24 pb-16">
                    <div className="max-w-2xl mx-auto">
                        {/* Enhanced Card with Glow Effect */}
                        <div className="relative">
                            {/* Glow Border Effect */}
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>

                            {/* Main Card */}
                            <div className="relative bg-gradient-to-b from-gray-900/90 to-gray-800/90 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-8 shadow-2xl">
                                {/* Header with Icon */}
                                <div className="text-center mb-8">
                                    {/* Decorative Circle */}
                                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-2 border-cyan-500/30 mb-4">
                                        <User className="w-10 h-10 text-cyan-400" />
                                    </div>

                                    <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-3">
                                        Complete Your Profile
                                    </h1>
                                    <p className="text-gray-400 text-lg">
                                        Please fill in your details to get started
                                    </p>

                                    {/* Progress Dots */}
                                    <div className="flex justify-center gap-2 mt-6">
                                        <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                        <div className="w-2 h-2 rounded-full bg-cyan-500/30"></div>
                                        <div className="w-2 h-2 rounded-full bg-cyan-500/30"></div>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Avatar Upload - Enhanced */}
                                    <div className="flex flex-col items-center mb-8">
                                        <div className="relative group">
                                            {/* Glow Ring */}
                                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-300"></div>

                                            {/* Avatar Container */}
                                            <div
                                                onClick={handleAvatarClick}
                                                className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-gray-700 cursor-pointer transition-all duration-300 hover:scale-105"
                                            >
                                                {avatarPreview ? (
                                                    <img
                                                        src={avatarPreview}
                                                        alt="Avatar Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-cyan-900/50 to-purple-900/50 flex items-center justify-center">
                                                        <Upload className="h-12 w-12 text-cyan-400/60 group-hover:text-cyan-400 transition-colors" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                                                    <span className="text-white text-sm font-medium flex items-center gap-2">
                                                        <Upload className="h-4 w-4" />
                                                        Upload Photo
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-400 mt-3">
                                            Click to upload profile picture (optional)
                                        </p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarChange}
                                            className="hidden"
                                        />
                                    </div>

                                    {/* Full Name - Enhanced */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-cyan-400 mb-2">
                                            Full Name (English) <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors z-10" />
                                            <Input
                                                type="text"
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleInputChange}
                                                placeholder="John Doe"
                                                className="pl-12 h-12 bg-gray-800/50 border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-xl text-white placeholder:text-gray-500 transition-all"
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>

                                    {/* Phone Number - Enhanced */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-cyan-400 mb-2">
                                            Phone Number <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative group">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors z-10" />
                                            <Input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                placeholder="+20 123 456 7890"
                                                className="pl-12 h-12 bg-gray-800/50 border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-xl text-white placeholder:text-gray-500 transition-all"
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>

                                    {/* Governorate - Enhanced */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-cyan-400 mb-2">
                                            Governorate <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative group">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors z-10 pointer-events-none" />
                                            <Select
                                                value={formData.address}
                                                onValueChange={handleAddressChange}
                                                required
                                                disabled={isSubmitting}
                                            >
                                                <SelectTrigger className="pl-12 h-12 bg-gray-800/50 border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-xl text-white transition-all">
                                                    <SelectValue placeholder="Select your governorate..." />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[300px] bg-gray-900/95 backdrop-blur-xl border-cyan-500/20 rounded-xl">
                                                    {egyptianGovernorates.map((governorate) => (
                                                        <SelectItem
                                                            key={governorate}
                                                            value={governorate}
                                                            className="hover:bg-cyan-500/10 focus:bg-cyan-500/20 cursor-pointer text-white rounded-lg transition-colors"
                                                        >
                                                            {governorate}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Bio - Enhanced */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-cyan-400 mb-2">
                                            Bio (Optional)
                                        </label>
                                        <div className="relative group">
                                            <FileText className="absolute left-4 top-4 h-5 w-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors z-10" />
                                            <Textarea
                                                name="bio"
                                                value={formData.bio}
                                                onChange={handleInputChange}
                                                placeholder="Tell us about yourself..."
                                                className="pl-12 pt-3 bg-gray-800/50 border-gray-700 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-xl text-white placeholder:text-gray-500 min-h-[120px] resize-none transition-all"
                                                maxLength={500}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 text-right">
                                            {formData.bio.length}/500 characters
                                        </p>
                                    </div>

                                    {/* Submit Button - Enhanced */}
                                    <div className="pt-4">
                                        <Button
                                            type="submit"
                                            className="w-full h-14 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <div className="flex items-center justify-center gap-3">
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    <span>Completing Profile...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>Complete Profile</span>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                    </svg>
                                                </div>
                                            )}
                                        </Button>
                                    </div>

                                    {/* Required Fields Note */}
                                    <div className="flex items-center justify-center gap-2 pt-2">
                                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-gray-700"></div>
                                        <p className="text-xs text-gray-500">
                                            <span className="text-red-400">*</span> Required fields
                                        </p>
                                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-gray-700"></div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
}
