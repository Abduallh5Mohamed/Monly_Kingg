import Link from 'next/link';
import { ShieldHalf } from 'lucide-react';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <ShieldHalf className="h-8 w-8 text-primary transition-all duration-300 group-hover:text-white group-hover:scale-110" />
      <span className="text-xl font-bold tracking-wider text-white font-headline transition-colors duration-300 group-hover:text-primary">
        RANK ASCENT
      </span>
    </Link>
  );
}
