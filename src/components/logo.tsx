import Link from 'next/link';
import { Crown } from 'lucide-react';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-orange-400 to-red-500 flex items-center justify-center shadow-lg group-hover:shadow-amber-500/30 transition-all duration-300">
        <Crown className="w-5 h-5 text-white" />
      </div>
      <span className="text-xl font-black text-white tracking-tight">
        Monly <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">King</span>
      </span>
    </Link>
  );
}
