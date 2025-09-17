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
    <section className="py-16 sm:py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-1/2 h-full bg-primary/50 rounded-full blur-[150px]" />
        <div className="absolute -bottom-1/2 -right-1/4 w-1/2 h-full bg-accent/50 rounded-full blur-[150px]" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <h2 className="text-4xl font-headline font-bold text-white text-glow text-center mb-12 uppercase">
          // Why Choose Us?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-lg overflow-hidden holographic-border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:bg-card/70 hover:scale-105"
            >
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-4 p-4 bg-primary/10 rounded-full border-2 border-primary/30">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold font-headline text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
