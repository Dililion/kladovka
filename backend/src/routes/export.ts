import { Router, Response } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Export article as Markdown
router.get('/:id/markdown', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const userId = req.userId;

    const result = await pool.query(
      `SELECT a.id, a.title, a.content, a.excerpt, a.created_at, a.updated_at,
              u.username as author_name,
              c.name as category_name,
              ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags
       FROM articles a
       LEFT JOIN users u ON a.author_id = u.id
       LEFT JOIN categories c ON a.category_id = c.id
       LEFT JOIN article_tags at ON a.id = at.article_id
       LEFT JOIN tags t ON at.tag_id = t.id
       WHERE a.id = $1
         AND (a.is_private = false
              OR a.author_id = $2
              OR EXISTS (SELECT 1 FROM users WHERE id = $2 AND role = 'admin')
              OR EXISTS (SELECT 1 FROM article_permissions WHERE article_id = a.id AND user_id = $2))
       GROUP BY a.id, u.username, c.name`,
      [articleId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Статья не найдена' });
    }

    const article = result.rows[0];

    // Build markdown content
    let markdown = `# ${article.title}\n\n`;

    if (article.excerpt) {
      markdown += `> ${article.excerpt}\n\n`;
    }

    markdown += `**Автор:** ${article.author_name}\n`;
    markdown += `**Категория:** ${article.category_name || 'Без категории'}\n`;
    if (article.tags && article.tags.length > 0) {
      markdown += `**Теги:** ${article.tags.join(', ')}\n`;
    }
    markdown += `**Создано:** ${new Date(article.created_at).toLocaleString('ru')}\n`;
    markdown += `**Обновлено:** ${new Date(article.updated_at).toLocaleString('ru')}\n\n`;
    markdown += `---\n\n`;
    markdown += article.content;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="article-${articleId}.md"`);
    res.send(markdown);
  } catch (error) {
    console.error('Error exporting markdown:', error);
    res.status(500).json({ error: 'Ошибка при экспорте статьи' });
  }
});

// Export article as HTML (will be used for PDF generation on frontend)
router.get('/:id/html', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const userId = req.userId;

    const result = await pool.query(
      `SELECT a.id, a.title, a.content, a.excerpt, a.created_at, a.updated_at,
              u.username as author_name,
              c.name as category_name,
              ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags
       FROM articles a
       LEFT JOIN users u ON a.author_id = u.id
       LEFT JOIN categories c ON a.category_id = c.id
       LEFT JOIN article_tags at ON a.id = at.article_id
       LEFT JOIN tags t ON at.tag_id = t.id
       WHERE a.id = $1
         AND (a.is_private = false
              OR a.author_id = $2
              OR EXISTS (SELECT 1 FROM users WHERE id = $2 AND role = 'admin')
              OR EXISTS (SELECT 1 FROM article_permissions WHERE article_id = a.id AND user_id = $2))
       GROUP BY a.id, u.username, c.name`,
      [articleId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Статья не найдена' });
    }

    const article = result.rows[0];

    res.json({
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      author: article.author_name,
      category: article.category_name || 'Без категории',
      tags: article.tags || [],
      created_at: article.created_at,
      updated_at: article.updated_at,
    });
  } catch (error) {
    console.error('Error exporting html:', error);
    res.status(500).json({ error: 'Ошибка при экспорте статьи' });
  }
});

export default router;
