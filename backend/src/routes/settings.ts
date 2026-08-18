import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const adminOnly = async (req: AuthRequest, res: any, next: any) => {
  const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
  if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
    return res.status(403).json({ message: 'Доступ запрещён' });
  }
  next();
};

router.use(authMiddleware, adminOnly);

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT key, value, category
      FROM system_settings
      ORDER BY category, key
    `);

    const settings: any = {};
    result.rows.forEach((row: any) => {
      if (!settings[row.category]) {
        settings[row.category] = {};
      }
      settings[row.category][row.key] = row.value;
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    const userId = (req as any).userId;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          `UPDATE system_settings
           SET value = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
           WHERE key = $3`,
          [value, userId, key]
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Settings updated successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

router.post('/test-smtp', async (req: AuthRequest, res: Response) => {
  try {
    const { testEmail } = req.body;
    const userId = req.userId;

    const settingsResult = await pool.query(`
      SELECT key, value FROM system_settings WHERE key LIKE 'smtp_%'
    `);

    const settings: any = {};
    settingsResult.rows.forEach((row: any) => {
      settings[row.key] = row.value;
    });

    if (settings.smtp_enabled !== 'true') {
      return res.status(400).json({ error: 'SMTP is not enabled' });
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: parseInt(settings.smtp_port),
      secure: settings.smtp_secure === 'true',
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_password
      }
    });

    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    const targetEmail = testEmail || userResult.rows[0]?.email;

    if (!targetEmail) {
      return res.status(400).json({ error: 'No email address provided' });
    }

    await transporter.sendMail({
      from: `"${settings.smtp_from_name}" <${settings.smtp_from_email}>`,
      to: targetEmail,
      subject: 'Test Email from Kladovka',
      text: 'This is a test email from Kladovka system settings.',
      html: '<p>This is a test email from <strong>Kladovka</strong> system settings.</p>'
    });

    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

router.post('/test-ldap', async (req: Request, res: Response) => {
  try {
    const { testUsername } = req.body;

    if (!testUsername) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const settingsResult = await pool.query(`
      SELECT key, value FROM system_settings WHERE key LIKE 'ldap_%'
    `);

    const settings: any = {};
    settingsResult.rows.forEach((row: any) => {
      settings[row.key] = row.value;
    });

    if (settings.ldap_enabled !== 'true') {
      return res.status(400).json({ error: 'LDAP is not enabled' });
    }

    const ldap = require('ldapjs');
    const client = ldap.createClient({
      url: settings.ldap_server
    });

    await new Promise<void>((resolve, reject) => {
      client.bind(settings.ldap_bind_dn, settings.ldap_bind_password, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const searchFilter = settings.ldap_search_filter.replace('{{username}}', testUsername);

    await new Promise<void>((resolve, reject) => {
      client.search(settings.ldap_search_base, { filter: searchFilter, scope: 'sub' }, (err: any, searchRes: any) => {
        if (err) {
          reject(err);
          return;
        }

        let found = false;
        searchRes.on('searchEntry', () => {
          found = true;
        });

        searchRes.on('end', () => {
          if (found) {
            resolve();
          } else {
            reject(new Error('User not found in LDAP'));
          }
        });

        searchRes.on('error', reject);
      });
    });

    client.unbind();
    res.json({ message: 'LDAP connection successful' });
  } catch (error) {
    console.error('Error testing LDAP:', error);
    res.status(500).json({ error: 'Failed to test LDAP connection' });
  }
});

export default router;
