# 🗺️ Roadmap v1.2.0

План развития Kladovka Knowledge Base - версия 1.2.0

---

## 🎯 Цели релиза v1.2.0

Сделать систему более гибкой, безопасной и интегрируемой.

**Основные направления:**
- 🎨 Улучшенный UX (темная тема)
- 🔐 Продвинутая безопасность (2FA, детальные права)
- 🔌 Интеграции (REST API, импорт/экспорт)
- 💾 Надежность (backup система)

---

## 📋 Список задач

### 1. 🎨 Темная/Светлая тема

**Приоритет:** HIGH  
**Сложность:** LOW  
**Время:** 2-3 дня

**Что нужно:**
- [ ] Создать CSS переменные для цветов
- [ ] Реализовать переключатель темы в Header
- [ ] Сохранять выбор в localStorage
- [ ] Применить темную палитру ко всем компонентам
- [ ] Поддержка system preference (auto)
- [ ] Плавный переход между темами

**Файлы:**
- `frontend/src/index.css` - CSS переменные
- `frontend/src/components/Header.tsx` - переключатель
- Все компоненты в `frontend/src/pages/`

---

### 2. 🔌 REST API + OpenAPI

**Приоритет:** HIGH  
**Сложность:** MEDIUM  
**Время:** 4-5 дней

**Что нужно:**
- [ ] API ключи для пользователей (генерация, хранение хешей)
- [ ] Middleware для проверки API ключей
- [ ] Документация OpenAPI/Swagger
- [ ] Swagger UI на `/api/docs`
- [ ] Rate limiting для API
- [ ] CORS настройки для API
- [ ] Примеры использования API

**Файлы:**
- `backend/src/routes/api-keys.ts` - управление ключами
- `backend/src/middleware/apiAuth.ts` - проверка ключей
- `backend/src/swagger.ts` - OpenAPI spec
- `backend/package.json` - добавить swagger-ui-express

**API endpoints для добавления:**
```
GET    /api/v1/articles
GET    /api/v1/articles/:id
POST   /api/v1/articles
PUT    /api/v1/articles/:id
DELETE /api/v1/articles/:id
GET    /api/v1/categories
POST   /api/v1/categories
GET    /api/v1/search?q=...
GET    /api/v1/user/profile
POST   /api/v1/user/api-keys
DELETE /api/v1/user/api-keys/:id
```

---

### 3. 🔐 Двухфакторная аутентификация (2FA)

**Приоритет:** HIGH  
**Сложность:** MEDIUM  
**Время:** 3-4 дня

**Что нужно:**
- [ ] TOTP генерация (speakeasy/otplib)
- [ ] QR код для Google Authenticator
- [ ] Проверка кодов при логине
- [ ] Backup коды (10 одноразовых)
- [ ] Страница настройки 2FA в профиле
- [ ] Опция "доверенное устройство" (30 дней)
- [ ] Recovery через email

**Файлы:**
- `backend/src/migrations/010_add_2fa.sql`
- `backend/src/routes/auth.ts` - логика 2FA
- `frontend/src/pages/TwoFactorSetup.tsx`
- `frontend/src/pages/Login.tsx` - добавить проверку 2FA
- `backend/package.json` - добавить speakeasy, qrcode

**Таблица БД:**
```sql
ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN two_factor_backup_codes TEXT;
```

---

### 4. 👥 Детальные права доступа

**Приоритет:** HIGH  
**Сложность:** HIGH  
**Время:** 5-7 дней

**Что нужно:**
- [ ] Роли: viewer, editor, moderator, admin
- [ ] Права на уровне категорий
- [ ] Приватные статьи (только автор или группа)
- [ ] Группы пользователей
- [ ] Middleware проверки прав
- [ ] UI управления правами в админ-панели
- [ ] Наследование прав (категория → статьи)

**Файлы:**
- `backend/src/migrations/011_permissions.sql`
- `backend/src/middleware/permissions.ts`
- `backend/src/routes/permissions.ts`
- `frontend/src/pages/PermissionsManager.tsx`

**Таблицы БД:**
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB
);

CREATE TABLE user_roles (
  user_id INTEGER REFERENCES users(id),
  role_id INTEGER REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE category_permissions (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id),
  role_id INTEGER REFERENCES roles(id),
  can_read BOOLEAN DEFAULT true,
  can_write BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false
);

