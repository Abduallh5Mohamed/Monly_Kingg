'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import Link from 'next/link';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      // TODO: Integrate with your forgot password API
      // const response = await apiClient.forgotPassword(email);
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setEmailSent(true);
      setMessage('Password reset instructions have been sent to your email');
    } catch (error: any) {
      setError(error.message || 'Failed to send reset instructions');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/assets/Login-Background.png)' }}
      />
      <div className="absolute inset-0 bg-black/30" />
      
      {/* Content positioned to the right */}
      <div className="relative z-10 min-h-screen flex items-center justify-end pr-8 md:pr-16 lg:pr-24 pt-20">
        <Card className="w-full max-w-md shadow-xl border-0 bg-transparent backdrop-blur-md">
          <CardHeader className="space-y-1 text-center pb-8">
            <CardTitle className="text-3xl font-bold text-white">
              Forgot Password?
            </CardTitle>
            <CardDescription className="text-white/80 text-base">
              Enter your email address and we'll send you instructions to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert className="border-red-200 bg-red-50/10 backdrop-blur-sm">
                <AlertDescription className="text-red-300">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert className="border-green-200 bg-green-50/10 backdrop-blur-sm">
                <AlertDescription className="text-green-300">
                  {message}
                </AlertDescription>
              </Alert>
            )}
            
            {!emailSent ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={handleChange}
                      className="pl-10 h-12 bg-white/20 border-white/30 focus:border-blue-400 focus:ring-blue-400 text-white placeholder:text-white/70"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending Instructions...
                    </>
                  ) : (
                    'Send Reset Instructions'
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="bg-green-100/10 border border-green-200/20 rounded-lg p-4 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold text-white mb-2">Check Your Email</h3>
                  <p className="text-white/80 text-sm">
                    We've sent password reset instructions to <strong>{email}</strong>
                  </p>
                </div>
                
                <Button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                    setMessage('');
                  }}
                  variant="outline"
                  className="w-full h-11 border-white/30 hover:bg-white/10 text-white"
                >
                  Send to Different Email
                </Button>
              </div>
            )}

            <div className="text-center pt-4">
              <Link
                href="/login"
                className="inline-flex items-center text-blue-300 hover:text-blue-200 font-medium transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </div>

            <div className="text-center">
              <span className="text-white/80">Don't have an account? </span>
              <Link
                href="/register"
                className="text-blue-300 hover:text-blue-200 font-semibold transition-colors"
              >
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}