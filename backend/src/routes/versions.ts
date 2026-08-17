import { Router } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Получить все версии статьи
router.get('/:articleId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { articleId } = req.params;

    // Проверить доступ к статье
    const article = await pool.query(
      'SELECT author_id, is_private FROM articles WHERE id = $1',
      [articleId]
    );

    if (article.rows.length === 0) {
      return res.status(404).json({ message: 'Статья не найдена' });
    }

    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
    const isAdmin = userResult.rows[0]?.role === 'admin';
    const isAuthor = article.rows[0].author_id === req.userId;

    if (!isAuthor && !isAdmin) {
      // Проверить права доступа для приватных статей
      if (article.rows[0].is_private) {
        const permission = await pool.query(
          'SELECT id FROM article_permissions WHERE article_id = $1 AND user_id = $2',
          [articleId, req.userId]
        );
        if (permission.rows.length === 0) {
          return res.status(403).json({ message: 'Нет доступа' });
        }
      }
    }

    const versions = await pool.query(
      `
      SELECT
        v.id, v.version_number, v.title, v.created_at,
        u.name as created_by_name
      FROM article_versions v
      LEFT JOIN users u ON v.created_by = u.id
      WHERE v.article_id = $1
      ORDER BY v.version_number DESC
      `,
      [articleId]
    );

    res.json(versions.rows);
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ message: 'Ошибка получения версий' });
  }
});

// Получить конкретную версию
router.get('/:articleId/:versionNumber', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { articleId, versionNumber } = req.params;

    // Проверить доступ
    const article = await pool.query(
      'SELECT author_id, is_private FROM articles WHERE id = $1',
      [articleId]
    );

    if (article.rows.length === 0) {
      return res.status(404).json({ message: 'Статья не найдена' });
    }

    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
    const isAdmin = userResult.rows[0]?.role === 'admin';
    const isAuthor = article.rows[0].author_id === req.userId;

    if (!isAuthor && !isAdmin) {
      if (article.rows[0].is_private) {
        const permission = await pool.query(
          'SELECT id FROM article_permissions WHERE article_id = $1 AND user_id = $2',
          [articleId, req.userId]
        );
        if (permission.rows.length === 0) {
          return res.status(403).json({ message: 'Нет доступа' });
        }
      }
    }

    const version = await pool.query(
      `
      SELECT
        v.*, u.name as created_by_name
      FROM article_versions v
      LEFT JOIN users u ON v.created_by = u.id
      WHERE v.article_id = $1 AND v.version_number = $2
      `,
      [articleId, versionNumber]
    );

    if (version.rows.length === 0) {
      return res.status(404).json({ message: 'Версия не найдена' });
    }

    res.json(version.rows[0]);
  } catch (error) {
    console.error('Get version error:', error);
    res.status(500).json({ message: 'Ошибка получения версии' });
  }
});

// Восстановить версию (создать новую версию из старой)
router.post('/:articleId/:versionNumber/restore', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { articleId, versionNumber } = req.params;

    // Проверить права
    const article = await pool.query('SELECT author_id FROM articles WHERE id = $1', [articleId]);

    if (article.rows.length === 0) {
      return res.status(404).json({ message: 'Статья не найдена' });
    }

    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
    const isAdmin = userResult.rows[0]?.role === 'admin';

    if (article.rows[0].author_id !== req.userId && !isAdmin) {
      return res.status(403).json({ message: 'Нет прав на восстановление' });
    }

    // Получить версию
    const version = await pool.query(
      'SELECT * FROM article_versions WHERE article_id = $1 AND version_number = $2',
      [articleId, versionNumber]
    );

    if (version.rows.length === 0) {
      return res.status(404).json({ message: 'Версия не найдена' });
    }

    const oldVersion = version.rows[0];

    // Сохранить текущую версию перед восстановлением
    const currentArticle = await pool.query('SELECT * FROM articles WHERE id = $1', [articleId]);
    const current = currentArticle.rows[0];

    const versionCount = await pool.query(
      'SELECT COALESCE(MAX(version_number), 0) as max_version FROM article_versions WHERE article_id = $1',
      [articleId]
    );
    const nextVersion = parseInt(versionCount.rows[0].max_version) + 1;

    await pool.query(
      `INSERT INTO article_versions (article_id, title, content, excerpt, version_number, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [articleId, current.title, current.content, current.excerpt, nextVersion, req.userId]
    );

    // Восстановить версию
    await pool.query(
      `UPDATE articles
       SET title = $1, content = $2, excerpt = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [oldVersion.title, oldVersion.content, oldVersion.excerpt, articleId]
    );

    res.json({ message: 'Версия восстановлена' });
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(500).json({ message: 'Ошибка восстановления версии' });
  }
});

export default router;
