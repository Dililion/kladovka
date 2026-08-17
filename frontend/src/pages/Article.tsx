import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { articlesService } from '../services/articles';
import { favoritesService } from '../services/favorites';
import { versionsService, ArticleVersion } from '../services/versions';
import { exportService } from '../services/export';
import { Article as ArticleType } from '../types';

const Article = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissions, setPermissions] = useState<{ user_id: number; name: string; email: string }[]>([]);
  const [permEmail, setPermEmail] = useState('');
  const [permLoading, setPermLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ArticleVersion | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const userData = localStorage.getItem('user');
  const currentUser = userData ? JSON.parse(userData) : null;

  useEffect(() => {
    if (slug) loadArticle();
  }, [slug]);

  const loadArticle = async () => {
    try {
      setLoading(true);
      const data = await articlesService.getArticle(slug!);
      setArticle(data);

      // Проверить статус избранного
      if (currentUser) {
        const favoriteStatus = await favoritesService.checkFavorite(data.id);
        setIsFavorite(favoriteStatus.isFavorite);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки статьи');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!article || !currentUser) return;

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await favoritesService.removeFromFavorites(article.id);
        setIsFavorite(false);
      } else {
        await favoritesService.addToFavorites(article.id);
        setIsFavorite(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!article || !confirm('Удалить страницу?')) return;
    try {
      await articlesService.deleteArticle(article.id);
      navigate('/');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка удаления');
    }
  };

  const loadPermissions = async () => {
    if (!article) return;
    try {
      const data = await articlesService.getPermissions(article.id);
      setPermissions(data);
    } catch {}
  };

  const handleShowPermissions = async () => {
    await loadPermissions();
    setShowPermissions(true);
  };

  const handleGrantPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!article || !permEmail.trim()) return;
    setPermLoading(true);
    try {
      const user = await articlesService.grantPermission(article.id, permEmail.trim());
      setPermissions([...permissions, user]);
      setPermEmail('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка');
    } finally {
      setPermLoading(false);
    }
  };

  const handleRevokePermission = async (userId: number) => {
    if (!article) return;
    try {
      await articlesService.revokePermission(article.id, userId);
      setPermissions(permissions.filter(p => p.user_id !== userId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  const loadVersions = async () => {
    if (!article) return;
    setVersionsLoading(true);
    try {
      const data = await versionsService.getVersions(article.id);
      setVersions(data);
      setShowVersions(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка загрузки версий');
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleViewVersion = async (versionNumber: number) => {
    if (!article) return;
    try {
      const version = await versionsService.getVersion(article.id, versionNumber);
      setSelectedVersion(version);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка загрузки версии');
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!article || !confirm('Восстановить эту версию? Текущая версия будет сохранена в историю.')) return;
    try {
      await versionsService.restoreVersion(article.id, versionNumber);
      setSelectedVersion(null);
      setShowVersions(false);
      loadArticle();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка восстановления версии');
    }
  };

  const handleExportMarkdown = async () => {
    if (!article) return;
    try {
      const blob = await exportService.exportMarkdown(article.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `article-${article.id}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка экспорта статьи');
    }
  };

  const handleExportPDF = async () => {
    if (!article) return;
    try {
      const data = await exportService.getArticleForPDF(article.id);

      // Create a temporary container for rendering
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '210mm';
      container.style.padding = '20mm';
      container.style.background = 'white';
      container.style.color = 'black';

      let html = `<h1 style="margin-bottom: 0.5em;">${data.title}</h1>`;
      if (data.excerpt) {
        html += `<p style="font-style: italic; color: #666; margin-bottom: 1em;">${data.excerpt}</p>`;
      }
      html += `<p style="font-size: 0.9em; color: #666; margin-bottom: 0.5em;"><strong>Автор:</strong> ${data.author}</p>`;
      html += `<p style="font-size: 0.9em; color: #666; margin-bottom: 0.5em;"><strong>Категория:</strong> ${data.category}</p>`;
      if (data.tags.length > 0) {
        html += `<p style="font-size: 0.9em; color: #666; margin-bottom: 0.5em;"><strong>Теги:</strong> ${data.tags.join(', ')}</p>`;
      }
      html += `<p style="font-size: 0.9em; color: #666; margin-bottom: 1em;"><strong>Создано:</strong> ${new Date(data.created_at).toLocaleString('ru')}</p>`;
      html += `<hr style="margin: 1.5em 0; border: none; border-top: 1px solid #ddd;" />`;
      html += DOMPurify.sanitize(marked(data.content) as string);

      container.innerHTML = html;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`article-${article.id}.pdf`);
    } catch (err: any) {
      console.error('PDF export error:', err);
      alert(err.response?.data?.message || 'Ошибка экспорта в PDF');
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!article) return <div className="error">Страница не найдена</div>;

  const htmlContent = DOMPurify.sanitize(marked(article.content) as string);
  const canEdit = currentUser && (currentUser.id === article.author_id || currentUser.role === 'admin');

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '900px' }}>
      <nav style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link to="/">Главная</Link>
          {' / '}
          <span style={{ color: 'var(--text-secondary)' }}>{article.title}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {currentUser && (
            <button
              className="btn"
              style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
            >
              {favoriteLoading ? '...' : isFavorite ? '★ В избранном' : '☆ В избранное'}
            </button>
          )}
          {canEdit && (
            <>
              {article.is_private && (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
                  onClick={handleShowPermissions}
                >
                  Права доступа
                </button>
              )}
              <Link
                to={`/edit/${article.id}`}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
              >
                Редактировать
              </Link>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
                onClick={loadVersions}
                disabled={versionsLoading}
              >
                {versionsLoading ? '...' : 'История'}
              </button>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
                onClick={handleExportMarkdown}
              >
                ⬇ Markdown
              </button>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
                onClick={handleExportPDF}
              >
                ⬇ PDF
              </button>
              <button
                className="btn"
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem', background: 'var(--error)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                onClick={handleDelete}
              >
                Удалить
              </button>
            </>
          )}
        </div>
      </nav>

      <article className="card" style={{ padding: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
          {article.is_private && <span title="Приватная">🔒 </span>}
          {article.title}
        </h1>

        <div style={{
          display: 'flex',
          gap: '1.5rem',
          marginBottom: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
          flexWrap: 'wrap',
          fontSize: '0.9rem',
          color: 'var(--text-muted)',
        }}>
          <span>Автор: <strong style={{ color: 'var(--text-secondary)' }}>{article.author_name}</strong></span>
          <span>Просмотров: {article.views_count}</span>
          <span>Создано: {new Date(article.created_at).toLocaleDateString('ru')}</span>
          {article.updated_at !== article.created_at && (
            <span>Обновлено: {new Date(article.updated_at).toLocaleDateString('ru')}</span>
          )}
        </div>

        {article.tags && article.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {article.tags.map((tag) => (
              <span key={tag} className="badge">#{tag}</span>
            ))}
          </div>
        )}

        <div
          style={{ lineHeight: 1.8, fontSize: '1.05rem', color: 'var(--text-primary)' }}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </article>

      {showPermissions && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card" style={{ padding: '2rem', width: '480px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3>Права доступа</h3>
              <button onClick={() => setShowPermissions(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleGrantPermission} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                className="input"
                type="email"
                placeholder="Email пользователя"
                value={permEmail}
                onChange={e => setPermEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={permLoading}>
                {permLoading ? '...' : 'Добавить'}
              </button>
            </form>

            {permissions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Нет дополнительных пользователей с доступом</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {permissions.map(p => (
                  <div key={p.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.9rem' }}>{p.name} <span style={{ color: 'var(--text-muted)' }}>({p.email})</span></span>
                    <button
                      onClick={() => handleRevokePermission(p.user_id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: '0.85rem' }}
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно истории версий */}
      {showVersions && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => { setShowVersions(false); setSelectedVersion(null); }}
        >
          <div
            className="card"
            style={{ maxWidth: '900px', width: '100%', maxHeight: '80vh', overflow: 'auto', padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem' }}>История версий</h2>
              <button
                className="btn btn-secondary"
                onClick={() => { setShowVersions(false); setSelectedVersion(null); }}
              >
                Закрыть
              </button>
            </div>

            {selectedVersion ? (
              <div>
                <button
                  className="btn"
                  onClick={() => setSelectedVersion(null)}
                  style={{ marginBottom: '1rem' }}
                >
                  ← Назад к списку
                </button>
                <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ marginBottom: '0.5rem' }}>Версия #{selectedVersion.version_number}</h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Создана: {new Date(selectedVersion.created_at).toLocaleString('ru')} •{' '}
                        Автор: {selectedVersion.created_by_name}
                      </p>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleRestoreVersion(selectedVersion.version_number)}
                    >
                      Восстановить
                    </button>
                  </div>
                </div>
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{selectedVersion.title}</h1>
                  {selectedVersion.excerpt && (
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontStyle: 'italic' }}>
                      {selectedVersion.excerpt}
                    </p>
                  )}
                  <div
                    className="markdown-content"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked(selectedVersion.content) as string) }}
                  />
                </div>
              </div>
            ) : (
              <div>
                {versions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                    История версий пуста
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        style={{
                          padding: '1rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                            Версия #{version.version_number}: {version.title}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            {new Date(version.created_at).toLocaleString('ru')} • {version.created_by_name}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleViewVersion(version.version_number)}
                            style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                          >
                            Просмотр
                          </button>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleRestoreVersion(version.version_number)}
                            style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                          >
                            Восстановить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Article;
