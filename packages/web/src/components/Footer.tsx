import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-shout-border mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-shout-muted">
            <Link href="/terms" className="hover:text-shout-text transition-colors">
              Terms
            </Link>
            <span className="text-shout-border">|</span>
            <Link href="/privacy" className="hover:text-shout-text transition-colors">
              Privacy
            </Link>
            <span className="text-shout-border">|</span>
            <Link href="/about" className="hover:text-shout-text transition-colors">
              About
            </Link>
            <span className="text-shout-border">|</span>
            <a
              href="https://github.com/pavanmadiraju91/shout-run"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-shout-text transition-colors"
            >
              GitHub
            </a>
          </div>
          <p className="text-xs text-shout-muted/60">MIT License</p>
        </div>
      </div>
    </footer>
  );
}
