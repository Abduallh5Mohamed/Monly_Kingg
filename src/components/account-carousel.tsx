'use client';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import Image from "next/image"

type TrendingGame = {
  name: string;
  logo: string;
  iconBg: string;
};

const trendingGames: TrendingGame[] = [
  {
    name: '',
    logo: '/assets/pubg.jpg',
    iconBg: 'bg-blue-600/50 border-blue-400',
  },
  {
    name: '',
    logo: '/assets/valorant.jpg',
    iconBg: 'bg-pink-600/50 border-pink-400',
  },
  {
    name: '',
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
              <div className="group relative aspect-[3/4] w-full rounded-xl holographic-border overflow-hidden">
                <Image
                  src={game.logo}
                  alt={'Trending Game'}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110 object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center gap-3">
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </>
  )
}
