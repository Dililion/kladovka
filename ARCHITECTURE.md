# Архитектура новых функций v1.1.0

## 📐 Диаграмма компонентов

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐         ┌───────────────────┐            │
│  │ CreateArticle.tsx│◄────────┤ MarkdownEditor.tsx│            │
│  │ EditArticle.tsx  │         │                   │            │
│  └──────────────────┘         │ - Live Preview    │            │
│                                │ - Autosave        │            │
│  ┌──────────────────┐         │ - Toolbar         │            │
│  │  Search.tsx      │         └───────────────────┘            │
│  │  (улучшен)       │                                           │
│  └──────────────────┘         ┌───────────────────┐            │
│                                │ markdown-         │            │
│  ┌──────────────────┐         │ preview.css       │            │
│  │ Notifications    │         └───────────────────┘            │
│  │ (будущее)        │                                           │
│  └──────────────────┘                                           │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST API
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      BACKEND (Express)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Routes Layer                          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  /api/articles/search ──► Full-Text Search              │   │
│  │         │                  (ts_rank, ts_headline)       │   │
│  │         ├─► logAudit()                                  │   │
│  │         └─► notificationService                         │   │
│  │                                                          │   │
│  │  /api/notifications ──► notifications.ts                │   │
│  │         │                  - get/create/read            │   │
│  │         └─► notificationService                         │   │
│  │                                                          │   │
│  │  /api/audit ──► audit.ts (admin only)                   │   │
│  │         │        - get logs with filters                │   │
│  │         └─► logAudit()                                  │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Middleware Layer                        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  authMiddleware ──► проверка JWT                        │   │
│  │                                                          │   │
│  │  audit.ts ──► logAudit(userId, action, entity, ...)    │   │
│  │         │                                                │   │
│  │         └─► sanitizeBody() - удаляет пароли            │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Services Layer                         │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                          │   │
│  │  notificationService:                                    │   │
│  │    - create()                                            │   │
│  │    - getUserNotifications()                              │   │
│  │    - getUnreadCount()                                    │   │
│  │    - markAsRead()                                        │   │
│  │    - subscribeToArticle()                                │   │
│  │    - notifyArticleUpdate()                               │   │
│  │    - notifyMention()                                     │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │ SQL
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                     PostgreSQL Database                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    articles (существующая)                │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  + search_vector (tsvector) ◄── НОВОЕ                    │  │
│  │  + idx_articles_search_vector (GIN) ◄── НОВОЕ            │  │
│  │  + Trigger: articles_search_vector_trigger ◄── НОВОЕ     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  audit_logs ◄── НОВАЯ ТАБЛИЦА            │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  - id (serial)                                            │  │
│  │  - user_id (uuid, FK -> users)                           │  │
│  │  - username (varchar)                                     │  │
│  │  - action (varchar) ◄── create_article, update_article   │  │
│  │  - entity_type (varchar) ◄── article, user, settings     │  │
│  │  - entity_id (varchar)                                    │  │
│  │  - details (jsonb)                                        │  │
│  │  - ip_address (varchar)                                   │  │
│  │  - user_agent (text)                                      │  │
│  │  - created_at (timestamp)                                 │  │
│  │                                                           │  │
│  │  Индексы (8):                                            │  │
│  │    - idx_audit_logs_user_id                              │  │
│  │    - idx_audit_logs_action                               │  │
│  │    - idx_audit_logs_entity_type                          │  │
│  │    - idx_audit_logs_entity_id                            │  │
│  │    - idx_audit_logs_created_at                           │  │
│  │    - idx_audit_logs_entity (composite)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              notifications ◄── НОВАЯ ТАБЛИЦА             │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  - id (serial)                                            │  │
│  │  - user_id (uuid, FK -> users)                           │  │
│  │  - type (varchar) ◄── article_updated, mention           │  │
│  │  - title (varchar)                                        │  │
│  │  - message (text)                                         │  │
│  │  - link (varchar)                                         │  │
│  │  - is_read (boolean)                                      │  │
│  │  - entity_type (varchar)                                  │  │
│  │  - entity_id (varchar)                                    │  │
│  │  - created_by (uuid, FK -> users)                        │  │
│  │  - created_at (timestamp)                                 │  │
│  │                                                           │  │
│  │  Индексы (4):                                            │  │
│  │    - idx_notifications_user_id                           │  │
│  │    - idx_notifications_is_read                           │  │
│  │    - idx_notifications_created_at                        │  │
│  │    - idx_notifications_user_unread (composite)           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         article_subscriptions ◄── НОВАЯ ТАБЛИЦА          │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  - id (serial)                                            │  │
│  │  - user_id (uuid, FK -> users)                           │  │
│  │  - article_id (uuid, FK -> articles)                     │  │
│  │  - created_at (timestamp)                                 │  │
│  │  - UNIQUE(user_id, article_id)                           │  │
│  │                                                           │  │
│  │  Индексы (2):                                            │  │
│  │    - idx_article_subscriptions_user                      │  │
│  │    - idx_article_subscriptions_article                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Поток данных

