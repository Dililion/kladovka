import { pool } from '../config/database.js';

export interface Notification {
  id: number;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  createdBy?: string;
  createdAt: Date;
}

export const notificationService = {
  // Create a notification
  async create(
    userId: string,
    type: string,
    title: string,
    message: string,
    link?: string,
    entityType?: string,
    entityId?: string,
    createdBy?: string
  ): Promise<Notification> {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, entity_type, entity_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, type, title, message, link || null, entityType || null, entityId || null, createdBy || null]
    );
    return result.rows[0];
  },

  // Notify all subscribers when article is updated
  async notifyArticleUpdate(articleId: string, articleTitle: string, updatedBy: string) {
    const subscribers = await pool.query(
      'SELECT user_id FROM article_subscriptions WHERE article_id = $1 AND user_id != $2',
      [articleId, updatedBy]
    );

    for (const sub of subscribers.rows) {
      await this.create(
        sub.user_id,
        'article_updated',
        'Статья обновлена',
        `Статья "${articleTitle}" была обновлена`,
        `/article/${articleId}`,
        'article',
        articleId,
        updatedBy
      );
    }
  },

  // Notify when user is mentioned
  async notifyMention(userId: string, mentionedBy: string, articleId: string, articleTitle: string) {
    const user = await pool.query('SELECT name FROM users WHERE id = $1', [mentionedBy]);
    const userName = user.rows[0]?.name || 'Пользователь';

    await this.create(
      userId,
      'mention',
      'Вас упомянули',
      `${userName} упомянул вас в статье "${articleTitle}"`,
      `/article/${articleId}`,
      'article',
      articleId,
      mentionedBy
    );
  },

  // Get user notifications
  async getUserNotifications(userId: string, limit: number = 20, offset: number = 0) {
    const result = await pool.query(
      `SELECT n.*, u.name as created_by_name
       FROM notifications n
       LEFT JOIN users u ON n.created_by = u.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  },

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(result.rows[0].count);
  },

  // Mark as read
  async markAsRead(notificationId: number, userId: string) {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  },

  // Mark all as read
  async markAllAsRead(userId: string) {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );
  },

  // Subscribe to article
  async subscribeToArticle(userId: string, articleId: string) {
    await pool.query(
      'INSERT INTO article_subscriptions (user_id, article_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, articleId]
    );
  },

  // Unsubscribe from article
  async unsubscribeFromArticle(userId: string, articleId: string) {
    await pool.query(
      'DELETE FROM article_subscriptions WHERE user_id = $1 AND article_id = $2',
      [userId, articleId]
    );
  },

  // Check if user is subscribed
  async isSubscribed(userId: string, articleId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT id FROM article_subscriptions WHERE user_id = $1 AND article_id = $2',
      [userId, articleId]
    );
    return result.rows.length > 0;
  },
};
