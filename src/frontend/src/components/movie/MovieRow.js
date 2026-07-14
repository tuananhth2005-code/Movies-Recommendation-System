import React from 'react';
import MovieCard from './MovieCard';
import EmptyState from '../ui/EmptyState';
import { SkeletonRow } from '../ui/LoadingSkeleton';

function getBadgeClass(label) {
  switch (label) {
    case 'AI Hybrid':
      return 'border border-[rgba(159,255,136,0.3)] bg-[rgba(159,255,136,0.14)] text-[var(--primary)]';
    case 'Hybrid':
      return 'border border-[rgba(0,210,253,0.3)] bg-[rgba(0,210,253,0.14)] text-[var(--secondary)]';
    case 'From Watched':
      return 'border border-[rgba(255,180,80,0.3)] bg-[rgba(255,180,80,0.14)] text-[#ffb450]';
    case 'Curated':
      return 'border border-[rgba(180,160,255,0.3)] bg-[rgba(180,160,255,0.14)] text-[#b4a0ff]';
    default:
      return 'border border-white/10 bg-white/5 text-[var(--on-surface-variant)]';
  }
}

export default function MovieRow({
  title,
  subtitle,
  badge,
  movies = [],
  loading = false,
  cardWidth = 180,
  onSeeAll,
  emptyMessage = 'No movies found.',
}) {
  const compact = cardWidth < 180;
  const itemWidthClass = compact ? 'w-[150px]' : 'w-[180px]';

  return (
    <div className="mb-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="section-title m-0">{title}</h2>
            {badge && (
              <span
                className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.03em] ${getBadgeClass(badge.label)}`}
                title={badge.tooltip}
              >
                {badge.label}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="m-0 text-[0.8125rem] text-[var(--on-surface-variant)]">
              {subtitle}
            </p>
          )}
        </div>
        {movies.length > 6 && onSeeAll && (
          <button
            className="btn btn-ghost btn-sm text-[0.8125rem] text-[var(--secondary)]"
            onClick={onSeeAll}
          >
            See all →
          </button>
        )}
      </div>

      <div className="scroll-row">
        {loading ? <SkeletonRow count={6} compact={compact} /> : movies.map((movie) => (
          <div key={movie.id} className={`shrink-0 ${itemWidthClass}`}>
            <MovieCard movie={movie} width={cardWidth} />
          </div>
        ))}
        {!loading && movies.length === 0 && (
          <EmptyState compact title="Nothing here yet" description={emptyMessage} />
        )}
      </div>
    </div>
  );
}
