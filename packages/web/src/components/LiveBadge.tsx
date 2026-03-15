interface LiveBadgeProps {
  size?: 'small' | 'default';
}

export function LiveBadge({ size = 'default' }: LiveBadgeProps) {
  const isSmall = size === 'small';

  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-shout-green/10 border border-shout-green/30 rounded ${
        isSmall ? 'px-1.5 py-0.5' : 'px-2 py-1'
      }`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-shout-green opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-shout-green"></span>
      </span>
      <span
        className={`font-medium text-shout-green uppercase tracking-wide ${
          isSmall ? 'text-[10px]' : 'text-xs'
        }`}
      >
        Live
      </span>
    </div>
  );
}
