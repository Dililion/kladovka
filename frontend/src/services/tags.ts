import { api } from './api';
import { Tag } from '../types';

export const tagsService = {
  getTags: async (): Promise<Tag[]> => {
    const { data } = await api.get<Tag[]>('/tags');
    return data;
  },
};
