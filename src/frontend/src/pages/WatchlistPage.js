import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import watchlistApi from '../api/watchlistApi';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/movie/MovieCard';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonGrid } from '../components/ui/LoadingSkeleton';

const DEMO_WATCHLIST = [
  { id: 1, title: 'Interstellar', vote_average: 8.6, release_year: 2014 },
  { id: 2, title: 'Dune: Part Two', vote_average: 8.5, release_year: 2024 },
  { id: 3, title: 'Oppenheimer', vote_average: 8.4, release_year: 2023 },
];

export default function WatchlistPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); 

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    const fetchWatchlist = async () => {
      setLoading(true);
      try {
        const res = await watchlistApi.getWatchlist();
      
    
        const normalized = (res || []).map(item => ({
          ...item,
          id: item.id || item.movie_id,
          title: item.title || item.movie_title
        }));
        setMovies(normalized);
      } catch {
        setMovies(DEMO_WATCHLIST);
      } finally {
        setLoading(false);
      }
    };
    fetchWatchlist();
  }, [isAuthenticated]);

  const handleRemove = async (movieId) => {
    try {
      await watchlistApi.removeFromWatchlist(movieId);
      setMovies(prev => prev.filter(m => m.id !== movieId));
    } catch {}
  };

  if (!isAuthenticated) {
    return (
      <div className="fade-in flex min-h-[60vh] items-center justify-center">
        <EmptyState
          title="Your Watchlist"
          description="Sign in to save movies to your personal watchlist and never miss a film."
          action={(
            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="btn btn-primary" onClick={() => navigate('/login')}>Sign In</button>
              <button className="btn btn-glass" onClick={() => navigate('/register')}>Create Account</button>
            </div>
          )}
        />
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="top-bar mb-8 flex-col items-start gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="display-md mb-1">My Watchlist</h1>
          <p className="body-md">{movies.length} {movies.length === 1 ? 'film' : 'films'} saved</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'rated', 'unrated'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`chip px-4 py-2 ${filter === f ? 'chip-active' : 'chip-default'}`}
            >
              {f === 'all' ? 'All' : f === 'rated' ? 'Rated' : 'Unrated'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonGrid count={6} />
      ) : movies.length === 0 ? (
        <EmptyState
          title="Your watchlist is empty"
          description="Discover great films and save them here."
          action={<button className="btn btn-primary" onClick={() => navigate('/discover')}>Explore Movies</button>}
        />
      ) : (
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
          {movies.map((movie) => (
            <div key={movie.id} className="relative">
              <MovieCard movie={movie} width="100%" />
              <button
                id={`remove-watchlist-${movie.id}`}
                onClick={(e) => { e.preventDefault(); handleRemove(movie.id); }}
                title="Remove from watchlist"
                className="absolute right-2 top-2 z-[5] flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(73,72,71,0.5)] bg-[rgba(14,14,14,0.9)] text-sm text-[var(--error)] transition hover:bg-[rgba(185,41,2,0.8)]"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
