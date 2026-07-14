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

const normalizeMovieList = (items = []) => items.map(normalizeMovie);

const movieApi = {
  getMovies: async (params) => {
    const res = await axiosClient.get('/movies', { params });
    if (Array.isArray(res)) {
      return normalizeMovieList(res);
    }
    return {
      ...res,
      items: normalizeMovieList(res.items || []),
    };
  },
  
  getMovieById: async (id) => normalizeMovie(await axiosClient.get(`/movies/${id}`)),
  

  searchMovies: async (params) => {
    const res = await axiosClient.get('/movies/search', { params });
    if (Array.isArray(res)) {
      return normalizeMovieList(res);
    }
    return {
      ...res,
      items: normalizeMovieList(res.items || []),
      movies: normalizeMovieList(res.movies || []),
    };
  },
  
  getTrending: async (params) => {
    const res = await axiosClient.get('/movies', { params: { ...params, limit: 10 } });
    if (Array.isArray(res)) {
      return normalizeMovieList(res);
    }
    return {
      ...res,
      items: normalizeMovieList(res.items || []),
    };
  },
  
  rateMovie: (movieId, score) => axiosClient.post('/ratings', { 
    movie_id: parseInt(movieId), 
    rating_score: parseFloat(score) 
  }),


  getGenres: () => axiosClient.get('/movies/genres'),


  getByGenre: async (genreId, params = {}) => {
    const safeGenreId = Number.parseInt(genreId, 10);
    const queryParams = {
      ...params,
      genre: Number.isNaN(safeGenreId) ? genreId : safeGenreId,
    };

    try {
      const res = await axiosClient.get('/movies', { params: queryParams });
      if (Array.isArray(res)) {
        const normalized = normalizeMovieList(res);
        return { items: normalized, movies: normalized, total: normalized.length };
      }
      return {
        ...res,
        items: normalizeMovieList(res.items || []),
        movies: normalizeMovieList(res.items || res.movies || []),
      };
    } catch (primaryErr) {
      try {
        const res = await axiosClient.get(`/movies/by-genre/${queryParams.genre}`, { params });
        if (Array.isArray(res)) {
          const normalized = normalizeMovieList(res);
          return { items: normalized, movies: normalized, total: normalized.length };
        }
        return {
          ...res,
          items: normalizeMovieList(res.items || []),
          movies: normalizeMovieList(res.items || res.movies || []),
        };
      } catch (fallbackErr) {
        if (fallbackErr?.detail?.includes?.('No movies found')) {
          return { total: 0, limit: params.limit || 20, offset: params.offset || 0, items: [], movies: [] };
        }
        throw fallbackErr || primaryErr;
      }
    }
  },

  getGenreMoviesAll: async (genreId, params = {}) => {
    const safeGenreId = Number.parseInt(genreId, 10);
    const res = await axiosClient.get(`/movies/genres/${safeGenreId}/movies`, { params });
    if (Array.isArray(res)) {
      return {
        items: normalizeMovieList(res),
        movies: normalizeMovieList(res),
        total: res.length,
      };
    }
    return {
      ...res,
      items: normalizeMovieList(res.items || []),
      movies: normalizeMovieList(res.items || res.movies || []),
    };
  },

  getAllMovies: async (params = {}) => {
    const res = await axiosClient.get('/movies/all', { params });
    if (Array.isArray(res)) {
      return normalizeMovieList(res);
    }
    return {
      ...res,
      items: normalizeMovieList(res.items || []),
    };
  },


  watchMovie: (movieId) => axiosClient.post(`/movies/${movieId}/watch`),

  
  getRecommendations: async (params) => {
    const res = await axiosClient.get('/recommends/me', { params });
    return {
      ...res,
      recommendations: normalizeMovieList(res.recommendations || []),
    };
  },

  // ── Admin CRUD ──
  createMovie: async (data) => normalizeMovie(await axiosClient.post('/movies', data)),
  updateMovie: async (id, data) => normalizeMovie(await axiosClient.put(`/movies/${id}`, data)),
  deleteMovie: (id) => axiosClient.delete(`/movies/${id}`),

  // ── Reviews ──
  getMovieReviews: (movieId, params) =>
    axiosClient.get(`/ratings/movie/${movieId}`, { params }),
  getMyReview: (movieId) => axiosClient.get(`/ratings/movie/${movieId}/me`),
  submitReview: (movieId, score, reviewText) =>
    axiosClient.post('/ratings', {
      movie_id: parseInt(movieId, 10),
      rating_score: parseFloat(score),
      review_text: reviewText || null,
    }),
  deleteReview: (ratingId) => axiosClient.delete(`/ratings/${ratingId}`),
};

export default movieApi;
