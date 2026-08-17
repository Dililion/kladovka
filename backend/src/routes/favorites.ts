import { Router } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Получить избранные статьи пользователя
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `
      SELECT
        a.id, a.title, a.slug, a.excerpt, a.views_count,
        a.created_at, a.updated_at,
        u.name as author_name,
        c.name as category_name,
        f.created_at as favorited_at,
        COALESCE(
          json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
          '[]'
        ) as tags
      FROM favorites f
      INNER JOIN articles a ON f.article_id = a.id
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE f.user_id = $1 AND a.status = 'published'
      GROUP BY a.id, u.name, c.name, f.created_at
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `,
      [req.userId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM favorites f INNER JOIN articles a ON f.article_id = a.id WHERE f.user_id = $1 AND a.status = \'published\'',
      [req.userId]
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      articles: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Ошибка получения избранного' });
  }
});

// Проверить, находится ли статья в избранном
router.get('/:articleId/check', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { articleId } = req.params;

    const result = await pool.query(
      'SELECT id FROM favorites WHERE user_id = $1 AND article_id = $2',
      [req.userId, articleId]
    );

    res.json({ isFavorite: result.rows.length > 0 });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ message: 'Ошибка проверки избранного' });
  }
});

// Добавить статью в избранное
router.post('/:articleId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { articleId } = req.params;

    // Проверить что статья существует
    const article = await pool.query('SELECT id FROM articles WHERE id = $1', [articleId]);
    if (article.rows.length === 0) {
      return res.status(404).json({ message: 'Статья не найдена' });
    }

    // Добавить в избранное (ON CONFLICT для избежания дубликатов)
    await pool.query(
      'INSERT INTO favorites (user_id, article_id) VALUES ($1, $2) ON CONFLICT (user_id, article_id) DO NOTHING',
      [req.userId, articleId]
    );

    res.json({ message: 'Добавлено в избранное' });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ message: 'Ошибка добавления в избранное' });
  }
});

// Удалить статью из избранного
router.delete('/:articleId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { articleId } = req.params;

    await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND article_id = $2',
      [req.userId, articleId]
    );

    res.json({ message: 'Удалено из избранного' });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ message: 'Ошибка удаления из избранного' });
  }
});

export default router;
