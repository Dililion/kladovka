import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import { pool } from '../config/database';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

const BACKUP_DIR = process.env.BACKUP_DIR || '/app/backups';

/**
 * GET /api/backups
 * Получить список всех бэкапов
 */
router.get('/', authMiddleware, checkPermission('settings', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        b.id, b.filename, b.type, b.size_bytes, b.status,
        b.created_at, b.completed_at, b.error_message,
        u.name as created_by_name
      FROM backups b
      LEFT JOIN users u ON b.created_by = u.id
      ORDER BY b.created_at DESC
      LIMIT 100
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ error: 'Failed to fetch backups' });
  }
});

/**
 * POST /api/backups
 * Создать новый бэкап
 */
router.post('/', authMiddleware, checkPermission('settings', 'update'), async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.body; // 'full', 'articles', 'categories', 'database'
    const userId = req.userId;

    if (!['full', 'articles', 'categories', 'database'].includes(type)) {
      return res.status(400).json({ error: 'Invalid backup type' });
    }

    const timestamp = Date.now();
    const filename = `backup-${type}-${timestamp}.json`;

    // Создаем запись о бэкапе
    const backupResult = await pool.query(
      `INSERT INTO backups (filename, type, status, created_by)
       VALUES ($1, $2, 'pending', $3)
       RETURNING id`,
      [filename, type, userId]
    );

    const backupId = backupResult.rows[0].id;

    // Запускаем создание бэкапа асинхронно
    createBackup(backupId, type, filename).catch(err => {
      console.error('Backup creation error:', err);
    });

    res.status(202).json({
      message: 'Backup creation started',
      backupId,
      filename
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

/**
 * DELETE /api/backups/:id
 * Удалить бэкап
 */
router.delete('/:id', authMiddleware, checkPermission('settings', 'update'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Получаем информацию о бэкапе
    const backupResult = await pool.query(
      'SELECT filename FROM backups WHERE id = $1',
      [id]
    );

    if (backupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const filename = backupResult.rows[0].filename;

    // Удаляем файл
    try {
      await fs.unlink(path.join(BACKUP_DIR, filename));
    } catch (err) {
      console.error('Error deleting backup file:', err);
    }

    // Удаляем запись из БД
    await pool.query('DELETE FROM backups WHERE id = $1', [id]);

    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

/**
 * GET /api/backups/settings
 * Получить настройки автоматических бэкапов
 */
router.get('/settings', authMiddleware, checkPermission('settings', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM backup_settings ORDER BY id LIMIT 1');

    if (result.rows.length === 0) {
      return res.json({
        enabled: false,
        schedule: 'daily',
        retention_days: 30,
        backup_types: ['full']
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching backup settings:', error);
    res.status(500).json({ error: 'Failed to fetch backup settings' });
  }
});

/**
 * PUT /api/backups/settings
 * Обновить настройки автоматических бэкапов
 */
router.put('/settings', authMiddleware, checkPermission('settings', 'update'), async (req: AuthRequest, res: Response) => {
  try {
    const { enabled, schedule, retention_days, backup_types, notification_email } = req.body;
    const userId = req.userId;

    await pool.query(
      `UPDATE backup_settings
       SET enabled = COALESCE($1, enabled),
           schedule = COALESCE($2, schedule),
           retention_days = COALESCE($3, retention_days),
           backup_types = COALESCE($4, backup_types),
           notification_email = COALESCE($5, notification_email),
           updated_at = CURRENT_TIMESTAMP,
           updated_by = $6
       WHERE id = 1`,
      [enabled, schedule, retention_days, backup_types ? JSON.stringify(backup_types) : null, notification_email, userId]
    );

    res.json({ message: 'Backup settings updated successfully' });
  } catch (error) {
    console.error('Error updating backup settings:', error);
    res.status(500).json({ error: 'Failed to update backup settings' });
  }
});

/**
 * POST /api/backups/cleanup
 * Очистить старые бэкапы согласно retention policy
 */
router.post('/cleanup', authMiddleware, checkPermission('settings', 'update'), async (req: AuthRequest, res: Response) => {
  try {
    // Получаем retention_days из настроек
    const settingsResult = await pool.query('SELECT retention_days FROM backup_settings ORDER BY id LIMIT 1');
    const retentionDays = settingsResult.rows[0]?.retention_days || 30;

    // Находим старые бэкапы
    const oldBackupsResult = await pool.query(
      `SELECT id, filename FROM backups
       WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
      [retentionDays]
    );

    let deleted = 0;
    for (const backup of oldBackupsResult.rows) {
      try {
        // Удаляем файл
        await fs.unlink(path.join(BACKUP_DIR, backup.filename));
        // Удаляем запись
        await pool.query('DELETE FROM backups WHERE id = $1', [backup.id]);
        deleted++;
      } catch (err) {
        console.error(`Error deleting old backup ${backup.filename}:`, err);
      }
    }

    res.json({
      message: 'Cleanup completed',
      deleted,
      retention_days: retentionDays
    });
  } catch (error) {
    console.error('Error cleaning up backups:', error);
    res.status(500).json({ error: 'Failed to cleanup backups' });
  }
});

/**
 * Функция для создания бэкапа
 */
async function createBackup(backupId: number, type: string, filename: string): Promise<void> {
  try {
    let data: any = {};

    if (type === 'full' || type === 'articles') {
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
      data.articles = articlesResult.rows;
    }

    if (type === 'full' || type === 'categories') {
      const categoriesResult = await pool.query('SELECT * FROM categories ORDER BY name');
      data.categories = categoriesResult.rows;
    }

    if (type === 'full') {
      const tagsResult = await pool.query('SELECT * FROM tags ORDER BY name');
      data.tags = tagsResult.rows;

      const usersResult = await pool.query('SELECT id, name, email, role, created_at FROM users');
      data.users = usersResult.rows;
    }

    const backupData = {
      version: '1.0',
      type,
      created_at: new Date().toISOString(),
      data
    };

    // Создаем директорию если её нет
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    // Записываем файл
    const filePath = path.join(BACKUP_DIR, filename);
    const jsonData = JSON.stringify(backupData, null, 2);
    await fs.writeFile(filePath, jsonData);

    const stats = await fs.stat(filePath);

    // Обновляем запись
    await pool.query(
      `UPDATE backups
       SET status = 'completed',
           size_bytes = $1,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [stats.size, backupId]
    );
  } catch (error: any) {
    console.error('Backup creation error:', error);
    await pool.query(
      `UPDATE backups
       SET status = 'failed',
           error_message = $1,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [error.message, backupId]
    );
  }
}

export default router;
