import { Router } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const adminOnly = async (req: AuthRequest, res: any, next: any) => {
  const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
  if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
    return res.status(403).json({ message: 'Доступ запрещён' });
  }
  next();
};

router.use(authMiddleware, adminOnly);

router.get('/stats', async (req, res) => {
  try {
    const [users, articles, comments, categories] = await Promise.all([
      pool.query('SELECT COUNT(*)::int as count FROM users'),
      pool.query('SELECT COUNT(*)::int as count FROM articles'),
      pool.query('SELECT COUNT(*)::int as count FROM comments'),
      pool.query('SELECT COUNT(*)::int as count FROM categories'),
    ]);

    const topArticles = await pool.query(
      'SELECT id, title, slug, views_count, status FROM articles ORDER BY views_count DESC LIMIT 5'
    );

    res.json({
      users: users.rows[0].count,
      articles: articles.rows[0].count,
      comments: comments.rows[0].count,
      categories: categories.rows[0].count,
      topArticles: topArticles.rows,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Ошибка получения статистики' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.username, u.role, u.created_at, u.is_blocked,
        COUNT(a.id)::int as articles_count
       FROM users u
       LEFT JOIN articles a ON u.id = a.author_id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ message: 'Ошибка получения пользователей' });
  }
});

router.patch('/users/:id/role', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Роль должна быть user или admin' });
    }

    if (parseInt(id) === req.userId) {
      return res.status(400).json({ message: 'Нельзя изменить свою роль' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Admin change role error:', error);
    res.status(500).json({ message: 'Ошибка изменения роли' });
  }
});

router.patch('/users/:id/block', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { is_blocked } = req.body;

    if (typeof is_blocked !== 'boolean') {
      return res.status(400).json({ message: 'is_blocked должен быть boolean' });
    }

    if (parseInt(id) === req.userId) {
      return res.status(400).json({ message: 'Нельзя заблокировать себя' });
    }

    const result = await pool.query(
      'UPDATE users SET is_blocked = $1 WHERE id = $2 RETURNING id, name, email, username, role, is_blocked',
      [is_blocked, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Admin block user error:', error);
    res.status(500).json({ message: 'Ошибка блокировки пользователя' });
  }
});

router.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.userId) {
      return res.status(400).json({ message: 'Нельзя удалить себя' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'Пользователь удалён' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ message: 'Ошибка удаления пользователя' });
  }
});

router.get('/articles', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.title, a.slug, a.status, a.views_count, a.created_at,
        u.name as author_name,
        c.name as category_name
       FROM articles a
       LEFT JOIN users u ON a.author_id = u.id
       LEFT JOIN categories c ON a.category_id = c.id
       ORDER BY a.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Admin get articles error:', error);
    res.status(500).json({ message: 'Ошибка получения статей' });
  }
});

router.patch('/articles/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json({ message: 'Статус должен быть draft или published' });
    }

    const result = await pool.query(
      'UPDATE articles SET status = $1 WHERE id = $2 RETURNING id, title, status',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Статья не найдена' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Admin change status error:', error);
    res.status(500).json({ message: 'Ошибка изменения статуса' });
  }
});

router.delete('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM article_tags WHERE article_id = $1', [id]);
    await pool.query('DELETE FROM comments WHERE article_id = $1', [id]);
    await pool.query('DELETE FROM articles WHERE id = $1', [id]);
    res.json({ message: 'Статья удалена' });
  } catch (error) {
    console.error('Admin delete article error:', error);
    res.status(500).json({ message: 'Ошибка удаления статьи' });
  }
});

router.get('/comments', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.content, c.created_at,
        u.name as user_name,
        a.title as article_title, a.slug as article_slug
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN articles a ON c.article_id = a.id
       ORDER BY c.created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Admin get comments error:', error);
    res.status(500).json({ message: 'Ошибка получения комментариев' });
  }
});

router.delete('/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM comments WHERE id = $1', [id]);
    res.json({ message: 'Комментарий удалён' });
  } catch (error) {
    console.error('Admin delete comment error:', error);
    res.status(500).json({ message: 'Ошибка удаления комментария' });
  }
});

router.get('/folders', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.title, a.slug, a.parent_id, a.created_at,
        u.name as author_name
       FROM articles a
       LEFT JOIN users u ON a.author_id = u.id
       WHERE a.is_folder = true
       ORDER BY a.title ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Admin get folders error:', error);
    res.status(500).json({ message: 'Ошибка получения папок' });
  }
});

router.patch('/folders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: 'Название обязательно' });

    const result = await pool.query(
      'UPDATE articles SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND is_folder = true RETURNING id, title',
      [title, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Папка не найдена' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Admin rename folder error:', error);
    res.status(500).json({ message: 'Ошибка переименования' });
  }
});

router.delete('/folders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Move children to folder's parent before deleting
    const folder = await pool.query('SELECT parent_id FROM articles WHERE id = $1 AND is_folder = true', [id]);
    if (folder.rows.length === 0) return res.status(404).json({ message: 'Папка не найдена' });

    const parentId = folder.rows[0].parent_id;
    await pool.query('UPDATE articles SET parent_id = $1 WHERE parent_id = $2', [parentId, id]);
    await pool.query('DELETE FROM articles WHERE id = $1', [id]);
    res.json({ message: 'Папка удалена' });
  } catch (error) {
    console.error('Admin delete folder error:', error);
    res.status(500).json({ message: 'Ошибка удаления папки' });
  }
});

router.get('/categories', async (req, res) => {
  const result = await pool.query('SELECT id, name, slug, created_at FROM categories ORDER BY name ASC');
  res.json(result.rows);
});

router.post('/categories', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Название обязательно' });
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/gi, '');
  const result = await pool.query(
    'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id, name, slug, created_at',
    [name, slug]
  );
  res.status(201).json(result.rows[0]);
});

router.patch('/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Название обязательно' });
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/gi, '');
  const result = await pool.query(
    'UPDATE categories SET name = $1, slug = $2 WHERE id = $3 RETURNING id, name, slug, created_at',
    [name, slug, id]
  );
  if (result.rows.length === 0) return res.status(404).json({ message: 'Категория не найдена' });
  res.json(result.rows[0]);
});

router.delete('/categories/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('UPDATE articles SET category_id = NULL WHERE category_id = $1', [id]);
  await pool.query('DELETE FROM categories WHERE id = $1', [id]);
  res.json({ message: 'Категория удалена' });
});

export default router;
