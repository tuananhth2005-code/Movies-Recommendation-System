import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import movieApi from '../../api/movieApi';

const EMPTY = {
  title: '',
  overview: '',
  release_date: '',
  poster_path: '',
  youtube_trailer_id: '',
  vote_average: 0,
  vote_count: 0,
  genre_ids: [],
};

/**
 * Create / edit movie modal (admin only).
 *
 * Props:
 *  - movie:     existing movie to edit, or null/undefined for create
 *  - onClose:   () => void
 *  - onSaved:   (savedMovie) => void
 */
export default function MovieForm({ movie, onClose, onSaved }) {
  const isEdit = Boolean(movie && movie.id);
  const [form, setForm] = useState(EMPTY);
  const [genres, setGenres] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    movieApi
      .getGenres()
      .then((res) => setGenres(res.genres || []))
      .catch(() => setGenres([]));
  }, []);

  useEffect(() => {
    if (isEdit) {
      setForm({
        title: movie.title || '',
        overview: movie.overview || '',
        release_date: movie.release_date ? movie.release_date.slice(0, 10) : '',
        poster_path: movie.poster_path || '',
        youtube_trailer_id: movie.youtube_trailer_id || '',
        vote_average: movie.vote_average ?? 0,
        vote_count: movie.vote_count ?? 0,
        genre_ids: (movie.genres || []).map((g) => g.id ?? g).filter((x) => x != null),
      });
    } else {
      setForm(EMPTY);
    }
  }, [movie, isEdit]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleGenre = (id) =>
    setForm((f) => ({
      ...f,
      genre_ids: f.genre_ids.includes(id)
        ? f.genre_ids.filter((g) => g !== id)
        : [...f.genre_ids, id],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    const payload = {
      title: form.title.trim(),
      overview: form.overview || null,
      release_date: form.release_date || null,
      poster_path: form.poster_path || null,
      youtube_trailer_id: form.youtube_trailer_id || null,
      vote_average: Number(form.vote_average) || 0,
      vote_count: parseInt(form.vote_count, 10) || 0,
      genre_ids: form.genre_ids,
    };
    setSaving(true);
    try {
      const saved = isEdit
        ? await movieApi.updateMovie(movie.id, payload)
        : await movieApi.createMovie(payload);
      onSaved?.(saved);
    } catch (err) {
      setError(err?.detail || 'Failed to save movie.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-[var(--radius-md)] border border-white/10 bg-[var(--surface)] p-2.5 text-sm text-[var(--on-surface)] outline-none focus:border-[var(--primary)]';
  const labelCls = 'mb-1 block text-xs font-semibold uppercase text-[var(--on-surface-variant)]';

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="slide-up w-full max-w-2xl rounded-[var(--radius-xl)] border border-white/10 bg-[var(--surface-container)] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.6)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[var(--on-surface)]">
            {isEdit ? 'Edit Movie' : 'Add Movie'}
          </h2>
          <button onClick={onClose} className="btn btn-icon btn-sm" aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelCls}>Title *</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              maxLength={255}
            />
          </div>

          <div>
            <label className={labelCls}>Overview</label>
            <textarea
              className={`${inputCls} resize-y`}
              rows={3}
              value={form.overview}
              onChange={(e) => setField('overview', e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Release date</label>
              <input
                type="date"
                className={inputCls}
                value={form.release_date}
                onChange={(e) => setField('release_date', e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>YouTube trailer ID</label>
              <input
                className={inputCls}
                value={form.youtube_trailer_id}
                onChange={(e) => setField('youtube_trailer_id', e.target.value)}
                placeholder="e.g. zSWdZVtXT7E"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Poster path</label>
            <input
              className={inputCls}
              value={form.poster_path}
              onChange={(e) => setField('poster_path', e.target.value)}
              placeholder="/abc123.jpg (TMDB path)"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Vote average (0–10)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                className={inputCls}
                value={form.vote_average}
                onChange={(e) => setField('vote_average', e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Vote count</label>
              <input
                type="number"
                min="0"
                className={inputCls}
                value={form.vote_count}
                onChange={(e) => setField('vote_count', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Genres</label>
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => {
                const active = form.genre_ids.includes(g.id);
                return (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => toggleGenre(g.id)}
                    className={`chip ${active ? 'chip-active' : 'chip-default'}`}
                  >
                    {g.name}
                  </button>
                );
              })}
              {genres.length === 0 && (
                <span className="text-sm text-[var(--on-surface-variant)]">No genres available.</span>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn btn-glass btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Movie'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
