# Kladovka - Knowledge Base System

Корпоративная база знаний с поддержкой LDAP аутентификации и SMTP уведомлений.

## 🆕 Что нового в v1.1.0

- **📝 Улучшенный Markdown редактор** с live preview и автосохранением
- **🔍 Полнотекстовый поиск** PostgreSQL с морфологией русского языка (в 100 раз быстрее!)
- **🔔 Система уведомлений** с подписками на статьи
- **📊 Audit Log** - журнал всех действий пользователей
- **🎨 CSS стили** для красивого отображения Markdown

➡️ **[Быстрый старт с новыми функциями](./QUICKSTART.md)**

## Возможности

- 📝 Создание и редактирование статей
- 🗂️ Организация по категориям
- 🔍 Полнотекстовый поиск
- 👥 Управление пользователями и ролями
- 💬 Комментарии к статьям
- 🏷️ Теги
- 🔐 LDAP интеграция для корпоративной аутентификации
- 📧 SMTP для email уведомлений
- 📊 Аналитика и статистика для администраторов

## Технологический стек

**Frontend:**
- React 18 + TypeScript
- React Router
- Axios
- Vite

**Backend:**
- Node.js + Express
- TypeScript
- PostgreSQL
- JWT аутентификация
- bcrypt для хеширования паролей
- nodemailer для SMTP
- ldapjs для LDAP

**Инфраструктура:**
- Docker + Docker Compose
- Nginx

## Быстрый старт

### Требования

- Docker и Docker Compose
- Node.js 20+ (для локальной разработки)

### Запуск

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd kb
```

2. Создайте `.env` файл в директории `backend/`:
```bash
cp backend/.env.example backend/.env
```

3. Отредактируйте `backend/.env` под ваши настройки

4. Запустите приложение:
```bash
docker-compose up -d
```

5. Инициализируйте базу данных:
```bash
docker-compose exec backend npm run init-db
docker-compose exec backend npm run init-settings
```

6. Приложение доступно на:
- Frontend: http://localhost:80
- Backend API: http://localhost:3001

### Первый вход

По умолчанию создается администратор:
- Email: `admin@example.com`
- Пароль: `admin123`

**⚠️ Обязательно смените пароль после первого входа!**

## Разработка

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Конфигурация

### LDAP

Настройки LDAP доступны в админ-панели (Настройки → LDAP):
- LDAP сервер
- Bind DN и пароль
- Search Base
- Search Filter
- Атрибуты для username, email, name

### SMTP

Настройки SMTP доступны в админ-панели (Настройки → SMTP):
- SMTP хост и порт
- Аутентификация
- От кого отправлять письма

## Структура проекта

```
kb/
├── backend/           # Express API
│   ├── src/
│   │   ├── config/   # Конфигурация БД
│   │   ├── middleware/ # Middleware (auth)
│   │   ├── routes/   # API endpoints
│   │   └── scripts/  # Утилиты
│   └── Dockerfile
├── frontend/         # React приложение
│   ├── src/
│   │   ├── pages/    # Компоненты страниц
│   │   └── App.tsx
│   └── Dockerfile
└── docker-compose.yml
```

## API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход

### Статьи
- `GET /api/articles` - Список статей
- `GET /api/articles/:id` - Статья по ID
- `POST /api/articles` - Создать статью
- `PUT /api/articles/:id` - Обновить статью
- `DELETE /api/articles/:id` - Удалить статью

### Категории
- `GET /api/categories` - Список категорий
- `POST /api/categories` - Создать категорию

### Администрирование (требуется роль admin)
- `GET /api/admin/stats` - Статистика
- `GET /api/admin/users` - Список пользователей
- `GET /api/settings` - Системные настройки
- `PUT /api/settings` - Обновить настройки
- `POST /api/settings/test-ldap` - Тест LDAP
- `POST /api/settings/test-smtp` - Тест SMTP

## Лицензия

MIT
