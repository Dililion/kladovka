import { Router } from 'express';
import { pool } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        t.id, t.name, t.slug,
        COUNT(at.article_id)::int as articles_count
      FROM tags t
      LEFT JOIN article_tags at ON t.id = at.tag_id
      LEFT JOIN articles a ON at.article_id = a.id AND a.status = 'published'
      GROUP BY t.id
      HAVING COUNT(at.article_id) > 0
      ORDER BY articles_count DESC, t.name
      LIMIT 50
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ message: 'Ошибка получения тегов' });
  }
});

export default router;
