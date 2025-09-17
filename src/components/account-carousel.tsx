'use client';

import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import type { Account } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const placeholderAccountImages = PlaceHolderImages.filter(img => img.id.startsWith('account-'));

const trendingAccounts: Account[] = [
  {
    id: '1',
    name: 'Cybernetic Ghost',
    game: 'Apex Legends',
    rank: 'Apex Predator',
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
    name: 'DragonSlayer',
    game: 'League of Legends',
    rank: 'Challenger',
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
    name: 'NetRunner X',
    game: 'Valorant',
    rank: 'Radiant',
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
    rank: 'High Admiral',
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
    <Carousel opts={{ loop: true, align: "start" }} className="w-full">
      <CarouselContent className="-ml-4">
        {trendingAccounts.map((account) => (
          <CarouselItem key={account.id} className="pl-4 md:basis-1/2 lg:basis-1/2">
            <div className="p-1">
              <div className="p-px rounded-lg bg-gradient-to-br from-primary/50 via-accent/50 to-purple-600/50 group transition-all duration-300 hover:from-primary hover:via-accent hover:to-purple-600 hover:scale-[1.03]">
                <Card className="bg-card/80 backdrop-blur-sm border-0 rounded-md overflow-hidden">
                  <CardContent className="relative flex aspect-[4/5] items-end p-0">
                    <Image
                      src={account.image.url}
                      alt={account.image.alt}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      data-ai-hint={account.image.hint}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                    <div className="relative w-full p-4 space-y-1">
                      <h3 className="text-lg font-bold text-white font-headline">{account.name}</h3>
                      <p className="text-sm text-foreground/70">{account.game}</p>
                      <Badge className="bg-primary/80 border-none font-bold text-primary-foreground">
                        {account.rank}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="text-white bg-white/10 hover:bg-white/20 border-white/20 -left-4" />
      <CarouselNext className="text-white bg-white/10 hover:bg-white/20 border-white/20 -right-4" />
    </Carousel>
  )
}
