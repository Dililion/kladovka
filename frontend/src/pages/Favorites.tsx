import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { favoritesService } from '../services/favorites';
import { Article } from '../types';

const Favorites = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadFavorites();
  }, [navigate]);

  const loadFavorites = async (page = 1) => {
    try {
      setLoading(true);
      const data = await favoritesService.getFavorites(page, 10);
      setArticles(data.articles);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error loading favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (articleId: number) => {
    if (!confirm('Удалить из избранного?')) return;

    try {
      await favoritesService.removeFromFavorites(articleId);
      loadFavorites(pagination.page);
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>Избранное</h1>

      {articles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: '1rem' }}>У вас пока нет избранных статей</p>
          <Link to="/" className="btn btn-primary">
            Перейти к статьям
          </Link>
        </div>
      ) : (
        <>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
            Всего: {pagination.total}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {articles.map((article) => (
              <div
                key={article.id}
                className="card"
                style={{ padding: '1.5rem', position: 'relative' }}
              >
                <Link
                  to={`/articles/${article.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>{article.title}</h2>
                  {article.excerpt && (
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      {article.excerpt}
                    </p>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>Автор: {article.author_name}</span>
                    {article.category_name && <span>Категория: {article.category_name}</span>}
                    <span>Просмотров: {article.views_count}</span>
                    <span>{new Date(article.created_at).toLocaleDateString('ru')}</span>
                  </div>
                  {article.tags && article.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                      {article.tags.map((tag) => (
                        <span key={tag} className="badge">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>

                <button
                  className="btn btn-secondary"
                  onClick={() => handleRemove(article.id)}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    fontSize: '0.875rem',
                    padding: '0.5rem 1rem',
                  }}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>

          {/* Пагинация */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`btn ${page === pagination.page ? 'btn-primary' : ''}`}
                  onClick={() => loadFavorites(page)}
                  style={{ minWidth: '40px' }}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Favorites;
