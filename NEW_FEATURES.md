# Новые функции в Kladovka v1.1.0

## 🎨 Улучшенный Markdown редактор

### Возможности:
- **Live Preview** - предпросмотр в реальном времени
- **Разделенный вид** - редактор и предпросмотр одновременно
- **Панель инструментов** с кнопками для форматирования:
  - Жирный текст (**B**)
  - Курсив (*I*)
  - Inline код (`</>`)
  - Блок кода (`{ }`)
  - Заголовки (H2, H3)
  - Ссылки (🔗)
  - Списки (• List)
  - Цитаты (❝ Quote)
  - Разделитель (─)
- **Автосохранение черновиков** - автоматически сохраняет в localStorage каждые 2 секунды
- **Восстановление черновиков** - при повторном открытии предлагает загрузить несохраненный черновик

### Использование:
Новый редактор автоматически используется на страницах создания и редактирования статей.

---

## 🔍 Полнотекстовый поиск PostgreSQL

### Возможности:
- **Морфологический поиск** - поддержка русского языка через `to_tsvector`
- **Весовые коэффициенты**:
  - Заголовок (вес A) - самый важный
  - Содержание (вес B)
  - Краткое описание (вес C)
- **Сортировка по релевантности** - результаты упорядочены по `ts_rank`
- **Подсветка найденных фрагментов** - через `ts_headline`
- **Автоматическое обновление** - триггер автоматически обновляет `search_vector` при изменении статьи

### API:
```bash
GET /api/articles/search?q=поисковый+запрос
```

Результаты включают поля:
- `rank` - релевантность результата (0.0 - 1.0)
- `highlight` - фрагменты текста с подсветкой найденных слов

### Применение миграции:
```bash
cd backend
npm run migrate
```

---

## 🔔 Система уведомлений

### Возможности:
- **Типы уведомлений**:
  - Обновление статьи (для подписчиков)
  - Упоминания (@username)
  - Пользовательские уведомления
- **Подписки на статьи** - пользователи могут подписаться на обновления конкретных статей
- **Счетчик непрочитанных** - отображение количества новых уведомлений
- **Отметка как прочитанное** - индивидуально или все сразу

### API Endpoints:

#### Получить уведомления
```bash
GET /api/notifications?page=1&limit=20
Authorization: Bearer <token>
```

#### Получить количество непрочитанных
```bash
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

#### Отметить как прочитанное
```bash
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

#### Отметить все как прочитанные
```bash
PUT /api/notifications/read-all
Authorization: Bearer <token>
```

#### Подписаться на статью
```bash
POST /api/notifications/subscribe/:articleId
Authorization: Bearer <token>
```

#### Отписаться от статьи
```bash
DELETE /api/notifications/subscribe/:articleId
Authorization: Bearer <token>
```

#### Проверить статус подписки
```bash
GET /api/notifications/subscribe/:articleId
Authorization: Bearer <token>
```

### Пример использования:
```javascript
// Подписаться на статью
await fetch('/api/notifications/subscribe/123', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// При обновлении статьи все подписчики получат уведомление
```

---

## 📊 Audit Log (Журнал действий)

### Возможности:
- **Автоматическое логирование** всех важных действий:
  - Создание/обновление/удаление статей
  - Вход/регистрация пользователей
  - Изменение настроек
- **Сохраняемая информация**:
  - Пользователь (ID и имя)
  - Действие (create_article, update_article, delete_article, и т.д.)
  - Тип сущности (article, user, settings)
  - ID сущности
  - Детали действия (JSON)
  - IP адрес
  - User Agent
  - Время действия
- **Фильтрация логов** по:
  - Пользователю
  - Действию
  - Типу сущности
  - ID сущности
  - Диапазону дат
- **Экспорт в CSV** - выгрузка логов для анализа

### API Endpoints (только для администраторов):

#### Получить логи
```bash
GET /api/audit?page=1&limit=50&userId=<uuid>&action=create_article&entityType=article&dateFrom=2024-01-01&dateTo=2024-12-31
Authorization: Bearer <admin-token>
```

#### Получить список доступных действий
```bash
GET /api/audit/actions
Authorization: Bearer <admin-token>
```

#### Получить список типов сущностей
```bash
GET /api/audit/entity-types
Authorization: Bearer <admin-token>
```

#### Экспортировать логи в CSV
```bash
GET /api/audit/export
Authorization: Bearer <admin-token>
```

### Использование в коде:
```typescript
import { logAudit } from '../middleware/audit.js';

// Логировать действие
await logAudit(
  userId,
  username,
  'create_article',
  'article',
  articleId,
  { title: 'Заголовок статьи', status: 'published' },
  req
);
```

---

## 🚀 Установка и применение обновлений

### 1. Обновить зависимости (если нужно)
```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Применить миграции базы данных
```bash
cd backend
npm run migrate
```

Или вручную:
```bash
psql -U kb_user -d kb -f src/migrations/010_fulltext_search.sql
psql -U kb_user -d kb -f src/migrations/011_audit_logs.sql
psql -U kb_user -d kb -f src/migrations/012_notifications.sql
```

### 3. Перезапустить приложение
```bash
# Остановить контейнеры
docker-compose down

# Запустить заново
docker-compose up -d

# Или без Docker
cd backend && npm run dev
cd frontend && npm run dev
```

---

## 📝 Изменения в package.json

Добавьте скрипт для миграций в `backend/package.json`:

```json
{
  "scripts": {
    "migrate": "tsx src/scripts/migrate.ts"
  }
}
```

---

## 🎯 Что дальше?

Следующие возможные улучшения:
1. **WebSocket** для уведомлений в реальном времени
2. **Swagger/OpenAPI документация** для API
3. **Webhooks** для интеграции с внешними системами
4. **Связи между статьями** (граф знаний)
5. **Шаблоны статей**
6. **Резервное копирование** (автоматический бэкап)
7. **Мультиязычность (i18n)**
8. **OAuth2 / SSO**

---

## 🐛 Troubleshooting

### Ошибка при применении миграций
Если миграция не применяется из-за того что объекты уже существуют, это нормально - скрипт их пропустит.

### Полнотекстовый поиск не работает
Убедитесь что:
1. Миграция 010 применена
2. Триггер создан: `\d+ articles` должен показывать `articles_search_vector_trigger`
3. Колонка `search_vector` заполнена: `SELECT search_vector FROM articles LIMIT 1;`

### Уведомления не приходят
Проверьте:
1. Таблицы созданы: `\dt notifications`
2. Подписка оформлена: `SELECT * FROM article_subscriptions WHERE user_id = '<your-id>';`
3. Backend логи на наличие ошибок

---

## 📄 Лицензия

MIT - как и основной проект
