import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import movieApi from '../../api/movieApi';
import { useAuth } from '../../context/AuthContext';
import TrailerModal from './TrailerModal';
import LazyImage from '../ui/LazyImage';

const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';


const DEMO_MOVIES = [
  {
    id: 1,
    title: 'Interstellar',
    overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival in a dying world.",
    backdrop_path: null,
    vote_average: 8.6,
    release_year: 2014,
    genres: ['Sci-Fi', 'Drama'],
    backdropColor: 'linear-gradient(135deg, #0a0a1e 0%, #1a1a3e 50%, #0a0a1e 100%)',
    emoji: '🚀',
  },
  {
    id: 2,
    title: 'Dune: Part Two',
    overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    backdrop_path: null,
    vote_average: 8.5,
    release_year: 2024,
    genres: ['Sci-Fi', 'Adventure'],
    backdropColor: 'linear-gradient(135deg, #1a0a00 0%, #3d1f00 50%, #1a0a00 100%)',
    emoji: '🏜️',
  },
  {
    id: 3,
    title: 'Oppenheimer',
    overview: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    backdrop_path: null,
    vote_average: 8.4,
    release_year: 2023,
    genres: ['Biography', 'Drama'],
    backdropColor: 'linear-gradient(135deg, #1a1a0a 0%, #2a2a1a 50%, #1a1a0a 100%)',
    emoji: '💥',
  },
];

export default function HeroBanner({ movies }) {
  const displayMovies = movies?.length > 0 ? movies.slice(0, 3) : DEMO_MOVIES;
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  // Trailer modal state
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerId, setTrailerId] = useState(null);
  const [trailerTitle, setTrailerTitle] = useState('');
  const [watchLoading, setWatchLoading] = useState(false);

  const { isAuthenticated } = useAuth();

  const goTo = useCallback((idx) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 300);
  }, [animating]);

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((current + 1) % displayMovies.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [current, displayMovies.length, goTo]);

  const movie = displayMovies[current];
  const backdropUrl = movie.backdrop_path ? `${BACKDROP_BASE}${movie.backdrop_path}` : null;
  const fallbackBackdropClass = current === 0
    ? 'bg-[linear-gradient(135deg,#0a0a1e_0%,#1a1a3e_50%,#0a0a1e_100%)]'
    : current === 1
      ? 'bg-[linear-gradient(135deg,#1a0a00_0%,#3d1f00_50%,#1a0a00_100%)]'
      : 'bg-[linear-gradient(135deg,#1a1a0a_0%,#2a2a1a_50%,#1a1a0a_100%)]';

  const handleWatchNow = async (e) => {
    e.preventDefault();
    if (!movie?.id) return;

    setTrailerTitle(movie.title);

    if (isAuthenticated) {
      setWatchLoading(true);
      try {
        const res = await movieApi.watchMovie(movie.id);
        setTrailerId(res.youtube_trailer_id || null);
      } catch {
        setTrailerId(movie.youtube_trailer_id || null);
      } finally {
        setWatchLoading(false);
      }
    } else {
      setTrailerId(movie.youtube_trailer_id || null);
    }
    setTrailerOpen(true);
  };

  return (
    <>
      {/* Trailer Modal */}
      {trailerOpen && (
        <TrailerModal
          trailerId={trailerId}
          title={trailerTitle}
          onClose={() => { setTrailerOpen(false); setTrailerId(null); }}
        />
      )}

      <div className="relative mb-10 h-[420px] overflow-hidden rounded-[var(--radius-xl)] sm:h-[480px]">
        {/* Background */}
        <div className={`absolute inset-0 transition-all duration-700 ${backdropUrl ? '' : fallbackBackdropClass}`}>
          {backdropUrl && (
            <LazyImage src={backdropUrl} alt={movie.title} className="opacity-40" wrapperClassName="h-full w-full" />
          )}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(14,14,14,0.97)_0%,rgba(14,14,14,0.7)_45%,rgba(14,14,14,0.1)_100%),linear-gradient(to_top,rgba(14,14,14,0.9)_0%,transparent_60%)]" />

        {/* Content */}
        <div className={`hero-banner__content transition-opacity duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`}>
          {/* Genre chips */}
          <div className="mb-4 flex flex-wrap gap-2">
            {(movie.genres || []).slice(0, 3).map((g, i) => (
              <span key={g.id || g.name || i} className="chip chip-default text-[0.6875rem]">
                {typeof g === 'string' ? g : (g.name || '')}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="display-lg mb-4 max-w-[37.5rem] text-white">
            {movie.title}
          </h1>

          {/* Overview */}
          <p className="body-lg mb-6 max-w-[32.5rem] overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
            {movie.overview}
          </p>

          {/* Rating + Year */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            {movie.vote_average > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xl text-[var(--primary)]">★</span>
                <span className="text-lg font-bold text-white">
                  {Number(movie.vote_average).toFixed(1)}
                </span>
                <span className="body-sm">/10</span>
              </div>
            )}
            {movie.release_year && (
              <span className="chip chip-default">{movie.release_year}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {/* ▶ Watch Now — opens trailer modal */}
            <button
              onClick={handleWatchNow}
              disabled={watchLoading}
              className={`btn btn-primary btn-lg justify-center ${watchLoading ? 'cursor-wait opacity-75' : ''}`}
            >
              {watchLoading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                  Loading...
                </>
              ) : 'Watch Now'}
            </button>

            {/* ℹ More Info — goes to detail page */}
            <Link to={`/movie/${movie.id}`} className="btn btn-glass btn-lg">
              More Info
            </Link>
          </div>
        </div>

        {/* Dots navigation */}
        <div className="absolute bottom-6 right-4 flex gap-2 sm:right-8">
          {displayMovies.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full p-0 transition-all duration-300 ${i === current ? 'w-6 bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]' : 'w-2 bg-white/30'}`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
