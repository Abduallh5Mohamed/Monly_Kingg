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
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-1/3 h-full bg-primary/10 blur-[100px] -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-1/3 h-full bg-accent/10 blur-[100px] translate-x-1/2" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <h2 className="text-4xl font-headline font-bold text-white text-glow text-center mb-16 uppercase">
          // Why Choose Us?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative p-1 transition-all duration-300"
              style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0 80%, 0 20%)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary opacity-50 group-hover:opacity-80 transition-opacity duration-300 animate-pulse group-hover:animate-none" />
              <div
                className="relative bg-card/80 backdrop-blur-md p-6 h-full flex flex-col items-center text-center transition-all duration-300 group-hover:scale-105"
                style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0 80%, 0 20%)' }}
              >
                <div className="mb-4 flex-shrink-0">
                    <div 
                        className="relative w-24 h-24 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                        style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                    >
                        <div className="absolute inset-0 bg-primary/10 border-2 border-primary/30"/>
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
          ))}
        </div>
      </div>
    </section>
  );
}
