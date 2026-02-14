'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { UserDashboardLayout } from '@/components/layout/user-dashboard-layout';
import Link from 'next/link';
import {
  Gamepad2,
  Monitor,
  Gift,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Zap,
  Loader2,
  ShoppingCart,
  CreditCard,
  Timer,
  Headphones,
  Crown,
  Laptop,
  Flame,
  Star,
  TrendingUp,
  Sparkles,
  Megaphone,
  Percent,
} from 'lucide-react';

/* ── SVG Platform Icons ── */
const SteamIcon = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M11.979 0C5.678 0 .511 4.86.022 10.95l6.432 2.658a3.387 3.387 0 0 1 1.912-.59c.063 0 .125.003.187.006l2.866-4.158V8.77c0-2.344 1.904-4.25 4.248-4.25 2.344 0 4.248 1.906 4.248 4.25 0 2.343-1.904 4.248-4.248 4.248l-.073-.001-4.088 2.92c0 .052.003.104.003.156 0 1.757-1.43 3.187-3.187 3.187-1.542 0-2.826-1.093-3.127-2.554L.238 14.41c1.301 5.332 6.103 9.29 11.74 9.29C18.616 23.7 24 18.316 24 11.85 24 5.384 18.617 0 11.979 0z" />
  </svg>
);

const XboxIcon = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M4.102 21.033C6.211 22.881 8.977 24 12 24c3.026 0 5.789-1.119 7.902-2.967 1.877-1.912-4.316-8.709-7.902-11.417-3.582 2.708-9.779 9.505-7.898 11.417zm11.16-14.406c2.5 2.961 7.484 10.313 6.076 12.912C23.056 17.36 24 14.8 24 12c0-4.571-2.548-8.545-6.301-10.58l-.001.001c-.125-.074-.249-.145-.376-.214-.327.396-1.48 1.953-2.06 4.42zm-9.116 12.91c-1.409-2.6 3.577-9.951 6.078-12.91-.578-2.468-1.734-4.024-2.061-4.42-.156.086-.31.177-.461.27C5.857 4.641 3.43 8.025 3.07 12h.006c0 2.819.951 5.395 2.07 7.537z" />
  </svg>
);

const PlayStationIcon = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M8.985 2.596v17.548l3.915 1.261V6.688c0-.69.304-1.151.794-.991.636.181.76.814.76 1.505v5.876c2.441 1.193 4.362-.002 4.362-3.153 0-3.237-1.126-4.675-4.438-5.827-1.307-.448-3.728-1.186-5.393-1.502z" />
  </svg>
);

/* ── Types ── */
interface Listing {
  _id: string;
  title: string;
  game: { _id: string; name: string } | null;
  seller: { _id: string; username: string } | null;
  price: number;
  coverImage: string | null;
  images: string[];
  details: Record<string, unknown>;
  status: string;
  createdAt: string;
}

interface Game {
  _id: string;
  name: string;
}

interface DashboardAd {
  _id: string;
  title: string;
  description: string;
  image: string;
  link: string;
  position: string;
  priority: number;
}

interface ActiveDiscount {
  _id: string;
  listing: {
    _id: string;
    title: string;
    price: number;
    coverImage: string | null;
    images: string[];
    game: { name: string } | null;
    status: string;
  } | null;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
}

