import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import RolesManagement from './RolesManagement';
import BackupManagement from './BackupManagement';
import ImportExport from './ImportExport';

interface AdminStats {
  users: number;
  articles: number;
  comments: number;
  categories: number;
  topArticles: Array<{ id: number; title: string; slug: string; views_count: number; status: string }>;
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  username: string;
  role: string;
  created_at: string;
  articles_count: number;
  is_blocked: boolean;
}

interface AdminArticle {
  id: number;
  title: string;
  slug: string;
  status: string;
  views_count: number;
  author_name: string;
  category_name: string | null;
  created_at: string;
}

interface AdminComment {
  id: number;
  content: string;
  user_name: string;
  article_title: string;
  article_slug: string;
  created_at: string;
}

interface AdminFolder {
  id: number;
  title: string;
  slug: string;
  parent_id: number | null;
  author_name: string;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

type Tab = 'stats' | 'users' | 'articles' | 'folders' | 'categories' | 'comments' | 'roles' | 'backups' | 'import-export';

const Admin = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [folders, setFolders] = useState<AdminFolder[]>([]);
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingFolderTitle, setEditingFolderTitle] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(true);

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/');
      return;
    }
    loadStats();
  }, []);

  useEffect(() => {
    if (tab === 'users' && users.length === 0) loadUsers();
    if (tab === 'articles' && articles.length === 0) loadArticles();
    if (tab === 'comments' && comments.length === 0) loadComments();
    if (tab === 'folders' && folders.length === 0) loadFolders();
    if (tab === 'categories' && categories.length === 0) loadCategories();
  }, [tab]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<AdminStats>('/admin/stats');
      setStats(data);
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await api.get<AdminUser[]>('/admin/users');
    setUsers(data);
    setLoading(false);
  };

  const loadArticles = async () => {
    setLoading(true);
    const { data } = await api.get<AdminArticle[]>('/admin/articles');
    setArticles(data);
    setLoading(false);
  };

  const loadComments = async () => {
    setLoading(true);
    const { data } = await api.get<AdminComment[]>('/admin/comments');
    setComments(data);
    setLoading(false);
  };

  const loadFolders = async () => {
    setLoading(true);
    const { data } = await api.get<AdminFolder[]>('/admin/folders');
    setFolders(data);
    setLoading(false);
  };

  const loadCategories = async () => {
    setLoading(true);
    const { data } = await api.get<Category[]>('/admin/categories');
    setCategories(data);
    setLoading(false);
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    const { data } = await api.post<Category>('/admin/categories', { name: newCategoryName });
    setCategories([...categories, data]);
    setNewCategoryName('');
  };

  const renameCategory = async (id: number) => {
    if (!editingCategoryName.trim()) return;
    await api.patch(`/admin/categories/${id}`, { name: editingCategoryName });
    setCategories(categories.map(c => c.id === id ? { ...c, name: editingCategoryName } : c));
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('Удалить категорию? Статьи станут без категории.')) return;
    await api.delete(`/admin/categories/${id}`);
    setCategories(categories.filter(c => c.id !== id));
  };

  const renameFolder = async (id: number) => {
    if (!editingFolderTitle.trim()) return;
    await api.patch(`/admin/folders/${id}`, { title: editingFolderTitle });
    setFolders(folders.map(f => f.id === id ? { ...f, title: editingFolderTitle } : f));
    setEditingFolderId(null);
    setEditingFolderTitle('');
  };

  const deleteFolder = async (id: number) => {
    if (!confirm('Удалить папку? Содержимое переместится на уровень выше.')) return;
    await api.delete(`/admin/folders/${id}`);
    setFolders(folders.filter(f => f.id !== id));
  };

  const changeRole = async (userId: number, newRole: string) => {
    await api.patch(`/admin/users/${userId}/role`, { role: newRole });
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const toggleBlockUser = async (userId: number, isBlocked: boolean) => {
    const action = isBlocked ? 'заблокировать' : 'разблокировать';
    if (!confirm(`Вы уверены, что хотите ${action} пользователя?`)) return;
    await api.patch(`/admin/users/${userId}/block`, { is_blocked: isBlocked });
    setUsers(users.map(u => u.id === userId ? { ...u, is_blocked: isBlocked } : u));
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('Удалить пользователя?')) return;
    await api.delete(`/admin/users/${userId}`);
    setUsers(users.filter(u => u.id !== userId));
  };

  const changeArticleStatus = async (articleId: number, status: string) => {
    await api.patch(`/admin/articles/${articleId}/status`, { status });
    setArticles(articles.map(a => a.id === articleId ? { ...a, status } : a));
  };

  const deleteArticle = async (articleId: number) => {
    if (!confirm('Удалить статью?')) return;
    await api.delete(`/admin/articles/${articleId}`);
    setArticles(articles.filter(a => a.id !== articleId));
  };

  const deleteComment = async (commentId: number) => {
    if (!confirm('Удалить комментарий?')) return;
    await api.delete(`/admin/comments/${commentId}`);
    setComments(comments.filter(c => c.id !== commentId));
  };

  const tabStyle = (t: Tab) => ({
    padding: '0.6rem 1.2rem',
    background: tab === t ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
    color: tab === t ? '#000' : 'var(--text-primary)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: tab === t ? 600 : 400,
    fontSize: '0.9rem',
  });

  const thStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    color: 'var(--text-muted)',
    fontWeight: 500,
    fontSize: '0.85rem',
    borderBottom: '1px solid var(--border-color)',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border-color)',
    fontSize: '0.9rem',
    verticalAlign: 'middle',
  };

  if (!currentUser || currentUser.role !== 'admin') return null;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h1 style={{ marginBottom: '0.5rem', fontSize: '2rem' }}>Панель администратора</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Управление приложением Kladovka</p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button style={tabStyle('stats')} onClick={() => setTab('stats')}>Обзор</button>
        <button style={tabStyle('users')} onClick={() => setTab('users')}>Пользователи</button>
        <button style={tabStyle('articles')} onClick={() => setTab('articles')}>Статьи</button>
        <button style={tabStyle('folders')} onClick={() => setTab('folders')}>Папки</button>
        <button style={tabStyle('categories')} onClick={() => setTab('categories')}>Категории</button>
        <button style={tabStyle('comments')} onClick={() => setTab('comments')}>Комментарии</button>
        <button style={tabStyle('roles')} onClick={() => setTab('roles')}>Роли</button>
        <button style={tabStyle('backups')} onClick={() => setTab('backups')}>Бэкапы</button>
        <button style={tabStyle('import-export')} onClick={() => setTab('import-export')}>Импорт/Экспорт</button>
        <button
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#F97316',
            border: 'none',
            borderRadius: '6px',
            color: '#F8FAFC',
            cursor: 'pointer',
            fontWeight: 500
          }}
          onClick={() => navigate('/settings')}
        >
          Настройки
        </button>
      </div>

      {loading && <p style={{ color: 'var(--text-muted)' }}>Загрузка...</p>}

      {/* Stats */}
      {tab === 'stats' && !loading && stats && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Пользователи', value: stats.users, color: '#38BDF8' },
              { label: 'Статьи', value: stats.articles, color: '#A78BFA' },
              { label: 'Комментарии', value: stats.comments, color: '#34D399' },
              { label: 'Категории', value: stats.categories, color: '#F97316' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color }}>{value}</div>
                <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{label}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Топ статей по просмотрам</h3>
            {stats.topArticles.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Нет статей</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Заголовок</th>
                    <th style={thStyle}>Статус</th>
                    <th style={thStyle}>Просмотры</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topArticles.map(a => (
                    <tr key={a.id}>
                      <td style={tdStyle}>
                        <a href={`/article/${a.slug}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                          {a.title}
                        </a>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          background: a.status === 'published' ? 'rgba(52,211,153,0.15)' : 'rgba(156,163,175,0.15)',
                          color: a.status === 'published' ? '#34D399' : 'var(--text-muted)',
                        }}>
                          {a.status === 'published' ? 'Опубликована' : 'Черновик'}
                        </span>
                      </td>
                      <td style={tdStyle}>{a.views_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && !loading && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Имя</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Роль</th>
                <th style={thStyle}>Статус</th>
                <th style={thStyle}>Статей</th>
                <th style={thStyle}>Дата</th>
                <th style={thStyle}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ opacity: u.is_blocked ? 0.6 : 1 }}>
                  <td style={tdStyle}>{u.name}</td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>{u.username}</td>
                  <td style={tdStyle}>
                    <select
                      value={u.role}
                      disabled={u.id === currentUser.id}
                      onChange={e => changeRole(u.id, e.target.value)}
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: u.role === 'admin' ? '#F97316' : 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.85rem',
                        cursor: u.id === currentUser.id ? 'default' : 'pointer',
                      }}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        background: u.is_blocked ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                        color: u.is_blocked ? '#EF4444' : '#22C55E',
                      }}
                    >
                      {u.is_blocked ? 'Заблокирован' : 'Активен'}
                    </span>
                  </td>
                  <td style={tdStyle}>{u.articles_count}</td>
                  <td style={tdStyle}>{new Date(u.created_at).toLocaleDateString('ru')}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {u.id !== currentUser.id && (
                        <>
                          <button
                            onClick={() => toggleBlockUser(u.id, !u.is_blocked)}
                            style={{
                              background: u.is_blocked ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                              color: u.is_blocked ? '#22C55E' : '#EF4444',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '0.25rem 0.6rem',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                            }}
                          >
                            {u.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                          </button>
                          <button
                            onClick={() => deleteUser(u.id)}
                            style={{
                              background: 'rgba(239,68,68,0.15)',
                              color: '#EF4444',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '0.25rem 0.6rem',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                            }}
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Articles */}
      {tab === 'articles' && !loading && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Заголовок</th>
                <th style={thStyle}>Автор</th>
                <th style={thStyle}>Категория</th>
                <th style={thStyle}>Статус</th>
                <th style={thStyle}>Просмотры</th>
                <th style={thStyle}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(a => (
                <tr key={a.id}>
                  <td style={{ ...tdStyle, maxWidth: '250px' }}>
                    <a href={`/article/${a.slug}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                      {a.title}
                    </a>
                  </td>
                  <td style={tdStyle}>{a.author_name}</td>
                  <td style={tdStyle}>{a.category_name || '—'}</td>
                  <td style={tdStyle}>
                    <select
                      value={a.status}
                      onChange={e => changeArticleStatus(a.id, e.target.value)}
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: a.status === 'published' ? '#34D399' : 'var(--text-muted)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="draft">Черновик</option>
                      <option value="published">Опубликована</option>
                    </select>
                  </td>
                  <td style={tdStyle}>{a.views_count}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => deleteArticle(a.id)}
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: 'none', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Folders */}
      {tab === 'folders' && !loading && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Название</th>
                <th style={thStyle}>Автор</th>
                <th style={thStyle}>Создана</th>
                <th style={thStyle}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {folders.length === 0 && (
                <tr><td colSpan={4} style={{ ...tdStyle, color: 'var(--text-muted)', textAlign: 'center' }}>Нет папок</td></tr>
              )}
              {folders.map(f => (
                <tr key={f.id}>
                  <td style={tdStyle}>
                    {editingFolderId === f.id ? (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <input
                          className="input"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                          value={editingFolderTitle}
                          onChange={e => setEditingFolderTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameFolder(f.id); if (e.key === 'Escape') setEditingFolderId(null); }}
                          autoFocus
                        />
                        <button onClick={() => renameFolder(f.id)} style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>ОК</button>
                        <button onClick={() => setEditingFolderId(null)} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                      </div>
                    ) : (
                      <span>📁 {f.title}</span>
                    )}
                  </td>
                  <td style={tdStyle}>{f.author_name}</td>
                  <td style={tdStyle}>{new Date(f.created_at).toLocaleDateString('ru')}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => { setEditingFolderId(f.id); setEditingFolderTitle(f.title); }}
                        style={{ background: 'rgba(56,189,248,0.15)', color: '#38BDF8', border: 'none', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Переименовать
                      </button>
                      <button
                        onClick={() => deleteFolder(f.id)}
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: 'none', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Categories */}
      {tab === 'categories' && !loading && (
        <div>
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Добавить категорию</h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                className="input"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createCategory()}
                placeholder="Название категории"
                style={{ flex: 1 }}
              />
              <button
                onClick={createCategory}
                style={{ background: 'var(--accent-primary)', color: '#000', border: 'none', borderRadius: '6px', padding: '0.5rem 1.2rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Добавить
              </button>
            </div>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Название</th>
                  <th style={thStyle}>Slug</th>
                  <th style={thStyle}>Дата создания</th>
                  <th style={thStyle}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 && (
                  <tr><td colSpan={4} style={{ ...tdStyle, color: 'var(--text-muted)', textAlign: 'center' }}>Нет категорий</td></tr>
                )}
                {categories.map(c => (
                  <tr key={c.id}>
                    <td style={tdStyle}>
                      {editingCategoryId === c.id ? (
                        <input
                          type="text"
                          className="input"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') renameCategory(c.id); if (e.key === 'Escape') { setEditingCategoryId(null); setEditingCategoryName(''); } }}
                          autoFocus
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
                        />
                      ) : (
                        c.name
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{c.slug}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('ru')}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {editingCategoryId === c.id ? (
                          <>
                            <button onClick={() => renameCategory(c.id)} style={{ background: 'rgba(56,189,248,0.15)', color: '#38BDF8', border: 'none', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>Сохранить</button>
                            <button onClick={() => { setEditingCategoryId(null); setEditingCategoryName(''); }} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: 'none', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>Отмена</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingCategoryId(c.id); setEditingCategoryName(c.name); }} style={{ background: 'rgba(56,189,248,0.15)', color: '#38BDF8', border: 'none', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>Переименовать</button>
                            <button onClick={() => deleteCategory(c.id)} style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: 'none', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>Удалить</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comments */}
      {tab === 'comments' && !loading && (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Комментарий</th>
                <th style={thStyle}>Автор</th>
                <th style={thStyle}>Статья</th>
                <th style={thStyle}>Дата</th>
                <th style={thStyle}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {comments.map(c => (
                <tr key={c.id}>
                  <td style={{ ...tdStyle, maxWidth: '300px', color: 'var(--text-secondary)' }}>{c.content}</td>
                  <td style={tdStyle}>{c.user_name}</td>
                  <td style={tdStyle}>
                    <a href={`/article/${c.article_slug}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                      {c.article_title}
                    </a>
                  </td>
                  <td style={tdStyle}>{new Date(c.created_at).toLocaleDateString('ru')}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => deleteComment(c.id)}
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: 'none', borderRadius: '4px', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Roles */}
      {tab === 'roles' && <RolesManagement />}

      {/* Backups */}
      {tab === 'backups' && <BackupManagement />}

      {/* Import/Export */}
      {tab === 'import-export' && <ImportExport />}
    </div>
  );
};

export default Admin;
