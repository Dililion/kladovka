import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { initializeDatabase } from './config/database.js';
import authRoutes from './routes/auth.js';
import articlesRoutes from './routes/articles.js';
import categoriesRoutes from './routes/categories.js';
import commentsRoutes from './routes/comments.js';
import tagsRoutes from './routes/tags.js';
import adminRoutes from './routes/admin.js';
import setupRoutes from './routes/setup.js';
import treeRoutes from './routes/tree.js';
import uploadsRoutes from './routes/uploads.js';
import favoritesRoutes from './routes/favorites.js';
import versionsRoutes from './routes/versions.js';
import exportRoutes from './routes/export.js';
import analyticsRoutes from './routes/analytics.js';
import settingsRoutes from './routes/settings.js';
import notificationsRoutes from './routes/notifications.js';
import auditRoutes from './routes/audit.js';
import apiKeysRoutes from './routes/api-keys.js';
import apiV1Routes from './routes/api-v1.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - в продакшене нужно ограничить origins
app.use(cors());
app.use(express.json());

// Статическая отдача загруженных файлов
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rate limiting для auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // 10 попыток
  message: { message: 'Слишком много попыток, попробуйте позже' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting для API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // 100 запросов
  message: { message: 'Слишком много запросов, попробуйте позже' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/articles', apiLimiter, articlesRoutes);
app.use('/api/categories', apiLimiter, categoriesRoutes);
app.use('/api/comments', apiLimiter, commentsRoutes);
app.use('/api/tags', apiLimiter, tagsRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/tree', apiLimiter, treeRoutes);
app.use('/api/uploads', apiLimiter, uploadsRoutes);
app.use('/api/favorites', apiLimiter, favoritesRoutes);
app.use('/api/versions', apiLimiter, versionsRoutes);
app.use('/api/export', apiLimiter, exportRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);
app.use('/api/settings', apiLimiter, settingsRoutes);
app.use('/api/notifications', apiLimiter, notificationsRoutes);
app.use('/api/audit', apiLimiter, auditRoutes);
app.use('/api', apiLimiter, apiKeysRoutes);
app.use('/api/v1', apiLimiter, apiV1Routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const startServer = async () => {
  try {
    await initializeDatabase();
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
