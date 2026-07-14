import React, { useState, useEffect, useRef } from 'react';
import movieApi from '../api/movieApi';
import MovieCard from '../components/movie/MovieCard';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonGrid } from '../components/ui/LoadingSkeleton';

const DEMO_RESULTS = [
  { id: 1, title: 'Interstellar', vote_average: 8.6, release_year: 2014, genres: ['Sci-Fi', 'Drama'] },
  { id: 2, title: 'Inception', vote_average: 8.8, release_year: 2010, genres: ['Sci-Fi', 'Thriller'] },
  { id: 3, title: 'The Dark Knight', vote_average: 9.0, release_year: 2008, genres: ['Action', 'Crime'] },
  { id: 4, title: 'Dune: Part Two', vote_average: 8.5, release_year: 2024, genres: ['Sci-Fi', 'Adventure'] },
  { id: 5, title: 'Oppenheimer', vote_average: 8.4, release_year: 2023, genres: ['Biography', 'Drama'] },
  { id: 6, title: 'Parasite', vote_average: 8.5, release_year: 2019, genres: ['Thriller', 'Drama'] },
];

const GENRES = ['All', 'Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller', 'Animation', 'Documentary'];
const SORT_OPTIONS = [
  { value: 'vote_average', label: 'Top Rated' },
  { value: 'release_year', label: 'Newest' },
  { value: 'title', label: 'A–Z' },
  { value: 'popularity', label: 'Popular' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [genre, setGenre] = useState('All');
  const [sortBy, setSortBy] = useState('vote_average');
  const inputRef = useRef();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) { setSearched(false); setResults([]); return; }
    const timer = setTimeout(() => doSearch(), 500);
    return () => clearTimeout(timer);
  }, [query, genre, sortBy]);

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = { q: query, sort_by: sortBy, limit: 24 };
      if (genre !== 'All') params.genre = genre;
      const res = await movieApi.searchMovies(params);
      setResults(res.movies || res.items || res || []);
    } catch {
      setResults(DEMO_RESULTS.filter(m => m.title.toLowerCase().includes(query.toLowerCase())));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch();
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="display-md mb-2">
          Discover Films
        </h1>
        <p className="body-lg">Search our curated collection of cinematic masterpieces</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl text-[var(--on-surface-variant)]">⌕</span>
          <input
            ref={inputRef}
            id="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`input-field h-14 rounded-full border border-[rgba(73,72,71,0.4)] pl-14 pr-20 text-[1.0625rem] ${query ? 'shadow-[0_0_0_2px_rgba(0,210,253,0.2)]' : ''}`}
            placeholder="Search for movies, directors, genres..."
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); setSearched(false); inputRef.current?.focus(); }}
              className="absolute right-5 top-1/2 -translate-y-1/2 bg-transparent text-xl text-[var(--on-surface-variant)] transition hover:text-white"
            >×</button>
          )}
        </div>
      </form>

      {/* Filters */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        {/* Genre chips */}
        <div className="flex flex-1 flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              id={`genre-${g.toLowerCase()}`}
              onClick={() => setGenre(g)}
              className={`chip ${genre === g ? 'chip-active' : 'chip-default'}`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Sort by */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="input-field w-full shrink-0 rounded-full py-2 sm:w-auto"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      {!searched && !query && (
        <EmptyState
          title="Start your search"
          description="Type a movie title, director name, or genre to explore the catalog."
        />
      )}

      {loading && (
        <SkeletonGrid count={8} />
      )}

      {!loading && searched && (
        <>
          <div className="mb-5 text-sm text-[var(--on-surface-variant)]">
            {results.length > 0
              ? `Found ${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`
              : `No results found for "${query}"`
            }
          </div>
          {results.length > 0 ? (
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
              {results.map((movie) => (
                <MovieCard key={movie.id} movie={movie} width="100%" />
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              title="No matching results"
              description="Try adjusting your keywords or changing the selected filters."
            />
          )}
        </>
      )}
    </div>
  );
}
