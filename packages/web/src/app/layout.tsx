import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'shout - Watch developers work. Live.',
  description:
    'Watch developers code in real-time. Share your terminal with the world. The live streaming platform for developers.',
  keywords: ['terminal', 'live coding', 'developer tools', 'streaming', 'pair programming'],
  authors: [{ name: 'shout.dev' }],
  openGraph: {
    title: 'shout - Watch developers work. Live.',
    description: 'Watch developers code in real-time. Share your terminal with the world.',
    url: 'https://shout.dev',
    siteName: 'shout',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'shout - Watch developers work. Live.',
    description: 'Watch developers code in real-time. Share your terminal with the world.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-shout-bg text-shout-text font-sans antialiased min-h-screen">
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
