import Link from 'next/link';
import Image from 'next/image';

export function Logo() {
  return (
    <Link href="/" className="flex items-center">
      <Image
        src="/assets/logo.png"
        alt="Monly King Logo"
        width={240}
        height={65}
        priority
        className="h-auto w-auto max-h-[65px]"
      />
    </Link>
  );
}
