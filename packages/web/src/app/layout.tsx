import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Header } from '@/components/Header';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://shout.run'),
  title: 'shout.run — See what your agents are building',
  description:
    'Watch your AI agents work in real time. Open-source terminal broadcasting with live streaming, replay, and embeds — for agents, developers, and teams.',
  keywords: [
    'AI agents',
    'agentic terminal',
    'MCP terminal',
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
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'shout.run — See what your agents are building',
    description:
      'Watch your AI agents work in real time. Live streaming, replay, and embeddable terminal sessions.',
    url: 'https://shout.run',
    siteName: 'shout.run',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'shout.run — See what your agents are building',
    description:
      'Watch your AI agents work in real time. Live streaming, replay, and embeddable terminal sessions.',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'shout',
              url: 'https://shout.run',
              description:
                'Open-source terminal broadcasting built for AI agents. Stream, replay, and embed terminal sessions — from CLI, SDKs, or MCP servers.',
              applicationCategory: 'DeveloperTools',
              operatingSystem: 'Linux, macOS, Windows',
              downloadUrl: 'https://www.npmjs.com/package/shout-run',
              featureList: [
                'Real-time terminal streaming',
                'Session replay',
                'Embeddable player',
                'asciicast v2 export',
                'TypeScript and Python SDKs',
                'MCP server for AI agents',
                'Late-joiner catch-up snapshots',
                'Privacy controls (public/private)',
              ],
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              author: {
                '@type': 'Person',
                name: 'Pavan Madiraju',
                url: 'https://github.com/pavanmadiraju91',
              },
              license: 'https://opensource.org/licenses/MIT',
              codeRepository: 'https://github.com/pavanmadiraju91/shout-run',
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'shout.run',
              url: 'https://shout.run',
              sameAs: [
                'https://github.com/pavanmadiraju91/shout-run',
                'https://www.npmjs.com/package/shout-run',
              ],
            }),
          }}
        />
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
