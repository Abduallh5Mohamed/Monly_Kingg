'use client';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronDown, Star, X } from 'lucide-react';

interface GameAccount {
  id: string;
  title: string;
  rank: string;
  price: number;
  image: string;
  rating: number;
  seller: string;
  features: string[];
}

interface GameCategory {
  name: string;
  description: string;
  bgImage: string;
  logo: string;
  color: string;
  accounts: GameAccount[];
}

const gameCategories: GameCategory[] = [
  {
    name: 'Valorant',
    description: 'Premium ranked accounts with rare skins',
    bgImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
    logo: 'https://placehold.co/80x80/1a1f2e/22d3ee?text=VAL',
    color: '#fd4556',
    accounts: [
      { id: 'v1', title: 'Immortal 3 Account', rank: 'Immortal 3', price: 299, image: 'https://placehold.co/400x300/1a1f2e/fd4556?text=Immortal+3', rating: 4.9, seller: 'EliteStore', features: ['50+ Skins', 'Knife Collection', 'All Agents'] },
      { id: 'v2', title: 'Radiant Full Skins', rank: 'Radiant', price: 599, image: 'https://placehold.co/400x300/1a1f2e/fd4556?text=Radiant', rating: 5.0, seller: 'ProAccs', features: ['100+ Skins', 'Dragon Set', 'Battle Pass'] },
      { id: 'v3', title: 'Diamond 2 Starter', rank: 'Diamond 2', price: 89, image: 'https://placehold.co/400x300/1a1f2e/fd4556?text=Diamond+2', rating: 4.7, seller: 'GameVault', features: ['20+ Skins', 'Clean MMR', 'Email Access'] },
      { id: 'v4', title: 'Ascendant Collection', rank: 'Ascendant 3', price: 199, image: 'https://placehold.co/400x300/1a1f2e/fd4556?text=Ascendant', rating: 4.8, seller: 'EliteStore', features: ['40+ Skins', 'Rare Buddies', 'Ranked Ready'] },
    ]
  },
  {
    name: 'PUBG',
    description: 'Battle royale accounts with exclusive items',
    bgImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800',
    logo: 'https://placehold.co/80x80/1a1f2e/f59e0b?text=PUBG',
    color: '#f59e0b',
    accounts: [
      { id: 'p1', title: 'Conqueror Account', rank: 'Conqueror', price: 450, image: 'https://placehold.co/400x300/1a1f2e/f59e0b?text=Conqueror', rating: 4.9, seller: 'BattleKing', features: ['M416 Glacier', '100+ Outfits', 'RP Maxed'] },
      { id: 'p2', title: 'Crown Tier Bundle', rank: 'Crown', price: 120, image: 'https://placehold.co/400x300/1a1f2e/f59e0b?text=Crown', rating: 4.6, seller: 'PubgPro', features: ['Rare Vehicle', '50+ Outfits', 'UC Balance'] },
      { id: 'p3', title: 'Ace Dominator', rank: 'Ace', price: 250, image: 'https://placehold.co/400x300/1a1f2e/f59e0b?text=Ace', rating: 4.8, seller: 'BattleKing', features: ['AWM Skin', 'Mythic Items', 'S1 Frame'] },
    ]
  },
  {
    name: 'FIFA / FC',
    description: 'Ultimate Team accounts with top players',
    bgImage: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800',
    logo: 'https://placehold.co/80x80/1a1f2e/22c55e?text=FC',
    color: '#22c55e',
    accounts: [
      { id: 'f1', title: 'TOTY Squad Ready', rank: 'Div 1', price: 350, image: 'https://placehold.co/400x300/1a1f2e/22c55e?text=TOTY', rating: 4.9, seller: 'FutKing', features: ['5M Coins', 'TOTY Mbappe', 'Full Meta'] },
      { id: 'f2', title: 'Icon Collection', rank: 'Div 3', price: 180, image: 'https://placehold.co/400x300/1a1f2e/22c55e?text=Icons', rating: 4.7, seller: 'FifaPro', features: ['3 Icons', '2M Coins', 'Rank 2'] },
    ]
  },
  {
    name: 'League of Legends',
    description: 'High-ranked accounts with rare skins',
    bgImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800',
    logo: 'https://placehold.co/80x80/1a1f2e/3b82f6?text=LoL',
    color: '#3b82f6',
    accounts: [
      { id: 'l1', title: 'Challenger Account', rank: 'Challenger', price: 799, image: 'https://placehold.co/400x300/1a1f2e/3b82f6?text=Challenger', rating: 5.0, seller: 'LeagueElite', features: ['All Champs', '200+ Skins', 'Clean History'] },
      { id: 'l2', title: 'Master Tier Smurf', rank: 'Master', price: 250, image: 'https://placehold.co/400x300/1a1f2e/3b82f6?text=Master', rating: 4.8, seller: 'SummonerShop', features: ['150 Champs', '80+ Skins', 'Fresh MMR'] },
      { id: 'l3', title: 'Diamond OTP', rank: 'Diamond 1', price: 150, image: 'https://placehold.co/400x300/1a1f2e/3b82f6?text=Diamond', rating: 4.6, seller: 'LeagueElite', features: ['50+ Skins', 'BE Stack', 'Ranked Ready'] },
    ]
  },
  {
    name: 'Call of Duty',
    description: 'Warzone & multiplayer accounts with camos',
    bgImage: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b28?w=800',
    logo: 'https://placehold.co/80x80/1a1f2e/a855f7?text=CoD',
    color: '#a855f7',
    accounts: [
      { id: 'c1', title: 'Damascus + Obsidian', rank: 'Prestige Master', price: 180, image: 'https://placehold.co/400x300/1a1f2e/a855f7?text=Damascus', rating: 4.8, seller: 'CodVault', features: ['Damascus All', 'Obsidian Pack', 'Dark Aether'] },
      { id: 'c2', title: 'Ranked Play Ready', rank: 'Crimson', price: 120, image: 'https://placehold.co/400x300/1a1f2e/a855f7?text=Ranked', rating: 4.7, seller: 'WarzonePro', features: ['Ranked Unlocks', 'Meta Loadouts', 'Clean Stats'] },
    ]
  },
];

