import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export const exportService = {
  async exportMarkdown(articleId: number): Promise<Blob> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/export/${articleId}/markdown`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: 'blob',
    });
    return response.data;
  },

  async getArticleForPDF(articleId: number): Promise<{
    title: string;
    content: string;
    excerpt?: string;
    author: string;
    category: string;
    tags: string[];
    created_at: string;
    updated_at: string;
  }> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/export/${articleId}/html`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};
