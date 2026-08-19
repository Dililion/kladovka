import { Router } from 'express';
import slugify from 'slugify';
import { pool } from '../config/database.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { notificationService } from '../services/notifications.js';

const router = Router();

router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const categoryId = req.query.categoryId as string;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        a.id, a.title, a.slug, a.excerpt, a.content, a.status, a.views_count,
        a.created_at, a.updated_at, a.parent_id, a.is_private, a.author_id,
        u.name as author_name,
        c.name as category_name,
        COALESCE(
          json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
          '[]'
        ) as tags
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (!req.userId) {
      conditions.push("a.status = 'published' AND a.is_private = false");
    } else {
      const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
      const isAdmin = userResult.rows[0]?.role === 'admin';

      if (!isAdmin) {
        params.push(req.userId);
        conditions.push(`(a.is_private = false OR a.author_id = $${params.length})`);
      }
    }

    if (categoryId) {
      params.push(categoryId);
      conditions.push(`a.category_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY a.id, u.name, c.name
      ORDER BY a.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) FROM articles a';
    const countParams: any[] = [];

    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
      if (categoryId) countParams.push(categoryId);
    }

    const countResult = await pool.query(countQuery, countParams);
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
    console.error('Get articles error:', error);
    res.status(500).json({ message: 'Ошибка получения статей' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Фильтры
    const authorId = req.query.authorId as string;
    const categoryIds = req.query.categoryIds as string; // comma-separated
    const tags = req.query.tags as string; // comma-separated
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const sortBy = (req.query.sortBy as string) || 'date'; // date, popularity, title
    const sortOrder = (req.query.sortOrder as string) || 'desc'; // asc, desc

    const params: any[] = [];
    const conditions: string[] = ["a.status = 'published'"];

    // Текстовый поиск (используем полнотекстовый поиск PostgreSQL)
    if (query) {
      // Используем to_tsquery для поиска по русскому языку
      params.push(query);
      conditions.push(`(
        search_vector @@ plainto_tsquery('russian', $${params.length})
      )`);
    }

    // Фильтр по автору
    if (authorId) {
      params.push(authorId);
      conditions.push(`a.author_id = $${params.length}`);
    }

    // Фильтр по категориям (множественный)
    if (categoryIds) {
      const catIds = categoryIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (catIds.length > 0) {
        params.push(catIds);
        conditions.push(`a.category_id = ANY($${params.length})`);
      }
    }

    // Фильтр по тегам (множественный - статьи содержащие хотя бы один из тегов)
    if (tags) {
      const tagNames = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      if (tagNames.length > 0) {
        params.push(tagNames);
        conditions.push(`EXISTS (
          SELECT 1 FROM article_tags at2
          JOIN tags t2 ON at2.tag_id = t2.id
          WHERE at2.article_id = a.id AND t2.name = ANY($${params.length})
        )`);
      }
    }

    // Фильтр по дате создания (от)
    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`a.created_at >= $${params.length}`);
    }

    // Фильтр по дате создания (до)
    if (dateTo) {
      params.push(dateTo);
      conditions.push(`a.created_at <= $${params.length}`);
    }

    // Сортировка
    let orderBy = 'a.created_at DESC';
    if (query) {
      // Если есть поисковый запрос, сортируем по релевантности
      orderBy = `ts_rank(search_vector, plainto_tsquery('russian', $1)) DESC, a.created_at DESC`;
    } else if (sortBy === 'popularity') {
      orderBy = `a.views_count ${sortOrder.toUpperCase()}, a.created_at DESC`;
    } else if (sortBy === 'title') {
      orderBy = `a.title ${sortOrder.toUpperCase()}`;
    } else {
      orderBy = `a.created_at ${sortOrder.toUpperCase()}`;
    }

    const searchQuery = `
      SELECT
        a.id, a.title, a.slug, a.excerpt, a.views_count,
        a.created_at, a.updated_at, a.author_id,
        u.name as author_name,
        c.name as category_name,
        COALESCE(
          json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
          '[]'
        ) as tags
        ${query ? `, ts_rank(search_vector, plainto_tsquery('russian', $1)) as rank,
        ts_headline('russian', a.content, plainto_tsquery('russian', $1), 'MaxWords=30, MinWords=15, ShortWord=3, MaxFragments=2') as highlight` : ''}
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY a.id, u.name, c.name${query ? ', a.search_vector' : ''}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const result = await pool.query(searchQuery, params);

    // Подсчёт общего количества
    const countParams = params.slice(0, -2); // убираем limit и offset
    const countQuery = `
      SELECT COUNT(DISTINCT a.id)
      FROM articles a
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE ${conditions.join(' AND ')}
    `;

    const countResult = await pool.query(countQuery, countParams);
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
    console.error('Search error:', error);
    res.status(500).json({ message: 'Ошибка поиска' });
  }
});

