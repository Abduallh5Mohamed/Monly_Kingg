import { HeroSection } from '@/components/sections/hero-section';
import { WhyChooseUsSection } from '@/components/sections/why-choose-us-section';
import { SupportSection } from '@/components/sections/support-section';
import { Footer } from '@/components/layout/footer';
import Snowfall from '@/components/layout/snowfall';

export default function Home() {
  return (
    <>
      <Snowfall />
      <HeroSection />
      <WhyChooseUsSection />
      <SupportSection />
      <Footer />
    </>
  );
}
