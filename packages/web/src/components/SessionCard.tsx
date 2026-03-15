import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { LiveBadge } from './LiveBadge';
import { ViewerCount } from './ViewerCount';
import type { SessionSummary } from '@shout/shared';

interface SessionCardProps {
  session: SessionSummary;
  featured?: boolean;
}

export function SessionCard({ session, featured = false }: SessionCardProps) {
  const startedAt = new Date(session.startedAt);

  return (
    <Link
      href={`/${session.username}/${session.id}`}
      className={`group block bg-shout-surface border rounded-lg overflow-hidden transition-all hover:shadow-lg hover:shadow-shout-green/5 ${
        featured
          ? 'border-shout-green/30 hover:border-shout-green/50 ring-1 ring-shout-green/10'
          : 'border-shout-border hover:border-shout-muted'
      }`}
    >
      {/* Terminal Preview Area */}
      <div className="bg-shout-bg h-32 relative overflow-hidden">
        {/* Faux terminal content */}
        <div className="p-3 font-mono text-xs text-shout-muted leading-relaxed opacity-50">
          <div className="text-shout-green">$ _</div>
        </div>

        {/* Live indicator overlay */}
        <div className="absolute top-3 right-3">
          <LiveBadge size="small" />
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {session.avatarUrl ? (
            <Image
              src={session.avatarUrl}
              alt={session.username}
              width={36}
              height={36}
              className="rounded-full border border-shout-border flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 bg-shout-bg rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
              {session.username.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-shout-text truncate group-hover:text-shout-accent transition-colors">
              {session.title || 'Untitled Session'}
            </h3>
            <p className="text-sm text-shout-muted">{session.username}</p>
          </div>
        </div>

        {/* Description */}
        {session.description && (
          <p className="mt-2 text-sm text-shout-text-secondary line-clamp-2">
            {session.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 text-sm text-shout-muted">
          <ViewerCount count={session.viewerCount} />

          <div className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{formatDistanceToNow(startedAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
