import { Router, Request, Response } from 'express';
import { apiAuth } from '../middleware/apiAuth';
import pool from '../config/database';

const router = Router();

interface ApiRequest extends Request {
  userId?: number;
  userRole?: string;
}

/**
 * GET /api/v1/articles
 * Получить список статей с пагинацией
 */
router.get('/articles', apiAuth, async (req: ApiRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const categoryId = req.query.category_id ? parseInt(req.query.category_id as string) : null;

    let query = `
      SELECT
        a.id, a.title, a.slug, a.content, a.category_id,
        a.created_at, a.updated_at, a.views,
        u.name as author_name, u.email as author_email,
        c.name as category_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (categoryId) {
      params.push(categoryId);
      query += ` AND a.category_id = $${params.length}`;
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Получаем общее количество статей
    const countQuery = categoryId
      ? 'SELECT COUNT(*) FROM articles WHERE category_id = $1'
      : 'SELECT COUNT(*) FROM articles';
    const countParams = categoryId ? [categoryId] : [];
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

/**
 * GET /api/v1/articles/:id
 * Получить статью по ID
 */
router.get('/articles/:id', apiAuth, async (req: ApiRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);

    if (isNaN(articleId)) {
      return res.status(400).json({ error: 'Invalid article ID' });
    }

    const result = await pool.query(
      `SELECT
        a.id, a.title, a.slug, a.content, a.category_id,
        a.created_at, a.updated_at, a.views,
        u.id as author_id, u.name as author_name, u.email as author_email,
        c.name as category_name,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', t.id, 'name', t.name)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.id = $1
      GROUP BY a.id, u.id, u.name, u.email, c.name`,
      [articleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Инкрементируем счетчик просмотров (async)
    pool.query('UPDATE articles SET views = views + 1 WHERE id = $1', [articleId])
      .catch(err => console.error('Error updating views:', err));

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

/**
 * POST /api/v1/articles
 * Создать новую статью
 */
router.post('/articles', apiAuth, async (req: ApiRequest, res: Response) => {
  try {
    const { title, content, category_id, tags } = req.body;
    const userId = req.userId;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Генерируем slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);

    // Создаем статью
    const result = await pool.query(
      `INSERT INTO articles (title, slug, content, author_id, category_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, slug, content, category_id, created_at, updated_at`,
      [title, slug, content, userId, category_id || null]
    );

    const article = result.rows[0];

    // Добавляем теги если указаны
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        // Создаем или находим тег
        const tagResult = await pool.query(
          'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
          [tagName.trim()]
        );
        const tagId = tagResult.rows[0].id;

        // Связываем с статьей
        await pool.query(
          'INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [article.id, tagId]
        );
      }
    }

    res.status(201).json(article);
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

/**
 * PUT /api/v1/articles/:id
 * Обновить статью
 */
router.put('/articles/:id', apiAuth, async (req: ApiRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { title, content, category_id } = req.body;
    const userId = req.userId;
    const userRole = req.userRole;

    if (isNaN(articleId)) {
      return res.status(400).json({ error: 'Invalid article ID' });
    }

    // Проверяем права доступа
    const articleCheck = await pool.query(
      'SELECT author_id FROM articles WHERE id = $1',
      [articleId]
    );

    if (articleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Только автор или админ могут редактировать
    if (articleCheck.rows[0].author_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own articles' });
    }

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Обновляем статью
    const result = await pool.query(
      `UPDATE articles
       SET title = $1, content = $2, category_id = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, title, slug, content, category_id, created_at, updated_at`,
      [title, content, category_id || null, articleId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

/**
 * DELETE /api/v1/articles/:id
 * Удалить статью
 */
router.delete('/articles/:id', apiAuth, async (req: ApiRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const userId = req.userId;
    const userRole = req.userRole;

    if (isNaN(articleId)) {
      return res.status(400).json({ error: 'Invalid article ID' });
    }

    // Проверяем права доступа
    const articleCheck = await pool.query(
      'SELECT author_id FROM articles WHERE id = $1',
      [articleId]
    );

    if (articleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Только автор или админ могут удалять
    if (articleCheck.rows[0].author_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own articles' });
    }

    await pool.query('DELETE FROM articles WHERE id = $1', [articleId]);

    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

/**
 * GET /api/v1/categories
 * Получить список категорий
 */
router.get('/categories', apiAuth, async (req: ApiRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
        c.id, c.name, c.description, c.created_at,
        COUNT(a.id) as article_count
      FROM categories c
      LEFT JOIN articles a ON c.id = a.category_id
      GROUP BY c.id
      ORDER BY c.name ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * POST /api/v1/categories
 * Создать категорию (только админ)
 */
router.post('/categories', apiAuth, async (req: ApiRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    const userRole = req.userRole;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin only' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * GET /api/v1/search
 * Поиск по статьям
 */
router.get('/search', apiAuth, async (req: ApiRequest, res: Response) => {
  try {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await pool.query(
      `SELECT
        a.id, a.title, a.slug,
        ts_headline('russian', a.content, plainto_tsquery('russian', $1),
          'MaxWords=50, MinWords=20, MaxFragments=1') as snippet,
        a.created_at, a.updated_at,
        u.name as author_name,
        c.name as category_name,
        ts_rank(a.search_vector, plainto_tsquery('russian', $1)) as rank
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.search_vector @@ plainto_tsquery('russian', $1)
      ORDER BY rank DESC, a.created_at DESC
      LIMIT $2 OFFSET $3`,
      [query, limit, offset]
    );

    // Получаем общее количество результатов
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM articles
       WHERE search_vector @@ plainto_tsquery('russian', $1)`,
      [query]
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      query,
    });
  } catch (error) {
    console.error('Error searching articles:', error);
    res.status(500).json({ error: 'Failed to search articles' });
  }
});

/**
 * GET /api/v1/user/profile
 * Получить профиль текущего пользователя
 */
router.get('/user/profile', apiAuth, async (req: ApiRequest, res: Response) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT id, name, email, role, created_at FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

export default router;
