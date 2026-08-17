export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  category_id: number | null;
  category_name: string | null;
  author_id: number;
  author_name: string;
  status: 'draft' | 'published';
  views_count: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  parent_id: number | null;
  is_private: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parent_id: number | null;
  parent_name: string | null;
  articles_count: number;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  articles_count: number;
  created_at: string;
}

export interface Comment {
  id: number;
  article_id: number;
  user_id: number;
  user_name: string;
  content: string;
  parent_id: number | null;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ArticlesResponse {
  articles: Article[];
  pagination: PaginationMeta;
}

export interface TreeNode {
  id: number;
  title: string;
  slug: string;
  parent_id: number | null;
  is_private: boolean;
  is_folder: boolean;
  author_id: number;
  created_at: string;
  updated_at: string;
  children: TreeNode[];
}
