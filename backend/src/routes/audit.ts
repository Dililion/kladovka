import { Router } from 'express';
import { pool } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get audit logs (admin only)
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Check if user is admin
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
    if (userResult.rows[0]?.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Filters
    const userId = req.query.userId as string;
    const action = req.query.action as string;
    const entityType = req.query.entityType as string;
    const entityId = req.query.entityId as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    let query = `
      SELECT
        al.*,
        u.name as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (userId) {
      paramCount++;
      query += ` AND al.user_id = $${paramCount}`;
      params.push(userId);
    }

    if (action) {
      paramCount++;
      query += ` AND al.action = $${paramCount}`;
      params.push(action);
    }

    if (entityType) {
      paramCount++;
      query += ` AND al.entity_type = $${paramCount}`;
      params.push(entityType);
    }

    if (entityId) {
      paramCount++;
      query += ` AND al.entity_id = $${paramCount}`;
      params.push(entityId);
    }

    if (dateFrom) {
      paramCount++;
      query += ` AND al.created_at >= $${paramCount}`;
      params.push(dateFrom);
    }

    if (dateTo) {
      paramCount++;
      query += ` AND al.created_at <= $${paramCount}`;
      params.push(dateTo);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM audit_logs al WHERE 1=1';
    const countParams: any[] = [];
    let countParamNum = 0;

    if (userId) {
      countParamNum++;
      countQuery += ` AND al.user_id = $${countParamNum}`;
      countParams.push(userId);
    }

    if (action) {
      countParamNum++;
      countQuery += ` AND al.action = $${countParamNum}`;
      countParams.push(action);
    }

    if (entityType) {
      countParamNum++;
      countQuery += ` AND al.entity_type = $${countParamNum}`;
      countParams.push(entityType);
    }

    if (entityId) {
      countParamNum++;
      countQuery += ` AND al.entity_id = $${countParamNum}`;
      countParams.push(entityId);
    }

    if (dateFrom) {
      countParamNum++;
      countQuery += ` AND al.created_at >= $${countParamNum}`;
      countParams.push(dateFrom);
    }

    if (dateTo) {
      countParamNum++;
      countQuery += ` AND al.created_at <= $${countParamNum}`;
      countParams.push(dateTo);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      logs: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Ошибка получения логов' });
  }
});

// Get available actions (for filters)
router.get('/actions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
    if (userResult.rows[0]?.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const result = await pool.query(
      'SELECT DISTINCT action FROM audit_logs ORDER BY action'
    );
    res.json(result.rows.map(r => r.action));
  } catch (error) {
    console.error('Get actions error:', error);
    res.status(500).json({ message: 'Ошибка получения действий' });
  }
});

// Get available entity types (for filters)
router.get('/entity-types', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
    if (userResult.rows[0]?.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const result = await pool.query(
      'SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type'
    );
    res.json(result.rows.map(r => r.entity_type));
  } catch (error) {
    console.error('Get entity types error:', error);
    res.status(500).json({ message: 'Ошибка получения типов сущностей' });
  }
});

// Export logs as CSV (admin only)
router.get('/export', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
    if (userResult.rows[0]?.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    const result = await pool.query(`
      SELECT
        al.id,
        al.username,
        al.action,
        al.entity_type,
        al.entity_id,
        al.ip_address,
        al.created_at
      FROM audit_logs al
      ORDER BY al.created_at DESC
      LIMIT 10000
    `);

    // Generate CSV
    let csv = 'ID,Username,Action,Entity Type,Entity ID,IP Address,Created At\n';
    result.rows.forEach(row => {
      csv += `${row.id},"${row.username}","${row.action}","${row.entity_type}","${row.entity_id || ''}","${row.ip_address || ''}","${row.created_at}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export logs error:', error);
    res.status(500).json({ message: 'Ошибка экспорта логов' });
  }
});

export default router;
