import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { checkPermission, getUserPermissions } from '../middleware/permissions.js';
import { pool } from '../config/database.js';

const router = Router();

interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

/**
 * GET /api/roles
 * Получить список всех ролей (только для админов)
 */
router.get('/', authMiddleware, checkPermission('users', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, display_name, description, permissions, is_system, created_at FROM roles ORDER BY name'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

/**
 * GET /api/roles/:name
 * Получить информацию о роли
 */
router.get('/:name', authMiddleware, checkPermission('users', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;

    const result = await pool.query(
      'SELECT id, name, display_name, description, permissions, is_system, created_at FROM roles WHERE name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

/**
 * POST /api/roles
 * Создать новую кастомную роль (только для админов)
 */
router.post('/', authMiddleware, checkPermission('users', 'create'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, display_name, description, permissions } = req.body;

    if (!name || !display_name || !permissions) {
      return res.status(400).json({ error: 'Name, display_name, and permissions are required' });
    }

    // Проверяем что имя уникально
    const existing = await pool.query('SELECT id FROM roles WHERE name = $1', [name]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Role with this name already exists' });
    }

    const result = await pool.query(
      `INSERT INTO roles (name, display_name, description, permissions, is_system)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, name, display_name, description, permissions, is_system, created_at`,
      [name, display_name, description || null, JSON.stringify(permissions)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

/**
 * PUT /api/roles/:name
 * Обновить роль (нельзя изменять системные роли)
 */
router.put('/:name', authMiddleware, checkPermission('users', 'update'), async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const { display_name, description, permissions } = req.body;

    // Проверяем что роль существует и не системная
    const roleCheck = await pool.query(
      'SELECT is_system FROM roles WHERE name = $1',
      [name]
    );

    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (roleCheck.rows[0].is_system) {
      return res.status(403).json({ error: 'Cannot modify system roles' });
    }

    const result = await pool.query(
      `UPDATE roles
       SET display_name = COALESCE($1, display_name),
           description = COALESCE($2, description),
           permissions = COALESCE($3, permissions),
           updated_at = CURRENT_TIMESTAMP
       WHERE name = $4
       RETURNING id, name, display_name, description, permissions, is_system, created_at, updated_at`,
      [display_name, description, permissions ? JSON.stringify(permissions) : null, name]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

/**
 * DELETE /api/roles/:name
 * Удалить кастомную роль (нельзя удалять системные)
 */
router.delete('/:name', authMiddleware, checkPermission('users', 'delete'), async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;

    // Проверяем что роль существует и не системная
    const roleCheck = await pool.query(
      'SELECT is_system FROM roles WHERE name = $1',
      [name]
    );

    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (roleCheck.rows[0].is_system) {
      return res.status(403).json({ error: 'Cannot delete system roles' });
    }

    // Проверяем что нет пользователей с этой ролью
    const usersCount = await pool.query(
      'SELECT COUNT(*) FROM users WHERE role = $1',
      [name]
    );

    if (parseInt(usersCount.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete role',
        message: 'There are users with this role. Reassign them first.'
      });
    }

    await pool.query('DELETE FROM roles WHERE name = $1', [name]);

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

/**
 * GET /api/roles/user/:userId/permissions
 * Получить права конкретного пользователя
 */
router.get('/user/:userId/permissions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const requestUserId = req.userId;

    // Пользователь может смотреть только свои права, админ - любые
    if (userId !== requestUserId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const permissions = await getUserPermissions(userId);

    if (!permissions) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ permissions });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'Failed to fetch user permissions' });
  }
});

/**
 * PUT /api/roles/user/:userId/permissions
 * Установить кастомные права пользователю (только админ)
 */
router.put('/user/:userId/permissions', authMiddleware, checkPermission('users', 'update'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { custom_permissions } = req.body;

    if (!custom_permissions) {
      return res.status(400).json({ error: 'custom_permissions is required' });
    }

    await pool.query(
      'UPDATE users SET custom_permissions = $1 WHERE id = $2',
      [JSON.stringify(custom_permissions), userId]
    );

    res.json({ message: 'Custom permissions updated successfully' });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({ error: 'Failed to update user permissions' });
  }
});

/**
 * POST /api/roles/category/:categoryId/permissions
 * Установить права на категорию
 */
router.post('/category/:categoryId/permissions', authMiddleware, checkPermission('categories', 'update'), async (req: AuthRequest, res: Response) => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const { user_id, role_name, can_read, can_write, can_delete } = req.body;

    if ((!user_id && !role_name) || (user_id && role_name)) {
      return res.status(400).json({ error: 'Specify either user_id or role_name, not both' });
    }

    const result = await pool.query(
      `INSERT INTO category_permissions (category_id, user_id, role_name, can_read, can_write, can_delete)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [categoryId, user_id || null, role_name || null, can_read || true, can_write || false, can_delete || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating category permission:', error);
    res.status(500).json({ error: 'Failed to create category permission' });
  }
});

/**
 * GET /api/roles/category/:categoryId/permissions
 * Получить список прав на категорию
 */
router.get('/category/:categoryId/permissions', authMiddleware, checkPermission('categories', 'read'), async (req: AuthRequest, res: Response) => {
  try {
    const categoryId = parseInt(req.params.categoryId);

    const result = await pool.query(
      `SELECT cp.*, u.name as user_name, u.email as user_email
       FROM category_permissions cp
       LEFT JOIN users u ON cp.user_id = u.id
       WHERE cp.category_id = $1
       ORDER BY cp.created_at DESC`,
      [categoryId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching category permissions:', error);
    res.status(500).json({ error: 'Failed to fetch category permissions' });
  }
});

/**
 * DELETE /api/roles/category/:categoryId/permissions/:permissionId
 * Удалить право на категорию
 */
router.delete('/category/:categoryId/permissions/:permissionId', authMiddleware, checkPermission('categories', 'update'), async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, permissionId } = req.params;

    await pool.query(
      'DELETE FROM category_permissions WHERE id = $1 AND category_id = $2',
      [permissionId, categoryId]
    );

    res.json({ message: 'Category permission deleted successfully' });
  } catch (error) {
    console.error('Error deleting category permission:', error);
    res.status(500).json({ error: 'Failed to delete category permission' });
  }
});

export default router;
