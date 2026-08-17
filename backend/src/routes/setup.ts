import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

const router = Router();

router.get('/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*)::int as count FROM users');
    res.json({ setupRequired: result.rows[0].count === 0 });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка' });
  }
});

router.post('/init', async (req, res) => {
  try {
    const count = await pool.query('SELECT COUNT(*)::int as count FROM users');
    if (count.rows[0].count > 0) {
      return res.status(403).json({ message: 'Настройка уже выполнена' });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Все поля обязательны' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Пароль должен быть не менее 6 символов' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'admin') RETURNING id, name, email, role, created_at",
      [name, email, hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '30d',
    });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Setup init error:', error);
    res.status(500).json({ message: 'Ошибка инициализации' });
  }
});

export default router;
