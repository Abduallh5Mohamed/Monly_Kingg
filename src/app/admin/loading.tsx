'use client';

import { Loader2 } from 'lucide-react';

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0b14] via-[#0e1118] to-[#1a1d2e] flex items-center justify-center">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-full border-4 border-purple-500/30 mx-auto relative animate-spin">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 animate-pulse" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white animate-pulse">
            Loading Admin Panel...
          </h2>
          <p className="text-sm text-white/60">
            Preparing your dashboard
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mt-8 w-64 h-1 bg-white/10 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-600 animate-pulse" style={{ width: '70%' }} />
        </div>
      </div>
    </div>
  );
}
