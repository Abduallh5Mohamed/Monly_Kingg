import { HeroSection } from '@/components/sections/hero-section';
import { WhyChooseUsSection } from '@/components/sections/why-choose-us-section';
import { FeaturedGamesSection } from '@/components/sections/featured-games-section';

export default function Home() {
  return (
    <>
      <HeroSection />
      <WhyChooseUsSection />
      <FeaturedGamesSection />
    </>
  );
}
