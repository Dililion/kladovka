import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { pool } from '../config/database.js';

const router = Router();

function getMailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Все поля обязательны' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Пароль должен быть не менее 6 символов' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email уже используется' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, hashedPassword]
    );

    const user = result.rows[0];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET не установлен');
      return res.status(500).json({ message: 'Ошибка конфигурации сервера' });
    }

    const token = jwt.sign({ userId: user.id }, secret, {
      expiresIn: '30d',
    });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Ошибка регистрации' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Логин и пароль обязательны' });
    }

    const result = await pool.query(
      'SELECT id, name, email, password, role FROM users WHERE email = $1 OR name = $1',
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET не установлен');
      return res.status(500).json({ message: 'Ошибка конфигурации сервера' });
    }

    const token = jwt.sign({ userId: user.id }, secret, {
      expiresIn: '30d',
    });

    const { password: _, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Ошибка входа' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email обязателен' });

    const result = await pool.query('SELECT id, name FROM users WHERE email = $1', [email]);

    // Always return success to avoid email enumeration
    if (result.rows.length === 0) {
      return res.json({ message: 'Если email зарегистрирован, письмо отправлено' });
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    const appUrl = process.env.APP_URL || 'http://localhost';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    if (process.env.SMTP_USER) {
      const mailer = getMailer();
      await mailer.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Сброс пароля — Kladovka',
        html: `
          <p>Здравствуйте, ${user.name}!</p>
          <p>Для сброса пароля перейдите по ссылке:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Ссылка действительна 1 час. Если вы не запрашивали сброс пароля — проигнорируйте это письмо.</p>
        `,
      });
    } else {
      // Dev mode: log the token
      console.log(`[DEV] Password reset token for ${email}: ${token}`);
      console.log(`[DEV] Reset URL: ${resetUrl}`);
    }

    res.json({ message: 'Если email зарегистрирован, письмо отправлено' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Ошибка отправки письма' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Токен и пароль обязательны' });
    if (password.length < 6) return res.status(400).json({ message: 'Пароль должен быть не менее 6 символов' });

    const result = await pool.query(
      `SELECT prt.id, prt.user_id
       FROM password_reset_tokens prt
       WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Токен недействителен или истёк' });
    }

    const { id: tokenId, user_id } = result.rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [tokenId]);

    res.json({ message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Ошибка сброса пароля' });
  }
});

export default router;
