import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { articlesService } from '../services/articles';
import { Article } from '../types';
import FileUpload from '../components/FileUpload';
import MarkdownEditor from '../components/MarkdownEditor';
import '../markdown-preview.css';

const EditArticle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    tags: '',
    status: 'draft' as 'draft' | 'published',
    isPrivate: false,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    loadArticle();
  }, [id]);

  const loadArticle = async () => {
    try {
      // fetch by id — we need to get the article; use slug from URL or fetch by id
      // Since our API uses slug, we need to look it up differently
      // We'll use GET /articles with search or just use the id-based approach
      // For now, get the article list and find by id
      const response = await articlesService.getArticles(1, 100);
      const found = response.articles.find(a => a.id === parseInt(id!));
      if (!found) { navigate('/'); return; }
      setArticle(found);
      setFormData({
        title: found.title,
        content: found.content,
        excerpt: found.excerpt || '',
        tags: found.tags.join(', '),
        status: found.status,
        isPrivate: found.is_private,
      });
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!article) return;
    setSaving(true);
    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      const updated = await articlesService.updateArticle(article.id, {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || undefined,
        tags: tags.length > 0 ? tags : [],
        status: formData.status,
        isPrivate: formData.isPrivate,
      });
      navigate(`/article/${updated.slug}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!article) return null;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '900px' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Редактировать страницу</h1>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Заголовок <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            type="text"
            className="input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Краткое описание
          </label>
          <textarea
            className="input"
            style={{ minHeight: '80px', resize: 'vertical' }}
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Загрузить изображения и файлы
          </label>
          <FileUpload
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.zip,.rar"
            onUploadComplete={(files) => {
              const links = files.map(f => {
                if (f.mimetype.startsWith('image/')) {
                  return `![${f.originalName}](${window.location.origin}${f.url})`;
                } else {
                  return `[${f.originalName}](${window.location.origin}${f.url})`;
                }
              }).join('\n\n');

              if (links) {
                setFormData(prev => ({
                  ...prev,
                  content: prev.content + (prev.content ? '\n\n' : '') + links
                }));
              }
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Содержание (Markdown) <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <MarkdownEditor
            value={formData.content}
            onChange={(content) => setFormData({ ...formData, content })}
            minHeight="500px"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Теги</label>
            <input
              type="text"
              className="input"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="tag1, tag2"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Статус</label>
            <select
              className="input"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
            >
              <option value="draft">Черновик</option>
              <option value="published">Опубликовано</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.isPrivate}
              onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontWeight: 500 }}>Приватная страница</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditArticle;
