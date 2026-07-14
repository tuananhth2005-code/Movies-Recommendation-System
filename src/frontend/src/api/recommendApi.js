import axiosClient from './axiosClient';

const normalizeMovie = (movie = {}) => {
  const id = movie.id ?? movie.movie_id;
  let releaseYear = movie.release_year;

  if (!releaseYear && movie.release_date) {
    const parsed = new Date(movie.release_date);
    if (!Number.isNaN(parsed.getTime())) {
      releaseYear = parsed.getFullYear();
    }
  }

  return {
    ...movie,
    id,
    movie_id: movie.movie_id ?? id,
    release_year: releaseYear,
  };
};

const normalizeList = (items = []) => items.map(normalizeMovie);

const recommendApi = {
  getPersonalized: async ({ top_n = 12 } = {}) => {
    const res = await axiosClient.get('/recommends/me', { params: { top_n } });
    return {
      recommendations: normalizeList(res.recommendations || []),
      strategy: res.strategy || 'unknown',
      sources: res.sources || {},
    };
  },

  getSimilarToWatched: async ({ top_n = 12 } = {}) => {
    const res = await axiosClient.get('/recommends/similar-to-watched', {
      params: { top_n },
    });
    return {
      recommendations: normalizeList(res.recommendations || []),
      strategy: res.strategy || 'unknown',
      seedCount: res.seed_count ?? null,
      reason: res.reason ?? null,
    };
  },
};

export default recommendApi;
