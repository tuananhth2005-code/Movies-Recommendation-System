import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import movieApi from '../../api/movieApi';
import { useAuth } from '../../context/AuthContext';
import StarRating from '../ui/StarRating';

const PAGE_SIZE = 10;

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function Avatar({ name }) {
  const letter = (name?.[0] || 'U').toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--secondary))] text-sm font-bold text-black">
      {letter}
    </div>
  );
}

export default function ReviewSection({ movieId }) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [average, setAverage] = useState(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form state
  const [score, setScore] = useState(0);
  const [text, setText] = useState('');
  const [myReviewId, setMyReviewId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadReviews = useCallback(
    async (nextOffset = 0, append = false) => {
      setLoading(true);
      try {
        const res = await movieApi.getMovieReviews(movieId, { limit: PAGE_SIZE, offset: nextOffset });
        const items = res.items || [];
        setReviews((prev) => (append ? [...prev, ...items] : items));
        setTotal(res.total || 0);
        setAverage(res.average_score ?? null);
        setOffset(nextOffset);
      } catch {
        if (!append) setReviews([]);
      } finally {
        setLoading(false);
      }
    },
    [movieId]
  );

  useEffect(() => {
    loadReviews(0, false);
  }, [loadReviews]);

  // Pre-fill the form with the user's existing review.
  useEffect(() => {
    if (!isAuthenticated) {
      setMyReviewId(null);
      setScore(0);
      setText('');
      return;
    }
    let cancelled = false;
    movieApi
      .getMyReview(movieId)
      .then((r) => {
        if (cancelled) return;
        setMyReviewId(r.id);
        setScore(Number(r.rating_score) || 0);
        setText(r.review_text || '');
      })
      .catch(() => {
        if (cancelled) return;
        setMyReviewId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [movieId, isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!score) {
      setError('Please select a star rating.');
      return;
    }
    setSubmitting(true);
    try {
      await movieApi.submitReview(movieId, score, text.trim());
      await loadReviews(0, false);
      // refresh "my review" id
      try {
        const mine = await movieApi.getMyReview(movieId);
        setMyReviewId(mine.id);
      } catch {}
    } catch (err) {
      setError(err?.detail || 'Failed to submit your review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ratingId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await movieApi.deleteReview(ratingId);
      if (ratingId === myReviewId) {
        setMyReviewId(null);
        setScore(0);
        setText('');
      }
      await loadReviews(0, false);
    } catch {}
  };

  return (
    <section className="mt-12">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h2 className="section-title m-0">Reviews</h2>
        {average != null && (
          <div className="flex items-center gap-2">
            <StarRating value={average} readonly size={18} />
            <span className="text-sm text-[var(--on-surface-variant)]">
              {average.toFixed(1)} · {total} review{total === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>

      {/* Review form */}
      {isAuthenticated ? (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-[var(--radius-lg)] border border-white/10 bg-[var(--surface-container-high)] p-5"
        >
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-[var(--on-surface)]">
              {myReviewId ? 'Edit your review' : 'Write a review'}
            </span>
            <StarRating value={score} onChange={setScore} size={26} />
            {score > 0 && (
              <span className="text-sm text-[var(--on-surface-variant)]">{score.toFixed(1)} / 5</span>
            )}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Share your thoughts about this movie (optional)…"
            className="w-full resize-y rounded-[var(--radius-md)] border border-white/10 bg-[var(--surface)] p-3 text-sm text-[var(--on-surface)] outline-none focus:border-[var(--primary)]"
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <div className="mt-3 flex items-center gap-3">
            <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
              {submitting ? 'Saving…' : myReviewId ? 'Update Review' : 'Submit Review'}
            </button>
            {myReviewId && (
              <button
                type="button"
                onClick={() => handleDelete(myReviewId)}
                className="btn btn-glass btn-sm"
              >
                Delete
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="mb-8 rounded-[var(--radius-lg)] border border-white/10 bg-[var(--surface-container-high)] p-5 text-sm text-[var(--on-surface-variant)]">
          <button onClick={() => navigate('/login')} className="text-[var(--primary)] underline">
            Sign in
          </button>{' '}
          to write a review.
        </div>
      )}

      {/* Review list */}
      {loading && reviews.length === 0 ? (
        <p className="text-sm text-[var(--on-surface-variant)]">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-[var(--on-surface-variant)]">No reviews yet. Be the first!</p>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((r) => {
            const isMine = user && r.user_id === String(user.id);
            return (
              <div
                key={r.id}
                className="rounded-[var(--radius-lg)] border border-white/10 bg-[var(--surface-container-high)] p-4"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={r.user_name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[var(--on-surface)]">{r.user_name}</span>
                      {isMine && <span className="chip chip-active text-[0.65rem]">You</span>}
                      <StarRating value={Number(r.rating_score)} readonly size={15} />
                      <span className="text-xs text-[var(--on-surface-variant)]">
                        {formatDate(r.updated_at || r.created_at)}
                      </span>
                    </div>
                    {r.review_text && (
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--on-surface)]">
                        {r.review_text}
                      </p>
                    )}
                  </div>
                  {isMine && (
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="btn btn-icon btn-sm shrink-0"
                      aria-label="Delete review"
                      title="Delete review"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {reviews.length < total && (
            <button
              onClick={() => loadReviews(offset + PAGE_SIZE, true)}
              disabled={loading}
              className="btn btn-glass btn-sm mx-auto"
            >
              {loading ? 'Loading…' : 'Load more reviews'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