router.get('/:slug', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `
      SELECT
        a.id, a.title, a.slug, a.excerpt, a.content, a.status, a.views_count,
        a.created_at, a.updated_at, a.parent_id, a.is_private,
        u.name as author_name, u.id as author_id,
        c.name as category_name, c.id as category_id,
        COALESCE(
          json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
          '[]'
        ) as tags
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.slug = $1
      GROUP BY a.id, u.name, u.id, c.name, c.id
      `,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Статья не найдена' });
    }

    const article = result.rows[0];

    if (article.is_private) {
      if (!req.userId) {
        return res.status(403).json({ message: 'Доступ запрещён' });
      }

      const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
      const isAdmin = userResult.rows[0]?.role === 'admin';

      if (!isAdmin && article.author_id !== req.userId) {
        const perm = await pool.query(
          'SELECT id FROM article_permissions WHERE article_id = $1 AND user_id = $2',
          [article.id, req.userId]
        );
        if (perm.rows.length === 0) {
          return res.status(403).json({ message: 'Доступ запрещён' });
        }
      }
    }

    await pool.query('UPDATE articles SET views_count = views_count + 1 WHERE id = $1', [
      article.id,
    ]);

    res.json(article);
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ message: 'Ошибка получения статьи' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, content, excerpt, categoryId, tags, status, parentId, isPrivate } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Заголовок и содержание обязательны' });
    }

    const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now();

    const result = await pool.query(
      `INSERT INTO articles (title, slug, content, excerpt, author_id, category_id, status, parent_id, is_private, is_folder)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
       RETURNING *`,
      [title, slug, content, excerpt || null, req.userId, categoryId || null, status || 'draft', parentId || null, isPrivate || false]
    );

    const article = result.rows[0];

    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        let tagResult = await pool.query('SELECT id FROM tags WHERE name = $1', [tagName]);

        let tagId;
        if (tagResult.rows.length === 0) {
          const newTag = await pool.query(
            'INSERT INTO tags (name, slug) VALUES ($1, $2) RETURNING id',
            [tagName, slugify(tagName, { lower: true, strict: true })]
          );
          tagId = newTag.rows[0].id;
        } else {
          tagId = tagResult.rows[0].id;
        }

        await pool.query('INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2)', [
          article.id,
          tagId,
        ]);
      }
    }

    const fullArticle = await pool.query(
      `
      SELECT
        a.*,
        u.name as author_name,
        c.name as category_name,
        COALESCE(
          json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
          '[]'
        ) as tags
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.id = $1
      GROUP BY a.id, u.name, c.name
      `,
      [article.id]
    );

    // Log audit
    const user = await pool.query('SELECT name FROM users WHERE id = $1', [req.userId]);
    await logAudit(
      req.userId?.toString(),
      user.rows[0]?.name,
      'create_article',
      'article',
      article.id.toString(),
      { title, status: status || 'draft' },
      req
    );

    res.status(201).json(fullArticle.rows[0]);
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ message: 'Ошибка создания статьи' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, categoryId, tags, status, parentId, isPrivate } = req.body;

    const article = await pool.query('SELECT * FROM articles WHERE id = $1', [id]);

    if (article.rows.length === 0) {
      return res.status(404).json({ message: 'Статья не найдена' });
    }

    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
    const isAdmin = userResult.rows[0]?.role === 'admin';

    if (article.rows[0].author_id !== req.userId && !isAdmin) {
      return res.status(403).json({ message: 'Нет прав на редактирование' });
    }

    // Сохранить текущую версию перед обновлением
    const currentArticle = article.rows[0];
    const versionCount = await pool.query(
      'SELECT COALESCE(MAX(version_number), 0) as max_version FROM article_versions WHERE article_id = $1',
      [id]
    );
    const nextVersion = parseInt(versionCount.rows[0].max_version) + 1;

    await pool.query(
      `INSERT INTO article_versions (article_id, title, content, excerpt, version_number, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, currentArticle.title, currentArticle.content, currentArticle.excerpt, nextVersion, req.userId]
    );

    await pool.query(
      `UPDATE articles
       SET title = $1, content = $2, excerpt = $3, category_id = $4, status = $5, parent_id = $6, is_private = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [title, content, excerpt || null, categoryId || null, status || 'draft', parentId || null, isPrivate || false, id]
    );

    await pool.query('DELETE FROM article_tags WHERE article_id = $1', [id]);

    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        let tagResult = await pool.query('SELECT id FROM tags WHERE name = $1', [tagName]);

        let tagId;
        if (tagResult.rows.length === 0) {
          const newTag = await pool.query(
            'INSERT INTO tags (name, slug) VALUES ($1, $2) RETURNING id',
            [tagName, slugify(tagName, { lower: true, strict: true })]
          );
          tagId = newTag.rows[0].id;
        } else {
          tagId = tagResult.rows[0].id;
        }

        await pool.query('INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2)', [
          id,
          tagId,
        ]);
      }
    }

    const updated = await pool.query(
      `
      SELECT
        a.*,
        u.name as author_name,
        c.name as category_name,
        COALESCE(
          json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
          '[]'
        ) as tags
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.id = $1
      GROUP BY a.id, u.name, c.name
      `,
      [id]
    );

    // Log audit
    const user = await pool.query('SELECT name FROM users WHERE id = $1', [req.userId]);
    await logAudit(
      req.userId?.toString(),
      user.rows[0]?.name,
      'update_article',
      'article',
      id,
      { title, status: status || 'draft' },
      req
    );

    // Notify subscribers about update
    if (status === 'published') {
      await notificationService.notifyArticleUpdate(id, title, req.userId!.toString());
    }

    res.json(updated.rows[0]);
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ message: 'Ошибка обновления статьи' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const article = await pool.query('SELECT author_id, title FROM articles WHERE id = $1', [id]);

    if (article.rows.length === 0) {
      return res.status(404).json({ message: 'Статья не найдена' });
    }

    const userResult2 = await pool.query('SELECT role, name FROM users WHERE id = $1', [req.userId]);
    const isAdmin2 = userResult2.rows[0]?.role === 'admin';

    if (article.rows[0].author_id !== req.userId && !isAdmin2) {
      return res.status(403).json({ message: 'Нет прав на удаление' });
    }

    await pool.query('DELETE FROM article_tags WHERE article_id = $1', [id]);
    await pool.query('DELETE FROM articles WHERE id = $1', [id]);

    // Log audit
    await logAudit(
      req.userId?.toString(),
      userResult2.rows[0]?.name,
      'delete_article',
      'article',
      id,
      { title: article.rows[0].title },
      req
    );

    res.json({ message: 'Статья удалена' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ message: 'Ошибка удаления статьи' });
  }
});

