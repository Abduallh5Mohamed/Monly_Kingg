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
    name: 'PUBG',
    logo: '/assets/game-pubg.png',
    iconBg: 'bg-blue-600/50 border-blue-400',
  },
  {
    name: 'VALORANT',
    logo: '/assets/game-valorant.png',
    iconBg: 'bg-pink-600/50 border-pink-400',
  },
  {
    name: 'FIFA',
    logo: '/assets/game-fifa.png',
    iconBg: 'bg-green-600/50 border-green-400',
  },
];

export function AccountCarousel() {
  return (
    <>
      <Carousel opts={{ loop: true, align: "start" }} className="w-full">
        <CarouselContent className="-ml-4">
          {trendingGames.map((game, index) => (
            <CarouselItem key={index} className="pl-8 md:basis-1/2 lg:basis-1/3">
              <div className="group relative aspect-[3/4] w-full flex items-center justify-center">
                <div 
                  className="absolute inset-0 bg-primary rounded-lg transition-all duration-300 group-hover:blur-[32px] group-hover:scale-105"
                />
                <div 
                  className="relative w-[97%] h-[97%] bg-background rounded-lg transition-all duration-300 group-hover:scale-105"
                >
                  <div className="w-full h-full flex flex-col items-center justify-center p-6">
                    <div className="relative flex-1 w-full flex items-center justify-center">
                       <Image
                        src={game.logo}
                        alt={`${game.name} logo`}
                        width={200}
                        height={200}
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
