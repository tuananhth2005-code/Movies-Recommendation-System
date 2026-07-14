import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import movieApi from '../api/movieApi';
import watchlistApi from '../api/watchlistApi';
import { useAuth } from '../context/AuthContext';
import TrailerModal from '../components/movie/TrailerModal';
import MovieForm from '../components/movie/MovieForm';
import ReviewSection from '../components/movie/ReviewSection';
import LazyImage from '../components/ui/LazyImage';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';

const DEMO_MOVIE = {
  id: 1,
  title: 'Interstellar',
  overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival in a dying world.",
  vote_average: 8.6,
  release_year: 2014,
  runtime: 169,
  genres: ['Science Fiction', 'Drama', 'Adventure'],
  director: 'Christopher Nolan',
  cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'],
  tagline: 'Mankind was born on Earth. It was never meant to die here.',
};

export default function MovieDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [similar, setSimilar] = useState([]);

  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerId, setTrailerId] = useState(null);
  const [watchLoading, setWatchLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchMovie = async () => {
      setLoading(true);
      try {
        const data = await movieApi.getMovieById(id);
        setMovie(data);

        if (isAuthenticated) {
          try {
            const wlCheck = await watchlistApi.isInWatchlist(id);
            setInWatchlist(wlCheck.in_watchlist || false);
          } catch {}
        }

        try {
          const simRes = await movieApi.getMovies({
            genre: data.genres?.[0]?.id || data.genres?.[0],
            limit: 8,
            exclude: id,
          });
          setSimilar(simRes.items || simRes.movies || []);
        } catch {}
      } catch {
        setMovie(DEMO_MOVIE);
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id, isAuthenticated]);

  const handleWatchlistToggle = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      if (inWatchlist) {
        await watchlistApi.removeFromWatchlist(id);
        setInWatchlist(false);
      } else {
        await watchlistApi.addToWatchlist(id);
        setInWatchlist(true);
      }
    } catch {}
  };

  const handleWatchNow = async () => {
    if (!movie) return;

    if (isAuthenticated) {
      setWatchLoading(true);
      try {
        const res = await movieApi.watchMovie(movie.id);
        setTrailerId(res.youtube_trailer_id || null);
        if (res.added_to_watchlist) setInWatchlist(true);
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

  const handleDeleteMovie = async () => {
    if (!movie) return;
    if (!window.confirm(`Delete "${movie.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await movieApi.deleteMovie(movie.id);
      navigate('/');
    } catch (err) {
      alert(err?.detail || 'Failed to delete movie.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 py-8 sm:px-8">
        <div className="mb-8 h-[400px] animate-pulse rounded-[var(--radius-xl)] bg-[var(--surface-container-high)]" />
        <div className="h-[200px] animate-pulse rounded-[var(--radius-xl)] bg-[var(--surface-container-high)]" />
      </div>
    );
  }

  if (!movie) return null;

  const backdropUrl = movie.backdrop_path ? `${BACKDROP_BASE}${movie.backdrop_path}` : null;
  const posterUrl = movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : null;
  const hasTrailer = Boolean(movie.youtube_trailer_id);

  return (
    <div className="fade-in mx-auto w-full max-w-[1400px]">
      {trailerOpen && (
        <TrailerModal
          trailerId={trailerId}
          title={movie.title}
          onClose={() => { setTrailerOpen(false); setTrailerId(null); }}
        />
      )}

      {editOpen && (
        <MovieForm
          movie={movie}
          onClose={() => setEditOpen(false)}
          onSaved={(saved) => { setMovie(saved); setEditOpen(false); }}
        />
      )}

      {/* Hero */}
      <div className="relative mb-10 flex min-h-[450px] items-end overflow-hidden rounded-[var(--radius-xl)] shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
        <div className={`absolute inset-0 ${backdropUrl ? '' : 'bg-[linear-gradient(135deg,#0a0a1e_0%,#1a1a3e_100%)]'}`}>
          {backdropUrl && <LazyImage src={backdropUrl} alt="" className="opacity-40" wrapperClassName="h-full w-full" />}
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(14,14,14,1)_0%,rgba(14,14,14,0.8)_40%,rgba(14,14,14,0)_100%),linear-gradient(to_top,rgba(14,14,14,1)_0%,transparent_50%)]" />
        
        <button onClick={() => navigate(-1)} className="btn btn-glass btn-sm absolute left-4 top-4 z-10 sm:left-6 sm:top-6">← Back</button>

        {isAdmin && (
          <div className="absolute right-4 top-4 z-10 flex gap-2 sm:right-6 sm:top-6">
            <button onClick={() => setEditOpen(true)} className="btn btn-glass btn-sm">✏️ Edit</button>
            <button onClick={handleDeleteMovie} disabled={deleting} className="btn btn-glass btn-sm text-red-300">
              {deleting ? 'Deleting…' : '🗑 Delete'}
            </button>
          </div>
        )}

        <div className="relative w-full p-6 sm:p-10">
          <div className="flex flex-wrap items-end gap-6 sm:gap-8">
            <div className="w-[180px] shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] sm:w-[220px]">
              {posterUrl ? <LazyImage src={posterUrl} alt={movie.title} wrapperClassName="w-full" /> : <div className="flex aspect-[2/3] items-center justify-center bg-[var(--surface-container-high)] text-4xl font-bold text-white/40">MV</div>}
            </div>
            <div className="min-w-[280px] flex-[1_1_400px]">
              <div className="mb-2 flex flex-wrap gap-2">
                {movie.release_date && <span className="chip chip-active">{new Date(movie.release_date).getFullYear()}</span>}
                <span className="chip chip-default">Rated {Number(movie.vote_average || 0).toFixed(1)}</span>
              </div>
              <h1 className="display-md mb-4 text-white">{movie.title}</h1>
              <div className="mb-8 flex flex-wrap gap-2">
                {(movie.genres || []).map((g, i) => (
                  <span key={g.id || i} className="chip chip-default bg-white/5 text-xs">{typeof g === 'string' ? g : (g.name || '')}</span>
                ))}
              </div>
              <div className="flex flex-col flex-wrap gap-4 sm:flex-row">
                <button onClick={handleWatchNow} disabled={watchLoading} className="btn btn-primary btn-lg glow-primary min-w-[200px] justify-center">
                  {watchLoading ? 'Loading...' : `Watch Now${!hasTrailer ? ' (No Trailer)' : ''}`}
                </button>
                <button onClick={handleWatchlistToggle} className={`btn btn-lg ${inWatchlist ? 'btn-secondary' : 'btn-glass'}`}>
                  {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-12">
        <div>
          <section className="mb-10">
            <h2 className="section-title">Synopsis</h2>
            <p className="body-lg text-[var(--on-surface)] leading-[1.8]">{movie.overview || "No synopsis available."}</p>
          </section>

          {movie.id && <ReviewSection movieId={movie.id} />}
        </div>
        <div>
          {similar.length > 0 && (
            <>
              <h3 className="title-sm mb-4 text-[var(--on-surface-variant)]">SIMILAR TITLES</h3>
              <div className="flex flex-col gap-3">
                {similar.map(m => (
                  <div key={m.id} onClick={() => navigate(`/movie/${m.id}`)} className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] p-2 transition hover:bg-white/5">
                    <div className="h-[72px] w-12 shrink-0 overflow-hidden rounded bg-[var(--surface-container-high)]">
                      {m.poster_path && <LazyImage src={`${POSTER_BASE}${m.poster_path}`} alt="" wrapperClassName="h-full w-full" />}
                    </div>
                    <div className="text-[0.9rem] font-semibold">{m.title}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
