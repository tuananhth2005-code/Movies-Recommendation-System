import React from 'react';

export function CardSkeleton({ compact = false }) {
  return (
    <div className="w-full animate-pulse">
      <div className="aspect-[2/3] w-full rounded-2xl bg-[var(--surface-container-high)]" />
      <div className="mt-3 h-3.5 w-4/5 rounded-full bg-[var(--surface-container-high)]" />
      {!compact && <div className="mt-2 h-3 w-3/5 rounded-full bg-[var(--surface-container-high)]" />}
    </div>
  );
}

export function SkeletonGrid({ count = 8, compact = false }) {
  const gridClass = compact
    ? 'grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]'
    : 'grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]';

  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function SkeletonRow({ count = 6, compact = false }) {
  const itemWidthClass = compact ? 'w-[150px]' : 'w-[180px]';

  return (
    <div className="flex gap-4 overflow-x-auto pb-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={`shrink-0 ${itemWidthClass}`}>
          <CardSkeleton />
        </div>
      ))}
    </div>
  );
}
