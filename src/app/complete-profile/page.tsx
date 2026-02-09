'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { User, Phone, MapPin, FileText, Upload, Loader2 } from 'lucide-react';

export default function CompleteProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        address: '',
        bio: '',
    });

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
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
                title: 'Address Required',
                description: 'Please enter your address',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Create FormData for file upload
            const data = new FormData();
            data.append('fullName', formData.fullName.trim());
            if (formData.phone) data.append('phone', formData.phone);
            if (formData.address) data.append('address', formData.address);
            if (formData.bio) data.append('bio', formData.bio);
            if (avatarFile) data.append('avatar', avatarFile);

            const response = await fetch('http://localhost:5000/api/v1/users/complete-profile', {
                method: 'POST',
                credentials: 'include',
                body: data,
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast({
                    title: 'Profile Completed!',
                    description: 'Welcome to your dashboard',
                    variant: 'default',
                });

                // Redirect to dashboard
                router.push('/user/dashboard');
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
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: 'url(/assets/Login-Background.png)' }}
            />
            <div className="absolute inset-0 bg-black/50 z-10" />

            <Header />

            <main className="relative container mx-auto px-4 z-30 pt-32 pb-16">
                <div className="max-w-2xl mx-auto">
                    <div className="holographic-border bg-card/50 backdrop-blur-sm p-8 rounded-lg">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-headline font-bold text-glow mb-2">
                                Complete Your Profile
                            </h1>
                            <p className="text-muted-foreground">
                                Please fill in your details to get started
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Avatar Upload */}
                            <div className="flex flex-col items-center mb-6">
                                <div
                                    onClick={handleAvatarClick}
                                    className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-primary/30 cursor-pointer hover:border-primary/60 transition-all group"
                                >
                                    {avatarPreview ? (
                                        <img
                                            src={avatarPreview}
                                            alt="Avatar Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                                            <Upload className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Upload className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">
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

                            {/* Full Name - Required */}
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Full Name (English) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        placeholder="John Doe"
                                        className="pl-10 bg-input/50"
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="+20 123 456 7890"
                                        className="pl-10 bg-input/50"
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Address <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        placeholder="Cairo, Egypt"
                                        className="pl-10 bg-input/50"
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            {/* Bio */}
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Bio
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                    <Textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleInputChange}
                                        placeholder="Tell us about yourself..."
                                        className="pl-10 bg-input/50 min-h-[100px]"
                                        maxLength={500}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formData.bio.length}/500 characters
                                </p>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full holographic-button"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Completing Profile...
                                    </>
                                ) : (
                                    'Complete Profile'
                                )}
                            </Button>

                            <p className="text-xs text-center text-muted-foreground mt-4">
                                <span className="text-red-500">*</span> Required fields
                            </p>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
