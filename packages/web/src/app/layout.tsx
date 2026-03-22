import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Header } from '@/components/Header';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'shout.run — Terminal sessions you can share',
  description:
    'Stream your terminal live, share replays, and embed sessions. Open-source terminal broadcasting for developers and AI agents.',
  keywords: [
    'terminal sharing',
    'live terminal',
    'terminal streaming',
    'terminal replay',
    'developer tools',
    'terminal broadcasting',
    'asciinema alternative',
    'MCP server',
  ],
  authors: [{ name: 'shout.run' }],
  openGraph: {
    title: 'shout.run — Terminal sessions you can share',
    description: 'Stream your terminal live, share replays, and embed sessions.',
    url: 'https://shout.run',
    siteName: 'shout.run',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'shout.run — Terminal sessions you can share',
    description: 'Stream your terminal live, share replays, and embed sessions.',
    images: ['/opengraph-image'],
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
      <body className="bg-shout-bg text-shout-text font-sans antialiased min-h-[100dvh]">
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
