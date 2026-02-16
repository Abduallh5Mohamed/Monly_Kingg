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
        <div className="relative min-h-screen w-full overflow-hidden bg-[#060811]">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

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
                    <div className="max-w-xl mx-auto">
                        {/* Main Card - Modern Glassmorphism */}
                        <div className="relative">
                            {/* Subtle glow */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-transparent to-purple-500/20 rounded-3xl blur-xl opacity-50"></div>

                            {/* Card */}
                            <div className="relative bg-[#0a0d16]/90 backdrop-blur-3xl border border-white/[0.06] rounded-3xl p-8 shadow-2xl">
                                {/* Header with Icon */}
                                <div className="text-center mb-8">
                                    {/* Decorative Circle */}
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/20 mb-5">
                                        <User className="w-8 h-8 text-cyan-400" />
                                    </div>

                                    <h1 className="text-3xl font-bold text-white mb-2">
                                        Complete Your Profile
                                    </h1>
                                    <p className="text-white/40 text-sm">
                                        Please fill in your details to get started
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Avatar Upload - Modern */}
                                    <div className="flex flex-col items-center mb-6">
                                        <div className="relative group">
                                            {/* Avatar Container */}
                                            <div
                                                onClick={handleAvatarClick}
                                                className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-white/10 cursor-pointer transition-all duration-300 hover:border-cyan-500/40 hover:scale-105 bg-white/[0.03]"
                                            >
                                                {avatarPreview ? (
                                                    <img
                                                        src={avatarPreview}
                                                        alt="Avatar Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Upload className="h-8 w-8 text-white/20 group-hover:text-cyan-400 transition-colors" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-white/30 mt-3">
                                            Click to upload (optional)
                                        </p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarChange}
                                            className="hidden"
                                        />
                                    </div>

                                    {/* Full Name - Modern */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">
                                            Full Name (English) <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-cyan-400 transition-colors z-10" />
                                            <Input
                                                type="text"
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleInputChange}
                                                placeholder="John Doe"
                                                className="pl-11 h-12 bg-white/[0.03] border-white/[0.08] focus:border-cyan-500/50 focus:ring-0 rounded-xl text-white placeholder:text-white/20 transition-all"
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>

                                    {/* Phone Number - Modern */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">
                                            Phone Number <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative group">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-cyan-400 transition-colors z-10" />
                                            <Input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                placeholder="+20 123 456 7890"
                                                className="pl-11 h-12 bg-white/[0.03] border-white/[0.08] focus:border-cyan-500/50 focus:ring-0 rounded-xl text-white placeholder:text-white/20 transition-all"
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>

                                    {/* Governorate - Modern */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">
                                            Governorate <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative group">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 group-focus-within:text-cyan-400 transition-colors z-10 pointer-events-none" />
                                            <Select
                                                value={formData.address}
                                                onValueChange={handleAddressChange}
                                                required
                                                disabled={isSubmitting}
                                            >
                                                <SelectTrigger className="pl-11 h-12 bg-white/[0.03] border-white/[0.08] focus:border-cyan-500/50 focus:ring-0 rounded-xl text-white transition-all">
                                                    <SelectValue placeholder="Select your governorate..." />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[300px] bg-[#0a0d16]/95 backdrop-blur-xl border-white/10 rounded-xl">
                                                    {egyptianGovernorates.map((governorate) => (
                                                        <SelectItem
                                                            key={governorate}
                                                            value={governorate}
                                                            className="hover:bg-white/5 focus:bg-cyan-500/10 cursor-pointer text-white rounded-lg transition-colors"
                                                        >
                                                            {governorate}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Bio - Modern */}
                                    <div className="space-y-2">
                                        <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">
                                            Bio (Optional)
                                        </label>
                                        <div className="relative group">
                                            <FileText className="absolute left-4 top-4 h-4 w-4 text-white/30 group-focus-within:text-cyan-400 transition-colors z-10" />
                                            <Textarea
                                                name="bio"
                                                value={formData.bio}
                                                onChange={handleInputChange}
                                                placeholder="Tell us about yourself..."
                                                className="pl-11 pt-3 bg-white/[0.03] border-white/[0.08] focus:border-cyan-500/50 focus:ring-0 rounded-xl text-white placeholder:text-white/20 min-h-[100px] resize-none transition-all"
                                                maxLength={500}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <p className="text-[10px] text-white/20 mt-1 text-right">
                                            {formData.bio.length}/500
                                        </p>
                                    </div>

                                    {/* Submit Button - Modern */}
                                    <div className="pt-4">
                                        <Button
                                            type="submit"
                                            className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span>Saving...</span>
                                                </div>
                                            ) : (
                                                <span>Complete Profile</span>
                                            )}
                                        </Button>
                                    </div>

                                    {/* Required Fields Note */}
                                    <p className="text-center text-[10px] text-white/20 pt-2">
                                        <span className="text-red-400">*</span> Required fields
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
}
