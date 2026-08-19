import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database.js';

export interface AuditRequest extends Request {
  userId?: string;
}

export interface AuditLogData {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
}

export const logAudit = async (
  userId: string | undefined,
  username: string | undefined,
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, any>,
  req?: Request
) => {
  try {
    const ipAddress = req?.ip || req?.socket?.remoteAddress || null;
    const userAgent = req?.headers['user-agent'] || null;

    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId || null,
        username || 'system',
        action,
        entityType,
        entityId || null,
        details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging should not break the main flow
  }
};

// Middleware to automatically log certain actions
export const auditMiddleware = (action: string, entityType: string) => {
  return async (req: AuditRequest, res: Response, next: NextFunction) => {
    // Store original methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Override json to capture response
    res.json = function (data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = data?.id || req.params?.id || req.body?.id;

        // Get username from token payload if available
        const username = (req as any).username;

        logAudit(
          req.userId,
          username,
          action,
          entityType,
          entityId?.toString(),
          {
            method: req.method,
            path: req.path,
            body: sanitizeBody(req.body),
          },
          req
        );
      }
      return originalJson(data);
    };

    next();
  };
};

// Sanitize sensitive fields from body
const sanitizeBody = (body: any): any => {
  if (!body) return undefined;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
};

export default { logAudit, auditMiddleware };
