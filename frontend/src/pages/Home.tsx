import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { articlesService } from '../services/articles';
import { categoriesService } from '../services/categories';
import { api } from '../services/api';
import { Article, Category } from '../types';

const Home = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    api.get('/setup/status').then(({ data }) => {
      if (data.setupRequired) navigate('/setup');
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [articlesData, categoriesData] = await Promise.all([
        articlesService.getArticles(page, 10),
        categoriesService.getCategories(),
      ]);
      setArticles(articlesData.articles);
      setTotalPages(articlesData.pagination.totalPages);
      setCategories(categoriesData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  if (loading && page === 1) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '2rem', fontSize: '2.5rem' }}>
            Kladovka
          </h1>

          {articles.length === 0 ? (
            <div className="card">
              <p style={{ color: 'var(--text-muted)' }}>Пока нет опубликованных статей</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {articles.map((article) => (
                <Link
                  key={article.id}
                  to={`/article/${article.slug}`}
                  className="card"
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      {article.excerpt}
                    </p>
                  )}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    fontSize: '0.9rem',
                    color: 'var(--text-muted)',
                  }}>
                    {article.category_name && (
                      <span className="badge">{article.category_name}</span>
                    )}
                    <span>Автор: {article.author_name}</span>
                    <span>Просмотров: {article.views_count}</span>
                    <span>{new Date(article.created_at).toLocaleDateString('ru')}</span>
                  </div>
                  {article.tags && article.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      {article.tags.map((tag) => (
                        <span key={tag} className="badge">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              marginTop: '2rem',
            }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary"
              >
                Назад
              </button>
              <span style={{ alignSelf: 'center', color: 'var(--text-secondary)' }}>
                Страница {page} из {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary"
              >
                Вперёд
              </button>
            </div>
          )}
        </div>

        <aside>
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Категории</h3>
            {categories.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Нет категорий
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/category/${category.slug}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      background: 'var(--bg-tertiary)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span>{category.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {category.articles_count}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Home;
