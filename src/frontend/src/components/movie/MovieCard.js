import React from 'react';
import { Link } from 'react-router-dom';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

const POSTER_COLORS = [
  'linear-gradient(135deg, #1a1a2e, #16213e)',
  'linear-gradient(135deg, #0d1b2a, #1b2838)',
  'linear-gradient(135deg, #1a0a2e, #2d1b69)',
  'linear-gradient(135deg, #0a2e1a, #1b4332)',
  'linear-gradient(135deg, #2e0a0a, #6b1f1f)',
];

function StarRating({ rating, maxRating = 10 }) {
  const stars = Math.round((rating / maxRating) * 5);
  return (
    <span className="star-rating">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`star ${i < stars ? 'filled' : ''}`}>★</span>
      ))}
    </span>
  );
}

export default function MovieCard({ movie, width = 180 }) {
  const movieId = movie.id ?? movie.movie_id;
  const posterUrl = movie.poster_path
    ? `${POSTER_BASE}${movie.poster_path}`
    : null;

  const colorIndex = (movieId || 0) % POSTER_COLORS.length;

  return (
    <Link to={`/movie/${movieId}`} style={{ textDecoration: 'none' }}>
      <div className="movie-card" style={{ width }}>
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={movie.title}
            className="movie-card__poster"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="movie-card__poster-placeholder"
          style={{
            background: POSTER_COLORS[colorIndex],
            display: posterUrl ? 'none' : 'flex',
          }}
        >
          🎬
        </div>

        {/* Hover overlay */}
        <div className="movie-card__overlay">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>
            Quick View →
          </div>
          {movie.vote_average > 0 && (
            <StarRating rating={movie.vote_average} />
          )}
        </div>

        {/* Card Info */}
        <div className="movie-card__info">
          <div className="movie-card__title">{movie.title}</div>
          <div className="movie-card__meta">
            {movie.release_year && <span>{movie.release_year}</span>}
            {movie.release_year && movie.vote_average > 0 && <span>·</span>}
            {movie.vote_average > 0 && (
              <span className="movie-card__rating">★ {Number(movie.vote_average).toFixed(1)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export { StarRating };
