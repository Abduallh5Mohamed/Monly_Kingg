'use client';

import { useState, useEffect, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
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
  ChevronRight,
  Gamepad2,
  Award,
  Wallet,
  Timer,
  Gift,
  Rocket,
  Activity,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  CalendarDays,
  Compass,
  Sparkles,
  Users
} from 'lucide-react';

const popularOffers = [
  {
    id: 1,
    title: 'Castle Nathria Heroic Raid – Elite Carry Package',
    price: '€400',
    originalPrice: '€500',
    discount: '-20%',
    image: '/assets/pubg.jpg',
    badge: 'TRENDING',
    rating: 4.8,
    reviews: 124,
    platform: 'WoW Europe'
  },
  {
    id: 2,
    title: 'Valorant Immortal Ready – Account Bundle',
    price: '€400',
    originalPrice: '€600',
    discount: '-33%',
    image: '/assets/valorant.jpg',
    badge: 'HOT',
    rating: 4.9,
    reviews: 98,
    platform: 'Riot EUW'
  },
  {
    id: 3,
    title: 'FIFA Ultimate Champion – Icon Squad',
    price: '€400',
    originalPrice: '€500',
    discount: '-20%',
    image: '/assets/fifa.jpg',
    badge: 'NEW',
    rating: 4.7,
    reviews: 156,
    platform: 'EA FC 25'
  },
  {
    id: 4,
    title: 'PUBG Conqueror – Timeless Rarity Boost Service',
    price: '€400',
    originalPrice: '€550',
    discount: '-27%',
    image: '/assets/pubg-battlegrounds.png',
    badge: 'POPULAR',
    rating: 4.8,
    reviews: 203,
    platform: 'Global'
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
    name: 'Legendary Powers',
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
    name: 'PvP',
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
    name: 'Shadowlands Services',
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
    name: 'Watch All Items',
    count: 161,
    icon: ChevronRight,
    gradient: 'from-amber-500 to-amber-700',
    special: true
  }
];

