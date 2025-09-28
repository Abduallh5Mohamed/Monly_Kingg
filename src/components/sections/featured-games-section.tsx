'use client';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const featuredGames = [
  {
    name: 'Valorant',
    description: 'A 5v5 character-based tactical shooter.',
    bgImage: '/assets/account-3.jpg',
    logo: '/assets/game-valorant.png',
  },
  {
    name: 'PUBG',
    description: 'A multiplayer online battle royale game.',
    bgVideo: '/assets/pubg.mp4',
    logo: '/assets/game-pubg.png',
  },
  {
    name: 'FIFA',
    description: 'A series of association football simulation video games.',
    bgImage: '/assets/account-4.jpg',
    logo: '/assets/game-fifa.png',
  },
  {
    name: 'League of Legends',
    description: 'A multiplayer online battle arena video game.',
    bgImage: '/assets/account-2.jpg',
    logo: '/assets/game-lol.png',
  },
  {
    name: 'Call of Duty',
    description: 'A first-person shooter video game series.',
    bgImage: '/assets/account-1.jpg',
    logo: '/assets/game-cod.png',
  },
];

export function FeaturedGamesSection() {
  return (
    <section id="games" className="py-24 sm:py-32 bg-background relative">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-headline font-bold text-white text-glow text-center mb-16 uppercase">
          // Featured Games
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredGames.map((game: any) => (
            <div 
              key={game.name} 
              className="group relative aspect-[3/4] overflow-hidden"
              style={{
                clipPath: 'polygon(0 0, 100% 0, 100% 90%, 85% 100%, 0 100%)'
              }}
            >
              <div 
                className="absolute inset-0 transition-transform duration-500 ease-in-out group-hover:scale-110"
              >
                {game.bgVideo ? (
                  <video
                    src={game.bgVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={game.bgImage}
                    alt={`${game.name} background`}
                    fill
                    className="object-cover"
                    data-ai-hint="game background"
                  />
                )}
                <div 
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" 
                />
              </div>

              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="relative h-20 w-20 mb-4 transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src={game.logo}
                    alt={`${game.name} logo`}
                    fill
                    className="object-contain"
                  />
                </div>
                <h3 className="text-3xl font-headline text-white">{game.name}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{game.description}</p>
                
                <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
                  <Button variant="outline" className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20">
                    Explore Accounts <ArrowRight className="ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
