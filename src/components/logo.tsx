import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center">
      <img
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
