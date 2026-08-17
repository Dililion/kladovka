import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export interface AnalyticsStats {
  total_articles: number;
  public_articles: number;
  private_articles: number;
  total_users: number;
  total_comments: number;
  total_categories: number;
  total_tags: number;
}

export interface RecentActivity {
  date: string;
  count: number;
}

export interface PopularTag {
  id: number;
  name: string;
  article_count: number;
}

export interface UserActivity {
  id: number;
  username: string;
  email: string;
  role: string;
  articles_count: number;
  comments_count: number;
  last_article_date: string | null;
  last_comment_date: string | null;
}

export interface PopularArticle {
  id: number;
  title: string;
  slug: string;
  views_count: number;
  created_at: string;
  author_name: string;
  category_name: string;
  comments_count: number;
}

export interface CategoryDistribution {
  id: number;
  name: string;
  article_count: number;
}

export const analyticsService = {
  async getStats(): Promise<{ stats: AnalyticsStats; recentActivity: RecentActivity[] }> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/analytics/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getPopularTags(limit: number = 10): Promise<PopularTag[]> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/analytics/popular-tags`, {
      params: { limit },
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getUserActivity(limit: number = 10): Promise<UserActivity[]> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/analytics/user-activity`, {
      params: { limit },
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getPopularArticles(limit: number = 10): Promise<PopularArticle[]> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/analytics/popular-articles`, {
      params: { limit },
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getCategoryDistribution(): Promise<CategoryDistribution[]> {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/analytics/category-distribution`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};
