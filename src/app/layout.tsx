import type { Metadata } from 'next';
import './globals.css';
import Snowfall from '@/components/layout/snowfall';
import { Providers } from '@/lib/providers';
import PendingTransactionsBar from '@/components/layout/PendingTransactionsBar';
import { DataPrefetcher } from '@/components/layout/DataPrefetcher';

export const metadata: Metadata = {
  title: 'Monly King',
  description: 'Your Gateway to the Premium Game Accounts & Unmatched Powers',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.dicebear.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <Providers>
          <DataPrefetcher />
          <div className="relative flex flex-col min-h-screen">
            <Snowfall />
            <main className="flex-grow z-20 pb-16">
              {children}
            </main>
            <PendingTransactionsBar />
          </div>
        </Providers>
      </body>
    </html>
  );
}
