import { api } from './api';
import { Comment } from '../types';

export const commentsService = {
  getComments: async (articleId: number): Promise<Comment[]> => {
    const { data } = await api.get<Comment[]>(`/comments/${articleId}`);
    return data;
  },

  createComment: async (comment: {
    articleId: number;
    content: string;
    parentId?: number;
  }): Promise<Comment> => {
    const { data } = await api.post<Comment>('/comments', comment);
    return data;
  },

  deleteComment: async (id: number): Promise<void> => {
    await api.delete(`/comments/${id}`);
  },
};
