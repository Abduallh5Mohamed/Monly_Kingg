import type { Metadata } from 'next';
import './globals.css';
import Snowfall from '@/components/layout/snowfall';
import { Providers } from '@/lib/providers';
import PendingTransactionsBar from '@/components/layout/PendingTransactionsBar';
import { DataPrefetcher } from '@/components/layout/DataPrefetcher';
import MainContent from '@/components/layout/main-content';

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
    <html lang="en" dir="ltr" className="dark" suppressHydrationWarning>
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
            <MainContent>{children}</MainContent>
            <PendingTransactionsBar />
          </div>
        </Providers>
      </body>
    </html>
  );
}
