# Kladovka Knowledge Base - Changelog v1.2.0

## 🎉 Release Date: August 19, 2026

## 📋 Overview
Version 1.2.0 introduces advanced security features, role-based access control, automated backup system, and comprehensive data management tools.

---

## ✨ New Features

### 🔐 Two-Factor Authentication (2FA)
Complete implementation of TOTP-based two-factor authentication for enhanced account security.

**Features:**
- QR code generation for authenticator apps (Google Authenticator, Authy, etc.)
- 10 backup codes for account recovery (SHA-256 hashed)
- Trusted devices system (30-day expiration)
- Device fingerprinting for automatic trust
- Enable/disable 2FA with verification
- Regenerate backup codes on demand

**API Endpoints:**
- `POST /api/2fa/setup` - Initialize 2FA setup
- `POST /api/2fa/verify` - Verify and enable 2FA
- `POST /api/2fa/disable` - Disable 2FA
- `GET /api/2fa/status` - Check 2FA status
- `POST /api/2fa/regenerate-backup-codes` - Generate new backup codes

**Database:**
- Added columns to `users` table: `two_factor_secret`, `two_factor_enabled`, `two_factor_backup_codes`
- New `trusted_devices` table with device fingerprinting

**Frontend:**
- `/2fa` page with QR code display
- Backup codes display with copy/download functionality
- Visual setup wizard

**Dependencies:**
- `otplib@12.0.1` - TOTP generation and verification
- `qrcode@1.5.3` - QR code generation

---

### 👥 Role-Based Access Control (RBAC)
Comprehensive permission system with granular resource access control.

**Features:**
- 4 predefined system roles: Admin, Editor, Author, Reader
- Granular permissions per resource (articles, categories, users, settings)
- Three permission levels: full access (✅), denied (❌), own only (👤)
- Category-level permissions
- Article-level permissions
- Custom role creation and management
- User role assignment

**System Roles:**
1. **Admin** - Full system access
2. **Editor** - Content management (create/edit all articles and categories)
3. **Author** - Own content only (create/edit/delete own articles)
4. **Reader** - Read-only access

**API Endpoints:**
- `GET /api/roles` - List all roles
- `POST /api/roles` - Create new role
- `PUT /api/roles/:id` - Update role permissions
- `DELETE /api/roles/:id` - Delete role
- `GET /api/roles/users/:userId/permissions` - Get user permissions
- `POST /api/roles/users/:userId/permissions` - Update user permissions
- `GET /api/roles/categories/:categoryId/permissions` - Get category permissions
- `POST /api/roles/categories/:categoryId/permissions` - Set category permissions

**Database:**
- New `roles` table with JSONB permissions
- New `category_permissions` table
- New `article_permissions` table
- PostgreSQL function `check_user_permission()`

**Frontend:**
- `/roles` page with visual permission matrix
- User role management interface
- Permission legend with icons

---

### 📦 Import/Export System
Comprehensive data portability with JSON-based import and export.

**Features:**
- Export articles with metadata, categories, and tags
- Export categories with descriptions
- Full system backup (admin only)
- Import with append or replace modes
- Automatic slug handling for duplicates
- Automatic category and tag creation
- Detailed import statistics

**Export Types:**
1. **Articles** - All articles with full metadata
2. **Categories** - All categories with descriptions
3. **Full Backup** - Complete system data (articles, categories, tags, users)

**Import Modes:**
- **Append** - Add to existing data
- **Replace** - Clear and replace (admin only)

**API Endpoints:**
- `GET /api/export/articles` - Export articles as JSON
- `GET /api/export/categories` - Export categories as JSON
- `GET /api/export/full` - Full system export (admin)
- `POST /api/import/articles` - Import articles
- `POST /api/import/categories` - Import categories

**Frontend:**
- `/import-export` page with file upload
- Download exported files automatically
- Import progress and statistics display
- Warning messages for destructive operations

---

### 💾 Automated Backup System
Scheduled and manual backup creation with retention policies.

**Features:**
- Manual backup creation on demand
- Multiple backup types (full, articles, categories, database)
- Backup history tracking
- Automated cleanup based on retention policy
- Backup settings configuration
- Email notifications (configurable)
- Backup status monitoring (pending, completed, failed)

**Backup Types:**
1. **Full** - Complete system backup
2. **Articles** - Articles with tags
3. **Categories** - Category structure
4. **Database** - Raw database export

**API Endpoints:**
- `GET /api/backups` - List all backups
- `POST /api/backups` - Create new backup
- `DELETE /api/backups/:id` - Delete backup
- `GET /api/backups/settings` - Get backup settings
- `PUT /api/backups/settings` - Update backup settings
- `POST /api/backups/cleanup` - Clean up old backups

**Database:**
- New `backups` table with status tracking
- New `backup_settings` table with scheduling configuration

