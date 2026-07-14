import axiosClient from './axiosClient';

const watchlistApi = {
  // Get watchlist (Backend: List[WatchlistItemResponse])
  getWatchlist: (params) => axiosClient.get('/watchlist', { params }),
  
  // Add to watchlist (Match backend: POST /watchlist?movie_id=1)
  addToWatchlist: (movieId) => axiosClient.post(`/watchlist?movie_id=${movieId}`),
  
  // Remove from watchlist (Match backend: DELETE /watchlist/{movie_id})
  removeFromWatchlist: (movieId) => axiosClient.delete(`/watchlist/${movieId}`),
  
  // Check if in watchlist (Cần kiểm tra backend có endpoint này chưa)
  isInWatchlist: (movieId) => axiosClient.get(`/watchlist/${movieId}/check`).catch(() => ({ in_watchlist: false })),
};

export default watchlistApi;
