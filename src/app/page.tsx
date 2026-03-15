import { HeroSection } from '@/components/sections/hero-section';
import { WhyChooseUsSection } from '@/components/sections/why-choose-us-section';
import { FeaturedGamesSection } from '@/components/sections/featured-games-section';
import { SupportSection } from '@/components/sections/support-section';
import { Footer } from '@/components/layout/footer';
import Snowfall from '@/components/layout/snowfall';
import { ForceEnglishDocument } from '@/components/layout/force-english-document';

export default function Home() {
  return (
    <>
      <ForceEnglishDocument />
      <Snowfall />
      <HeroSection />
      <WhyChooseUsSection />
      <FeaturedGamesSection />
      <SupportSection />
      <Footer />
    </>
  );
}
