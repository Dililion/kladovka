import { Router, Request, Response } from 'express';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = Router();

interface AuthRequest extends Request {
  userId?: number;
}

/**
 * GET /api/2fa/setup
 * Начать настройку 2FA - сгенерировать секрет и QR код
 */
router.get('/setup', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    // Получаем информацию о пользователе
    const userResult = await pool.query(
      'SELECT email, two_factor_enabled FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.two_factor_enabled) {
      return res.status(400).json({
        error: '2FA already enabled',
        message: 'Two-factor authentication is already enabled for this account'
      });
    }

    // Генерируем секрет для TOTP
    const secret = authenticator.generateSecret();

    // Создаем otpauth URL для QR кода
    const appName = 'Kladovka';
    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);

    // Генерируем QR код
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Временно сохраняем секрет (он будет активирован после верификации)
    await pool.query(
      'UPDATE users SET two_factor_secret = $1 WHERE id = $2',
      [secret, userId]
    );

    res.json({
      secret,
      qrCode: qrCodeDataUrl,
      otpauthUrl,
      message: 'Scan the QR code with Google Authenticator or Authy'
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

/**
 * POST /api/2fa/verify
 * Проверить код и активировать 2FA
 */
router.post('/verify', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    // Получаем секрет пользователя
    const userResult = await pool.query(
      'SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (!user.two_factor_secret) {
      return res.status(400).json({
        error: '2FA not initialized',
        message: 'Please start 2FA setup first'
      });
    }

    if (user.two_factor_enabled) {
      return res.status(400).json({
        error: '2FA already enabled'
      });
    }

    // Проверяем код
    const isValid = authenticator.verify({
      token: code,
      secret: user.two_factor_secret
    });

    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid code',
        message: 'The code you entered is incorrect'
      });
    }

    // Генерируем backup коды (10 штук)
    const backupCodes = generateBackupCodes(10);
    const backupCodesHash = await hashBackupCodes(backupCodes);

    // Активируем 2FA
    await pool.query(
      `UPDATE users
       SET two_factor_enabled = true,
           two_factor_backup_codes = $1
       WHERE id = $2`,
      [JSON.stringify(backupCodesHash), userId]
    );

    res.json({
      message: '2FA enabled successfully',
      backupCodes,
      warning: 'Save these backup codes in a safe place. Each can be used only once if you lose access to your authenticator.'
    });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

/**
 * POST /api/2fa/disable
 * Отключить 2FA (требуется код подтверждения)
 */
router.post('/disable', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    // Получаем данные пользователя
    const userResult = await pool.query(
      'SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (!user.two_factor_enabled) {
      return res.status(400).json({
        error: '2FA not enabled'
      });
    }

    // Проверяем код
    const isValid = authenticator.verify({
      token: code,
      secret: user.two_factor_secret
    });

    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid code',
        message: 'The code you entered is incorrect'
      });
    }

    // Отключаем 2FA
    await pool.query(
      `UPDATE users
       SET two_factor_enabled = false,
           two_factor_secret = NULL,
           two_factor_backup_codes = NULL
       WHERE id = $1`,
      [userId]
    );

    // Удаляем все доверенные устройства
    await pool.query(
      'DELETE FROM trusted_devices WHERE user_id = $1',
      [userId]
    );

    res.json({
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

/**
 * GET /api/2fa/status
 * Получить статус 2FA для текущего пользователя
 */
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const userResult = await pool.query(
      'SELECT two_factor_enabled FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      enabled: userResult.rows[0].two_factor_enabled || false
    });
  } catch (error) {
    console.error('Error getting 2FA status:', error);
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

/**
 * POST /api/2fa/regenerate-backup-codes
 * Сгенерировать новые backup коды (требуется код подтверждения)
 */
router.post('/regenerate-backup-codes', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    const userResult = await pool.query(
      'SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (!user.two_factor_enabled) {
      return res.status(400).json({ error: '2FA not enabled' });
    }

    // Проверяем код
    const isValid = authenticator.verify({
      token: code,
      secret: user.two_factor_secret
    });

    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid code',
        message: 'The code you entered is incorrect'
      });
    }

    // Генерируем новые backup коды
    const backupCodes = generateBackupCodes(10);
    const backupCodesHash = await hashBackupCodes(backupCodes);

    await pool.query(
      'UPDATE users SET two_factor_backup_codes = $1 WHERE id = $2',
      [JSON.stringify(backupCodesHash), userId]
    );

    res.json({
      backupCodes,
      message: 'New backup codes generated. Save them in a safe place.',
      warning: 'Old backup codes are no longer valid.'
    });
  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    res.status(500).json({ error: 'Failed to regenerate backup codes' });
  }
});

/**
 * Генерация backup кодов
 */
function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Генерируем 8-значный код
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Хеширование backup кодов для безопасного хранения
 */
async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return codes.map(code => {
    return crypto.createHash('sha256').update(code).digest('hex');
  });
}

export default router;
