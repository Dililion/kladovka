# Kladovka - Knowledge Base System

Корпоративная база знаний с поддержкой LDAP аутентификации и SMTP уведомлений.

## 🆕 Последние обновления

### v1.2.0 - Консолидация админ-панели
- **⚙️ Единая админ-панель** - все административные функции в одном месте с табами
- **👥 Управление ролями** - теперь в админке
- **📦 Импорт/Экспорт** - интегрирован в админ-панель
- **💾 Бэкапы** - управление резервными копиями через админку
- **🎯 Улучшенная навигация** - быстрый доступ через иконку ⚙️ в сайдбаре

### v1.1.0
- **📝 Улучшенный Markdown редактор** с live preview и автосохранением
- **🔍 Полнотекстовый поиск** PostgreSQL с морфологией русского языка (в 100 раз быстрее!)
- **🔔 Система уведомлений** с подписками на статьи
- **📊 Audit Log** - журнал всех действий пользователей
- **🎨 CSS стили** для красивого отображения Markdown

## Возможности

- 📝 Создание и редактирование статей с Markdown
- 🗂️ Организация по категориям
- 🔍 Полнотекстовый поиск с морфологией
- 👥 Управление пользователями и ролями
- 💬 Комментарии к статьям
- 🏷️ Теги
- 🔐 LDAP интеграция для корпоративной аутентификации
- 📧 SMTP для email уведомлений
- 📊 Аналитика и статистика
- 🔔 Система уведомлений с подписками
- 📝 Audit Log - журнал действий
- ⚙️ Единая админ-панель с табами:
  - Управление пользователями
  - Системные настройки (LDAP, SMTP, 2FA)
  - Комментарии
  - Роли и права доступа
  - Импорт/Экспорт данных
  - Резервное копирование
- 🔒 Двухфакторная аутентификация (2FA)
- 🔑 API Keys для программного доступа

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

## 🚀 Установка

**Новичок?** Начните с пошаговой инструкции:

➡️ **[INSTALL.md - Установка с нуля](./INSTALL.md)** - полная инструкция для начинающих

**Опытный пользователь?** Быстрый старт ниже ↓

---

## 📦 Портабельность

**Kladovka может быть развернут в любой директории** на любой системе с Docker.

Приложение использует только относительные пути и не зависит от места установки:
- ✅ Работает в `/opt/kladovka`
- ✅ Работает в `~/projects/kladovka`
- ✅ Работает в `/var/www/kladovka`
- ✅ Работает на Linux, macOS, Windows (WSL)

➡️ **[Подробная документация по портабельности](./PORTABILITY.md)**

## Быстрый старт

### Требования

- Docker и Docker Compose
- Node.js 20+ (для локальной разработки)

### Запуск

1. Клонируйте репозиторий в любую директорию:
```bash
git clone https://github.com/Dililion/kladovka.git
cd kladovka
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
- `PUT /api/admin/users/:id` - Обновить пользователя
- `DELETE /api/admin/users/:id` - Удалить пользователя
- `GET /api/settings` - Системные настройки
- `PUT /api/settings` - Обновить настройки
- `POST /api/settings/test-ldap` - Тест LDAP
- `POST /api/settings/test-smtp` - Тест SMTP
- `GET /api/roles` - Список ролей
- `POST /api/backup` - Создать бэкап
- `GET /api/backup/list` - Список бэкапов
- `POST /api/backup/restore` - Восстановить из бэкапа
- `POST /api/export` - Экспорт данных
- `POST /api/import` - Импорт данных

## 📖 Документация

- **[INSTALL.md](./INSTALL.md)** - Полная инструкция по установке
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Описание API endpoints
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Архитектура системы
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Чеклист для деплоя
- **[CHANGELOG.md](./CHANGELOG.md)** - История изменений

## 🎯 Для администраторов

После установки и первого входа:

1. **Смените пароль администратора**
2. **Настройте LDAP** (если используете) в ⚙️ Админка → Настройки → LDAP
3. **Настройте SMTP** для уведомлений в ⚙️ Админка → Настройки → SMTP
4. **Создайте роли** через ⚙️ Админка → Роли
5. **Настройте резервное копирование** через ⚙️ Админка → Бэкапы
6. **Включите 2FA** для дополнительной безопасности

Доступ к админ-панели: иконка ⚙️ в левом сайдбаре или прямая ссылка `/admin`

## Лицензия

MIT
