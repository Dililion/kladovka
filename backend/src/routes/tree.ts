import { Router } from 'express';
import { pool } from '../config/database.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    let query = `
      SELECT
        a.id, a.title, a.slug, a.parent_id, a.is_private, a.author_id, a.is_folder,
        a.created_at, a.updated_at
      FROM articles a
      WHERE (a.status = 'published' OR a.is_folder = true)
    `;

    if (!req.userId) {
      query += " AND a.is_private = false";
    } else {
      const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
      const isAdmin = userResult.rows[0]?.role === 'admin';

      if (!isAdmin) {
        const permCheck = `(
          a.is_private = false
          OR a.author_id = ${req.userId}
          OR EXISTS (SELECT 1 FROM article_permissions ap WHERE ap.article_id = a.id AND ap.user_id = ${req.userId})
        )`;
        query += ` AND ${permCheck}`;
      }
    }

    query += ' ORDER BY a.is_folder DESC, a.title ASC';

    const result = await pool.query(query);

    const buildTree = (items: any[], parentId: number | null = null): any[] => {
      return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id),
        }));
    };

    res.json(buildTree(result.rows));
  } catch (error) {
    console.error('Get tree error:', error);
    res.status(500).json({ message: 'Ошибка получения дерева' });
  }
});

export default router;
