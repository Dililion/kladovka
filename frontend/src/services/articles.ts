import { api } from './api';
import { Article, ArticlesResponse } from '../types';

export const articlesService = {
  getArticles: async (page = 1, limit = 10, categoryId?: number): Promise<ArticlesResponse> => {
    const params: any = { page, limit };
    if (categoryId) params.categoryId = categoryId;
    const { data } = await api.get<ArticlesResponse>('/articles', { params });
    return data;
  },

  getArticle: async (slug: string): Promise<Article> => {
    const { data } = await api.get<Article>(`/articles/${slug}`);
    return data;
  },

  searchArticles: async (params: {
    q?: string;
    authorId?: string;
    categoryIds?: string;
    tags?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }): Promise<ArticlesResponse> => {
    const { data } = await api.get<ArticlesResponse>('/articles/search', { params });
    return data;
  },

  getAuthors: async (): Promise<{ id: number; name: string }[]> => {
    const { data } = await api.get('/articles/filters/authors');
    return data;
  },

  createArticle: async (article: {
    title: string;
    content: string;
    excerpt?: string;
    categoryId?: number;
    tags?: string[];
    status?: 'draft' | 'published';
    parentId?: number;
    isPrivate?: boolean;
  }): Promise<Article> => {
    const { data } = await api.post<Article>('/articles', article);
    return data;
  },

  updateArticle: async (id: number, article: Partial<{
    title: string;
    content: string;
    excerpt: string;
    categoryId: number;
    tags: string[];
    status: 'draft' | 'published';
    parentId: number;
    isPrivate: boolean;
  }>): Promise<Article> => {
    const { data } = await api.put<Article>(`/articles/${id}`, article);
    return data;
  },

  moveArticle: async (id: number, parentId: number | null): Promise<void> => {
    await api.patch(`/articles/${id}/move`, { parentId });
  },

  getPermissions: async (id: number): Promise<{ user_id: number; name: string; email: string }[]> => {
    const { data } = await api.get(`/articles/${id}/permissions`);
    return data;
  },

  grantPermission: async (id: number, email: string): Promise<{ user_id: number; name: string; email: string }> => {
    const { data } = await api.post(`/articles/${id}/permissions`, { email });
    return data;
  },

  revokePermission: async (id: number, userId: number): Promise<void> => {
    await api.delete(`/articles/${id}/permissions/${userId}`);
  },

  createFolder: async (title: string, parentId?: number): Promise<any> => {
    const { data } = await api.post('/articles/folder', { title, parentId });
    return data;
  },

  deleteArticle: async (id: number): Promise<void> => {
    await api.delete(`/articles/${id}`);
  },
};
