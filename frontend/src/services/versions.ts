import { api } from './api';

export interface ArticleVersion {
  id: number;
  article_id: number;
  title: string;
  content: string;
  excerpt: string | null;
  version_number: number;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

export const versionsService = {
  getVersions: async (articleId: number): Promise<ArticleVersion[]> => {
    const { data } = await api.get<ArticleVersion[]>(`/versions/${articleId}`);
    return data;
  },

  getVersion: async (articleId: number, versionNumber: number): Promise<ArticleVersion> => {
    const { data } = await api.get<ArticleVersion>(`/versions/${articleId}/${versionNumber}`);
    return data;
  },

  restoreVersion: async (articleId: number, versionNumber: number): Promise<void> => {
    await api.post(`/versions/${articleId}/${versionNumber}/restore`);
  },
};
