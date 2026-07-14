import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import movieApi from '../../api/movieApi';
import { useAuth } from '../../context/AuthContext';
import MovieForm from '../../components/movie/MovieForm';

const PAGE_SIZE = 20;

export default function MovieManagementPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [movies, setMovies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
      const res = query
        ? await movieApi.searchMovies({ q: query, ...params })
        : await movieApi.getMovies(params);
      setMovies(res.items || res.movies || []);
      setTotal(res.total || 0);
    } catch {
      setMovies([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  // Redirect non-admins once auth has resolved.
  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/');
  }, [authLoading, isAdmin, navigate]);

  if (authLoading) return null;
  if (!isAdmin) return null;

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    setQuery(search.trim());
  };

  const handleDelete = async (movie) => {
    if (!window.confirm(`Delete "${movie.title}"?`)) return;
    try {
      await movieApi.deleteMovie(movie.id);
      load();
    } catch (err) {
      alert(err?.detail || 'Failed to delete movie.');
    }
  };

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (movie) => { setEditing(movie); setFormOpen(true); };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="fade-in mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-8">
      {formOpen && (
        <MovieForm
          movie={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); load(); }}
        />
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="display-md text-white">Manage Movies</h1>
        <button onClick={openCreate} className="btn btn-primary btn-sm">+ Add Movie</button>
      </div>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search movies by title…"
          className="w-full max-w-md rounded-[var(--radius-md)] border border-white/10 bg-[var(--surface)] p-2.5 text-sm text-[var(--on-surface)] outline-none focus:border-[var(--primary)]"
        />
        <button type="submit" className="btn btn-glass btn-sm">Search</button>
        {query && (
          <button
            type="button"
            onClick={() => { setSearch(''); setQuery(''); setPage(0); }}
            className="btn btn-glass btn-sm"
          >
            Clear
          </button>
        )}
      </form>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-white/10">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--surface-container-high)] text-left text-[var(--on-surface-variant)]">
              <th className="p-3 font-semibold">ID</th>
              <th className="p-3 font-semibold">Title</th>
              <th className="p-3 font-semibold">Release</th>
              <th className="p-3 font-semibold">Rating</th>
              <th className="p-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center text-[var(--on-surface-variant)]">Loading…</td></tr>
            ) : movies.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-[var(--on-surface-variant)]">No movies found.</td></tr>
            ) : (
              movies.map((m) => (
                <tr key={m.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3 text-[var(--on-surface-variant)]">{m.id}</td>
                  <td className="p-3">
                    <button onClick={() => navigate(`/movie/${m.id}`)} className="font-semibold text-[var(--on-surface)] hover:text-[var(--primary)]">
                      {m.title}
                    </button>
                  </td>
                  <td className="p-3 text-[var(--on-surface-variant)]">
                    {m.release_date ? new Date(m.release_date).getFullYear() : '—'}
                  </td>
                  <td className="p-3 text-[var(--on-surface-variant)]">{Number(m.vote_average || 0).toFixed(1)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(m)} className="btn btn-glass btn-sm" title="Edit">✏️</button>
                      <button onClick={() => handleDelete(m)} className="btn btn-glass btn-sm text-red-300" title="Delete">🗑</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0 || loading}
          className="btn btn-glass btn-sm"
        >
          ← Prev
        </button>
        <span className="text-sm text-[var(--on-surface-variant)]">
          Page {page + 1} / {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
          disabled={page + 1 >= totalPages || loading}
          className="btn btn-glass btn-sm"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
