# Kladovka - Knowledge Base System

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)
![Docker](https://img.shields.io/badge/docker-required-blue.svg)

Современная система управления знаниями (Knowledge Base) с поддержкой Markdown, категорий, тегов, версионирования и аналитики.

## 🚀 Особенности

### Основные возможности
- **Markdown редактор** с поддержкой форматирования и предпросмотра
- **Иерархическая структура** - папки и вложенные статьи
- **Категории и теги** для организации контента
- **Полнотекстовый поиск** с фильтрами по автору, категориям, тегам и датам
- **Версионирование** - автоматическое сохранение истории изменений с возможностью восстановления
- **Права доступа** - публичные и приватные статьи
- **Комментарии** с возможностью модерации

### Продвинутые функции
- **Загрузка файлов** - изображения, PDF, Office документы (Word, Excel, PowerPoint), архивы (до 50MB)
- **Избранное/Закладки** для быстрого доступа к важным статьям
- **Экспорт** статей в Markdown и PDF форматы
- **Аналитика** для администраторов:
  - Статистика по статьям, пользователям, комментариям
  - График активности за 30 дней
  - Популярные теги и статьи
  - Активность пользователей
- **Админ-панель**:
  - Управление пользователями (смена роли, блокировка)
  - Управление статьями и комментариями
  - Управление категориями и папками

### Безопасность
- JWT аутентификация
- Хеширование паролей (bcrypt)
- Восстановление пароля через email
- Блокировка пользователей
- Проверка прав доступа на уровне middleware

## 🛠 Технологический стек

### Backend
- **Node.js** + **TypeScript**
- **Express.js** - веб-фреймворк
- **PostgreSQL** - база данных
- **JWT** - аутентификация
- **Multer** - загрузка файлов
- **Nodemailer** - отправка email

### Frontend
- **React** + **TypeScript**
- **React Router** - маршрутизация
- **Axios** - HTTP клиент
- **React Markdown** - рендеринг Markdown
- **html2canvas** + **jsPDF** - экспорт в PDF

### DevOps
- **Docker** + **Docker Compose**
- **Nginx** - reverse proxy для frontend
- Автоматическая сборка и деплой

## 📦 Установка и запуск

### Требования
- Docker и Docker Compose
- Node.js 20+ (для разработки)

### Быстрый старт

1. Клонируйте репозиторий:
```bash
git clone https://github.com/YOUR_USERNAME/kladovka.git
cd kladovka
```

2. Создайте файл `.env` в директории `backend`:
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/kladovka
JWT_SECRET=your-secret-key-change-in-production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FRONTEND_URL=http://localhost
```

3. Запустите приложение:
```bash
./start.sh
```

Приложение будет доступно по адресу:
- Frontend: http://localhost
- Backend API: http://localhost:3000
- Health check: http://localhost:3000/health

### Остановка приложения
```bash
./stop.sh
```

## 🔧 Разработка

### Структура проекта
```
kladovka/
├── backend/              # Backend (Node.js + Express)
│   ├── src/
│   │   ├── routes/      # API роуты
│   │   ├── middleware/  # Middleware (auth, rate limiting)
│   │   ├── config/      # Конфигурация (database, email)
│   │   └── migrations/  # SQL миграции
│   └── Dockerfile
├── frontend/            # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/  # React компоненты
│   │   ├── pages/       # Страницы
│   │   ├── services/    # API сервисы
│   │   └── types.ts     # TypeScript типы
│   └── Dockerfile
├── docker-compose.yml   # Docker Compose конфигурация
├── start.sh            # Скрипт запуска
└── stop.sh             # Скрипт остановки
```

### Локальная разработка

#### Backend
```bash
cd backend
npm install
npm run dev  # запуск с hot reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev  # запуск на http://localhost:5173
```

## 📚 API документация

### Аутентификация
- `POST /api/auth/register` - регистрация
- `POST /api/auth/login` - вход
- `POST /api/auth/forgot-password` - восстановление пароля
- `POST /api/auth/reset-password` - сброс пароля

### Статьи
- `GET /api/articles` - список статей
- `GET /api/articles/:slug` - получить статью
- `POST /api/articles` - создать статью
- `PUT /api/articles/:id` - обновить статью
- `DELETE /api/articles/:id` - удалить статью
- `GET /api/articles/:id/versions` - история версий
- `POST /api/articles/:id/versions/:versionId/restore` - восстановить версию

### Поиск
- `GET /api/search?q=query&author=&category=&tags=&dateFrom=&dateTo=&sortBy=` - поиск с фильтрами

### Избранное
- `GET /api/favorites` - список избранного
- `POST /api/favorites` - добавить в избранное
- `DELETE /api/favorites/:articleId` - удалить из избранного

### Экспорт
- `GET /api/export/:id/markdown` - экспорт в Markdown
- `GET /api/export/:id/html` - экспорт в HTML (для PDF)

### Аналитика (admin only)
- `GET /api/analytics/stats` - общая статистика
- `GET /api/analytics/popular-tags` - популярные теги
- `GET /api/analytics/user-activity` - активность пользователей
- `GET /api/analytics/popular-articles` - популярные статьи

### Админ-панель (admin only)
- `GET /api/admin/users` - список пользователей
- `PATCH /api/admin/users/:id/role` - изменить роль
- `PATCH /api/admin/users/:id/block` - заблокировать/разблокировать
- `DELETE /api/admin/users/:id` - удалить пользователя

## 🎨 Скриншоты

<!-- Добавьте скриншоты вашего приложения -->

## 🤝 Вклад в проект

Приветствуются любые предложения и улучшения! 

1. Fork репозиторий
2. Создайте ветку для новой функции (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в ветку (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## 📝 Лицензия

Этот проект распространяется под лицензией MIT. См. файл `LICENSE` для подробностей.

## 👤 Автор

Mikhail - [@YOUR_GITHUB](https://github.com/YOUR_USERNAME)

## 🙏 Благодарности

- [React](https://reactjs.org/)
- [Express.js](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://www.docker.com/)
