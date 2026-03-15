'use client';
import Image from 'next/image';

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
    name: 'FIFA',
    description: 'Ultimate Team accounts with top players',
    bgImage: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800',
    logo: 'https://placehold.co/80x80/1a1f2e/22c55e?text=FIFA',
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
    name: 'Arc Raiders',
    description: 'Action-packed accounts with rare items',
    bgImage: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b28?w=800',
    logo: 'https://placehold.co/80x80/1a1f2e/ec4899?text=ARC',
    color: '#ec4899',
    accounts: [
      { id: 'a1', title: 'Legendary Rider', rank: 'S-Rank', price: 280, image: 'https://placehold.co/400x300/1a1f2e/ec4899?text=Legendary', rating: 4.9, seller: 'ArkMaster', features: ['Rare Mount', 'Epic Gear', 'Max Level'] },
      { id: 'a2', title: 'Elite Collection', rank: 'A-Rank', price: 150, image: 'https://placehold.co/400x300/1a1f2e/ec4899?text=Elite', rating: 4.7, seller: 'RiderPro', features: ['Multiple Riders', 'Premium Items', 'Resources'] },
    ]
  },
];

export function FeaturedGamesSection() {
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
            return (
              <div
                key={game.name}
                className="group relative overflow-hidden rounded-2xl border-2 transition-all duration-500 text-left flex-shrink-0 w-[200px] sm:w-auto snap-start border-white/10 hover:border-white/30 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={game.bgImage}
                    alt={game.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-all duration-700 group-hover:scale-110 brightness-50 group-hover:brightness-[0.6]"
                  />
                  <div className="absolute inset-0 transition-all duration-500 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-white/20">
                      <Image src={game.logo} alt={game.name} fill sizes="32px" className="object-cover" />
                    </div>
                    <h3 className="font-bold text-white text-sm truncate">{game.name}</h3>
                  </div>
                  <p className="text-xs text-white/60 truncate">{game.accounts.length} accounts available</p>
                </div>

                <div
                  className="absolute bottom-0 left-0 right-0 h-[3px] transition-all duration-500 opacity-0 group-hover:opacity-50"
                  style={{ background: `linear-gradient(90deg, transparent, ${game.color}, transparent)` }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
