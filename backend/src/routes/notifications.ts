import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { notificationService } from '../services/notifications.js';

const router = Router();

// Get user notifications
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const notifications = await notificationService.getUserNotifications(
      req.userId!.toString(),
      limit,
      offset
    );

    const unreadCount = await notificationService.getUnreadCount(req.userId!.toString());

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Ошибка получения уведомлений' });
  }
});

// Get unread count
router.get('/unread-count', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.userId!.toString());
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Ошибка получения счетчика' });
  }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    await notificationService.markAsRead(notificationId, req.userId!.toString());
    res.json({ message: 'Уведомление отмечено как прочитанное' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Ошибка обновления уведомления' });
  }
});

// Mark all as read
router.put('/read-all', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await notificationService.markAllAsRead(req.userId!.toString());
    res.json({ message: 'Все уведомления отмечены как прочитанные' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Ошибка обновления уведомлений' });
  }
});

// Subscribe to article
router.post('/subscribe/:articleId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { articleId } = req.params;
    await notificationService.subscribeToArticle(req.userId!.toString(), articleId);
    res.json({ message: 'Подписка оформлена' });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ message: 'Ошибка подписки' });
  }
});

// Unsubscribe from article
router.delete('/subscribe/:articleId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { articleId } = req.params;
    await notificationService.unsubscribeFromArticle(req.userId!.toString(), articleId);
    res.json({ message: 'Подписка отменена' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ message: 'Ошибка отписки' });
  }
});

// Check subscription status
router.get('/subscribe/:articleId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { articleId } = req.params;
    const isSubscribed = await notificationService.isSubscribed(req.userId!.toString(), articleId);
    res.json({ isSubscribed });
  } catch (error) {
    console.error('Check subscription error:', error);
    res.status(500).json({ message: 'Ошибка проверки подписки' });
  }
});

export default router;
