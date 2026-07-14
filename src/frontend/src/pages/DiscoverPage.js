import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MovieRow from '../components/movie/MovieRow';
import movieApi from '../api/movieApi';

const GENRE_ACCENTS = [
  'border-[rgba(159,255,136,0.2)] bg-[rgba(159,255,136,0.08)] text-[var(--primary)]',
  'border-[rgba(0,210,253,0.2)] bg-[rgba(0,210,253,0.08)] text-[var(--secondary)]',
  'border-[rgba(172,137,255,0.2)] bg-[rgba(172,137,255,0.08)] text-[var(--tertiary)]',
  'border-[rgba(255,255,255,0.12)] bg-white/5 text-white/80',
];

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genresLoading, setGenresLoading] = useState(true);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await movieApi.getGenres();
        const genreList = (res.genres || res || []).filter(
          (g) => g.id !== 0 && g.name?.toLowerCase() !== 'unknown'
        );
        setGenres(genreList);
        const defaultGenre = genreList[0];
        if (defaultGenre) {
          setSelectedGenre(defaultGenre);
        }
      } catch (err) {
        console.error('[Discover] Failed to load genres:', err);
        const demoGenres = [
          { id: 1, name: 'Action' }, { id: 2, name: 'Comedy' },
          { id: 3, name: 'Drama' }, { id: 4, name: 'Horror' },
          { id: 5, name: 'Sci-Fi' }, { id: 6, name: 'Romance' },
        ];
        setGenres(demoGenres);
        setSelectedGenre(demoGenres[0]);
      } finally {
        setGenresLoading(false);
      }
    };
    fetchGenres();
  }, []);

  useEffect(() => {
    if (!selectedGenre) return;
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const genreId = Number.parseInt(selectedGenre.id, 10);
        const res = await movieApi.getByGenre(genreId, { limit: 20 });
        setMovies(res.movies || res.items || []);
      } catch (err) {
        console.error('[Discover] Failed to load movies by genre:', err);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [selectedGenre]);

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="display-md mb-2">Discover</h1>
        <p className="body-lg">Explore films by genre and find your next favorite</p>
      </div>

      {/* Genre grid selector */}
      {!genresLoading && (
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {genres.map((g, i) => {
            const isSelected = selectedGenre?.id === g.id;
            const accentClass = GENRE_ACCENTS[i % GENRE_ACCENTS.length];
            return (
              <button
                key={g.id || g.name || i}
                id={`genre-card-${g.id || i}`}
                onClick={() => {
                  if (selectedGenre?.id === g.id) return;
                  setSelectedGenre(g);
                }}
                className={`rounded-[var(--radius-xl)] border p-5 text-center transition ${isSelected ? 'scale-[1.02] border-[rgba(159,255,136,0.3)] bg-[linear-gradient(135deg,rgba(159,255,136,0.15),rgba(0,210,253,0.1))] shadow-[0_0_16px_rgba(159,255,136,0.1)]' : 'border-[rgba(73,72,71,0.2)] bg-[var(--surface-container)] hover:border-white/20 hover:bg-[var(--surface-container-high)]'}`}
              >
                <div className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${isSelected ? 'border-[rgba(159,255,136,0.3)] bg-[rgba(159,255,136,0.12)] text-[var(--primary)]' : accentClass}`}>
                  {(typeof g === 'string' ? g : g.name).slice(0, 2).toUpperCase()}
                </div>
                <div className={`text-sm font-semibold ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--on-surface)]'}`}>
                  {typeof g === 'string' ? g : g.name}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedGenre && (
        <MovieRow
          title={`${selectedGenre.name} Films`}
          movies={movies}
          loading={loading}
          cardWidth={180}
          onSeeAll={() =>
            navigate(
              `/movies?genre=${selectedGenre.id}&genreName=${encodeURIComponent(selectedGenre.name)}`
            )
          }
        />
      )}
    </div>
  );
}