// Create folder
router.post('/folder', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, parentId } = req.body;
    if (!title) return res.status(400).json({ message: 'Название обязательно' });

    const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now();

    const result = await pool.query(
      `INSERT INTO articles (title, slug, content, author_id, status, parent_id, is_folder, is_private)
       VALUES ($1, $2, '', $3, 'published', $4, true, false)
       RETURNING id, title, slug, parent_id, is_folder, is_private, author_id, created_at, updated_at`,
      [title, slug, req.userId, parentId || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ message: 'Ошибка создания папки' });
  }
});

// Move article/folder to new parent
router.patch('/:id/move', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { parentId } = req.body;

    const article = await pool.query('SELECT author_id FROM articles WHERE id = $1', [id]);
    if (article.rows.length === 0) return res.status(404).json({ message: 'Не найдено' });

    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
    const isAdmin = userResult.rows[0]?.role === 'admin';

    if (article.rows[0].author_id !== req.userId && !isAdmin) {
      return res.status(403).json({ message: 'Нет прав' });
    }

    await pool.query(
      'UPDATE articles SET parent_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [parentId || null, id]
    );

    res.json({ message: 'Перемещено' });
  } catch (error) {
    console.error('Move error:', error);
    res.status(500).json({ message: 'Ошибка перемещения' });
  }
});

