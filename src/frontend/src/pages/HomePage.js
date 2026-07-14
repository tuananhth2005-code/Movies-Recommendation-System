import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroBanner from '../components/movie/HeroBanner';
import MovieRow from '../components/movie/MovieRow';
import movieApi from '../api/movieApi';
import recommendApi from '../api/recommendApi';
import { getStrategyBadge, getStrategySubtitle } from '../components/movie/strategyBadge';
import { useAuth } from '../context/AuthContext';

const DEMO_TRENDING = [
  { id: 1, title: 'Interstellar', vote_average: 8.6, release_year: 2014 },
  { id: 2, title: 'Dune: Part Two', vote_average: 8.5, release_year: 2024 },
  { id: 3, title: 'Oppenheimer', vote_average: 8.4, release_year: 2023 },
  { id: 4, title: 'The Batman', vote_average: 7.8, release_year: 2022 },
  { id: 5, title: 'Blade Runner 2049', vote_average: 8.0, release_year: 2017 },
  { id: 6, title: 'Everything Everywhere All at Once', vote_average: 8.1, release_year: 2022 },
  { id: 7, title: 'Top Gun: Maverick', vote_average: 8.3, release_year: 2022 },
  { id: 8, title: 'Avatar: The Way of Water', vote_average: 7.6, release_year: 2022 },
];

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [loading, setLoading] = useState(true);

  // Personalized recommendations
  const [recommended, setRecommended] = useState([]);
  const [recStrategy, setRecStrategy] = useState(null);
  const [recSources, setRecSources] = useState({});
  const [recLoading, setRecLoading] = useState(false);

  // Similar to watched
  const [similarToWatched, setSimilarToWatched] = useState([]);
  const [stwStrategy, setStwStrategy] = useState(null);
  const [stwSeedCount, setStwSeedCount] = useState(null);
  const [stwLoading, setStwLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [trendRes, topRes] = await Promise.all([
          movieApi.getTrending({ limit: 12 }),
          movieApi.getMovies({ limit: 12 }),
        ]);
        setTrending(trendRes.items || trendRes || []);
        setTopRated(topRes.items || topRes || []);
      } catch (err) {
        console.error('[home] Failed to fetch movies:', err);
        setTrending(DEMO_TRENDING);
        setTopRated([...DEMO_TRENDING].reverse());
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch personalized + similar-to-watched in parallel khi user đăng nhập
  useEffect(() => {
    if (!isAuthenticated) {
      setRecommended([]);
      setSimilarToWatched([]);
      setRecStrategy(null);
      setStwStrategy(null);
      return;
    }

    setRecLoading(true);
    setStwLoading(true);

    recommendApi
      .getPersonalized({ top_n: 12 })
      .then((res) => {
        setRecommended(res.recommendations);
        setRecStrategy(res.strategy);
        setRecSources(res.sources);
      })
      .catch((err) => {
        console.error('[recommendation/me] Failed:', err);
        setRecommended([]);
      })
      .finally(() => setRecLoading(false));

    recommendApi
      .getSimilarToWatched({ top_n: 12 })
      .then((res) => {
        setSimilarToWatched(res.recommendations);
        setStwStrategy(res.strategy);
        setStwSeedCount(res.seedCount);
      })
      .catch((err) => {
        console.error('[recommendation/similar-to-watched] Failed:', err);
        setSimilarToWatched([]);
      })
      .finally(() => setStwLoading(false));
  }, [isAuthenticated]);

  const recBadge = getStrategyBadge(recStrategy, recSources);
  const recSubtitle = getStrategySubtitle(recStrategy, recSources);
  const stwBadge = getStrategyBadge(stwStrategy);
  const stwSubtitle = getStrategySubtitle(stwStrategy, {}, stwSeedCount);
  const showSimilarToWatched =
    isAuthenticated && stwStrategy === 'watched_based' && similarToWatched.length > 0;

  return (
    <div className="fade-in">
      {/* Greeting */}
      <div className="top-bar flex-col items-start gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--on-surface)] sm:text-3xl">
            {isAuthenticated ? `Welcome back, ${user?.username || 'Curator'}` : 'Welcome to The Curator'}
          </h1>
          <p className="body-md mt-1">Your personalized cinema experience</p>
        </div>
        <button
          className="btn btn-primary w-full justify-center sm:w-auto"
          onClick={() => navigate('/search')}
        >
          Search Movies
        </button>
      </div>

      {/* Hero Banner */}
      <HeroBanner movies={trending} />

      {/* Personalized Recommendations - đặt LÊN ĐẦU vì quan trọng nhất */}
      {isAuthenticated && (
        <MovieRow
          title="Recommended for You"
          subtitle={recSubtitle}
          badge={recBadge}
          movies={recommended}
          loading={recLoading}
          cardWidth={180}
          onSeeAll={() => navigate('/discover')}
          emptyMessage="No recommendations yet. Watch a few movies to get personalized picks!"
        />
      )}

      {/* Because You Watched - chỉ hiện khi user có watch history thật */}
      {showSimilarToWatched && (
        <MovieRow
          title="Because You Watched"
          subtitle={stwSubtitle}
          badge={stwBadge}
          movies={similarToWatched}
          loading={stwLoading}
          cardWidth={180}
        />
      )}

      {/* Trending Now */}
      <MovieRow
        title="Trending Now"
        movies={trending}
        loading={loading}
        cardWidth={180}
      />

      {/* Top Rated */}
      <MovieRow
        title="Top Rated"
        movies={topRated}
        loading={loading}
        cardWidth={180}
      />

      {/* CTA for guests */}
      {!isAuthenticated && (
        <div className="mt-8 rounded-[var(--radius-xl)] border border-[rgba(159,255,136,0.15)] bg-[linear-gradient(135deg,rgba(159,255,136,0.08),rgba(0,210,253,0.08))] px-6 py-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:px-10 sm:py-10">
          <h2 className="font-display text-2xl font-bold sm:text-[1.75rem]">
            Get Personalized Recommendations
          </h2>
          <p className="body-lg mx-auto mb-6 mt-3 max-w-[30rem]">
            Sign in to unlock AI-powered movie recommendations tailored just for you.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
              Get Started Free
            </button>
            <button className="btn btn-glass btn-lg" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
