'use client';

import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import { Button } from '@/components/ui/button';
import {
  Star,
  ShoppingCart,
  ArrowRight,
  Swords,
  Crown,
  Shield,
  Zap,
  Trophy,
  Target,
  Flame,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';

export default function UserDashboardPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const popularOffers = [
    {
      id: 1,
      title: 'Castle Nathria Heroic Raid - Heroic CN Carry',
      price: '400',
      originalPrice: '500',
      discount: '-20%',
      image: '/assets/pubg.jpg',
      badge: 'TRENDING',
      rating: 4.8,
      reviews: 124
    },
    {
      id: 2,
      title: '0/9 GD Shadowlands Power leveling (Unlock the Maw - WoW)',
      price: '400',
      originalPrice: '600',
      discount: '-33%',
      image: '/assets/valorant.jpg',
      badge: 'HOT',
      rating: 4.9,
      reviews: 98
    },
    {
      id: 3,
      title: 'Custom 1-60 Powerleveling',
      price: '400',
      originalPrice: '500',
      discount: '-20%',
      image: '/assets/fifa.jpg',
      badge: 'NEW',
      rating: 4.7,
      reviews: 156
    },
    {
      id: 4,
      title: 'Buy WoW Shadowlands (%) | Timeless Rarity Boost Service',
      price: '400',
      originalPrice: '550',
      discount: '-27%',
      image: '/assets/pubg-battlegrounds.png',
      badge: 'POPULAR',
      rating: 4.8,
      reviews: 203
    }
  ];

  const categories = [
    {
      name: 'Covenants',
      count: 15,
      icon: Crown,
      gradient: 'from-purple-500 to-purple-700'
    },
    {
      name: 'Legendary powers',
      count: 19,
      icon: Flame,
      gradient: 'from-orange-500 to-red-600'
    },
    {
      name: 'Mounts',
      count: 8,
      icon: Target,
      gradient: 'from-blue-500 to-blue-700'
    },
    {
      name: 'Mythic+',
      count: 22,
      icon: Trophy,
      gradient: 'from-cyan-500 to-cyan-700'
    },
    {
      name: 'Powerleveling',
      count: 15,
      icon: Zap,
      gradient: 'from-yellow-500 to-yellow-700'
    },
    {
      name: 'Pvp',
      count: 27,
      icon: Swords,
      gradient: 'from-red-500 to-red-700'
    },
    {
      name: 'Raid',
      count: 17,
      icon: Shield,
      gradient: 'from-green-500 to-green-700'
    },
    {
      name: 'Shadowlands services',
      count: 9,
      icon: Crown,
      gradient: 'from-indigo-500 to-indigo-700'
    },
    {
      name: 'Torghast Tower',
      count: 13,
      icon: Target,
      gradient: 'from-pink-500 to-pink-700'
    },
    {
      name: 'Watch all items',
      count: 161,
      icon: ChevronRight,
      gradient: 'from-amber-500 to-amber-700',
      special: true
    }
  ];

  return (
    <UserDashboardLayout>
      <div className="space-y-8 pb-12">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-[#0a0e1a] via-[#1a1f3a] to-[#0f1419] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
          {/* Background Video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          >
            <source src="/assets/Hero-Background.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
          
          <div className="relative z-10 p-8 md:p-12 lg:p-16">
            <div className="max-w-2xl">
              <div className="inline-block mb-4">
                <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider">
                  ⚔️ Gaming Marketplace
                </span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                Boost your gear, level and rating
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-600">
                  on our WoW marketplace
                </span>
              </h1>
              
              <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                Professional boosted World of Warcraft carries, legendary coaching from professional gamers. Secured service with fast results!
              </p>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-bold text-lg">4.8</span>
                  <span className="text-gray-400">Trustpilot</span>
                </div>
                <div className="text-gray-500">•</div>
                <div className="text-gray-400">1000+ reviews</div>
              </div>
              
              <Button className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white px-8 py-6 rounded-full text-lg font-bold shadow-2xl shadow-yellow-500/50 transition-all duration-300 hover:scale-105">
                EXPLORE NOW
              </Button>
            </div>
          </div>
        </div>

        {/* Popular Offers Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">POPULAR OFFERS</h2>
              <div className="h-1 w-24 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full"></div>
            </div>
            <Button 
              variant="ghost" 
              className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 font-semibold"
            >
              WATCH
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularOffers.map((offer) => (
              <div
                key={offer.id}
                className="group bg-gradient-to-br from-[#0f1419]/90 to-[#1a1f3a]/90 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-500/20 hover:-translate-y-2"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={offer.image}
                    alt={offer.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                      {offer.badge}
                    </span>
                  </div>
                  {offer.discount && (
                    <div className="absolute top-3 right-3">
                      <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                        {offer.discount}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>

                <div className="p-5 space-y-4">
                  <h3 className="text-white font-semibold line-clamp-2 min-h-[3rem] group-hover:text-yellow-400 transition-colors">
                    {offer.title}
                  </h3>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-white font-semibold">{offer.rating}</span>
                    </div>
                    <span className="text-gray-500">({offer.reviews} reviews)</span>
                  </div>

                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-white">{offer.price}€</span>
                    {offer.originalPrice && (
                      <span className="text-gray-500 line-through text-lg mb-1">{offer.originalPrice}€</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 text-white rounded-lg font-semibold text-sm">
                      BUY NOW
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 rounded-lg font-semibold text-sm"
                    >
                      ADD TO CART
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">CATEGORIES</h2>
            <div className="h-1 w-24 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full"></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div
                  key={index}
                  className={`group relative bg-gradient-to-br from-[#0f1419]/90 to-[#1a1f3a]/90 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-yellow-500/50 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-yellow-500/20 hover:-translate-y-2 ${
                    category.special ? 'border-yellow-500/30 bg-gradient-to-br from-amber-900/20 to-yellow-900/20' : ''
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-white font-semibold mb-1 group-hover:text-yellow-400 transition-colors">
                    {category.name}
                  </h3>
                  
                  <p className="text-gray-400 text-sm">
                    {category.count} {category.count === 161 ? 'OFFERS' : 'offers'}
                  </p>

                  {category.special && (
                    <div className="absolute top-3 right-3">
                      <ChevronRight className="w-5 h-5 text-yellow-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mythic+ Bundles Banner */}
        <div className="relative bg-gradient-to-br from-purple-900/30 via-indigo-900/30 to-pink-900/30 rounded-3xl overflow-hidden shadow-2xl border border-purple-500/30">
          <div className="absolute inset-0 bg-[url('/assets/valorant.jpg')] bg-cover bg-center opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-purple-900/40 to-transparent" />
          
          <div className="relative z-10 p-8 md:p-12">
            <div className="max-w-2xl">
              <div className="inline-block mb-3">
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1.5 rounded-full text-sm font-bold uppercase">
                  KEYSTONE MASTER
                </span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-3">
                Mythic + Bundles
              </h2>
              
              <p className="text-gray-300 text-lg mb-6">
                x3 Mythic + 15 timed gameplay + 15% OFF!
              </p>
              
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 rounded-full text-lg font-bold shadow-2xl shadow-purple-500/50 transition-all duration-300 hover:scale-105">
                VIEW OFFERS
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  );
}
