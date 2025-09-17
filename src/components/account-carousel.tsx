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

export function AccountCarousel() {
  return (
    <>
      <Carousel opts={{ loop: true, align: "start" }} className="w-full">
        <CarouselContent className="-ml-4">
          {trendingAccounts.map((account, index) => (
            <CarouselItem key={account.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
              <div className="relative p-1 group">
                <Card 
                  className="bg-card/80 backdrop-blur-sm border-2 border-transparent rounded-2xl overflow-hidden aspect-[1/1.15] transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_5px_hsl(var(--primary)/0.6)]"
                  style={{
                    borderColor: 'hsl(var(--primary))',
                    boxShadow: '0 0 10px 2px hsl(var(--primary)/0.5)',
                  }}
                >
                  <CardContent className="relative flex flex-col justify-between h-full p-0">
                    <Image
                      src={account.image.url}
                      alt={account.image.alt}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      data-ai-hint={account.image.hint}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
                    
                    <div className="relative w-full p-3 flex justify-center">
                      <div className="bg-black/40 backdrop-blur-sm px-4 py-1 rounded-full">
                        <h3 className="text-base font-bold text-white font-headline tracking-wide">{account.name}</h3>
                      </div>
                    </div>

                    <div className="relative w-full p-4 flex justify-start">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${index === 1 ? 'bg-red-600/50 border-red-400' : 'bg-blue-600/50 border-blue-400'}`}>
                        <Gamepad2 className="w-5 h-5 text-white"/>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </>
  )
}