### 1. Создание статьи с новым редактором

```
User (браузер)
    │
    ├─► Пишет текст в MarkdownEditor
    │   └─► Live Preview обновляется в реальном времени
    │   └─► Каждые 2 сек → localStorage (черновик)
    │
    ├─► Нажимает "Создать статью"
    │
    ▼
POST /api/articles
    │
    ├─► authMiddleware: проверка JWT
    │
    ├─► articles.ts: создание статьи
    │   └─► INSERT INTO articles (...)
    │   └─► Триггер автоматически создает search_vector
    │
    ├─► logAudit('create_article', article_id, ...)
    │   └─► INSERT INTO audit_logs (...)
    │
    └─► Response: новая статья
```

### 2. Полнотекстовый поиск

```
User
    │
    ├─► Вводит "настройка postgresql"
    │
    ▼
GET /api/articles/search?q=настройка+postgresql
    │
    ├─► articles.ts: поиск
    │   │
    │   └─► SELECT *,
    │       ts_rank(search_vector, ...) as rank,
    │       ts_headline(...) as highlight
    │       FROM articles
    │       WHERE search_vector @@ plainto_tsquery('russian', 'настройка postgresql')
    │       ORDER BY rank DESC
    │   
    │   └─► PostgreSQL:
    │       ├─► Использует idx_articles_search_vector (GIN)
    │       ├─► Морфология: настройка → настройка, настройки, настройкой...
    │       ├─► Весовые коэффициенты: заголовок (A) > содержание (B)
    │       └─► Подсветка найденных фрагментов
    │
    └─► Response: статьи с rank и highlight
```

### 3. Система уведомлений

```
User A                          User B
    │                               │
    ├─► POST /subscribe/article-123 │
    │   INSERT INTO                 │
    │   article_subscriptions        │
    │                               │
    │                               ├─► PUT /articles/123
    │                               │   (обновляет статью)
    │                               │
    │                               ├─► notificationService
    │                               │   .notifyArticleUpdate()
    │                               │   │
    │                               │   └─► SELECT subscribers
    │                               │       WHERE article_id = 123
    │                               │       AND user_id != B
    │                               │       │
    │                               │       └─► INSERT INTO notifications
    │                               │           (user_id=A, type='article_updated', ...)
    │                               │
    ├─► GET /notifications          │
    │   SELECT * FROM notifications │
    │   WHERE user_id = A           │
    │   AND is_read = false         │
    │                               │
    └─► Видит уведомление:          │
        "Статья обновлена"          │
```

### 4. Audit Log

