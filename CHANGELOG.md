# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-08-17

### Added
- Initial release of Kladovka Knowledge Base System
- User authentication (register, login, password reset)
- Article management with Markdown support
- Hierarchical structure with folders
- Categories and tags system
- Full-text search with filters (author, category, tags, date range)
- Article versioning with history and restore capability
- Public/private articles with permission system
- Comments system
- File upload support (images, PDF, Office documents, archives up to 50MB)
- Favorites/bookmarks functionality
- Export articles to Markdown and PDF
- Analytics dashboard for admins:
  - General statistics
  - 30-day activity chart
  - Popular tags and articles
  - User activity metrics
- Admin panel:
  - User management (role change, blocking)
  - Article and comment moderation
  - Category management
- Docker-based deployment with docker-compose
- Responsive UI with light/dark theme support

### Technologies
- Backend: Node.js, TypeScript, Express.js, PostgreSQL
- Frontend: React, TypeScript, React Router
- DevOps: Docker, Docker Compose, Nginx

## [Unreleased]

## [1.1.0] - 2026-08-19

### Added
- **Улучшенный Markdown редактор**:
  - Live preview с возможностью разделенного вида
  - Панель инструментов для форматирования
  - Автосохранение черновиков в localStorage
  - Восстановление несохраненных черновиков
- **Полнотекстовый поиск PostgreSQL**:
  - Морфологический поиск с поддержкой русского языка
  - Весовые коэффициенты (заголовок > содержание > описание)
  - Сортировка результатов по релевантности (ts_rank)
  - Подсветка найденных фрагментов (ts_headline)
  - Автоматическое обновление индекса через триггеры
- **Система уведомлений**:
  - Уведомления об обновлениях статей
  - Подписки на изменения статей
  - Счетчик непрочитанных уведомлений
  - Поддержка упоминаний (@username)
  - REST API для управления уведомлениями
- **Audit Log (журнал действий)**:
  - Автоматическое логирование всех важных действий
  - Фильтрация логов по пользователю, действию, типу, дате
  - Сохранение IP адреса и User Agent
  - Экспорт логов в CSV
  - Админ-панель для просмотра логов
- **Скрипт миграций БД** (`npm run migrate`)
- CSS стили для Markdown preview

### Changed
- Улучшен поиск статей - теперь использует полнотекстовый индекс вместо ILIKE
- Обновлены страницы создания и редактирования статей для использования нового редактора

### Technical
- Добавлены миграции: 010_fulltext_search.sql, 011_audit_logs.sql, 012_notifications.sql
- Новые API endpoints: /api/notifications, /api/audit
- Middleware для audit logging
- Сервис уведомлений

## [1.0.0] - 2025-08-17

### Planned
- Email notifications for comments
- Real-time preview for Markdown editor
- Auto-save drafts
- Article templates
- Related articles recommendations
- RSS feed
- Two-factor authentication (2FA)
- API for external integrations
