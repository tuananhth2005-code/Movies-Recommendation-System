import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MovieGrid from '../components/movie/MovieGrid';
import movieApi from '../api/movieApi';

const SORT_OPTIONS = [
  { label: 'Top Rated', value: 'rating' },
  { label: 'Recent Releases', value: 'release_date' },
  { label: 'By Title (A-Z)', value: 'title' },
];

export default function AllMoviesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [allMovies, setAllMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedSort, setSelectedSort] = useState('rating');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const pageSize = 20;

  // Load genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await movieApi.getGenres();
        const genresList = (res.genres || res || []).filter(
          (g) => g.id !== 0 && g.name?.toLowerCase() !== 'unknown'
        );
        setGenres(genresList);

        const queryGenreId = Number.parseInt(searchParams.get('genre'), 10);
        if (!Number.isNaN(queryGenreId)) {
          const matchedGenre = genresList.find((g) => Number(g.id) === queryGenreId);
          if (matchedGenre) {
            setSelectedGenre(matchedGenre);
          }
        }
      } catch (err) {
        console.error('[AllMovies] Failed to load genres:', err);
      }
    };
    fetchGenres();
  }, [searchParams]);

  // Load movies based on filters
  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      setPage(0);
      try {
        let result;
        
        if (searchQuery) {
          // Search by term
          result = await movieApi.searchMovies({ 
            q: searchQuery, 
            limit: pageSize, 
            offset: 0 
          });
        } else if (selectedGenre) {
          // Filter by genre
          result = await movieApi.getGenreMoviesAll(selectedGenre.id, {
            sort_by: selectedSort,
            limit: pageSize, 
            offset: 0 
          });
        } else {
          // All movies with sorting
          result = await movieApi.getAllMovies({ 
            sort_by: selectedSort,
            limit: pageSize, 
            offset: 0 
          });
        }

        const items = result.items || result.movies || [];
        setAllMovies(items);
        setFilteredMovies(items);
        setHasMore(items.length === pageSize);
      } catch (err) {
        console.error('[AllMovies] Failed to load movies:', err);
        setFilteredMovies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [selectedGenre, selectedSort, searchQuery]);

  // Load more movies (infinite scroll)
  const handleLoadMore = async () => {
    if (!hasMore || loading) return;
    
    setLoading(true);
    try {
      const offset = (page + 1) * pageSize;
      let result;

      if (searchQuery) {
        result = await movieApi.searchMovies({ 
          q: searchQuery, 
          limit: pageSize, 
          offset 
        });
      } else if (selectedGenre) {
        result = await movieApi.getGenreMoviesAll(selectedGenre.id, {
          sort_by: selectedSort,
          limit: pageSize, 
          offset 
        });
      } else {
        result = await movieApi.getAllMovies({ 
          sort_by: selectedSort,
          limit: pageSize, 
          offset 
        });
      }

      const items = result.items || result.movies || [];
      if (items.length > 0) {
        setFilteredMovies(prev => [...prev, ...items]);
        setPage(page + 1);
        setHasMore(items.length === pageSize);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('[AllMovies] Failed to load more:', err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const handleMovieClick = (movie) => {
    navigate(`/movie/${movie.id || movie.movie_id}`);
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedGenre(null); // Clear genre filter when searching
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('genre');
      next.delete('genreName');
      return next;
    });
  };

  const handleGenreSelect = (genre) => {
    const nextGenre = selectedGenre?.id === genre.id ? null : genre;
    setSelectedGenre(nextGenre);
    setSearchQuery(''); 
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextGenre) {
        next.set('genre', String(nextGenre.id));
        next.set('genreName', nextGenre.name);
      } else {
        next.delete('genre');
        next.delete('genreName');
      }
      return next;
    });
  };

  const handleSortChange = (sortValue) => {
    setSelectedSort(sortValue);
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-10">
        <h1 className="display-md mb-2">
          All Movies
        </h1>
        <p className="body-lg text-[var(--on-surface-variant)]">
          Explore our complete film library
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex flex-1 items-center rounded-full border border-[var(--outline)] bg-[var(--surface-container)] pl-4">
          <span className="text-[var(--on-surface-variant)]">⌕</span>
          <input
            type="text"
            placeholder="Search movies..."
            value={searchQuery}
            onChange={handleSearch}
            className="flex-1 border-none bg-transparent px-4 py-3 text-[0.95rem] text-[var(--on-surface)] outline-none"
          />
        </div>
      </div>

      {/* Filters Section */}
      <div className="mb-8">
        {/* Sort Options */}
        <div className="mb-4">
          <p className="label-md mb-2 text-[var(--on-surface-variant)]">
            Sort by
          </p>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={`rounded-full px-4 py-2 text-[0.875rem] transition ${selectedSort === option.value ? 'border border-[rgba(159,255,136,0.3)] bg-[rgba(159,255,136,0.15)] font-semibold text-[var(--primary)]' : 'border border-[rgba(73,72,71,0.2)] bg-[var(--surface-container)] text-[var(--on-surface)]'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Genre Filter */}
        {genres.length > 0 && (
          <div>
            <p className="label-md mb-2 text-[var(--on-surface-variant)]">
              Filter by genre
            </p>
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => handleGenreSelect(genre)}
                  className={`rounded-[var(--radius-lg)] px-3 py-2 text-center text-[0.85rem] transition ${selectedGenre?.id === genre.id ? 'border border-[rgba(0,210,253,0.3)] bg-[rgba(0,210,253,0.15)] font-semibold text-[var(--primary)]' : 'border border-[rgba(73,72,71,0.2)] bg-[var(--surface-container)] text-[var(--on-surface)]'}`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {(selectedGenre || searchQuery) && (
        <div className="mb-4 rounded-[var(--radius-lg)] border border-[rgba(159,255,136,0.2)] bg-[rgba(159,255,136,0.1)] px-4 py-3">
          <p className="label-md">
            Active Filters:{' '}
            {searchQuery && <span>Search: <strong>"{searchQuery}"</strong></span>}
            {selectedGenre && <span>{selectedGenre.name}</span>}
            {(selectedGenre || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedGenre(null);
                  setSearchQuery('');
                }}
                className="ml-2 border-none bg-transparent text-[var(--primary)] underline"
              >
                Clear
              </button>
            )}
          </p>
        </div>
      )}

      {/* Movies Grid */}
      <MovieGrid
        movies={filteredMovies}
        loading={loading && page === 0}
        cardWidth={165}
        onMovieClick={handleMovieClick}
        emptyMessage={
          searchQuery
            ? `No movies found for "${searchQuery}"`
            : 'No movies found for this filter'
        }
      />

      {/* Load More Button */}
      {hasMore && filteredMovies.length > 0 && (
        <div className="mt-10 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className={`btn btn-primary ${loading ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* End of Results */}
      {!hasMore && filteredMovies.length > 0 && (
        <div className="mt-10 pb-10 text-center text-[var(--on-surface-variant)]">
          <p className="body-md">End of results</p>
        </div>
      )}
    </div>
  );
}
