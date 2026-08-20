import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database.js';

interface PermissionRequest extends Request {
  userId?: number;
  userRole?: string;
}

interface RolePermissions {
  [resource: string]: {
    [action: string]: boolean | string;
  };
}

/**
 * Middleware для проверки прав доступа
 * @param resource - ресурс (articles, categories, users, settings, etc.)
 * @param action - действие (create, read, update, delete, etc.)
 */
export const checkPermission = (resource: string, action: string) => {
  return async (req: PermissionRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;
      const userRole = req.userRole;

      if (!userId || !userRole) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Админы имеют все права
      if (userRole === 'admin') {
        return next();
      }

      // Получаем права роли
      const roleResult = await pool.query(
        'SELECT permissions FROM roles WHERE name = $1',
        [userRole]
      );

      if (roleResult.rows.length === 0) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid role'
        });
      }

      const permissions: RolePermissions = roleResult.rows[0].permissions;

      // Проверяем права на ресурс
      if (!permissions[resource]) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `No permissions for resource: ${resource}`
        });
      }

      const permissionValue = permissions[resource][action];

      // Если права нет или явно false
      if (!permissionValue) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `No permission to ${action} ${resource}`
        });
      }

      // Если права "own" - пользователь может работать только со своими ресурсами
      if (permissionValue === 'own') {
        // Это будет проверяться в самом route handler
        (req as any).requiresOwnership = true;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Проверка владения ресурсом (для прав "own")
 */
export const checkOwnership = async (
  userId: number,
  resourceType: string,
  resourceId: number
): Promise<boolean> => {
  try {
    let query = '';

    switch (resourceType) {
      case 'article':
        query = 'SELECT author_id FROM articles WHERE id = $1';
        break;
      case 'comment':
        query = 'SELECT user_id as author_id FROM comments WHERE id = $1';
        break;
      default:
        return false;
    }

    const result = await pool.query(query, [resourceId]);

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].author_id === userId;
  } catch (error) {
    console.error('Ownership check error:', error);
    return false;
  }
};

/**
 * Получить права пользователя
 */
export const getUserPermissions = async (userId: number): Promise<RolePermissions | null> => {
  try {
    const userResult = await pool.query(
      'SELECT role, custom_permissions FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const { role, custom_permissions } = userResult.rows[0];

    // Получаем базовые права роли
    const roleResult = await pool.query(
      'SELECT permissions FROM roles WHERE name = $1',
      [role]
    );

    if (roleResult.rows.length === 0) {
      return null;
    }

    const rolePermissions: RolePermissions = roleResult.rows[0].permissions;

    // Объединяем с кастомными правами (если есть)
    if (custom_permissions && Object.keys(custom_permissions).length > 0) {
      return mergePermissions(rolePermissions, custom_permissions);
    }

    return rolePermissions;
  } catch (error) {
    console.error('Get user permissions error:', error);
    return null;
  }
};

/**
 * Объединение прав (кастомные перекрывают базовые)
 */
function mergePermissions(base: RolePermissions, custom: RolePermissions): RolePermissions {
  const merged = { ...base };

  for (const resource in custom) {
    if (!merged[resource]) {
      merged[resource] = {};
    }
    for (const action in custom[resource]) {
      merged[resource][action] = custom[resource][action];
    }
  }

  return merged;
}

/**
 * Проверка прав на категорию
 */
export const checkCategoryPermission = async (
  userId: number,
  categoryId: number,
  action: 'read' | 'write' | 'delete'
): Promise<boolean> => {
  try {
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return false;
    }

    const userRole = userResult.rows[0].role;

    // Админы имеют все права
    if (userRole === 'admin') {
      return true;
    }

    // Проверяем специфичные права на категорию
    const permResult = await pool.query(
      `SELECT can_read, can_write, can_delete
       FROM category_permissions
       WHERE category_id = $1 AND (user_id = $2 OR role_name = $3)
       ORDER BY user_id DESC NULLS LAST
       LIMIT 1`,
      [categoryId, userId, userRole]
    );

    if (permResult.rows.length > 0) {
      const perm = permResult.rows[0];
      switch (action) {
        case 'read': return perm.can_read;
        case 'write': return perm.can_write;
        case 'delete': return perm.can_delete;
      }
    }

    // Если нет специфичных прав, проверяем общие права роли
    const rolePerms = await getUserPermissions(userId);
    if (!rolePerms || !rolePerms.categories) {
      return false;
    }

    const actionMap = {
      read: 'read',
      write: 'update',
      delete: 'delete'
    };

    return rolePerms.categories[actionMap[action]] === true;
  } catch (error) {
    console.error('Category permission check error:', error);
    return false;
  }
};

/**
 * Проверка прав на статью
 */
export const checkArticlePermission = async (
  userId: number,
  articleId: number,
  action: 'read' | 'write'
): Promise<boolean> => {
  try {
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return false;
    }

    const userRole = userResult.rows[0].role;

    // Админы имеют все права
    if (userRole === 'admin') {
      return true;
    }

    // Проверяем является ли пользователь автором
    const articleResult = await pool.query(
      'SELECT author_id FROM articles WHERE id = $1',
      [articleId]
    );

    if (articleResult.rows.length === 0) {
      return false;
    }

    const isAuthor = articleResult.rows[0].author_id === userId;

    // Проверяем специфичные права на статью
    const permResult = await pool.query(
      `SELECT can_read, can_write
       FROM article_permissions
       WHERE article_id = $1 AND (user_id = $2 OR role_name = $3)
       ORDER BY user_id DESC NULLS LAST
       LIMIT 1`,
      [articleId, userId, userRole]
    );

    if (permResult.rows.length > 0) {
      const perm = permResult.rows[0];
      return action === 'read' ? perm.can_read : perm.can_write;
    }

    // Если нет специфичных прав, проверяем общие права роли
    const rolePerms = await getUserPermissions(userId);
    if (!rolePerms || !rolePerms.articles) {
      return false;
    }

    const actionMap = {
      read: 'read',
      write: 'update'
    };

    const permission = rolePerms.articles[actionMap[action]];

    // Если права "own" - проверяем авторство
    if (permission === 'own') {
      return isAuthor;
    }

    return permission === true;
  } catch (error) {
    console.error('Article permission check error:', error);
    return false;
  }
};
