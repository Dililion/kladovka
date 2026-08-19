# Тестирование новых функций Kladovka v1.1.0

## Подготовка к тестированию

### 1. Применение миграций

```bash
cd backend
npm run migrate
```

Ожидаемый результат:
```
🔄 Running migrations...
📄 Running migration: 010_fulltext_search.sql
✅ Migration 010_fulltext_search.sql completed successfully
📄 Running migration: 011_audit_logs.sql
✅ Migration 011_audit_logs.sql completed successfully
📄 Running migration: 012_notifications.sql
✅ Migration 012_notifications.sql completed successfully
✅ All migrations completed successfully!
```

### 2. Перезапуск приложения

```bash
cd ..
docker-compose down
docker-compose up -d
```

---

## Тест 1: Улучшенный Markdown редактор

### Шаги:
1. Войдите в систему
2. Перейдите на страницу создания статьи
3. Проверьте наличие панели инструментов над редактором
4. Напишите текст и нажмите на кнопки форматирования:
   - **B** - жирный текст
   - *I* - курсив
   - `</>` - inline код
   - **H2**, **H3** - заголовки
5. Нажмите кнопку **Split** - должен появиться разделенный вид
6. Нажмите кнопку **Preview** - должен показаться только предпросмотр

### Тест автосохранения:
1. Напишите текст в редакторе
2. Подождите 2-3 секунды
3. Внизу должно появиться сообщение "💾 Черновик автоматически сохранен"
4. Закройте вкладку без сохранения
5. Откройте страницу создания статьи снова
6. Должно появиться диалоговое окно с предложением загрузить черновик

### Ожидаемый результат:
✅ Редактор работает с live preview
✅ Кнопки форматирования вставляют правильный Markdown
✅ Автосохранение работает
✅ Восстановление черновика работает

---

## Тест 2: Полнотекстовый поиск

### Подготовка:
1. Создайте несколько статей с русским текстом:
   - "Установка PostgreSQL на Ubuntu"
   - "Настройка базы данных"
   - "Миграции в PostgreSQL"

### Тест поиска:
```bash
# Проверка через API
curl "http://localhost:3001/api/articles/search?q=postgresql"
```

### Проверка через UI:
1. Перейдите на страницу поиска
2. Введите запрос: "postgresql"
3. Проверьте результаты

### Проверка морфологии:
Поиск по слову "база" должен находить статьи со словами:
- "база"
- "базы"
- "базой"
- "баз"

### Проверка в БД:
```sql
-- Подключитесь к БД
psql -U kb_user -d kb

-- Проверьте наличие search_vector
SELECT id, title, search_vector FROM articles LIMIT 1;

-- Проверьте поиск
SELECT title, ts_rank(search_vector, plainto_tsquery('russian', 'postgresql')) as rank
FROM articles
WHERE search_vector @@ plainto_tsquery('russian', 'postgresql')
ORDER BY rank DESC;
```

### Ожидаемый результат:
✅ Поиск находит статьи по русским словам в разных формах
✅ Результаты отсортированы по релевантности
✅ Поле `highlight` содержит фрагменты с найденными словами

---

## Тест 3: Система уведомлений

### Тест подписки:
```bash
# Получите токен после входа
TOKEN="your-jwt-token"

# Подпишитесь на статью (замените article-id)
curl -X POST "http://localhost:3001/api/notifications/subscribe/article-id" \
  -H "Authorization: Bearer $TOKEN"

# Проверьте статус подписки
curl "http://localhost:3001/api/notifications/subscribe/article-id" \
  -H "Authorization: Bearer $TOKEN"
```

### Тест уведомлений:
1. Пользователь A подписывается на статью пользователя B
2. Пользователь B обновляет статью
3. Пользователь A должен получить уведомление:
```bash
curl "http://localhost:3001/api/notifications" \
  -H "Authorization: Bearer $TOKEN_USER_A"
```

### Проверка в БД:
```sql
-- Проверьте таблицы
SELECT * FROM notifications WHERE user_id = 'user-uuid' ORDER BY created_at DESC;
SELECT * FROM article_subscriptions WHERE user_id = 'user-uuid';
```

### Тест счетчика непрочитанных:
```bash
curl "http://localhost:3001/api/notifications/unread-count" \
  -H "Authorization: Bearer $TOKEN"
```

### Тест отметки как прочитанное:
```bash
# Отметить одно уведомление
curl -X PUT "http://localhost:3001/api/notifications/1/read" \
  -H "Authorization: Bearer $TOKEN"

# Отметить все
curl -X PUT "http://localhost:3001/api/notifications/read-all" \
  -H "Authorization: Bearer $TOKEN"
```

### Ожидаемый результат:
✅ Подписка создается успешно
✅ Уведомление приходит при обновлении статьи
✅ Счетчик непрочитанных работает корректно
✅ Отметка как прочитанное работает

---

## Тест 4: Audit Log

### Требования:
Пользователь должен иметь роль `admin`

### Проверка логирования:
1. Создайте статью
2. Обновите статью
3. Удалите статью
4. Проверьте логи:

