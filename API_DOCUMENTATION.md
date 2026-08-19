# 🔌 REST API Документация

Kladovka предоставляет REST API для интеграции с внешними приложениями.

---

## 🔐 Аутентификация

Для доступа к API необходим API ключ. Создайте его в интерфейсе: **🔑 API** → **Создать новый ключ**

### Два способа передачи ключа:

**1. В заголовке Authorization (рекомендуется):**
```bash
curl -H "Authorization: Bearer kb_xxxxxxxxxxxxxxxx" \
  http://localhost:3001/api/v1/articles
```

**2. В query параметре:**
```bash
curl "http://localhost:3001/api/v1/articles?api_key=kb_xxxxxxxxxxxxxxxx"
```

---

## 📚 Endpoints

### Статьи

#### GET /api/v1/articles
Получить список статей с пагинацией

**Query параметры:**
- `page` (number) - номер страницы, по умолчанию 1
- `limit` (number) - количество на странице, по умолчанию 20, максимум 100
- `category_id` (number) - фильтр по категории

**Пример запроса:**
```bash
curl -H "Authorization: Bearer kb_xxxxx" \
  "http://localhost:3001/api/v1/articles?page=1&limit=10&category_id=5"
```

**Ответ:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Заголовок статьи",
      "slug": "zagolovok-stati",
      "content": "Содержание статьи...",
      "category_id": 5,
      "created_at": "2026-08-19T10:00:00Z",
      "updated_at": "2026-08-19T10:00:00Z",
      "views": 42,
      "author_name": "Иван Иванов",
      "author_email": "ivan@example.com",
      "category_name": "Документация"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  }
}
```

---

#### GET /api/v1/articles/:id
Получить статью по ID

**Пример:**
```bash
curl -H "Authorization: Bearer kb_xxxxx" \
  http://localhost:3001/api/v1/articles/42
```

**Ответ:**
```json
{
  "id": 42,
  "title": "Заголовок статьи",
  "slug": "zagolovok-stati",
  "content": "Полное содержание статьи в Markdown формате...",
  "category_id": 5,
  "created_at": "2026-08-19T10:00:00Z",
  "updated_at": "2026-08-19T10:00:00Z",
  "views": 42,
  "author_id": 10,
  "author_name": "Иван Иванов",
  "author_email": "ivan@example.com",
  "category_name": "Документация",
  "tags": [
    {"id": 1, "name": "api"},
    {"id": 2, "name": "rest"}
  ]
}
```

---

#### POST /api/v1/articles
Создать новую статью

**Body (JSON):**
```json
{
  "title": "Новая статья",
  "content": "Содержание в **Markdown**",
  "category_id": 5,
  "tags": ["api", "tutorial"]
}
```

**Пример:**
```bash
curl -X POST \
  -H "Authorization: Bearer kb_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"title":"Новая статья","content":"Содержание"}' \
  http://localhost:3001/api/v1/articles
```

**Ответ (201 Created):**
```json
{
  "id": 150,
  "title": "Новая статья",
  "slug": "novaya-statya",
  "content": "Содержание в **Markdown**",
  "category_id": 5,
  "created_at": "2026-08-19T15:30:00Z",
  "updated_at": "2026-08-19T15:30:00Z"
}
```

---

#### PUT /api/v1/articles/:id
Обновить статью

**Права:** только автор статьи или администратор

**Body (JSON):**
```json
{
  "title": "Обновленный заголовок",
  "content": "Обновленное содержание",
  "category_id": 6
}
```

**Пример:**
```bash
curl -X PUT \
  -H "Authorization: Bearer kb_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"title":"Обновленный заголовок","content":"Новое содержание"}' \
  http://localhost:3001/api/v1/articles/150
```

---

#### DELETE /api/v1/articles/:id
Удалить статью

**Права:** только автор статьи или администратор

**Пример:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer kb_xxxxx" \
  http://localhost:3001/api/v1/articles/150
```

**Ответ (200 OK):**
```json
{
  "message": "Article deleted successfully"
}
```

---

### Категории

#### GET /api/v1/categories
Получить список всех категорий

**Пример:**
```bash
curl -H "Authorization: Bearer kb_xxxxx" \
  http://localhost:3001/api/v1/categories
```

**Ответ:**
```json
[
  {
    "id": 1,
    "name": "Документация",
    "description": "Техническая документация",
    "created_at": "2026-08-01T10:00:00Z",
    "article_count": 42
  },
  {
    "id": 2,
    "name": "FAQ",
    "description": "Часто задаваемые вопросы",
    "created_at": "2026-08-01T10:00:00Z",
    "article_count": 18
  }
]
```

---

#### POST /api/v1/categories
Создать новую категорию

**Права:** только администратор

**Body (JSON):**
```json
{
  "name": "Новая категория",
  "description": "Описание категории"
}
```

**Пример:**
```bash
curl -X POST \
  -H "Authorization: Bearer kb_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"name":"Новая категория","description":"Описание"}' \
  http://localhost:3001/api/v1/categories
```

---

### Поиск

