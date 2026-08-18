import { Router, Response } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Middleware to check admin role
const requireAdmin = (req: AuthRequest, res: Response, next: any) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  // Check user role from database
  pool.query('SELECT role FROM users WHERE id = $1', [req.userId])
    .then(result => {
      if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
        return res.status(403).json({ error: 'Доступ запрещён' });
      }
      next();
    })
    .catch(err => {
      console.error('Error checking admin role:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
    });
};

// Get general statistics
router.get('/stats', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM articles) as total_articles,
        (SELECT COUNT(*) FROM articles WHERE is_private = false) as public_articles,
        (SELECT COUNT(*) FROM articles WHERE is_private = true) as private_articles,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM comments) as total_comments,
        (SELECT COUNT(*) FROM categories) as total_categories,
        (SELECT COUNT(*) FROM tags) as total_tags
    `);

    const recentActivity = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM articles
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      stats: stats.rows[0],
      recentActivity: recentActivity.rows,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// Get popular tags
router.get('/popular-tags', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await pool.query(`
      SELECT
        t.id,
        t.name,
        COUNT(at.article_id) as article_count
      FROM tags t
      LEFT JOIN article_tags at ON t.id = at.tag_id
      GROUP BY t.id, t.name
      ORDER BY article_count DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching popular tags:', error);
    res.status(500).json({ error: 'Ошибка получения популярных тегов' });
  }
});

// Get user activity
router.get('/user-activity', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.email,
        u.role,
        COUNT(DISTINCT a.id) as articles_count,
        COUNT(DISTINCT c.id) as comments_count,
        MAX(a.created_at) as last_article_date,
        MAX(c.created_at) as last_comment_date
      FROM users u
      LEFT JOIN articles a ON u.id = a.author_id
      LEFT JOIN comments c ON u.id = a.author_id
      GROUP BY u.id, u.username, u.email, u.role
      ORDER BY articles_count DESC, comments_count DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Ошибка получения активности пользователей' });
  }
});

// Get popular articles by view count
router.get('/popular-articles', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await pool.query(`
      SELECT
        a.id,
        a.title,
        a.slug,
        a.views_count,
        a.created_at,
        u.username as author_name,
        c.name as category_name,
        COUNT(DISTINCT co.id) as comments_count
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN comments co ON a.id = co.article_id
      GROUP BY a.id, u.username, c.name
      ORDER BY a.views_count DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching popular articles:', error);
    res.status(500).json({ error: 'Ошибка получения популярных статей' });
  }
});

// Get category distribution
router.get('/category-distribution', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        COUNT(a.id) as article_count
      FROM categories c
      LEFT JOIN articles a ON c.id = a.category_id
      GROUP BY c.id, c.name
      ORDER BY article_count DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching category distribution:', error);
    res.status(500).json({ error: 'Ошибка получения распределения категорий' });
  }
});

export default router;
