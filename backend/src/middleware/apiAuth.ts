import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import pool from '../config/database';

interface ApiKeyRequest extends Request {
  apiKey?: {
    id: number;
    userId: number;
    name: string;
  };
}

/**
 * Middleware для проверки API ключа
 * Поддерживает два формата:
 * 1. Header: Authorization: Bearer kb_xxxxxxxxxxxxx
 * 2. Query parameter: ?api_key=kb_xxxxxxxxxxxxx
 */
export const apiAuth = async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
  try {
    // Получаем ключ из заголовка или query параметра
    let apiKey = req.headers.authorization?.replace('Bearer ', '');
    if (!apiKey) {
      apiKey = req.query.api_key as string;
    }

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'Provide API key in Authorization header or api_key query parameter'
      });
    }

    // Проверяем формат ключа (должен начинаться с kb_)
    if (!apiKey.startsWith('kb_')) {
      return res.status(401).json({
        error: 'Invalid API key format',
        message: 'API key must start with "kb_"'
      });
    }

    // Хешируем ключ для поиска в БД
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Ищем ключ в базе данных
    const result = await pool.query(
      `SELECT ak.id, ak.user_id, ak.name, ak.is_active, ak.expires_at, u.email, u.role
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.key_hash = $1`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'API key not found'
      });
    }

    const keyData = result.rows[0];

    // Проверяем что ключ активен
    if (!keyData.is_active) {
      return res.status(401).json({
        error: 'API key disabled',
        message: 'This API key has been disabled'
      });
    }

    // Проверяем срок действия
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return res.status(401).json({
        error: 'API key expired',
        message: 'This API key has expired'
      });
    }

    // Обновляем время последнего использования (async, не ждем)
    pool.query(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [keyData.id]
    ).catch(err => console.error('Error updating last_used_at:', err));

    // Логируем использование API (async, не ждем)
    logApiUsage(keyData.id, req).catch(err => console.error('Error logging API usage:', err));

    // Добавляем информацию о ключе и пользователе в request
    req.apiKey = {
      id: keyData.id,
      userId: keyData.user_id,
      name: keyData.name,
    };

    // Добавляем информацию о пользователе в стандартный формат (совместимость с JWT auth)
    (req as any).userId = keyData.user_id;
    (req as any).userRole = keyData.role;
    (req as any).user = {
      id: keyData.user_id,
      email: keyData.email,
      role: keyData.role,
    };

    next();
  } catch (error) {
    console.error('API auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Логирование использования API
 */
async function logApiUsage(apiKeyId: number, req: Request) {
  try {
    const startTime = Date.now();
    const endpoint = req.path;
    const method = req.method;

    // После завершения запроса логируем
    req.on('finish', async () => {
      const responseTime = Date.now() - startTime;
      const statusCode = (req.res as any)?.statusCode || 0;

      await pool.query(
        `INSERT INTO api_usage (api_key_id, endpoint, method, status_code, response_time_ms)
         VALUES ($1, $2, $3, $4, $5)`,
        [apiKeyId, endpoint, method, statusCode, responseTime]
      );
    });
  } catch (error) {
    console.error('Error logging API usage:', error);
  }
}

/**
 * Генерация нового API ключа
 * Формат: kb_[32 случайных символа]
 */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(24);
  const key = `kb_${randomBytes.toString('base64').replace(/[+/=]/g, '').substring(0, 32)}`;
  return key;
}

/**
 * Хеширование API ключа для хранения в БД
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Получение префикса ключа (первые 12 символов для идентификации)
 */
export function getKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12);
}
