import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Header } from '@/components/Header';
import { ThemeProvider } from '@/components/ThemeProvider';
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

const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('shout-theme');
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-shout-bg text-shout-text font-sans antialiased min-h-screen">
        <ThemeProvider>
          <Header />
          <main>{children}</main>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
