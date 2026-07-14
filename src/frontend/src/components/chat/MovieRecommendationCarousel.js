import React from 'react';
import MovieCard from '../movie/MovieCard';

export default function MovieRecommendationCarousel({ movies = [] }) {
  if (!movies.length) return null;

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin]">
      {movies.map((movie) => (
        <div key={movie.id} className="shrink-0">
          <MovieCard movie={movie} width={130} />
        </div>
      ))}
    </div>
  );
}
