import { api } from './api';
import { ArticlesResponse } from '../types';

export const favoritesService = {
  getFavorites: async (page = 1, limit = 10): Promise<ArticlesResponse> => {
    const { data } = await api.get<ArticlesResponse>('/favorites', { params: { page, limit } });
    return data;
  },

  checkFavorite: async (articleId: number): Promise<{ isFavorite: boolean }> => {
    const { data } = await api.get<{ isFavorite: boolean }>(`/favorites/${articleId}/check`);
    return data;
  },

  addToFavorites: async (articleId: number): Promise<void> => {
    await api.post(`/favorites/${articleId}`);
  },

  removeFromFavorites: async (articleId: number): Promise<void> => {
    await api.delete(`/favorites/${articleId}`);
  },
};
