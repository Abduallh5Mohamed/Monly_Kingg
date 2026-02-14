import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center">
      <img
        src="/assets/logo.png"
        alt="Monly King"
        className="h-14 w-auto"
      />
    </Link>
  );
}