type Highlight = {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

const premiumHighlights: Highlight[] = [
  {
    title: 'Concierge Portfolio Support',
    description: 'Dedicated brokers optimise your asset rotation with weekly ROI snapshots and resale recommendations.',
    icon: Award,
    accent: 'from-purple-500/30 to-purple-900/40'
  },
  {
    title: 'Secure Escrow & KYC',
    description: 'Multi-factor vaulting with 24/7 monitoring keeps your premium accounts safe during trades.',
    icon: Shield,
    accent: 'from-emerald-500/30 to-emerald-900/40'
  },
  {
    title: 'Access to Limited Drops',
    description: 'Invitations to founder-tier drops across Valorant, Call of Duty, and exclusive MMO events.',
    icon: Rocket,
    accent: 'from-amber-500/30 to-orange-900/40'
  }
];

const loyaltyPerks = [
  {
    title: 'Obsidian Tier Lounge',
    description: 'Private Discord channels, instant response SLA, and quarterly marketplace audits.',
    icon: Gift
  },
  {
    title: 'Asset Insurance',
    description: 'Complimentary recovery assistance and buy-back guarantees for verified trades.',
    icon: Shield
  },
  {
    title: 'Weekend Boost Events',
    description: 'Stackable XP boosts on cross-platform bundles every Friday through Sunday.',
    icon: Zap
  }
];

const featuredCollections = [
  {
    name: 'Immortal Ready Valorant Roster',
    summary: 'Hand-picked accounts with agent unlocks, battle-pass history, and top-tier skins.',
    image: '/assets/valorant.jpg'
  },
  {
    name: 'Prestige CoD Operators',
    summary: 'Rare operator bundles with limited camos and finishing moves, curated for collectors.',
    image: '/assets/pubg.jpg'
  }
];

type PortfolioSlice = {
  label: string;
  value: number;
  change: string;
  positive: boolean;
  color: string;
};

const portfolioBreakdown: PortfolioSlice[] = [
  {
    label: 'Prestige Accounts',
    value: 38,
    change: '+6.2%',
    positive: true,
    color: 'from-yellow-500 to-amber-500'
  },
  {
    label: 'Mythic Boost Services',
    value: 27,
    change: '+4.1%',
    positive: true,
    color: 'from-cyan-500 to-blue-500'
  },
  {
    label: 'Collectible Skins',
    value: 21,
    change: '+2.8%',
    positive: true,
    color: 'from-purple-500 to-indigo-500'
  },
  {
    label: 'Liquid Credits',
    value: 14,
    change: '-1.3%',
    positive: false,
    color: 'from-emerald-500 to-teal-500'
  }
];

type PortfolioMetric = {
  title: string;
  value: string;
  delta: string;
  helper?: string;
  positive: boolean;
  icon: LucideIcon;
};

const portfolioViews = {
  growth: {
    label: 'Growth',
    title: 'Aggressive expansion trajectory',
    subtitle: '90-day concierge forecast',
    callout: 'Rebalance two dormant accounts into high-velocity marketplace drops to keep momentum.',
    metrics: [
      {
        title: 'Projected 90d ROI',
        value: '+42%',
        delta: '+6.4%',
        helper: 'vs. last quarter',
        positive: true,
        icon: TrendingUp
      },
      {
        title: 'Average Hold Window',
        value: '18 days',
        delta: '-2 days',
        helper: 'Faster flips improve liquidity',
        positive: true,
        icon: RefreshCw
      },
      {
        title: 'Upsell Conversion',
        value: '32%',
        delta: '+5%',
        helper: 'Boosted by weekend bundles',
        positive: true,
        icon: Sparkles
      },
      {
        title: 'Risk Exposure',
        value: 'Low–Medium',
        delta: 'Improved',
        helper: 'Shield coverage extended',
        positive: true,
        icon: ShieldCheck
      }
    ]
  },
  income: {
    label: 'Income',
    title: 'Yield stabilisation mode',
    subtitle: 'Passive credit stream',
    callout: 'Maintain current farming cadence; concierge queued two premium retainers for November.',
    metrics: [
      {
        title: 'Monthly Yield',
        value: '€1,240',
        delta: '+11%',
        helper: 'Recurring after fees',
        positive: true,
        icon: Wallet
      },
      {
        title: 'Retention Rate',
        value: '94%',
        delta: '+3%',
        helper: '12-week trailing',
        positive: true,
        icon: Users
      },
      {
        title: 'Queue Time',
        value: '21 minutes',
        delta: '-5 minutes',
        helper: 'Concierge response SLA',
        positive: true,
        icon: Timer
      },
      {
        title: 'Escrow Coverage',
        value: '100%',
        delta: 'Maintained',
        helper: 'Across 12 managed assets',
        positive: true,
        icon: Shield
      }
    ]
  },
  security: {
    label: 'Security',
    title: 'Asset hardening protocol',
    subtitle: 'Threat surface diagnostics',
    callout: 'Enable biometric step-up on three legacy accounts before the next trading window.',
    metrics: [
      {
        title: 'Intrusion Attempts',
        value: '0',
        delta: '-3 incidents',
        helper: 'Last 30 days',
        positive: true,
        icon: ShieldCheck
      },
      {
        title: 'Anomaly Detection',
        value: '99.3%',
        delta: '+1.1%',
        helper: 'AI coverage score',
        positive: true,
        icon: Activity
      },
      {
        title: 'Recovery Readiness',
        value: 'under 6h',
        delta: 'Rehearsed',
        helper: 'Concierge war-game complete',
        positive: true,
        icon: Compass
      },
      {
        title: 'Insurance Buffer',
        value: '€75k',
        delta: '+€5k',
        helper: 'Obsidian tier coverage',
        positive: true,
        icon: Crown
      }
    ]
  }
} as const;

type PortfolioViewKey = keyof typeof portfolioViews;

type MarketSignal = {
  title: string;
  description: string;
  delta: string;
  positive: boolean;
  icon: LucideIcon;
};

const marketSignals: MarketSignal[] = [
  {
    title: 'Valorant Immortal scarcity',
    description: 'Store rotation tightened supply; concierge suggests listing legacy rosters within 48h.',
    delta: '+18%',
    positive: true,
    icon: TrendingUp
  },
  {
    title: 'Mythic+ booking cooldown',
    description: 'Demand dips before fortified week; hold premium carry slots for Friday surge.',
    delta: '-6%',
    positive: false,
    icon: BarChart3
  },
  {
    title: 'Shield insurance expansion',
    description: 'Obsidian tier now covers tactical shooters; upgrade aging assets for complimentary audits.',
    delta: '+3 franchises',
    positive: true,
    icon: ShieldCheck
  }
];

type RecentActivityType = 'credit' | 'debit' | 'info';

type RecentActivityItem = {
  time: string;
  title: string;
  value: string;
  type: RecentActivityType;
  icon: LucideIcon;
  meta?: string;
};

const recentActivity: RecentActivityItem[] = [
  {
    time: '2 hours ago',
    title: 'Valorant Immortal bundle sold via concierge resale window',
    value: '+€420',
    type: 'credit',
    icon: TrendingUp,
    meta: 'Buyer verified · Escrow released'
  },
  {
    time: '6 hours ago',
    title: 'Mythic+ carry reserved by Obsidian squad',
    value: '-€220',
    type: 'debit',
    icon: RefreshCw,
    meta: 'Weekend boost multiplier applied'
  },
  {
    time: 'Yesterday',
    title: 'PUBG Conqueror account enrolled in asset insurance',
    value: 'Secured',
    type: 'info',
    icon: ShieldCheck,
    meta: 'Coverage valid through Q1 2026'
  }
];

type UpcomingEvent = {
  title: string;
  date: string;
  description: string;
  icon: LucideIcon;
};

const upcomingEvents: UpcomingEvent[] = [
  {
    title: 'Legend Vault drop window',
    date: 'Oct 22 • 21:00 CET',
    description: 'Founder-tier loot curation with direct resale pairing and guaranteed KYC support.',
    icon: CalendarDays
  },
  {
    title: 'Cross-franchise strategy clinic',
    date: 'Oct 25 • 18:30 CET',
    description: 'Concierge coaches walk through hybrid income stacks for MMO and tactical shooters.',
    icon: Compass
  },
  {
    title: 'Obsidian lounge roundtable',
    date: 'Oct 29 • 20:00 CET',
    description: 'Invite-only mastermind with top resellers reviewing Q4 arbitrage opportunities.',
    icon: Users
  }
];

const slides = [
  {
    title: 'Shadowstrike Elite',
    subtitle: '50 limited slots • Prestige-only coaching teams on demand.',
    ctaLabel: 'View Elite Packages',
    accent: 'from-cyan-500 to-blue-500'
  },
  {
    title: 'Legend Vault Drop',
    subtitle: 'Guaranteed Mythic loot crates and cross-platform transfers with concierge setup.',
    ctaLabel: 'Browse Legend Vault',
    accent: 'from-amber-500 to-orange-500'
  },
  {
    title: 'Resell Optimiser',
    subtitle: 'Smart analytics predict resale windows to maximise ROI on your dormant accounts.',
    ctaLabel: 'Launch Optimiser',
    accent: 'from-emerald-500 to-teal-500'
  }
];

export default function UserDashboardPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activePortfolioView, setActivePortfolioView] = useState<PortfolioViewKey>('growth');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const activeSlide = slides[currentSlide];
  const activePortfolio = portfolioViews[activePortfolioView];

  const stats = useMemo(
    () => [
      {
        label: 'Prestige Tier',
        value: 'Obsidian III',
        helper: 'Next upgrade in 1,200 XP',
        icon: Crown,
        accent: 'from-purple-500 to-purple-700'
      },
      {
        label: 'Account Portfolio',
        value: '€9,450',
        helper: 'Across 12 managed assets',
        icon: Wallet,
        accent: 'from-emerald-500 to-teal-500'
      },
      {
        label: 'Avg. Resell ROI',
        value: '+38%',
        helper: 'Trailing 90 days',
        icon: Trophy,
        accent: 'from-amber-500 to-orange-500'
      },
      {
        label: 'Support SLA',
        value: '14m',
        helper: 'Concierge response time',
        icon: Timer,
        accent: 'from-cyan-500 to-blue-500'
      }
    ],
    []
  );

  return (
    <UserDashboardLayout>
      <div className="space-y-10 pb-12">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#060910] via-[#101526] to-[#090d16] shadow-2xl">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          >
            <source src="/assets/Hero-Background.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-transparent" />

          <div className="relative z-10 grid gap-10 p-8 md:p-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:p-16">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-white">
                ⚔️ Gaming Marketplace
              </span>

              <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                Elevate your roster, gear, and prestige level
                <br />
                <span className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-600 bg-clip-text text-transparent">
                  across the premium marketplace
                </span>
              </h1>

              <p className="max-w-2xl text-lg text-white/80">
                Tailored for elite players 25+ who treat gaming assets like investments. Unlock white-glove boosts, curated accounts, and concierge resale intelligence built for longevity.
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400" />
                  <span className="text-white font-semibold">4.9 Trustpilot</span>
                </div>
                <span className="opacity-40">•</span>
                <span>1000+ verified reviews</span>
                <span className="opacity-40">•</span>
                <span>GDPR-compliant secure escrow</span>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button className="rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 px-8 py-6 text-lg font-semibold text-white shadow-[0_20px_60px_-20px_rgba(234,179,8,0.75)] transition hover:scale-105 hover:from-yellow-600 hover:to-amber-700">
                  Explore Marketplace
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-white/30 bg-white/10 px-8 py-6 text-lg font-semibold text-white transition hover:bg-white/20"
                >
                  Schedule Strategy Call
                </Button>
              </div>
            </div>

            <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-[0_30px_80px_-40px_rgba(59,130,246,0.45)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-widest text-white/60">Active Initiative</p>
                  <h2 className="text-2xl font-semibold text-white">{activeSlide.title}</h2>
                </div>
                <Gamepad2 className="h-10 w-10 text-cyan-300" />
              </div>
              <p className="mt-4 text-sm text-white/70">{activeSlide.subtitle}</p>

              <Button
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-white/20 to-white/5 py-4 text-sm font-semibold text-white transition hover:from-white/30 hover:to-white/10"
              >
                {activeSlide.ctaLabel}
              </Button>

              <div className="mt-6 flex items-center justify-between text-xs text-white/40">
                {slides.map((slide, index) => (
                  <button
                    key={slide.title}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-1.5 flex-1 rounded-full transition ${
                      currentSlide === index ? 'bg-gradient-to-r ' + slide.accent : 'bg-white/10 hover:bg-white/20'
                    }`}
                    aria-label={`Activate slide ${slide.title}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 grid gap-4 border-t border-white/10 bg-black/50 p-6 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-inner shadow-black/30"
                >
                  <div>
                    <p className="text-sm uppercase tracking-widest text-white/50">{stat.label}</p>
                    <p className="text-2xl font-semibold text-white">{stat.value}</p>
                    <p className="text-xs text-white/50">{stat.helper}</p>
                  </div>
                  <div className={`rounded-xl bg-gradient-to-br ${stat.accent} p-3 text-white/90`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Premium Highlights */}
        <section className="grid gap-4 lg:grid-cols-3">
          {premiumHighlights.map((highlight) => {
            const Icon = highlight.icon;
            return (
              <div
                key={highlight.title}
                className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${highlight.accent} p-6 text-white shadow-lg shadow-black/30 backdrop-blur-xl transition hover:border-white/30`}
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-black/40 p-3">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{highlight.title}</h3>
                    <p className="text-sm text-white/70">{highlight.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Popular Offers Section */}
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white">Popular Offers</h2>
              <div className="h-1 w-24 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600" />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-5 py-2 text-sm font-semibold text-yellow-300 hover:bg-yellow-500/20"
              >
                Watchlist
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/15"
              >
                Request Custom Build
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {popularOffers.map((offer) => (
              <article
                key={offer.id}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f1419]/90 to-[#1a1f3a]/90 shadow-lg transition hover:-translate-y-2 hover:border-yellow-500/60 hover:shadow-yellow-500/20"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={offer.image}
                    alt={offer.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 px-3 py-1 text-xs font-bold text-white">
                      {offer.badge}
                    </span>
                    {offer.discount && (
                      <span className="rounded-full bg-red-500/90 px-3 py-1 text-xs font-bold text-white">
                        {offer.discount}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-4 left-4 text-xs uppercase tracking-widest text-white/70">
                    {offer.platform}
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="space-y-2">
                    <h3 className="line-clamp-2 min-h-[3rem] text-lg font-semibold text-white transition group-hover:text-yellow-400">
                      {offer.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span className="font-semibold text-white">{offer.rating}</span>
                      </div>
                      <span className="text-white/40">({offer.reviews} reviews)</span>
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-white">{offer.price}</span>
                    <span className="text-sm text-white/40 line-through">{offer.originalPrice}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button className="rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-sm font-semibold text-white transition hover:from-cyan-700 hover:to-cyan-600">
                      Buy Now
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center justify-center gap-2 rounded-xl border-yellow-500/50 text-sm font-semibold text-yellow-300 transition hover:bg-yellow-500/10"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white">Categories</h2>
            <div className="h-1 w-24 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600" />
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.name}
                  className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f1419]/90 to-[#181f31]/90 p-6 transition hover:-translate-y-2 hover:border-yellow-500/50 hover:shadow-2xl hover:shadow-yellow-500/20 ${
                    category.special ? 'border-yellow-500/40 bg-gradient-to-br from-amber-900/30 to-yellow-900/20' : ''
                  }`}
                >
                  <div className={`mb-5 inline-flex rounded-2xl bg-gradient-to-br ${category.gradient} p-3 text-white transition group-hover:scale-105`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-white transition group-hover:text-yellow-400">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-sm text-white/60">
                    {category.count} {category.count === 161 ? 'offers' : 'collections'}
                  </p>
                  {category.special && (
                    <ChevronRight className="absolute right-5 top-5 h-5 w-5 text-yellow-400" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Portfolio Intelligence */}
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f1320] via-[#121933] to-[#080b14] p-8 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Portfolio Intelligence</p>
                <h2 className="text-3xl font-bold text-white">Active Asset Mix</h2>
                <p className="mt-2 max-w-xl text-sm text-white/60">
                  Concierge-grade analytics balance growth, yield, and security so your marketplace portfolio compounds with minimal friction.
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
                {(Object.entries(portfolioViews) as [PortfolioViewKey, (typeof portfolioViews)[PortfolioViewKey]][]).map(([key, view]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActivePortfolioView(key)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      activePortfolioView === key
                        ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[0.6fr_0.4fr]">
              <div className="space-y-5">
                {portfolioBreakdown.map((slice) => (
                  <div
                    key={slice.label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-white">{slice.label}</span>
                      <span className={`text-xs font-semibold ${slice.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {slice.change}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${slice.color}`}
                          style={{ width: `${slice.value}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-white">{slice.value}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 rounded-2xl border border-white/10 bg-[#11182a]/80 p-6 backdrop-blur-xl">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">{activePortfolio.subtitle}</p>
                  <h3 className="text-2xl font-semibold text-white">{activePortfolio.title}</h3>
                  <p className="mt-2 text-sm text-white/60">{activePortfolio.callout}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {activePortfolio.metrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                      <div
                        key={metric.title}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20"
                      >
                        <div className="flex items-center justify-between">
                          <div className="rounded-xl bg-white/10 p-2 text-white">
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className={`text-xs font-semibold ${metric.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {metric.delta}
                          </span>
                        </div>
                        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/50">{metric.title}</p>
                        <p className="text-xl font-semibold text-white">{metric.value}</p>
                        {metric.helper && <p className="text-xs text-white/50">{metric.helper}</p>}
                      </div>
                    );
                  })}
                </div>

                <Button className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-500 py-3 text-sm font-semibold text-white transition hover:from-cyan-700 hover:to-blue-600">
                  Request Rebalance Review
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#121826]/90 to-[#0d101c]/90 p-8 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Market Signals</p>
                <h3 className="text-2xl font-semibold text-white">Concierge Radar</h3>
              </div>
              <Button
                variant="ghost"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                View Analytics
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              {marketSignals.map((signal) => {
                const Icon = signal.icon;
                return (
                  <div
                    key={signal.title}
                    className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 p-3 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-white">{signal.title}</h4>
                        <span className={`text-xs font-semibold ${signal.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {signal.delta}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-white/60">{signal.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-yellow-500/40 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 p-4 text-sm text-yellow-100">
              Concierge note: Lock in guaranteed resale multipliers before the weekend auction close.
            </div>
          </div>
        </section>

        {/* Featured Collections */}
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden rounded-3xl border border-purple-500/40 bg-gradient-to-br from-purple-900/20 via-purple-900/40 to-blue-900/30 p-8 shadow-2xl">
            <div className="absolute inset-0 bg-[url('/assets/valorant.jpg')] bg-cover bg-center opacity-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-purple-900/40 to-transparent" />
            <div className="relative z-10 space-y-6">
              <span className="inline-flex items-center rounded-full bg-purple-500/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                Keystone Master
              </span>
              <h2 className="text-4xl font-bold text-white">Mythic + Bundles</h2>
              <p className="max-w-xl text-white/70">Triple Mythic+ 15 timed runs with tactical coaching and 15% off on cross-faction carry teams.</p>
              <Button className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-lg font-semibold text-white transition hover:from-purple-700 hover:to-pink-700">
                View Offers
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {featuredCollections.map((collection) => (
              <div
                key={collection.name}
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#101522]/90 to-[#0b0f18]/80 p-6 shadow-lg"
              >
                <div className="absolute inset-0 bg-black/50" />
                <img
                  src={collection.image}
                  alt={collection.name}
                  className="absolute inset-0 h-full w-full object-cover opacity-40"
                />
                <div className="relative z-10 space-y-2 text-white">
                  <h3 className="text-xl font-semibold">{collection.name}</h3>
                  <p className="text-sm text-white/70">{collection.summary}</p>
                  <Button variant="ghost" className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20">
                    Discover Collection
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Activity & Events */}
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f141f] via-[#111a2d] to-[#080b13] p-8 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Recent Activity</p>
                <h2 className="text-3xl font-bold text-white">Concierge-verified ledger</h2>
                <p className="mt-2 text-sm text-white/60">Live sync across marketplace sales, bookings, and security automations.</p>
              </div>
              <Button
                variant="outline"
                className="rounded-full border-white/20 bg-white/5 px-5 py-2 text-xs font-semibold text-white hover:bg-white/15"
              >
                Export Ledger
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              {recentActivity.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={`${item.title}-${item.time}`}
                    className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 p-3 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                        <span
                          className={`text-sm font-semibold ${
                            item.type === 'credit'
                              ? 'text-emerald-400'
                              : item.type === 'debit'
                              ? 'text-rose-400'
                              : 'text-cyan-300'
                          }`}
                        >
                          {item.value}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-white/50">
                        <span>{item.time}</span>
                        {item.meta && <span className="text-white/40">•</span>}
                        {item.meta && <span>{item.meta}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#121a2c] via-[#10182a] to-[#070a12] p-8 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%)]" />
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Concierge Calendar</p>
                <h2 className="text-3xl font-bold text-white">Upcoming premium moments</h2>
                <p className="mt-2 text-sm text-white/60">Reserve your slot before allocations close for Obsidian members.</p>
              </div>
              <Button className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2 text-xs font-semibold text-white hover:from-purple-700 hover:to-blue-700">
                Reserve Access
              </Button>
            </div>

            <div className="relative z-10 mt-6 space-y-4">
              {upcomingEvents.map((event) => {
                const Icon = event.icon;
                return (
                  <div
                    key={event.title}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="flex flex-1 items-start gap-3">
                      <div className="rounded-xl bg-gradient-to-br from-amber-500/30 to-yellow-500/30 p-3 text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-white/50">{event.date}</p>
                        <h3 className="mt-1 text-lg font-semibold text-white">{event.title}</h3>
                        <p className="mt-1 text-sm text-white/60">{event.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="mt-2 h-5 w-5 text-white/40" />
                  </div>
                );
              })}
            </div>

            <div className="relative z-10 mt-8 rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500/15 to-blue-500/10 p-5 text-white">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-xl bg-black/30 p-2 text-cyan-200">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Concierge Line</p>
                  <h3 className="text-lg font-semibold">Private turnaround currently 12 minutes</h3>
                </div>
              </div>
              <p className="mt-3 text-sm text-white/70">Ping your broker with code <span className="font-semibold text-cyan-200">OBSIDIAN-PRIORITY</span> for instant escalation.</p>
            </div>
          </div>
        </section>

        {/* Loyalty Perks */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0f1320] via-[#10172c] to-[#070b13] p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Loyalty Intelligence</p>
              <h2 className="text-3xl font-bold text-white">Staying Obsidian unlocks the concierge ecosystem</h2>
            </div>
            <Button className="rounded-full bg-gradient-to-r from-cyan-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-700 hover:to-cyan-600">
              Review Tier Benefits
            </Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {loyaltyPerks.map((perk) => {
              const Icon = perk.icon;
              return (
                <div key={perk.title} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-white/80">
                  <div className="rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/40 p-3 text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{perk.title}</h3>
                    <p className="text-sm text-white/70">{perk.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </UserDashboardLayout>
  );
}
