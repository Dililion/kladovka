import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { pool } from '../config/database';
import { generateApiKey, hashApiKey, getKeyPrefix } from '../middleware/apiAuth';

const router = Router();

interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

/**
 * GET /api/user/api-keys
 * Получить список API ключей пользователя
 */
router.get('/user/api-keys', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT id, name, key_prefix, last_used_at, created_at, expires_at, is_active
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

/**
 * POST /api/user/api-keys
 * Создать новый API ключ
 */
router.post('/user/api-keys', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { name, expiresInDays } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'API key name is required' });
    }

    if (name.length > 100) {
      return res.status(400).json({ error: 'API key name must be less than 100 characters' });
    }

    // Проверяем лимит ключей на пользователя (максимум 10)
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM api_keys WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    if (parseInt(countResult.rows[0].count) >= 10) {
      return res.status(400).json({
        error: 'API key limit reached',
        message: 'You can have maximum 10 active API keys'
      });
    }

    // Генерируем новый ключ
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = getKeyPrefix(apiKey);

    // Вычисляем дату истечения
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Сохраняем в БД
    const result = await pool.query(
      `INSERT INTO api_keys (user_id, name, key_hash, key_prefix, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, key_prefix, created_at, expires_at, is_active`,
      [userId, name.trim(), keyHash, keyPrefix, expiresAt]
    );

    // Возвращаем ключ только один раз (пользователь должен его сохранить)
    res.status(201).json({
      ...result.rows[0],
      api_key: apiKey,
      message: 'Save this API key - it will not be shown again!'
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * DELETE /api/user/api-keys/:id
 * Удалить (деактивировать) API ключ
 */
router.delete('/user/api-keys/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const keyId = parseInt(req.params.id);

    if (isNaN(keyId)) {
      return res.status(400).json({ error: 'Invalid API key ID' });
    }

    // Проверяем что ключ принадлежит пользователю
    const result = await pool.query(
      'UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING id',
      [keyId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

/**
 * GET /api/user/api-keys/:id/usage
 * Статистика использования API ключа
 */
router.get('/user/api-keys/:id/usage', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const keyId = parseInt(req.params.id);

    if (isNaN(keyId)) {
      return res.status(400).json({ error: 'Invalid API key ID' });
    }

    // Проверяем что ключ принадлежит пользователю
    const keyCheck = await pool.query(
      'SELECT id FROM api_keys WHERE id = $1 AND user_id = $2',
      [keyId, userId]
    );

    if (keyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Получаем статистику за последние 30 дней
    const result = await pool.query(
      `SELECT
         DATE(created_at) as date,
         COUNT(*) as requests,
         AVG(response_time_ms) as avg_response_time,
         SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors
       FROM api_usage
       WHERE api_key_id = $1 AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [keyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching API usage:', error);
    res.status(500).json({ error: 'Failed to fetch API usage' });
  }
});

export default router;