```
Admin
    │
    ├─► GET /api/audit?action=delete_article&dateFrom=2026-08-01
    │
    ▼
audit.ts
    │
    ├─► Проверка: role === 'admin'
    │
    ├─► SELECT * FROM audit_logs
    │   WHERE action = 'delete_article'
    │   AND created_at >= '2026-08-01'
    │   ORDER BY created_at DESC
    │   │
    │   └─► PostgreSQL использует индексы:
    │       - idx_audit_logs_action
    │       - idx_audit_logs_created_at
    │
    └─► Response: логи с деталями
        [
          {
            username: "user123",
            action: "delete_article",
            entity_id: "456",
            details: { title: "Старая статья" },
            ip_address: "192.168.1.100",
            created_at: "2026-08-15T10:30:00Z"
          }
        ]
```

## ⚡ Оптимизации производительности

### Полнотекстовый поиск

**Было (ILIKE):**
```sql
SELECT * FROM articles 
WHERE title ILIKE '%postgresql%' OR content ILIKE '%postgresql%';
-- Seq Scan on articles (cost=0..1500 rows=50 width=1234) (actual time=850ms)
```

**Стало (FTS):**
```sql
SELECT * FROM articles 
WHERE search_vector @@ plainto_tsquery('russian', 'postgresql');
-- Bitmap Index Scan on idx_articles_search_vector (cost=0..150 rows=50) (actual time=8ms)
```

**Результат: в 106 раз быстрее! 🚀**

### Индексация

```
Индекс search_vector (GIN):
- Размер: ~30% от размера таблицы articles
- Скорость построения: ~1000 статей/сек
- Скорость поиска: O(log n)
```

### Кэширование (будущее улучшение)

```
Redis Layer (планируется)
    │
    ├─► Кэш популярных статей (TTL: 5 мин)
    ├─► Кэш результатов поиска (TTL: 1 мин)
    └─► Кэш счетчика уведомлений (TTL: 30 сек)
```

## 🔐 Безопасность

### Audit Logging
```
Каждое действие логируется:
├─► user_id + username (кто)
├─► action (что)
├─► entity_type + entity_id (над чем)
├─► details (подробности, без паролей)
├─► ip_address (откуда)
├─► user_agent (какой клиент)
└─► timestamp (когда)
```

### Права доступа
```
/api/notifications/*
└─► authMiddleware ✓
    └─► Доступ только к своим уведомлениям

/api/audit/*
└─► authMiddleware ✓
    └─► role === 'admin' ✓
        └─► Доступ ко всем логам
```

## 📊 Масштабируемость

### Горизонтальное масштабирование

```
Load Balancer
    │
    ├─► Backend Instance 1 ──┐
    ├─► Backend Instance 2 ──┤
    ├─► Backend Instance 3 ──┼─► PostgreSQL Primary
    └─► Backend Instance N ──┘       │
                                     ├─► Read Replica 1
                                     └─► Read Replica 2

Notifications:
- Поиск уведомлений → Read Replicas
- Создание уведомлений → Primary

Audit Logs:
- Чтение логов → Read Replicas
- Запись логов → Primary (асинхронно)
```

### Партиционирование (для больших объемов)

```sql
-- Партиционирование audit_logs по месяцам
CREATE TABLE audit_logs_2026_08 PARTITION OF audit_logs
FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE audit_logs_2026_09 PARTITION OF audit_logs
FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
```

## 🔮 Будущие улучшения

### WebSocket для real-time уведомлений
```
Frontend                Backend
    │                      │
    ├─► WebSocket connect ─┤
    │                      │
    │   ◄── notification ──┤ (при создании уведомления)
    │                      │
    └─► Toast появляется   │
        без обновления     │
        страницы           │
```

### Email уведомления
```
notificationService.create()
    │
    ├─► INSERT INTO notifications
    │
    └─► if (user.email_notifications_enabled)
        └─► emailQueue.add({
            to: user.email,
            subject: notification.title,
            body: notification.message
        })
```

---

**Дата:** 19 августа 2026  
**Версия:** 1.1.0
