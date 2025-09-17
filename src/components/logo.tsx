import Link from 'next/link';
import Image from 'next/image';

export function Logo() {
  return (
    <Link href="/" className="flex items-center">
      <Image 
        src="/assets/logo.png" 
        alt="Monly King Logo" 
        width={180} 
        height={50}
        priority
      />
    </Link>
  );
}
