import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  analyticsService,
  AnalyticsStats,
  RecentActivity,
  PopularTag,
  UserActivity,
  PopularArticle,
  CategoryDistribution,
} from '../services/analytics';

const Analytics = () => {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [popularArticles, setPopularArticles] = useState<PopularArticle[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userData = localStorage.getItem('user');
  const currentUser = userData ? JSON.parse(userData) : null;

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      setError('Доступ запрещён');
      setLoading(false);
      return;
    }
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [statsData, tagsData, usersData, articlesData, categoriesData] = await Promise.all([
        analyticsService.getStats(),
        analyticsService.getPopularTags(15),
        analyticsService.getUserActivity(10),
        analyticsService.getPopularArticles(10),
        analyticsService.getCategoryDistribution(),
      ]);

      setStats(statsData.stats);
      setRecentActivity(statsData.recentActivity);
      setPopularTags(tagsData);
      setUserActivity(usersData);
      setPopularArticles(articlesData);
      setCategoryDistribution(categoriesData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки аналитики');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!stats) return null;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1200px' }}>
      <nav style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <Link to="/">Главная</Link>
        {' / '}
        <span style={{ color: 'var(--text-secondary)' }}>Аналитика</span>
      </nav>

      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Аналитика</h1>

      {/* General Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.total_articles}</div>
          <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Всего статей</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {stats.public_articles} публичных • {stats.private_articles} приватных
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.total_users}</div>
          <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Пользователей</div>
        </div>

        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.total_comments}</div>
          <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Комментариев</div>
        </div>

        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.total_categories}</div>
          <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Категорий</div>
        </div>

        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.total_tags}</div>
          <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Тегов</div>
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Активность за последние 30 дней</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '150px' }}>
            {recentActivity.slice(0, 30).reverse().map((activity, index) => {
              const maxCount = Math.max(...recentActivity.map(a => a.count));
              const height = (activity.count / maxCount) * 100;
              return (
                <div
                  key={index}
                  title={`${new Date(activity.date).toLocaleDateString('ru')}: ${activity.count} статей`}
                  style={{
                    flex: 1,
                    height: `${height}%`,
                    background: 'var(--primary)',
                    borderRadius: '2px',
                    minHeight: activity.count > 0 ? '4px' : '0',
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Popular Tags */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Популярные теги</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {popularTags.map((tag) => (
              <div
                key={tag.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '4px',
                }}
              >
                <span>{tag.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{tag.article_count} статей</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Распределение по категориям</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {categoryDistribution.map((category) => (
              <div
                key={category.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '4px',
                }}
              >
                <span>{category.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{category.article_count} статей</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Articles */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Популярные статьи</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {popularArticles.map((article) => (
            <div
              key={article.id}
              style={{
                padding: '1rem',
                background: 'var(--bg-secondary)',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1 }}>
                <Link
                  to={`/article/${article.slug}`}
                  style={{ fontWeight: 500, color: 'var(--text-primary)', textDecoration: 'none' }}
                >
                  {article.title}
                </Link>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {article.author_name} • {article.category_name} • {article.comments_count} комментариев
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                {article.views_count} <span style={{ fontSize: '0.875rem', fontWeight: 'normal' }}>просмотров</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Activity */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Активность пользователей</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Пользователь</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Роль</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Статей</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Комментариев</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Последняя статья</th>
              </tr>
            </thead>
            <tbody>
              {userActivity.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div>{user.username}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{user.email}</div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: user.role === 'admin' ? 'var(--error)' : 'var(--bg-secondary)',
                        color: user.role === 'admin' ? '#fff' : 'var(--text-primary)',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                      }}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>{user.articles_count}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>{user.comments_count}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {user.last_article_date
                      ? new Date(user.last_article_date).toLocaleDateString('ru')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
