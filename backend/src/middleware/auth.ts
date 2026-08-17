import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database.js';

export interface AuthRequest extends Request {
  userId?: number;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET не установлен');
      return res.status(500).json({ message: 'Ошибка конфигурации сервера' });
    }

    const decoded = jwt.verify(token, secret) as { userId: number };

    // Проверить, не заблокирован ли пользователь
    const userResult = await pool.query('SELECT is_blocked FROM users WHERE id = $1', [decoded.userId]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    if (userResult.rows[0].is_blocked) {
      return res.status(403).json({ message: 'Ваш аккаунт заблокирован' });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Недействительный токен' });
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const decoded = jwt.verify(token, secret) as { userId: number };

        // Проверить блокировку для опциональной аутентификации
        const userResult = await pool.query('SELECT is_blocked FROM users WHERE id = $1', [decoded.userId]);

        if (userResult.rows.length > 0 && !userResult.rows[0].is_blocked) {
          req.userId = decoded.userId;
        }
      }
    }
    next();
  } catch (error) {
    next();
  }
};
