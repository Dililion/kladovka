import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { articlesService } from '../services/articles';
import { categoriesService } from '../services/categories';
import { Article, Category as CategoryType } from '../types';

const Category = () => {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<CategoryType | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (slug) {
      loadData();
    }
  }, [slug, page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const categoryData = await categoriesService.getCategory(slug!);
      setCategory(categoryData);
      const articlesData = await articlesService.getArticles(page, 10, categoryData.id);
      setArticles(articlesData.articles);
      setTotalPages(articlesData.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  if (loading && page === 1) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!category) return <div className="error">Категория не найдена</div>;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <nav style={{ marginBottom: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <Link to="/">Главная</Link>
        {' / '}
        <span style={{ color: 'var(--text-secondary)' }}>{category.name}</span>
      </nav>

      <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          {category.name}
        </h1>
        {category.description && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            {category.description}
          </p>
        )}
        <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Статей в категории: {category.articles_count}
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--text-muted)' }}>В этой категории пока нет статей</p>
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
  );
};

export default Category;
