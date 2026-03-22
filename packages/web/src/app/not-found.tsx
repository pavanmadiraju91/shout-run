import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="bg-shout-surface border border-shout-border rounded-lg p-8 max-w-lg w-full font-mono">
        <div className="text-shout-muted text-sm mb-4">$ shout /path</div>
        <div className="text-shout-red text-lg mb-6">
          shout: command not found: <span className="text-shout-text">/path</span>
        </div>
        <div className="text-shout-text-secondary text-sm mb-6">
          The page you were looking for does not exist.
        </div>
        <div className="flex items-center gap-2 text-shout-muted text-sm">
          <span className="text-shout-green">$</span>
          <Link
            href="/"
            className="text-shout-accent hover:underline"
          >
            cd ~
          </Link>
          <span className="text-shout-text-secondary">← go home</span>
        </div>
      </div>
    </div>
  );
}