export function FeaturedGamesSection() {
  const [selectedGame, setSelectedGame] = useState<GameCategory | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // don't close when clicking game buttons
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGameSelect = (game: GameCategory) => {
    if (selectedGame?.name === game.name && isOpen) {
      setIsOpen(false);
    } else {
      setSelectedGame(game);
      setIsOpen(true);
    }
  };

  return (
    <section id="games" className="py-24 sm:py-32 bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-primary/80 uppercase tracking-[0.3em] text-xs sm:text-sm font-medium mb-3">Browse Categories</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold text-white uppercase">
            Choose Your Game
          </h2>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto text-sm sm:text-base">Select a game to explore premium accounts available for purchase</p>
        </div>

        {/* Game Selection Grid */}
        <div className="flex overflow-x-auto pb-4 gap-3 sm:gap-4 mb-8 sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:overflow-visible sm:pb-0 snap-x snap-mandatory scrollbar-hide">
          {gameCategories.map((game) => {
            const isSelected = selectedGame?.name === game.name && isOpen;
            return (
              <button
                key={game.name}
                onClick={() => handleGameSelect(game)}
                className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-500 text-left flex-shrink-0 w-[200px] sm:w-auto snap-start ${
                  isSelected
                    ? 'border-primary shadow-[0_0_30px_rgba(34,211,238,0.3)] scale-[1.02]'
                    : 'border-white/10 hover:border-white/30 hover:shadow-lg hover:shadow-primary/10'
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={game.bgImage}
                    alt={game.name}
                    fill
                    className={`object-cover transition-all duration-700 ${isSelected ? 'scale-110 brightness-75' : 'group-hover:scale-110 brightness-50 group-hover:brightness-[0.6]'}`}
                  />
                  <div className={`absolute inset-0 transition-all duration-500 ${isSelected ? 'bg-gradient-to-t from-black/90 via-black/50 to-transparent' : 'bg-gradient-to-t from-black/80 via-black/40 to-transparent'}`} />
                  
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <ChevronDown className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-white/20">
                      <Image src={game.logo} alt={game.name} fill className="object-cover" />
                    </div>
                    <h3 className="font-bold text-white text-sm truncate">{game.name}</h3>
                  </div>
                  <p className="text-xs text-white/60 truncate">{game.accounts.length} accounts available</p>
                </div>

                <div
                  className={`absolute bottom-0 left-0 right-0 h-[3px] transition-all duration-500 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}
                  style={{ background: `linear-gradient(90deg, transparent, ${game.color}, transparent)` }}
                />
              </button>
            );
          })}
        </div>

        {/* Dropdown Accounts Panel */}
        <div ref={dropdownRef} className={`transition-all duration-700 ease-out overflow-hidden ${isOpen && selectedGame ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          {selectedGame && (
            <div className="relative rounded-2xl border border-white/10 bg-card/80 backdrop-blur-xl overflow-hidden">
              {/* Header */}
              <div className="relative px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10">
                <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(135deg, ${selectedGame.color}20, transparent)` }} />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 flex-shrink-0" style={{ borderColor: selectedGame.color + '60' }}>
                      <Image src={selectedGame.logo} alt={selectedGame.name} fill className="object-cover" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white">{selectedGame.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{selectedGame.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{selectedGame.accounts.length} listings</span>
                    <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                      <X className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Accounts Grid */}
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                  {selectedGame.accounts.map((account, index) => (
                    <div
                      key={account.id}
                      className="group/card relative rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] overflow-hidden transition-all duration-500 hover:border-white/20 hover:shadow-lg hover:-translate-y-1"
                      style={{
                        animation: isOpen ? `slideUp 0.5s ease-out ${index * 100}ms both` : 'none'
                      }}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <Image src={account.image} alt={account.title} fill className="object-cover transition-transform duration-500 group-hover/card:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20">
                          <span className="text-white font-bold text-sm">${account.price}</span>
                        </div>
                        <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs text-white font-medium">{account.rating}</span>
                        </div>
                        <div className="absolute bottom-3 left-3">
                          <span className="px-3 py-1 rounded-full text-xs font-bold text-white border" style={{ backgroundColor: selectedGame.color + '30', borderColor: selectedGame.color + '60' }}>
                            {account.rank}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-white text-sm mb-1 group-hover/card:text-primary transition-colors">{account.title}</h4>
                        <p className="text-xs text-muted-foreground mb-3">by {account.seller}</p>
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {account.features.map((feature, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-white/70 border border-white/10">{feature}</span>
                          ))}
                        </div>
                        <Button size="sm" className="w-full rounded-lg text-xs font-bold transition-all duration-300 hover:shadow-lg" style={{ background: `linear-gradient(135deg, ${selectedGame.color}, ${selectedGame.color}cc)` }}>
                          View Details <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
