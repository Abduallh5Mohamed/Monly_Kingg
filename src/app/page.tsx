import { HeroSection } from '@/components/sections/hero-section';
import { NewSection } from '@/components/sections/new-section';

export default function Home() {
  return (
    <div className="relative min-h-screen w-full bg-background overflow-x-hidden">
      <HeroSection />
      <NewSection />
    </div>
  );
}
