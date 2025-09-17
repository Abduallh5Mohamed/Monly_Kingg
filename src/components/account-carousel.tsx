'use client';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import Image from "next/image"
import { Gamepad2 } from "lucide-react";

type TrendingGame = {
  name: string;
  logo: string;
  iconBg: string;
};

const trendingGames: TrendingGame[] = [
  {
    name: 'FIFA',
    logo: '/assets/game-fifa.png',
    iconBg: 'bg-red-600/50 border-red-400',
  },
  {
    name: 'PUBG',
    logo: '/assets/game-pubg.png',
    iconBg: 'bg-blue-600/50 border-blue-400',
  },
  {
    name: 'VALORANT',
    logo: '/assets/game-valorant.png',
    iconBg: 'bg-pink-600/50 border-pink-400',
  },
];

export function AccountCarousel() {
  return (
    <>
      <Carousel opts={{ loop: true, align: "start" }} className="w-full">
        <CarouselContent className="-ml-4">
          {trendingGames.map((game, index) => (
            <CarouselItem key={index} className="pl-8 md:basis-1/2 lg:basis-1/3">
              <div className="group relative aspect-[1/1.05] w-full flex items-center justify-center">
                <div 
                  className="absolute inset-0 bg-primary transition-all duration-300 group-hover:blur-[48px] group-hover:scale-105"
                  style={{
                    clipPath: 'polygon(25% 0, 75% 0, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0 75%, 0 25%)',
                  }}
                />
                <div 
                  className="relative w-[96%] h-[96%] bg-background transition-all duration-300 group-hover:scale-105"
                  style={{
                    clipPath: 'polygon(25% 0, 75% 0, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0 75%, 0 25%)',
                  }}
                >
                  <div className="w-full h-full flex flex-col items-center justify-center p-6">
                    <div className="relative flex-1 w-full flex items-center justify-center">
                       <Image
                        src={game.logo}
                        alt={`${game.name} logo`}
                        width={150}
                        height={150}
                        className="object-contain transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${game.iconBg}`}>
                        <Gamepad2 className="w-4 h-4 text-white"/>
                      </div>
                      <span className="font-headline text-white text-sm tracking-wide">{game.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </>
  )
}
