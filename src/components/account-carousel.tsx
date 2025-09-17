'use client';

import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import Image from "next/image"
import type { Account } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Gamepad2 } from "lucide-react";

const placeholderAccountImages = PlaceHolderImages.filter(img => img.id.startsWith('account-'));

const trendingAccounts: Account[] = [
  {
    id: '1',
    name: 'HALO_PREDNITE',
    game: 'Apex Legends',
    title: 'Apex Predator',
    price: 499.99,
    image: {
      id: placeholderAccountImages[0].id,
      url: placeholderAccountImages[0].imageUrl,
      alt: placeholderAccountImages[0].description,
      hint: placeholderAccountImages[0].imageHint
    },
  },
  {
    id: '2',
    name: 'AZLA',
    game: 'League of Legends',
    title: 'Challenger',
    price: 799.99,
    image: {
      id: placeholderAccountImages[1].id,
      url: placeholderAccountImages[1].imageUrl,
      alt: placeholderAccountImages[1].description,
      hint: placeholderAccountImages[1].imageHint
    },
  },
  {
    id: '3',
    name: 'CYBRPURK 20770',
    game: 'Valorant',
    title: 'Radiant',
    price: 650.00,
    image: {
      id: placeholderAccountImages[2].id,
      url: placeholderAccountImages[2].imageUrl,
      alt: placeholderAccountImages[2].description,
      hint: placeholderAccountImages[2].imageHint
    },
  },
  {
    id: '4',
    name: 'Void Jumper',
    game: 'Star Citizen',
    title: 'High Admiral',
    price: 1200.00,
    image: {
      id: placeholderAccountImages[3].id,
      url: placeholderAccountImages[3].imageUrl,
      alt: placeholderAccountImages[3].description,
      hint: placeholderAccountImages[3].imageHint
    },
  },
];

const HexagonClip = () => (
  <svg width="0" height="0">
    <defs>
      <clipPath id="hexagon-clip" clipPathUnits="objectBoundingBox">
        <path d="M0.5,0 L0.955,0.25 V0.75 L0.5,1 L0.045,0.75 V0.25 L0.5,0 Z" />
      </clipPath>
    </defs>
  </svg>
);


export function AccountCarousel() {
  return (
    <>
      <HexagonClip />
      <Carousel opts={{ loop: true, align: "start" }} className="w-full">
        <CarouselContent className="-ml-4">
          {trendingAccounts.map((account) => (
            <CarouselItem key={account.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
              <div className="relative p-1 group">
                <div 
                  className="relative transition-transform duration-300 group-hover:scale-105"
                  style={{
                    clipPath: 'url(#hexagon-clip)',
                  }}
                >
                  <Card 
                    className="bg-card/80 backdrop-blur-sm border-0 overflow-hidden aspect-[1/1.15]"
                    style={{
                      boxShadow: '0 0 15px 3px hsl(190 90% 50% / 0.5), inset 0 0 5px 1px hsl(190 90% 50% / 0.7)',
                      border: '1px solid hsl(190 90% 50% / 0.8)',
                    }}
                  >
                    <CardContent className="relative flex flex-col justify-end h-full p-0">
                      <Image
                        src={account.image.url}
                        alt={account.image.alt}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        data-ai-hint={account.image.hint}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                      <div className="relative w-full p-6 space-y-2 flex justify-between items-end">
                        <h3 className="text-lg font-bold text-white font-headline leading-none">{account.name}</h3>
                        <div className="w-8 h-8 rounded-full bg-blue-600/50 flex items-center justify-center border-2 border-blue-400">
                          <Gamepad2 className="w-4 h-4 text-white"/>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </>
  )
}