// Get permissions for an article
router.get('/:id/permissions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const article = await pool.query('SELECT author_id FROM articles WHERE id = $1', [id]);
    if (article.rows.length === 0) return res.status(404).json({ message: 'Не найдено' });

    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
    const isAdmin = userResult.rows[0]?.role === 'admin';

    if (article.rows[0].author_id !== req.userId && !isAdmin) {
      return res.status(403).json({ message: 'Нет прав' });
    }

    const perms = await pool.query(
      `SELECT ap.user_id, u.name, u.email
       FROM article_permissions ap
       JOIN users u ON ap.user_id = u.id
       WHERE ap.article_id = $1`,
      [id]
    );

    res.json(perms.rows);
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ message: 'Ошибка получения прав' });
  }
});

// Grant access to a user
router.post('/:id/permissions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const article = await pool.query('SELECT author_id FROM articles WHERE id = $1', [id]);
    if (article.rows.length === 0) return res.status(404).json({ message: 'Не найдено' });

    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
    const isAdmin = userResult.rows[0]?.role === 'admin';

    if (article.rows[0].author_id !== req.userId && !isAdmin) {
      return res.status(403).json({ message: 'Нет прав' });
    }

    const targetUser = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    if (targetUser.rows.length === 0) return res.status(404).json({ message: 'Пользователь не найден' });

    await pool.query(
      'INSERT INTO article_permissions (article_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, targetUser.rows[0].id]
    );

    res.json(targetUser.rows[0]);
  } catch (error) {
    console.error('Grant permission error:', error);
    res.status(500).json({ message: 'Ошибка добавления прав' });
  }
});

// Revoke access
router.delete('/:id/permissions/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id, userId } = req.params;

    const article = await pool.query('SELECT author_id FROM articles WHERE id = $1', [id]);
    if (article.rows.length === 0) return res.status(404).json({ message: 'Не найдено' });

    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
    const isAdmin = userResult.rows[0]?.role === 'admin';

    if (article.rows[0].author_id !== req.userId && !isAdmin) {
      return res.status(403).json({ message: 'Нет прав' });
    }

    await pool.query(
      'DELETE FROM article_permissions WHERE article_id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ message: 'Доступ отозван' });
  } catch (error) {
    console.error('Revoke permission error:', error);
    res.status(500).json({ message: 'Ошибка отзыва прав' });
  }
});

// Получить список авторов для фильтра
router.get('/filters/authors', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT u.id, u.name
      FROM users u
      INNER JOIN articles a ON u.id = a.author_id
      WHERE a.status = 'published'
      ORDER BY u.name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get authors error:', error);
    res.status(500).json({ message: 'Ошибка получения авторов' });
  }
});

export default router;
