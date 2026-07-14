import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authApi from '../api/authApi';
import movieApi from '../api/movieApi';

const GENRE_ACCENTS = [
  'border-[rgba(159,255,136,0.2)] bg-[rgba(159,255,136,0.08)] text-[var(--primary)]',
  'border-[rgba(0,210,253,0.2)] bg-[rgba(0,210,253,0.08)] text-[var(--secondary)]',
  'border-[rgba(172,137,255,0.2)] bg-[rgba(172,137,255,0.08)] text-[var(--tertiary)]',
  'border-white/10 bg-white/5 text-white/80',
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [step, setStep] = useState(1); // 1=genres, 2=done

  useEffect(() => {
    let mounted = true;

    const fetchGenres = async () => {
      try {
        const res = await movieApi.getGenres();
        const items = res?.genres || [];
        if (mounted) {
          setGenres(items);
        }
      } catch (error) {
        if (mounted) {
          setGenres([]);
        }
      } finally {
        if (mounted) {
          setGenresLoading(false);
        }
      }
    };

    fetchGenres();

    return () => {
      mounted = false;
    };
  }, []);

  const toggleGenre = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleContinue = async () => {
    if (step === 1) {
      try {
        await authApi.updatePreferences({ genre_ids: [...selected] });
      } catch (error) {
        return;
      }
      setStep(2);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] p-6">
      <div className="light-leak light-leak-1" />
      <div className="light-leak light-leak-3" />

      <div className="relative z-[1] w-full max-w-[40rem]">
        {/* Progress dots */}
        <div className="mb-8 flex justify-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className={`h-2 rounded-full transition-all ${s === step ? 'w-6 bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]' : s < step ? 'w-3 bg-[var(--primary)]' : 'w-2 bg-[var(--surface-container-high)]'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="fade-in">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl font-semibold text-[var(--primary)]">
                GO
              </div>
              <h1 className="display-md mb-3">
                What do you love to watch?
              </h1>
              <p className="body-lg">
                Select at least 3 genres to personalize your recommendations
              </p>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {genresLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-[104px] animate-pulse rounded-[var(--radius-xl)] bg-[var(--surface-container-high)]" />
                ))
              ) : (
                genres.map((g, index) => {
                const isSelected = selected.has(g.id);
                const accentClass = GENRE_ACCENTS[index % GENRE_ACCENTS.length];
                return (
                  <button
                    key={g.id}
                    id={`onboard-genre-${g.id}`}
                    onClick={() => toggleGenre(g.id)}
                    className={`rounded-[var(--radius-xl)] p-5 text-center transition ${isSelected ? 'scale-[1.03] border-2 border-[rgba(159,255,136,0.5)] bg-[linear-gradient(135deg,rgba(159,255,136,0.2),rgba(0,210,253,0.1))] shadow-[0_0_16px_rgba(159,255,136,0.15)]' : 'border-2 border-transparent bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)]'}`}
                  >
                    <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${isSelected ? 'border-[rgba(159,255,136,0.35)] bg-[rgba(159,255,136,0.12)] text-[var(--primary)]' : accentClass}`}>{g.name.slice(0, 2).toUpperCase()}</div>
                    <div className={`text-sm font-semibold ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--on-surface)]'}`}>{g.name}</div>
                  </button>
                );
                })
              )}
            </div>

            <div className="text-center">
              <button
                id="btn-onboard-continue"
                onClick={handleContinue}
                disabled={selected.size < 3}
                className={`btn btn-primary btn-lg ${selected.size < 3 ? 'opacity-50' : ''}`}
              >
                Continue ({selected.size} selected)
              </button>
              <button
                onClick={() => navigate('/')}
                className="btn btn-ghost mx-auto mt-4 block text-sm text-[var(--on-surface-variant)]"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 animate-pulse items-center justify-center rounded-full border border-[rgba(159,255,136,0.3)] bg-[rgba(159,255,136,0.12)] text-2xl font-bold text-[var(--primary)]">OK</div>
            <h1 className="display-md mb-4">
              You're all set, {user?.username || 'Curator'}!
            </h1>
            <p className="body-lg mx-auto mb-8 max-w-[25rem]">
              We've curated your personal screening room. Your recommendations are ready.
            </p>
            <button
              id="btn-enter-cinema"
              onClick={handleContinue}
              className="btn btn-primary btn-lg mx-auto"
            >
              Enter the Cinema →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
