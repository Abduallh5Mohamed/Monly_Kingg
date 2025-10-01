'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";
import Link from 'next/link';

export default function ResetPasswordForm() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [tokenValid, setTokenValid] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    useEffect(() => {
        if (!token || !email) {
            setError('Invalid reset link');
            setVerifying(false);
            return;
        }

        verifyResetToken();
    }, [token, email]);

    const verifyResetToken = async () => {
        try {
            const response = await fetch('/api/auth/verify-reset-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, token }),
            });

            const data = await response.json();

            if (response.ok && data.valid) {
                setTokenValid(true);
            } else {
                setError(data.message || 'Invalid or expired reset token');
            }
        } catch (error) {
            setError('Failed to verify reset token');
        } finally {
            setVerifying(false);
        }
    };

    const validatePassword = (password: string) => {
        if (password.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    token,
                    newPassword: password
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setResetSuccess(true);
                setMessage(data.message || 'Password reset successful');
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            } else {
                setError(data.message || 'Failed to reset password');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="min-h-screen relative">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: 'url(/assets/Login-Background.png)' }}
                />
                <div className="absolute inset-0 bg-black/30" />

                <div className="relative z-10 min-h-screen flex items-center justify-center">
                    <Card className="w-full max-w-md shadow-xl border-0 bg-transparent backdrop-blur-md">
                        <CardContent className="p-8">
                            <div className="flex flex-col items-center space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-white" />
                                <p className="text-white">Verifying reset token...</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (!tokenValid && !resetSuccess) {
        return (
            <div className="min-h-screen relative">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: 'url(/assets/Login-Background.png)' }}
                />
                <div className="absolute inset-0 bg-black/30" />

                <div className="relative z-10 min-h-screen flex items-center justify-center">
                    <Card className="w-full max-w-md shadow-xl border-0 bg-transparent backdrop-blur-md">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold text-white">Invalid Reset Link</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                            <Alert className="mb-6 bg-red-500/20 border-red-500/50">
                                <AlertDescription className="text-white">
                                    {error || 'This reset link is invalid or has expired.'}
                                </AlertDescription>
                            </Alert>
                            <Link href="/forgot-password">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Request New Reset Link
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (resetSuccess) {
        return (
            <div className="min-h-screen relative">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: 'url(/assets/Login-Background.png)' }}
                />
                <div className="absolute inset-0 bg-black/30" />

                <div className="relative z-10 min-h-screen flex items-center justify-center">
                    <Card className="w-full max-w-md shadow-xl border-0 bg-transparent backdrop-blur-md">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-white" />
                            </div>
                            <CardTitle className="text-2xl font-bold text-white">Password Reset Successful</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 text-center">
                            <p className="text-white mb-6">
                                Your password has been successfully reset. You will be redirected to the login page shortly.
                            </p>
                            <Link href="/login">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                    Go to Login
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative">
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: 'url(/assets/Login-Background.png)' }}
            />
            <div className="absolute inset-0 bg-black/30" />

            <div className="relative z-10 min-h-screen flex items-center justify-end pr-8 md:pr-16 lg:pr-24 pt-20">
                <Card className="w-full max-w-md shadow-xl border-0 bg-transparent backdrop-blur-md">
                    <CardHeader className="space-y-1 text-center pb-8">
                        <div className="mx-auto mb-4 w-16 h-16 bg-blue-600/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-blue-500/30">
                            <Lock className="h-8 w-8 text-white" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-white">
                            Reset Your Password
                        </CardTitle>
                        <CardDescription className="text-gray-200">
                            Enter your new password below
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6 px-8 pb-8">
                        {error && (
                            <Alert className="bg-red-500/20 border-red-500/50">
                                <AlertDescription className="text-white">{error}</AlertDescription>
                            </Alert>
                        )}

                        {message && (
                            <Alert className="bg-green-500/20 border-green-500/50">
                                <AlertDescription className="text-white">{message}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-white">
                                    New Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-white/10 border-white/20 text-white placeholder-white/60 pr-10"
                                        placeholder="Enter your new password"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4 text-white/60" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-white/60" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-white">
                                    Confirm New Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="bg-white/10 border-white/20 text-white placeholder-white/60 pr-10"
                                        placeholder="Confirm your new password"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4 text-white/60" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-white/60" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="text-sm text-gray-300">
                                Password requirements:
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                    <li>At least 8 characters long</li>
                                    <li>Contains uppercase and lowercase letters</li>
                                    <li>Contains at least one number</li>
                                </ul>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Resetting Password...
                                    </>
                                ) : (
                                    'Reset Password'
                                )}
                            </Button>
                        </form>

                        <div className="text-center">
                            <Link
                                href="/login"
                                className="text-blue-300 hover:text-blue-200 text-sm transition-colors"
                            >
                                <ArrowLeft className="inline mr-1 h-4 w-4" />
                                Back to Login
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}