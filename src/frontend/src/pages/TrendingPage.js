import React, { useState, useEffect } from 'react';
import MovieRow from '../components/movie/MovieRow';
import movieApi from '../api/movieApi';
import { SkeletonGrid } from '../components/ui/LoadingSkeleton';

const DEMO_TRENDING = [
  { id: 1, title: 'Interstellar', vote_average: 8.6, release_year: 2014 },
  { id: 2, title: 'Dune: Part Two', vote_average: 8.5, release_year: 2024 },
  { id: 3, title: 'Oppenheimer', vote_average: 8.4, release_year: 2023 },
  { id: 4, title: 'The Batman', vote_average: 7.8, release_year: 2022 },
  { id: 5, title: 'Blade Runner 2049', vote_average: 8.0, release_year: 2017 },
  { id: 6, title: 'Everything Everywhere All at Once', vote_average: 8.1, release_year: 2022 },
];

const TIME_FILTERS = [
  { label: 'Today', value: 'day' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

export default function TrendingPage() {
  const [period, setPeriod] = useState('week');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await movieApi.getTrending({ period, limit: 24 });
        setMovies(res.movies || res.items || res || []);
      } catch {
        setMovies(DEMO_TRENDING);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [period]);

  return (
    <div className="fade-in">
      <div className="top-bar flex-col items-start gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="display-md mb-1">
            Trending
          </h1>
          <p className="body-md">What the world is watching right now</p>
        </div>
        {/* Time period filter */}
        <div className="flex w-full flex-wrap rounded-[var(--radius-xl)] bg-[var(--surface-container)] p-1 sm:w-auto">
          {TIME_FILTERS.map((f) => (
            <button
              key={f.value}
              id={`trending-filter-${f.value}`}
              onClick={() => setPeriod(f.value)}
              className={`flex-1 rounded-[calc(var(--radius-xl)-4px)] px-4 py-2 text-sm transition sm:flex-none ${period === f.value ? 'bg-[var(--surface-container-highest)] font-semibold text-[var(--on-surface)] shadow-[0_2px_8px_rgba(0,0,0,0.2)]' : 'text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trending rank list */}
      <div className="mt-8">
        {loading ? (
          <SkeletonGrid count={12} />
        ) : (
          <>
            {/* Top 3 spotlight */}
            {movies.slice(0, 3).length > 0 && (
              <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {movies.slice(0, 3).map((movie, i) => (
                  <div
                    key={movie.id}
                    className={`relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface-container)] p-5 ${i === 0 ? 'border border-[rgba(159,255,136,0.2)]' : i === 1 ? 'border border-[rgba(0,210,253,0.15)]' : 'border border-[rgba(73,72,71,0.2)]'}`}
                  >
                    <div className={`absolute right-3 top-[-8px] font-display text-[4rem] font-extrabold leading-none ${i === 0 ? 'text-[rgba(159,255,136,0.12)]' : i === 1 ? 'text-[rgba(0,210,253,0.1)]' : 'text-[rgba(255,255,255,0.05)]'}`}>
                      #{i + 1}
                    </div>
                    <div className="flex items-start gap-4">
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-white/10 text-base font-bold ${i === 0 ? 'bg-[rgba(159,255,136,0.12)] text-[var(--primary)]' : i === 1 ? 'bg-[rgba(0,210,253,0.12)] text-[var(--secondary)]' : 'bg-white/5 text-white/70'}`}>{i + 1}</div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="truncate font-display text-base font-bold">{movie.title}</div>
                        <div className="mt-1 text-[0.8125rem] text-[var(--on-surface-variant)]">
                          {movie.release_year}
                        </div>
                        {movie.vote_average > 0 && (
                          <div className="mt-1 text-sm font-semibold text-[var(--primary)]">
                            ★ {Number(movie.vote_average).toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rest of list */}
            <MovieRow
              title="All Trending"
              movies={movies.slice(3)}
              loading={false}
              cardWidth={180}
            />
          </>
        )}
      </div>
    </div>
  );
}