/* ═══════════ STATIC DEMO DATA ═══════════ */
const STATIC_PRODUCTS = [
  { id: 's1', title: 'GTA V Premium Edition - Full Access Account', game: 'Grand Theft Auto V', price: 12.99, originalPrice: 29.99, discount: 57, rating: 4.8, sold: 1240, image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop', platform: 'Steam', region: 'Global', verified: true },
  { id: 's2', title: 'Fortnite Account - 150+ Skins Rare Collection', game: 'Fortnite', price: 24.99, originalPrice: 89.99, discount: 72, rating: 4.9, sold: 890, image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=300&fit=crop', platform: 'Epic', region: 'Global', verified: true },
  { id: 's3', title: 'Valorant Account - Diamond Rank + 30 Skins', game: 'Valorant', price: 34.99, originalPrice: 79.99, discount: 56, rating: 4.7, sold: 567, image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b28?w=400&h=300&fit=crop', platform: 'Riot', region: 'EU', verified: true },
  { id: 's4', title: 'Minecraft Java + Bedrock Premium Account', game: 'Minecraft', price: 8.49, originalPrice: 26.95, discount: 69, rating: 4.9, sold: 3200, image: 'https://images.unsplash.com/photo-1587573089734-599ef9a138e1?w=400&h=300&fit=crop', platform: 'Microsoft', region: 'Global', verified: true },
  { id: 's5', title: 'CS2 Prime Status + 500hrs Gameplay', game: 'Counter-Strike 2', price: 15.99, originalPrice: 35.99, discount: 56, rating: 4.6, sold: 2100, image: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=300&fit=crop', platform: 'Steam', region: 'Global', verified: true },
  { id: 's6', title: 'Apex Legends - Heirloom Account Level 500', game: 'Apex Legends', price: 44.99, originalPrice: 149.99, discount: 70, rating: 4.8, sold: 456, image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop', platform: 'EA', region: 'Global', verified: true },
  { id: 's7', title: 'League of Legends - 200+ Champions All Skins', game: 'League of Legends', price: 29.99, originalPrice: 99.99, discount: 70, rating: 4.7, sold: 780, image: 'https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=400&h=300&fit=crop', platform: 'Riot', region: 'EUW', verified: true },
  { id: 's8', title: 'Roblox Account - 10,000 Robux + Premium', game: 'Roblox', price: 19.99, originalPrice: 49.99, discount: 60, rating: 4.5, sold: 1500, image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&h=300&fit=crop', platform: 'Roblox', region: 'Global', verified: true },
];

const STATIC_GIFT_CARDS = [
  { id: 'g1', title: 'Steam Gift Card $50 USD', game: 'Steam', price: 42.99, originalPrice: 50.00, discount: 14, rating: 5.0, sold: 5600, image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop', platform: 'Steam', region: 'US', verified: true },
  { id: 'g2', title: 'PlayStation Store Gift Card $25', game: 'PlayStation', price: 21.49, originalPrice: 25.00, discount: 14, rating: 4.9, sold: 3400, image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=300&fit=crop', platform: 'PlayStation', region: 'US', verified: true },
  { id: 'g3', title: 'Xbox Game Pass Ultimate 3 Months', game: 'Xbox', price: 28.99, originalPrice: 44.99, discount: 36, rating: 4.8, sold: 2800, image: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=400&h=300&fit=crop', platform: 'Xbox', region: 'Global', verified: true },
  { id: 'g4', title: 'Nintendo eShop Gift Card $35', game: 'Nintendo', price: 30.49, originalPrice: 35.00, discount: 13, rating: 4.9, sold: 1900, image: 'https://images.unsplash.com/photo-1585620385456-4759f9b5c7d9?w=400&h=300&fit=crop', platform: 'Nintendo', region: 'US', verified: true },
  { id: 'g5', title: 'Google Play Gift Card $100', game: 'Google Play', price: 89.99, originalPrice: 100.00, discount: 10, rating: 4.8, sold: 4200, image: 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=400&h=300&fit=crop', platform: 'Google', region: 'Global', verified: true },
  { id: 'g6', title: 'iTunes / Apple Gift Card $50', game: 'Apple', price: 43.99, originalPrice: 50.00, discount: 12, rating: 4.9, sold: 3100, image: 'https://images.unsplash.com/photo-1591337676887-a217a6c1e926?w=400&h=300&fit=crop', platform: 'Apple', region: 'US', verified: true },
];

const STATIC_TRENDING = [
  { id: 't1', title: 'Elden Ring - Full Access Steam Account', game: 'Elden Ring', price: 18.99, originalPrice: 59.99, discount: 68, rating: 4.9, sold: 670, image: 'https://images.unsplash.com/photo-1580327344181-c1163234db17?w=400&h=300&fit=crop', platform: 'Steam', region: 'Global', verified: true },
  { id: 't2', title: 'Hogwarts Legacy Deluxe + All DLC', game: 'Hogwarts Legacy', price: 22.99, originalPrice: 69.99, discount: 67, rating: 4.8, sold: 890, image: 'https://images.unsplash.com/photo-1535572290543-960a8046f5af?w=400&h=300&fit=crop', platform: 'Steam', region: 'Global', verified: true },
  { id: 't3', title: 'FIFA 24 Ultimate Team Account', game: 'EA FC 24', price: 14.99, originalPrice: 39.99, discount: 63, rating: 4.6, sold: 1200, image: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=300&fit=crop', platform: 'EA', region: 'Global', verified: true },
  { id: 't4', title: 'Call of Duty MW3 - Level 155 Account', game: 'Call of Duty', price: 27.99, originalPrice: 69.99, discount: 60, rating: 4.7, sold: 540, image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop', platform: 'Battle.net', region: 'EU', verified: true },
  { id: 't5', title: 'Diablo IV Season Pass + Campaign', game: 'Diablo IV', price: 32.99, originalPrice: 89.99, discount: 63, rating: 4.5, sold: 340, image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop', platform: 'Battle.net', region: 'Global', verified: true },
  { id: 't6', title: 'Cyberpunk 2077 Phantom Liberty Account', game: 'Cyberpunk 2077', price: 16.99, originalPrice: 49.99, discount: 66, rating: 4.8, sold: 780, image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b28?w=400&h=300&fit=crop', platform: 'Steam', region: 'Global', verified: true },
];

const STATIC_SUBSCRIPTIONS = [
  { id: 'sub1', title: 'Netflix Premium 1 Year Subscription', game: 'Netflix', price: 29.99, originalPrice: 155.88, discount: 81, rating: 4.9, sold: 8900, image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8d6f28?w=400&h=300&fit=crop', platform: 'Netflix', region: 'Global', verified: true },
  { id: 'sub2', title: 'Spotify Premium 12 Months Account', game: 'Spotify', price: 19.99, originalPrice: 119.88, discount: 83, rating: 4.8, sold: 12400, image: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400&h=300&fit=crop', platform: 'Spotify', region: 'Global', verified: true },
  { id: 'sub3', title: 'YouTube Premium 1 Year - No Ads', game: 'YouTube', price: 24.99, originalPrice: 143.88, discount: 83, rating: 4.9, sold: 7600, image: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400&h=300&fit=crop', platform: 'Google', region: 'Global', verified: true },
  { id: 'sub4', title: 'Discord Nitro 1 Year Full Access', game: 'Discord', price: 34.99, originalPrice: 99.99, discount: 65, rating: 4.7, sold: 4500, image: 'https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=400&h=300&fit=crop', platform: 'Discord', region: 'Global', verified: true },
  { id: 'sub5', title: 'Xbox Game Pass Ultimate 12 Months', game: 'Xbox', price: 59.99, originalPrice: 179.88, discount: 67, rating: 4.8, sold: 3200, image: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=400&h=300&fit=crop', platform: 'Xbox', region: 'Global', verified: true },
  { id: 'sub6', title: 'EA Play Pro 1 Year Membership', game: 'EA Play', price: 39.99, originalPrice: 99.99, discount: 60, rating: 4.6, sold: 2100, image: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=300&fit=crop', platform: 'EA', region: 'Global', verified: true },
];

/* ── Category Icons ── */
const CATEGORIES = [
  { icon: SteamIcon, label: 'Steam', count: '2.4K' },
  { icon: Gamepad2, label: 'Games & DLCs', count: '1.8K' },
  { icon: CreditCard, label: 'Gift Cards', count: '950' },
  { icon: Timer, label: 'Subscriptions', count: '620' },
  { icon: Monitor, label: 'Accounts', count: '3.1K' },
  { icon: XboxIcon, label: 'Xbox', count: '780' },
  { icon: PlayStationIcon, label: 'PlayStation', count: '640' },
  { icon: Laptop, label: 'Software', count: '420' },
  { icon: Gift, label: 'Lifestyle', count: '310' },
];

/* ── Promo Banners ── */
const PROMO_BANNERS_TOP = [
  { title: 'SOFTWARE', subtitle: 'Mega Sale', discount: '-80%', gradient: 'from-orange-500 via-red-500 to-pink-500', emoji: '🔥' },
  { title: 'MINECRAFT', subtitle: 'Java + Bedrock', discount: '-60%', gradient: 'from-green-500 via-green-600 to-emerald-700', emoji: '⛏️' },
  { title: 'YouTube Premium', subtitle: 'Ad-Free', discount: '-70%', gradient: 'from-red-500 via-red-600 to-red-800', emoji: '▶️' },
];

const PROMO_BANNERS_BOTTOM = [
  { title: 'XBOX', discount: '-90%', gradient: 'from-green-400 via-green-500 to-green-700', IconComp: XboxIcon },
  { title: 'PlayStation', discount: '-70%', gradient: 'from-blue-500 via-blue-600 to-blue-800', IconComp: PlayStationIcon },
  { title: 'STEAM SALE', discount: '-80%', gradient: 'from-slate-600 via-slate-700 to-slate-900', IconComp: SteamIcon },
];

/* ── Platform Filter Tabs ── */
const PLATFORM_TABS = [
  { id: 'all', name: 'All', icon: Gamepad2, color: 'from-cyan-500 to-blue-500' },
  { id: 'steam', name: 'Steam', icon: SteamIcon, color: 'from-slate-500 to-slate-600' },
  { id: 'xbox', name: 'Xbox', icon: XboxIcon, color: 'from-green-500 to-green-600' },
  { id: 'playstation', name: 'PlayStation', icon: PlayStationIcon, color: 'from-blue-500 to-blue-600' },
];

/* ═══════════ HORIZONTAL SCROLL COMPONENT ═══════════ */
function HorizontalScroll({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll, { passive: true });
      checkScroll();
      return () => ref.removeEventListener('scroll', checkScroll);
    }
  }, [children]);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'right' ? 340 : -340, behavior: 'smooth' });
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Left fade + button */}
      <div className={`absolute left-0 top-0 bottom-2 w-16 bg-gradient-to-r from-[#060811] to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`} />
      <button
        onClick={() => scroll('left')}
        className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.1] text-white flex items-center justify-center transition-all duration-300 hover:bg-white/15 hover:scale-110 shadow-xl ${canScrollLeft ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2">
        {children}
      </div>

      {/* Right fade + button */}
      <div className={`absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-[#060811] to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`} />
      <button
        onClick={() => scroll('right')}
        className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.1] text-white flex items-center justify-center transition-all duration-300 hover:bg-white/15 hover:scale-110 shadow-xl ${canScrollRight ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ═══════════ STATIC PRODUCT CARD ═══════════ */
function StaticProductCard({ product }: { product: typeof STATIC_PRODUCTS[0] }) {
  const passPrice = (product.price * 0.82).toFixed(2);

  return (
    <div className="group flex-shrink-0 w-[200px] bg-[#0c0f18] rounded-2xl border border-white/[0.04] hover:border-white/[0.1] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/[0.07] hover:-translate-y-1.5">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f18] via-transparent to-transparent opacity-60" />

        {/* Verified */}
        <span className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center">
          <ShieldCheck className="w-3 h-3 text-cyan-400" />
        </span>

        {/* Discount badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1">
          <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg">
            -{product.discount}%
          </span>
        </div>

        {/* Rating */}
        <span className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
          <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /> {product.rating}
        </span>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-[12px] font-semibold text-white/85 line-clamp-2 min-h-[32px] group-hover:text-white transition-colors leading-tight">
          {product.title}
        </h3>

        {/* Platform & Region */}
        <div className="flex items-center gap-1 mt-2">
          <span className="text-[9px] text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded font-medium">{product.platform}</span>
          <span className="text-[9px] text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded font-medium">{product.region}</span>
          <span className="text-[9px] text-white/20 ml-auto">{product.sold.toLocaleString()} sold</span>
        </div>

        {/* Prices */}
        <div className="flex items-end justify-between mt-2.5 pt-2.5 border-t border-white/[0.04]">
          <div>
            <p className="text-[10px] text-white/20 line-through">${product.originalPrice.toFixed(2)}</p>
            <p className="text-base font-black text-white">${product.price.toFixed(2)}</p>
          </div>
          <button className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-cyan-400 hover:border-cyan-500/20 transition-all duration-300 hover:scale-110">
            <ShoppingCart className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* SEAL PASS Price */}
        <div className="mt-2 bg-gradient-to-r from-violet-500/80 to-purple-600/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
          <span className="text-white font-bold text-[13px]">${passPrice}</span>
          <span className="text-white/60 text-[9px] flex items-center gap-1">
            with <Crown className="w-2.5 h-2.5 text-yellow-300" /> <span className="font-bold text-white/80">PASS</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ DYNAMIC PRODUCT CARD (from API) ═══════════ */
function ProductCard({ listing }: { listing: Listing }) {
  const discount = Math.floor(10 + ((listing.price * 7) % 60));
  const originalPrice = (listing.price * (100 / (100 - discount))).toFixed(2);
  const passPrice = (listing.price * 0.82).toFixed(2);

  return (
    <Link
      href={`/listings/${listing._id}`}
      className="group flex-shrink-0 w-[200px] bg-[#0c0f18] rounded-2xl border border-white/[0.04] hover:border-white/[0.1] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/[0.07] hover:-translate-y-1.5"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {listing.coverImage || listing.images?.length > 0 ? (
          <img src={listing.coverImage || listing.images[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-white/[0.03] to-transparent flex items-center justify-center">
            <Gamepad2 className="w-10 h-10 text-white/[0.06]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f18] via-transparent to-transparent opacity-60" />
        <span className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center">
          <ShieldCheck className="w-3 h-3 text-cyan-400" />
        </span>
        <span className="absolute bottom-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg">
          -{discount}%
        </span>
      </div>
      <div className="p-3">
        <h3 className="text-[12px] font-semibold text-white/85 line-clamp-2 min-h-[32px] group-hover:text-white transition-colors leading-tight">
          {listing.title}
        </h3>
        <div className="flex items-center gap-1 mt-2">
          {listing.game && <span className="text-[9px] text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded font-medium">{listing.game.name}</span>}
          <span className="text-[9px] text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded font-medium">GLOBAL</span>
        </div>
        <div className="flex items-end justify-between mt-2.5 pt-2.5 border-t border-white/[0.04]">
          <div>
            <p className="text-[10px] text-white/20 line-through">${originalPrice}</p>
            <p className="text-base font-black text-white">${listing.price}</p>
          </div>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-cyan-400 hover:border-cyan-500/20 transition-all duration-300 hover:scale-110">
            <ShoppingCart className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="mt-2 bg-gradient-to-r from-violet-500/80 to-purple-600/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
          <span className="text-white font-bold text-[13px]">${passPrice}</span>
          <span className="text-white/60 text-[9px] flex items-center gap-1">
            with <Crown className="w-2.5 h-2.5 text-yellow-300" /> <span className="font-bold text-white/80">PASS</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ═══════════ SECTION HEADER ═══════════ */
function SectionHeader({ icon: Icon, title, color, subtitle }: { icon: React.ElementType; title: string; color: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className={`relative w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-4 h-4 text-white" />
          <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${color} blur-lg opacity-30`} />
        </div>
        <div>
          <h2 className="text-base font-bold text-white leading-tight">{title}</h2>
          {subtitle && <p className="text-[10px] text-white/25 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <Link href="/user/dashboard" className="text-[11px] text-white/25 hover:text-cyan-400 transition-colors font-medium flex items-center gap-1 group">
        View All
        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}

/* ═══════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════ */
export default function UserDashboardPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [trendingListings, setTrendingListings] = useState<Listing[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [dashboardAds, setDashboardAds] = useState<DashboardAd[]>([]);
  const [activeDiscounts, setActiveDiscounts] = useState<ActiveDiscount[]>([]);

  useEffect(() => {
    fetch('/api/v1/listings/games')
      .then((r) => r.json())
      .then((d) => { if (d.data) setGames(d.data); })
      .catch(() => { });

    // Fetch ads for dashboard
    fetch('/api/v1/ads/active?position=hero')
      .then((r) => r.json())
      .then((d) => { if (d.data) setDashboardAds(d.data); })
      .catch(() => { });

    // Fetch active discounts
    fetch('/api/v1/discounts/active')
      .then((r) => r.json())
      .then((d) => { if (d.data) setActiveDiscounts(d.data); })
      .catch(() => { });
  }, []);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const [bestRes, trendRes] = await Promise.all([
        fetch('/api/v1/listings/browse?limit=10&sort=newest'),
        fetch('/api/v1/listings/browse?limit=10&sort=price_asc'),
      ]);
      const bestData = await bestRes.json();
      const trendData = await trendRes.json();
      if (bestData.data) setListings(bestData.data);
      if (trendData.data) setTrendingListings(trendData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  return (
    <UserDashboardLayout>
      <div className="min-h-screen pb-28 space-y-10">

        {/* ═══════════ HERO WELCOME SECTION ═══════════ */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d1225] via-[#0f1630] to-[#0a0f20] border border-white/[0.04] p-6 sm:p-8">
          {/* Decorative orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/[0.04] rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/[0.04] rounded-full blur-[60px]" />
          
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Welcome back! <span className="inline-block animate-[float_3s_ease-in-out_infinite]">👋</span>
              </h1>
              <p className="text-sm text-white/30 mt-1">Find the best deals on gaming accounts & digital goods</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick stats pills */}
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-[11px] font-semibold text-white/60">12K+ Products</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span className="text-[11px] font-semibold text-white/60">Verified Sellers</span>
              </div>
            </div>
          </div>

          {/* Platform Tabs inside hero */}
          <div className="relative flex items-center gap-2 mt-6 overflow-x-auto scrollbar-hide pb-1">
            {PLATFORM_TABS.map((platform) => {
              const Icon = platform.icon;
              const isActive = selectedPlatform === platform.id;
              return (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-300 ${
                    isActive 
                      ? 'bg-white/[0.1] text-white shadow-lg border border-white/[0.1]' 
                      : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
                  }`}
                >
                  {isActive && <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${platform.color} opacity-15`} />}
                  <Icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{platform.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ═══════════ ADMIN ADS HERO CAROUSEL ═══════════ */}
        {dashboardAds.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-orange-400 to-red-500" />
              <span className="text-[11px] text-white/25 font-semibold uppercase tracking-widest">Sponsored</span>
            </div>
            <HorizontalScroll>
              {dashboardAds.map((ad) => (
                <a
                  key={ad._id}
                  href={ad.link || '#'}
                  target={ad.link ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  onClick={() => { fetch(`/api/v1/ads/${ad._id}/click`, { method: 'POST' }).catch(() => {}); }}
                  className="flex-shrink-0 relative w-[300px] md:w-[380px] aspect-[16/9] rounded-2xl overflow-hidden group border border-white/[0.04] hover:border-white/[0.1] transition-all duration-500"
                >
                  <img src={ad.image} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-bold text-sm truncate">{ad.title}</h3>
                    {ad.description && <p className="text-white/40 text-[11px] mt-0.5 line-clamp-1">{ad.description}</p>}
                  </div>
                  <span className="absolute top-2.5 right-2.5 bg-white/[0.08] backdrop-blur-sm text-white/40 text-[8px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">Ad</span>
                </a>
              ))}
            </HorizontalScroll>
          </section>
        )}

        {/* ═══════════ CATEGORY ICONS - Bento Grid Style ═══════════ */}
        <section>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <Link key={i} href="/user/dashboard" className="group flex flex-col items-center gap-2 py-3 px-2 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all duration-300 hover:-translate-y-0.5">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/30 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-all duration-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-white/45 font-medium group-hover:text-white/70 transition-colors leading-tight block">
                      {cat.label}
                    </span>
                    <span className="text-[8px] text-white/15 font-medium">{cat.count}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ═══════════ PROMOTIONAL BANNERS - Modern Cards ═══════════ */}
        <section className="space-y-2.5">
          {/* Top row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {PROMO_BANNERS_TOP.map((banner, i) => (
              <Link key={i} href="/user/dashboard"
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${banner.gradient} h-24 md:h-28 flex items-center justify-between px-5 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl group`}
              >
                {/* Noise overlay */}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
                
                <div className="relative z-10 flex items-center gap-3">
                  <span className="text-2xl">{banner.emoji}</span>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-wide">{banner.title}</h3>
                    <p className="text-white/50 text-[11px] font-medium">{banner.subtitle}</p>
                  </div>
                </div>
                <span className="relative z-10 bg-white/20 backdrop-blur-sm text-white text-base font-black px-3 py-1.5 rounded-xl border border-white/20">
                  {banner.discount}
                </span>
              </Link>
            ))}
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {PROMO_BANNERS_BOTTOM.map((banner, i) => (
              <Link key={i} href="/user/dashboard"
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${banner.gradient} h-16 md:h-20 flex items-center justify-between px-5 transition-all duration-500 hover:scale-[1.02] group`}
              >
                <div className="flex items-center gap-2.5">
                  <banner.IconComp className="w-6 h-6 text-white/70" />
                  <h3 className="text-sm font-black text-white tracking-wider">{banner.title}</h3>
                </div>
                <span className="bg-white/20 backdrop-blur-sm text-white text-sm font-black px-2.5 py-1 rounded-lg border border-white/10">
                  {banner.discount}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ═══════════ DISCOUNTED PRODUCTS (FROM ADMIN) ═══════════ */}
        {activeDiscounts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                  <Percent className="w-4 h-4 text-white" />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 blur-lg opacity-30" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                    Flash Deals
                    <span className="bg-red-500/15 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-500/15 animate-pulse">
                      LIMITED
                    </span>
                  </h2>
                  <p className="text-[10px] text-white/20 mt-0.5">Exclusive discounts, grab before they're gone</p>
                </div>
              </div>
              <Link href="/user/dashboard" className="text-[11px] text-white/25 hover:text-red-400 transition-colors font-medium flex items-center gap-1 group">
                View All
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <HorizontalScroll>
              {activeDiscounts.map((disc) => {
                if (!disc.listing) return null;
                const coverImg = disc.listing.coverImage || (disc.listing.images?.length > 0 ? disc.listing.images[0] : null);
                return (
                  <Link
                    key={disc._id}
                    href={`/listings/${disc.listing._id}`}
                    className="group flex-shrink-0 w-[200px] bg-[#0c0f18] rounded-2xl border border-red-500/[0.06] hover:border-red-500/20 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-red-500/[0.07] hover:-translate-y-1.5 relative"
                  >
                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-pink-500 to-red-500 z-10" />

                    <div className="relative aspect-[4/3] overflow-hidden">
                      {coverImg ? (
                        <img src={coverImg} alt={disc.listing.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-white/[0.03] to-transparent flex items-center justify-center">
                          <Gamepad2 className="w-10 h-10 text-white/[0.06]" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f18] via-transparent to-transparent opacity-60" />
                      <span className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center">
                        <ShieldCheck className="w-3 h-3 text-cyan-400" />
                      </span>
                      <span className="absolute bottom-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg animate-pulse">
                        -{disc.discountPercent}%
                      </span>
                    </div>

                    <div className="p-3">
                      <h3 className="text-[12px] font-semibold text-white/85 line-clamp-2 min-h-[32px] group-hover:text-red-300 transition-colors leading-tight">
                        {disc.listing.title}
                      </h3>
                      {disc.listing.game && (
                        <span className="text-[9px] text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded font-medium mt-2 inline-block">
                          {disc.listing.game.name}
                        </span>
                      )}
                      <div className="flex items-end justify-between mt-2.5 pt-2.5 border-t border-white/[0.04]">
                        <div>
                          <p className="text-[10px] text-white/20 line-through">${disc.originalPrice.toFixed(2)}</p>
                          <p className="text-base font-black text-red-400">${disc.discountedPrice.toFixed(2)}</p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/15 text-red-400 text-[9px] font-black px-2 py-1 rounded-lg">
                          DEAL
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </HorizontalScroll>
          </section>
        )}

        {/* ═══════════ BEST SELLING ACCOUNTS (STATIC) ═══════════ */}
        <section>
          <SectionHeader icon={Flame} title="Best Selling Accounts" color="from-orange-500 to-red-500" subtitle="Most popular gaming accounts" />
          <HorizontalScroll>
            {STATIC_PRODUCTS.map((product) => (
              <StaticProductCard key={product.id} product={product} />
            ))}
          </HorizontalScroll>
        </section>

        {/* ═══════════ BEST SELLING GIFT CARDS (STATIC) ═══════════ */}
        <section>
          <SectionHeader icon={CreditCard} title="Best Selling Gift Cards" color="from-emerald-500 to-green-600" subtitle="Top rated digital gift cards" />
          <HorizontalScroll>
            {STATIC_GIFT_CARDS.map((product) => (
              <StaticProductCard key={product.id} product={product} />
            ))}
          </HorizontalScroll>
        </section>

        {/* ═══════════ SEAL+PASS BANNER - Ultra Modern ═══════════ */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.04]">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0e0b1f] via-[#130f2a] to-[#0b0918]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(139,92,246,0.06),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_30%,rgba(236,72,153,0.04),transparent_50%)]" />
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          <div className="relative flex flex-col md:flex-row items-center">
            {/* Left Visual */}
            <div className="relative w-full md:w-2/5 h-44 md:h-56 flex items-center justify-center overflow-hidden">
              <div className="relative z-10">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-pink-500/20 rotate-6 hover:rotate-0 transition-transform duration-500">
                  <Crown className="w-12 h-12 md:w-16 md:h-16 text-white drop-shadow-lg" />
                </div>
              </div>
              {/* Floating orbs */}
              <div className="absolute top-8 right-16 w-8 h-8 bg-pink-500/10 rounded-full animate-[float_3s_ease-in-out_infinite]" />
              <div className="absolute bottom-12 left-20 w-5 h-5 bg-purple-500/15 rounded-full animate-[float_4s_ease-in-out_infinite_1s]" />
              <Sparkles className="absolute top-12 left-1/3 w-4 h-4 text-yellow-400/20 animate-pulse" />
            </div>

            {/* Right Content */}
            <div className="w-full md:w-3/5 p-6 md:p-8 text-center md:text-left">
              <div className="inline-block mb-3">
                <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full uppercase tracking-widest">Premium</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                SEAL<span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">+</span>PASS
              </h3>
              <p className="text-white/30 text-sm mt-2 max-w-sm">Save up to 25% on every purchase with our premium membership</p>

              <div className="my-5 border-t border-white/[0.04]" />

              <div className="flex items-baseline gap-2 justify-center md:justify-start">
                <span className="text-white/25 text-sm">from</span>
                <span className="text-3xl md:text-4xl font-black text-white tabular-nums">$2.49</span>
                <span className="text-sm text-white/30">/mo</span>
              </div>

              <button className="mt-5 w-full md:w-auto bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold px-8 py-3 rounded-xl hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 flex items-center justify-center gap-2 text-sm hover:scale-[1.02] active:scale-[0.98]">
                <Zap className="w-4 h-4" />
                Get SEAL+PASS
              </button>

              <p className="text-white/15 text-[10px] mt-3">Cancel anytime. No hidden fees.</p>
            </div>
          </div>
        </section>

        {/* ═══════════ TRENDING GAMES (STATIC) ═══════════ */}
        <section>
          <SectionHeader icon={TrendingUp} title="Trending Now" color="from-purple-500 to-violet-600" subtitle="What everyone's buying" />
          <HorizontalScroll>
            {STATIC_TRENDING.map((product) => (
              <StaticProductCard key={product.id} product={product} />
            ))}
          </HorizontalScroll>
        </section>

        {/* ═══════════ LIVE LISTINGS (FROM API) ═══════════ */}
        {listings.length > 0 && (
          <section>
            <SectionHeader icon={Sparkles} title="Latest Listings" color="from-cyan-500 to-blue-600" subtitle="Fresh from our sellers" />
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
                  <span className="text-[11px] text-white/20">Loading listings...</span>
                </div>
              </div>
            ) : (
              <HorizontalScroll>
                {listings.map((listing) => (
                  <ProductCard key={listing._id} listing={listing} />
                ))}
              </HorizontalScroll>
            )}
          </section>
        )}

        {/* ═══════════ POPULAR SUBSCRIPTIONS (STATIC) ═══════════ */}
        <section>
          <SectionHeader icon={Timer} title="Popular Subscriptions" color="from-pink-500 to-rose-600" subtitle="Best subscription deals" />
          <HorizontalScroll>
            {STATIC_SUBSCRIPTIONS.map((product) => (
              <StaticProductCard key={product.id} product={product} />
            ))}
          </HorizontalScroll>
        </section>

        {/* ═══════════ TRUST BADGES - Minimal ═══════════ */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { icon: ShieldCheck, title: 'Secure Payments', desc: 'Protected transactions', color: 'text-emerald-400' },
            { icon: Zap, title: 'Instant Delivery', desc: 'Get accounts instantly', color: 'text-amber-400' },
            { icon: Headphones, title: '24/7 Support', desc: 'Always available', color: 'text-blue-400' },
            { icon: Gift, title: 'Best Deals', desc: 'Unbeatable prices', color: 'text-pink-400' },
          ].map((feature, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 flex items-center gap-3 hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300">
              <div className={`w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center ${feature.color}`}>
                <feature.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-white/80">{feature.title}</p>
                <p className="text-[10px] text-white/20">{feature.desc}</p>
              </div>
            </div>
          ))}
        </section>

      </div>
    </UserDashboardLayout>
  );
}