#### GET /api/v1/search
Полнотекстовый поиск по статьям

**Query параметры:**
- `q` (string, required) - поисковый запрос
- `page` (number) - номер страницы, по умолчанию 1
- `limit` (number) - количество на странице, по умолчанию 20, максимум 100

**Пример:**
```bash
curl -H "Authorization: Bearer kb_xxxxx" \
  "http://localhost:3001/api/v1/search?q=docker+deployment"
```

**Ответ:**
```json
{
  "data": [
    {
      "id": 42,
      "title": "Docker Deployment Guide",
      "slug": "docker-deployment-guide",
      "snippet": "...deploy your application using <b>Docker</b>...",
      "created_at": "2026-08-19T10:00:00Z",
      "updated_at": "2026-08-19T10:00:00Z",
      "author_name": "Иван Иванов",
      "category_name": "Документация",
      "rank": 0.845
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  },
  "query": "docker deployment"
}
```

---

### Пользователь

#### GET /api/v1/user/profile
Получить профиль текущего пользователя (владельца API ключа)

**Пример:**
```bash
curl -H "Authorization: Bearer kb_xxxxx" \
  http://localhost:3001/api/v1/user/profile
```

**Ответ:**
```json
{
  "id": 10,
  "name": "Иван Иванов",
  "email": "ivan@example.com",
  "role": "user",
  "created_at": "2026-01-15T10:00:00Z"
}
```

---

## 🚦 Rate Limiting

API имеет ограничения на количество запросов:
- **100 запросов в 15 минут** на один API ключ

При превышении лимита вернется ошибка 429:
```json
{
  "message": "Слишком много запросов, попробуйте позже"
}
```

---

## ❌ Обработка ошибок

Все ошибки возвращаются в формате:
```json
{
  "error": "Краткое описание ошибки",
  "message": "Подробное описание"
}
```

### HTTP коды ответов:

- `200` - Успех
- `201` - Создано
- `400` - Неверный запрос
- `401` - Не авторизован (неверный или отсутствующий API ключ)
- `403` - Доступ запрещен (недостаточно прав)
- `404` - Не найдено
- `429` - Слишком много запросов (rate limit)
- `500` - Внутренняя ошибка сервера

---

## 📊 Примеры использования

### Python

```python
import requests

API_KEY = "kb_xxxxxxxxxxxxxxxx"
BASE_URL = "http://localhost:3001/api/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Получить список статей
response = requests.get(f"{BASE_URL}/articles", headers=headers)
articles = response.json()

# Создать статью
new_article = {
    "title": "Новая статья из Python",
    "content": "Содержание статьи",
    "category_id": 1,
    "tags": ["python", "api"]
}
response = requests.post(f"{BASE_URL}/articles", json=new_article, headers=headers)
created = response.json()
print(f"Создана статья с ID: {created['id']}")
```

### JavaScript (Node.js)

```javascript
const axios = require('axios');

const API_KEY = 'kb_xxxxxxxxxxxxxxxx';
const BASE_URL = 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Получить список статей
async function getArticles() {
  const response = await api.get('/articles?page=1&limit=10');
  return response.data;
}

// Создать статью
async function createArticle(title, content) {
  const response = await api.post('/articles', {
    title,
    content,
    tags: ['javascript', 'api']
  });
  return response.data;
}

// Поиск
async function search(query) {
  const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
  return response.data;
}
```

### PHP

```php
<?php

$apiKey = 'kb_xxxxxxxxxxxxxxxx';
$baseUrl = 'http://localhost:3001/api/v1';

// Получить список статей
$ch = curl_init("$baseUrl/articles");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $apiKey",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$articles = json_decode($response, true);
curl_close($ch);

// Создать статью
$newArticle = [
    'title' => 'Новая статья из PHP',
    'content' => 'Содержание статьи',
    'tags' => ['php', 'api']
];

$ch = curl_init("$baseUrl/articles");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $apiKey",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($newArticle));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$created = json_decode($response, true);
curl_close($ch);

echo "Создана статья с ID: " . $created['id'];
```

---

## 🔒 Безопасность

**Рекомендации:**

1. **Храните API ключи в безопасности** - никогда не коммитьте их в git
2. **Используйте переменные окружения** для хранения ключей
3. **Создавайте отдельные ключи** для разных приложений
4. **Удаляйте неиспользуемые ключи**
5. **Устанавливайте срок действия** для временных интеграций
6. **Используйте HTTPS** в продакшене

---

## 📈 Мониторинг использования

Статистика использования API доступна в интерфейсе:
**🔑 API** → выберите ключ → **Статистика**

Вы увидите:
- Количество запросов по дням
- Среднее время ответа
- Количество ошибок

---

## 🆘 Поддержка

Если у вас возникли проблемы с API:

1. Проверьте что API ключ активен и не истек
2. Проверьте формат запроса (Content-Type: application/json)
3. Проверьте лимиты запросов
4. Посмотрите логи: `docker compose logs backend`

---

**Версия API:** v1  
**Последнее обновление:** 2026-08-19
