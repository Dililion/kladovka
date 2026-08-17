import { api } from './api';
import { Category } from '../types';

export const categoriesService = {
  getCategories: async (): Promise<Category[]> => {
    const { data } = await api.get<Category[]>('/categories');
    return data;
  },

  getCategory: async (slug: string): Promise<Category> => {
    const { data } = await api.get<Category>(`/categories/${slug}`);
    return data;
  },

  createCategory: async (category: {
    name: string;
    description?: string;
    parentId?: number;
  }): Promise<Category> => {
    const { data } = await api.post<Category>('/categories', category);
    return data;
  },
};