**Frontend:**
- `/backups` page for backup management (admin)
- Backup list with size and status
- One-click backup creation
- Settings configuration panel

---

### 🔔 Notification System
Real-time notifications for user actions and system events.

**Features:**
- Article comment notifications
- Article update notifications
- Mention notifications (@username)
- Article subscription system
- Unread notification count
- Mark as read functionality
- Mark all as read
- Real-time updates

**API Endpoints:**
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `POST /api/notifications/subscribe/:articleId` - Subscribe to article
- `DELETE /api/notifications/subscribe/:articleId` - Unsubscribe
- `GET /api/notifications/subscribe/:articleId` - Check subscription status

**Database:**
- New `notifications` table
- New `notification_subscriptions` table

**Frontend:**
- Notification bell icon in header
- Notification list page
- Subscription management

---

### 📊 Audit Logging
Comprehensive audit trail for all system actions.

**Features:**
- Log all user actions (create, update, delete)
- Log authentication events (login, logout, 2FA)
- Log permission changes
- Log role assignments
- IP address tracking
- User agent tracking
- Detailed action metadata

**API Endpoints:**
- `GET /api/audit/logs` - Get audit logs (admin)
- `GET /api/audit/logs/:userId` - Get user-specific logs

**Database:**
- New `audit_logs` table with JSONB metadata

---

## 🔧 Technical Improvements

### Backend
- Fixed TypeScript compilation errors
- Improved type safety across all routes
- Added proper error handling
- Implemented middleware for permission checking
- Added audit logging service
- Added notification service

### Frontend
- Fixed unused variable warnings
- Improved component structure
- Added loading states
- Enhanced error handling
- Responsive design improvements

### Database
- Applied all migrations successfully
- Added indexes for performance
- Implemented PostgreSQL functions for permissions

### Docker
- Multi-stage builds for optimization
- Proper layer caching
- Production-ready configuration

---

## 📝 Migration Notes

### Applied Migrations:
1. ✅ `014_two_factor_auth.sql` - 2FA system tables
2. ✅ `015_enhanced_rbac.sql` - RBAC system tables
3. ✅ `016_backup_system.sql` - Backup system tables
4. ✅ `017_notifications.sql` - Notification system tables
5. ✅ `018_audit_logs.sql` - Audit logging tables

### To Apply Manually:
```bash
docker compose exec -T postgres psql -U postgres -d kladovka < backend/src/migrations/014_two_factor_auth.sql
docker compose exec -T postgres psql -U postgres -d kladovka < backend/src/migrations/015_enhanced_rbac.sql
docker compose exec -T postgres psql -U postgres -d kladovka < backend/src/migrations/016_backup_system.sql
docker compose exec -T postgres psql -U postgres -d kladovka < backend/src/migrations/017_notifications.sql
docker compose exec -T postgres psql -U postgres -d kladovka < backend/src/migrations/018_audit_logs.sql
```

---

## 🚀 Deployment

### Build and Start:
```bash
./start.sh
```

### Stop:
```bash
./stop.sh
```

### Access:
- Frontend: http://localhost
- Backend API: http://localhost:3000
- Health check: http://localhost:3000/health

---

## 📚 Documentation

### New Routes Added to Header (Admin Only):
- 🔐 2FA - `/2fa`
- 🔑 API Keys - `/api-keys`
- 👥 Roles - `/roles`
- 📦 Import/Export - `/import-export`
- 💾 Backups - `/backups` (to be added)

---

## 🐛 Bug Fixes
- Fixed TypeScript compilation errors in backend routes
- Fixed unused import in import-export.ts
- Fixed userId type mismatches in audit logging
- Fixed userId type mismatches in notification service
- Fixed unused parameters in RolesManagement.tsx
- Removed unused interface in TwoFactorAuth.tsx

---

## 📦 Dependencies Added

### Backend:
- `otplib@12.0.1` - TOTP for 2FA
- `qrcode@1.5.3` - QR code generation
- `@types/qrcode@1.5.5` - TypeScript types

### Frontend:
- No new dependencies (using existing axios, react-router-dom)

---

## 🔒 Security Enhancements
- Two-factor authentication with TOTP
- Backup codes for account recovery (SHA-256 hashed)
- Trusted device tracking
- Role-based access control
- Granular permission system
- Audit logging for all actions
- Enhanced authentication middleware

---

## 🎯 Next Steps
1. Test all 2FA flows (setup, login, backup codes)
2. Test RBAC with different user roles
3. Test import/export functionality
4. Test backup creation and restoration
5. Configure automated backup scheduling
6. Set up email notifications
7. Monitor audit logs

---

## 👨‍💻 Contributors
- Mikhail (Dililion)
- Claude Opus 5 (AI Assistant)

---

## 📄 License
Same as main project

---

## 🙏 Acknowledgments
Built with modern web technologies:
- Node.js & Express
- React & TypeScript
- PostgreSQL
- Docker & Docker Compose
