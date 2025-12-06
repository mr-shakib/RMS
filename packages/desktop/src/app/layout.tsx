import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { LayoutWrapper } from '@/components/layout/layout-wrapper';

export const metadata: Metadata = {
  title: 'Restaurant Management System',
  description: 'A modern POS system for restaurants',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <LayoutWrapper>{children}</LayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
