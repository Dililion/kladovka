import { Router } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;

    const result = await pool.query(
      `
      SELECT
        c.id, c.content, c.created_at,
        u.name as user_name
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.article_id = $1
      ORDER BY c.created_at ASC
`,
      [articleId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Ошибка получения комментариев' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { articleId, content } = req.body;

    if (!articleId || !content) {
      return res.status(400).json({ message: 'articleId и content обязательны' });
    }

    const article = await pool.query('SELECT id FROM articles WHERE id = $1', [articleId]);

    if (article.rows.length === 0) {
      return res.status(404).json({ message: 'Статья не найдена' });
    }

    const result = await pool.query(
      `INSERT INTO comments (article_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [articleId, req.userId, content]
    );

    const comment = await pool.query(
      `
      SELECT
        c.id, c.content, c.created_at,
        u.name as user_name
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
`,
      [result.rows[0].id]
    );

    res.status(201).json(comment.rows[0]);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Ошибка создания комментария' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const comment = await pool.query('SELECT user_id FROM comments WHERE id = $1', [id]);

    if (comment.rows.length === 0) {
      return res.status(404).json({ message: 'Комментарий не найден' });
    }

    if (comment.rows[0].user_id !== req.userId) {
      return res.status(403).json({ message: 'Нет прав на удаление' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [id]);

    res.json({ message: 'Комментарий удалён' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Ошибка удаления комментария' });
  }
});

export default router;