```bash
ADMIN_TOKEN="admin-jwt-token"

# Получить все логи
curl "http://localhost:3001/api/audit?page=1&limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Фильтровать по действию
curl "http://localhost:3001/api/audit?action=create_article" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Фильтровать по типу сущности
curl "http://localhost:3001/api/audit?entityType=article" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Фильтровать по дате
curl "http://localhost:3001/api/audit?dateFrom=2026-08-01&dateTo=2026-08-31" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Проверка в БД:
```sql
-- Проверьте логи
SELECT 
  id, username, action, entity_type, entity_id, 
  details, ip_address, created_at 
FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 20;

-- Логи по конкретному пользователю
SELECT * FROM audit_logs WHERE user_id = 'user-uuid' ORDER BY created_at DESC;

-- Логи по конкретной статье
SELECT * FROM audit_logs WHERE entity_type = 'article' AND entity_id = 'article-id';
```

### Тест экспорта CSV:
```bash
curl "http://localhost:3001/api/audit/export" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o audit-logs.csv
```

### Проверка сохраненных данных:
Каждая запись в логе должна содержать:
- ✅ user_id
- ✅ username
- ✅ action (create_article, update_article, delete_article)
- ✅ entity_type (article)
- ✅ entity_id
- ✅ details (JSON с заголовком и статусом)
- ✅ ip_address
- ✅ user_agent
- ✅ created_at

### Ожидаемый результат:
✅ Все действия логируются автоматически
✅ Фильтры работают корректно
✅ CSV экспорт содержит данные
✅ IP адрес и User Agent сохраняются

---

## Тест 5: Интеграция всех функций

### Сценарий:
1. **Создайте статью** с новым редактором:
   - Используйте панель инструментов
   - Проверьте live preview
   - Сохраните статью

2. **Проверьте audit log**:
   - Убедитесь что действие `create_article` залогировано

3. **Подпишитесь на статью** (другим пользователем)

4. **Обновите статью**:
   - Измените текст
   - Сохраните

5. **Проверьте уведомление**:
   - Второй пользователь должен получить уведомление

6. **Проверьте audit log**:
   - Должно быть действие `update_article`

7. **Выполните поиск**:
   - Найдите созданную статью через полнотекстовый поиск
   - Проверьте релевантность

---

## Устранение неполадок

### Проблема: Миграции не применяются
```bash
# Проверьте подключение к БД
psql -U kb_user -d kb -c "SELECT version();"

# Применить миграции вручную
psql -U kb_user -d kb -f backend/src/migrations/010_fulltext_search.sql
psql -U kb_user -d kb -f backend/src/migrations/011_audit_logs.sql
psql -U kb_user -d kb -f backend/src/migrations/012_notifications.sql
```

### Проблема: Полнотекстовый поиск не работает
```sql
-- Проверьте наличие колонки и индекса
\d+ articles

-- Должны быть:
-- Колонка: search_vector | tsvector
-- Индекс: idx_articles_search_vector | gin
-- Триггер: articles_search_vector_trigger

-- Обновите search_vector вручную
UPDATE articles SET search_vector = 
  setweight(to_tsvector('russian', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('russian', coalesce(content, '')), 'B') ||
  setweight(to_tsvector('russian', coalesce(excerpt, '')), 'C');
```

### Проблема: Уведомления не создаются
```sql
-- Проверьте таблицы
\dt notifications
\dt article_subscriptions

-- Проверьте подписки
SELECT * FROM article_subscriptions;

-- Добавьте подписку вручную
INSERT INTO article_subscriptions (user_id, article_id) 
VALUES ('user-uuid', 'article-uuid');
```

### Проблема: Audit logs не сохраняются
```sql
-- Проверьте таблицу
\d+ audit_logs

-- Проверьте права
SELECT has_table_privilege('kb_user', 'audit_logs', 'INSERT');

-- Добавьте запись вручную
INSERT INTO audit_logs (username, action, entity_type, entity_id)
VALUES ('test_user', 'test_action', 'test_entity', '123');
```

---

## Проверка производительности

### Полнотекстовый поиск vs ILIKE:
```sql
-- Старый способ (медленно)
EXPLAIN ANALYZE
SELECT * FROM articles 
WHERE title ILIKE '%postgresql%' OR content ILIKE '%postgresql%';

-- Новый способ (быстро)
EXPLAIN ANALYZE
SELECT * FROM articles 
WHERE search_vector @@ plainto_tsquery('russian', 'postgresql');
```

Ожидаемый результат:
- Полнотекстовый поиск должен быть **в 10-100 раз быстрее**
- Использует индекс `idx_articles_search_vector`

---

## Контрольный список завершения

- [ ] Миграции применены успешно
- [ ] Markdown редактор работает с live preview
- [ ] Автосохранение черновиков работает
- [ ] Полнотекстовый поиск находит статьи
- [ ] Подписка на статьи работает
- [ ] Уведомления создаются при обновлении статей
- [ ] Audit log сохраняет действия пользователей
- [ ] Фильтры в audit log работают
- [ ] CSV экспорт логов работает
- [ ] Все API endpoints отвечают корректно

---

## Отчет о проблемах

Если вы обнаружили проблемы, создайте issue с информацией:
- Описание проблемы
- Шаги для воспроизведения
- Ожидаемое поведение
- Фактическое поведение
- Логи из backend (docker-compose logs backend)
- Версия PostgreSQL
- Версия Node.js
