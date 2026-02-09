import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Dashboard - Monly King',
  description: 'Manage your gaming accounts and purchases',
};

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