CREATE TABLE article_permissions (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id),
  user_id INTEGER REFERENCES users(id),
  group_id INTEGER REFERENCES groups(id),
  permission_type VARCHAR(20) -- 'owner', 'editor', 'viewer'
);
```

---

### 5. 📥 Импорт контента

**Приоритет:** MEDIUM  
**Сложность:** MEDIUM  
**Время:** 4-5 дней

**Что нужно:**
- [ ] Импорт из Markdown файлов (ZIP upload)
- [ ] Импорт из Confluence (XML export)
- [ ] Импорт из JSON (структурированный формат)
- [ ] Preview перед импортом
- [ ] Маппинг категорий при импорте
- [ ] Обработка изображений в импорте
- [ ] Progress bar для больших импортов

**Файлы:**
- `backend/src/routes/import.ts`
- `backend/src/services/importers/markdown.ts`
- `backend/src/services/importers/confluence.ts`
- `frontend/src/pages/Import.tsx`

**API endpoints:**
```
POST /api/import/markdown - загрузить ZIP с .md
POST /api/import/confluence - загрузить XML
POST /api/import/json - загрузить JSON
GET  /api/import/:id/preview - preview импорта
POST /api/import/:id/confirm - подтвердить импорт
```

---

### 6. 📤 Расширенный экспорт

**Приоритет:** MEDIUM  
**Сложность:** LOW  
**Время:** 2-3 дня

**Что нужно:**
- [ ] Экспорт категории целиком (ZIP с Markdown)
- [ ] Экспорт с вложениями (изображения, файлы)
- [ ] Экспорт в HTML (static site)
- [ ] Экспорт в JSON (структурированный)
- [ ] Bulk export (выбрать несколько статей)
- [ ] Scheduled exports (cron)

**Файлы:**
- `backend/src/routes/export.ts` - расширить
- `backend/src/services/exporters/category.ts`
- `backend/src/services/exporters/html-site.ts`
- `frontend/src/pages/Export.tsx`

---

### 7. 💾 Система бэкапов

**Приоритет:** MEDIUM  
**Сложность:** MEDIUM  
**Время:** 3-4 дня

**Что нужно:**
- [ ] Автоматический backup БД (pg_dump)
- [ ] Backup загруженных файлов
- [ ] Настройка расписания (ежедневно/еженедельно)
- [ ] Хранение backup (локально/S3)
- [ ] Restore из backup
- [ ] Ротация backup (хранить последние N)
- [ ] Email уведомления об успехе/ошибке

**Файлы:**
- `backend/src/services/backup.ts`
- `backend/src/routes/backup.ts`
- `backend/src/scripts/backup-cron.ts`
- `frontend/src/pages/AdminBackup.tsx`

**Конфигурация (.env):**
```env
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * * # 2 AM daily
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE=local # local|s3
BACKUP_S3_BUCKET=my-kb-backups
```

---

## 📅 Timeline

**Фаза 1 (неделя 1-2):**
- ✅ Темная тема
- ✅ REST API base + OpenAPI

**Фаза 2 (неделя 3-4):**
- ✅ 2FA
- ✅ Детальные права доступа

**Фаза 3 (неделя 5-6):**
- ✅ Импорт контента
- ✅ Расширенный экспорт
- ✅ Система бэкапов

**Итого:** ~6 недель разработки

---

## 🧪 Тестирование

Для каждой фичи нужны:
- [ ] Unit тесты (backend)
- [ ] Integration тесты (API)
- [ ] E2E тесты (frontend + backend)
- [ ] Security аудит (для 2FA и прав доступа)
- [ ] Performance тесты (для импорта больших объемов)

---

## 📝 Документация

После реализации обновить:
- [ ] README.md - новые фичи
- [ ] QUICKSTART.md - настройка 2FA, API ключей
- [ ] API_DOCUMENTATION.md - создать
- [ ] INSTALL.md - добавить настройку бэкапов
- [ ] CHANGELOG.md - полный список изменений v1.2.0

---

## 🚀 Deployment

Перед релизом v1.2.0:
- [ ] Миграции БД протестированы
- [ ] Обратная совместимость с v1.1.0
- [ ] Документация обновлена
- [ ] Docker образы собраны
- [ ] CI/CD тесты проходят
- [ ] Security scan пройден
- [ ] Performance benchmarks проверены

---

## 💡 Опциональные фичи (если останется время)

- Webhooks для событий
- Slack/Discord уведомления
- Диаграммы Mermaid в Markdown
- PWA (Progressive Web App)
- Mentions в комментариях (@username)
- Шаблоны статей

---

**Начало разработки:** 2026-08-19  
**Планируемый релиз:** 2026-10-01 (v1.2.0)
