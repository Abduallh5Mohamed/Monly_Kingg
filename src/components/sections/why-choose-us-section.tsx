'use client';

import { Shield, Gamepad2, Rocket, Headset } from 'lucide-react';

const features = [
  {
    icon: <Shield className="w-10 h-10 text-primary" />,
    title: 'Secure Transactions',
    description: 'Guaranteed safety for all your purchases and sales, protected by cutting-edge security.',
  },
  {
    icon: <Gamepad2 className="w-10 h-10 text-primary" />,
    title: 'Vast Selection',
    description: 'The widest variety of premium and rare gaming accounts across all popular titles.',
  },
  {
    icon: <Rocket className="w-10 h-10 text-primary" />,
    title: 'Instant Delivery',
    description: 'Gain immediate access to your new account credentials right after purchase confirmation.',
  },
  {
    icon: <Headset className="w-10 h-10 text-primary" />,
    title: '24/7 Support',
    description: 'Our dedicated support team is always available to assist you with any inquiries or issues.',
  },
];

export function WhyChooseUsSection() {
  return (
    <>
      <section className="py-16 sm:py-24 bg-background relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[500px] z-0 opacity-10">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-primary to-accent"
            style={{ clipPath: 'polygon(0 0, 70% 0, 50% 100%, 0% 100%)' }}
          />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-4xl font-headline font-bold text-white text-glow text-center mb-16 uppercase">
            // Why Choose Us?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="relative pt-8">
                <div className="absolute top-0 left-1/2 -translate-x-1/2">
                  <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_15px_5px_hsl(var(--primary)/0.4)]"></div>
                  <div className="w-px h-8 bg-gradient-to-b from-primary/50 to-transparent mx-auto"></div>
                </div>
                <div
                  className="group shimmer-card relative bg-card/50 p-6 rounded-lg border border-border/20 transition-all duration-300 hover:-translate-y-2 hover:border-primary/50 overflow-hidden"
                >
                  <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="mb-6">
                        <div 
                            className="relative w-24 h-24 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                            style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }}
                        >
                            <div className="absolute inset-0 bg-primary/10 border-2 border-primary/30 group-hover:bg-primary/20 transition-colors duration-300"/>
                            {feature.icon}
                        </div>
                    </div>
                    <h3 className="text-xl font-bold font-headline text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <style jsx global>{`
        .shimmer-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(110deg, transparent 40%, rgba(255, 255, 255, 0.15) 50%, transparent 60%);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
          pointer-events: none;
        }
        .shimmer-card:hover::after {
          transform: translateX(100%);
        }
      `}</style>
    </>
  );
}
