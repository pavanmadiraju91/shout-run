import { ThemeProvider } from '@/components/ThemeProvider';
import '../globals.css';

// Inline theme script that reads ?theme= query param instead of localStorage
const embedThemeScript = `
(function() {
  try {
    var params = new URLSearchParams(window.location.search);
    var theme = params.get('theme');
    if (theme !== 'light' && theme !== 'dark') {
      theme = 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch(e) {}
})();
`;

export default function EmbedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: embedThemeScript }} />
      </head>
      <body className="bg-shout-bg text-shout-text m-0 p-0 overflow-hidden">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
