'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

export function FeatureBanner() {
  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-[#1a1d2e] via-[#2a2d4e] to-[#1a1d2e] min-h-[280px]">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-between h-full p-8">
        {/* Left Side - Character/Image Placeholder */}
        <div className="flex-shrink-0 w-1/3">
          <div className="relative w-full h-48 flex items-center justify-center">
            {/* Placeholder for character image */}
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center backdrop-blur-sm border-2 border-purple-500/30">
              <span className="text-6xl">🎮</span>
            </div>
            {/* Decorative elements */}
            <div className="absolute top-4 right-4 w-12 h-12 bg-orange-500/20 rounded-lg rotate-12 animate-pulse" />
            <div className="absolute bottom-4 left-4 w-8 h-8 bg-blue-500/20 rounded-lg -rotate-12 animate-pulse" />
          </div>
        </div>

        {/* Center - Main Content */}
        <div className="flex-1 text-center px-8">
          <h2 className="text-5xl font-bold text-white mb-3">
            Admin Dashboard
          </h2>
          <p className="text-white/70 text-lg mb-6">
            Manage your gaming marketplace and get insights of{' '}
            <span className="text-purple-400 font-semibold">unlimited control</span>
            {' '}in your Admin Dashboard
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold rounded-full px-8 shadow-lg shadow-yellow-500/50"
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              Quick Actions
            </Button>
            
            {/* Timer/Stats Display */}
            <div className="flex items-center gap-3 text-white">
              <span className="text-sm text-white/60">Don't miss</span>
              <div className="flex gap-2">
                {[
                  { value: '15', label: 'h' },
                  { value: '24', label: 'm' },
                  { value: '55', label: 's' }
                ].map((time, idx) => (
                  <div 
                    key={idx}
                    className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20"
                  >
                    <span className="font-bold">{time.value}</span>
                    <span className="text-xs text-white/60 ml-1">{time.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Decorative */}
        <div className="flex-shrink-0 w-1/4">
          <div className="relative h-48">
            {/* Floating elements */}
            <div className="absolute top-8 right-8 w-16 h-16 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-2xl rotate-12 animate-float" />
            <div className="absolute bottom-12 right-16 w-12 h-12 bg-gradient-to-br from-pink-500/30 to-red-500/30 rounded-xl -rotate-12 animate-float" style={{ animationDelay: '1s' }} />
            <div className="absolute top-16 right-4 w-10 h-10 bg-gradient-to-br from-cyan-500/30 to-blue-500/30 rounded-lg rotate-45 animate-float" style={{ animationDelay: '2s' }} />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(var(--rotate, 12deg)); }
          50% { transform: translateY(-20px) rotate(var(--rotate, 12deg)); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </Card>
  );
}
