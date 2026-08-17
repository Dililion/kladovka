import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { articlesService } from '../services/articles';
import { categoriesService } from '../services/categories';
import { Category } from '../types';
import FileUpload from '../components/FileUpload';

const CreateArticle = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    categoryId: '',
    tags: '',
    status: 'draft' as 'draft' | 'published',
    parentId: '',
    isPrivate: false,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadCategories();
  }, [navigate]);

  const loadCategories = async () => {
    try {
      const data = await categoriesService.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tags = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const article = await articlesService.createArticle({
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || undefined,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : undefined,
        tags: tags.length > 0 ? tags : undefined,
        status: formData.status,
        parentId: formData.parentId ? parseInt(formData.parentId) : undefined,
        isPrivate: formData.isPrivate,
      });

      navigate(`/article/${article.slug}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка создания статьи');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '900px' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2.5rem' }}>
        Создать статью
      </h1>

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
            maxLength={500}
            placeholder="Введите заголовок статьи"
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
            placeholder="Краткое описание статьи (необязательно)"
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
              // Добавить ссылки на загруженные файлы в контент
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
          <textarea
            className="input textarea"
            style={{ minHeight: '400px', fontFamily: 'monospace' }}
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            required
            placeholder="# Заголовок&#10;&#10;Текст статьи в формате Markdown..."
          />
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Поддерживается Markdown: # заголовки, **жирный**, *курсив*, [ссылки](url), ``` код ```
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Категория
            </label>
            <select
              className="input"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            >
              <option value="">Без категории</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Статус
            </label>
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
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Теги
          </label>
          <input
            type="text"
            className="input"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="Разделяйте запятой: javascript, tutorial, beginner"
          />
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
          <p style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '1.5rem' }}>
            Только вы и администраторы смогут видеть эту страницу
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Создание...' : 'Создать статью'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateArticle;
