import React from 'react';
import MovieCard from './MovieCard';
import EmptyState from '../ui/EmptyState';
import { SkeletonGrid } from '../ui/LoadingSkeleton';


export default function MovieGrid({
  movies = [],
  loading = false,
  cardWidth = 150,
  onMovieClick,
  emptyMessage = 'No movies found',
}) {
  const gridClass = cardWidth >= 180
    ? 'grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]'
    : 'grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]';

  if (loading) {
    return <SkeletonGrid count={12} compact={cardWidth < 180} />;
  }

  if (!movies || movies.length === 0) {
    return (
      <EmptyState
        compact
        title="No movies available"
        description={emptyMessage}
      />
    );
  }

  return (
    <div className={gridClass}>
      {movies.map((movie) => (
        <div
          key={movie.id || movie.movie_id}
          onClick={() => onMovieClick?.(movie)}
          className={onMovieClick ? 'cursor-pointer' : 'cursor-default'}
        >
          <MovieCard movie={movie} />
        </div>
      ))}
    </div>
  );
}
