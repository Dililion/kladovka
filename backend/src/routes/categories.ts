import { Router } from 'express';
import slugify from 'slugify';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        c.id, c.name, c.slug, c.description, c.created_at,
        COUNT(a.id)::int as articles_count
      FROM categories c
      LEFT JOIN articles a ON c.id = a.category_id AND a.status = 'published'
      GROUP BY c.id
      ORDER BY c.name
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Ошибка получения категорий' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `
      SELECT
        c.id, c.name, c.slug, c.description, c.created_at,
        COUNT(a.id)::int as articles_count
      FROM categories c
      LEFT JOIN articles a ON c.id = a.category_id AND a.status = 'published'
      WHERE c.slug = $1
      GROUP BY c.id
      `,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Категория не найдена' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Ошибка получения категории' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Название обязательно' });
    }

    const slug = slugify(name, { lower: true, strict: true });

    const existing = await pool.query('SELECT id FROM categories WHERE slug = $1', [slug]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Категория с таким названием уже существует' });
    }

    const result = await pool.query(
      'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) RETURNING *',
      [name, slug, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Ошибка создания категории' });
  }
});

export default router;
