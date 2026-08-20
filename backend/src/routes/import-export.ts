import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import { pool } from '../config/database.js';

const router = Router();

interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

/**
 * GET /api/export/articles
 * Экспорт всех статей в JSON
 */
router.get('/articles', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        a.id, a.title, a.slug, a.content, a.category_id,
        a.created_at, a.updated_at, a.views,
        c.name as category_name,
        u.name as author_name, u.email as author_email,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      GROUP BY a.id, c.name, u.name, u.email
      ORDER BY a.created_at DESC
    `);

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: req.userId,
      type: 'articles',
      count: result.rows.length,
      data: result.rows
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="kladovka-articles-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export articles error:', error);
    res.status(500).json({ error: 'Failed to export articles' });
  }
});

/**
 * GET /api/export/categories
 * Экспорт всех категорий в JSON
 */
router.get('/categories', authMiddleware, checkPermission('categories', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, created_at
      FROM categories
      ORDER BY name
    `);

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: req.userId,
      type: 'categories',
      count: result.rows.length,
      data: result.rows
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="kladovka-categories-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export categories error:', error);
    res.status(500).json({ error: 'Failed to export categories' });
  }
});

/**
 * GET /api/export/full
 * Полный экспорт всех данных (только для админов)
 */
router.get('/full', authMiddleware, checkPermission('settings', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    // Статьи
    const articlesResult = await pool.query(`
      SELECT
        a.id, a.title, a.slug, a.content, a.category_id,
        a.created_at, a.updated_at, a.views, a.author_id,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM articles a
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);

    // Категории
    const categoriesResult = await pool.query(`
      SELECT id, name, description, created_at
      FROM categories
      ORDER BY name
    `);

    // Теги
    const tagsResult = await pool.query(`
      SELECT id, name, created_at
      FROM tags
      ORDER BY name
    `);

    // Пользователи (без паролей и чувствительных данных)
    const usersResult = await pool.query(`
      SELECT id, name, email, role, created_at
      FROM users
      ORDER BY created_at
    `);

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: req.userId,
      type: 'full',
      data: {
        articles: articlesResult.rows,
        categories: categoriesResult.rows,
        tags: tagsResult.rows,
        users: usersResult.rows
      },
      stats: {
        articles_count: articlesResult.rows.length,
        categories_count: categoriesResult.rows.length,
        tags_count: tagsResult.rows.length,
        users_count: usersResult.rows.length
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="kladovka-full-backup-${Date.now()}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Full export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * POST /api/import/articles
 * Импорт статей из JSON
 */
router.post('/articles', authMiddleware, checkPermission('articles', 'create'), async (req: AuthRequest, res: Response) => {
  try {
    const { data, mode } = req.body; // mode: 'append' или 'replace'

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid import data format' });
    }

    const userId = req.userId;
    let imported = 0;
    let skipped = 0;
    let errors: string[] = [];

    // Если режим replace - удаляем все статьи (только для админов)
    if (mode === 'replace' && req.userRole === 'admin') {
      await pool.query('DELETE FROM articles');
    }

    for (const article of data) {
      try {
        // Проверяем существует ли категория
        let categoryId = article.category_id;
        if (article.category_name) {
          const catResult = await pool.query(
            'SELECT id FROM categories WHERE name = $1',
            [article.category_name]
          );
          if (catResult.rows.length > 0) {
            categoryId = catResult.rows[0].id;
          } else {
            // Создаем категорию если её нет
            const newCat = await pool.query(
              'INSERT INTO categories (name) VALUES ($1) RETURNING id',
              [article.category_name]
            );
            categoryId = newCat.rows[0].id;
          }
        }

        // Вставляем статью
        const result = await pool.query(
          `INSERT INTO articles (title, slug, content, category_id, author_id, created_at)
           VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_TIMESTAMP))
           ON CONFLICT (slug) DO UPDATE
           SET title = EXCLUDED.title,
               content = EXCLUDED.content,
               category_id = EXCLUDED.category_id
           RETURNING id`,
          [
            article.title,
            article.slug,
            article.content,
            categoryId,
            userId,
            article.created_at
          ]
        );

        const articleId = result.rows[0].id;

        // Импортируем теги
        if (article.tags && Array.isArray(article.tags)) {
          for (const tag of article.tags) {
            // Находим или создаем тег
            let tagId;
            const tagResult = await pool.query(
              'SELECT id FROM tags WHERE name = $1',
              [tag.name]
            );
            if (tagResult.rows.length > 0) {
              tagId = tagResult.rows[0].id;
            } else {
              const newTag = await pool.query(
                'INSERT INTO tags (name) VALUES ($1) RETURNING id',
                [tag.name]
              );
              tagId = newTag.rows[0].id;
            }

            // Связываем статью с тегом
            await pool.query(
              'INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [articleId, tagId]
            );
          }
        }

        imported++;
      } catch (err: any) {
        console.error('Import article error:', err);
        errors.push(`${article.title}: ${err.message}`);
        skipped++;
      }
    }

    res.json({
      message: 'Import completed',
      imported,
      skipped,
      total: data.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Import articles error:', error);
    res.status(500).json({ error: 'Failed to import articles' });
  }
});

/**
 * POST /api/import/categories
 * Импорт категорий из JSON
 */
router.post('/categories', authMiddleware, checkPermission('categories', 'create'), async (req: AuthRequest, res: Response) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid import data format' });
    }

    let imported = 0;
    let skipped = 0;

    for (const category of data) {
      try {
        await pool.query(
          `INSERT INTO categories (name, description, created_at)
           VALUES ($1, $2, COALESCE($3, CURRENT_TIMESTAMP))
           ON CONFLICT (name) DO UPDATE
           SET description = EXCLUDED.description`,
          [category.name, category.description, category.created_at]
        );
        imported++;
      } catch (err) {
        console.error('Import category error:', err);
        skipped++;
      }
    }

    res.json({
      message: 'Categories imported',
      imported,
      skipped,
      total: data.length
    });
  } catch (error) {
    console.error('Import categories error:', error);
    res.status(500).json({ error: 'Failed to import categories' });
  }
});

export default router;
