# 🚀 Инструкция по установке Kladovka с нуля

Эта инструкция поможет развернуть систему Kladovka на чистом сервере или компьютере. Никаких предварительных знаний не требуется — следуйте шагам по порядку.

---

## 📋 Что вам понадобится

- Компьютер или сервер с Linux, macOS или Windows
- Доступ к интернету
- 30 минут времени

**Не нужно:**
- Устанавливать PostgreSQL, Node.js или другие зависимости
- Разбираться в настройке баз данных
- Писать код

Все уже готово и упаковано в Docker-контейнеры.

---

## Шаг 1: Установка Docker

Docker — это платформа для запуска приложений в изолированных контейнерах.

### Linux (Ubuntu/Debian)

```bash
# Обновите систему
sudo apt update
sudo apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавьте себя в группу docker (чтобы не использовать sudo)
sudo usermod -aG docker $USER

# Перелогиньтесь или выполните
newgrp docker

# Проверьте установку
docker --version
docker compose version
```

### macOS

1. Скачайте [Docker Desktop для Mac](https://www.docker.com/products/docker-desktop/)
2. Установите как обычное приложение
3. Запустите Docker Desktop
4. Проверьте в терминале:
```bash
docker --version
docker compose version
```

### Windows

1. Скачайте [Docker Desktop для Windows](https://www.docker.com/products/docker-desktop/)
2. Установите WSL2 (Docker Desktop установит автоматически)
3. Запустите Docker Desktop
4. Откройте PowerShell или WSL2 терминал
5. Проверьте:
```bash
docker --version
docker compose version
```

---

## Шаг 2: Скачивание Kladovka

Выберите директорию где хотите установить (например `/opt/kladovka` или `~/kladovka`):

```bash
# Клонируйте репозиторий
git clone https://github.com/Dililion/kladovka.git

# Перейдите в директорию
cd kladovka
```

**Важно:** Приложение можно установить в ЛЮБУЮ директорию — оно полностью портабельно.

---

## Шаг 3: Настройка окружения

### 3.1 Создайте файл конфигурации

```bash
# Скопируйте шаблон конфигурации
cp backend/.env.example backend/.env
```

### 3.2 Отредактируйте настройки

Откройте файл `backend/.env` в любом текстовом редакторе:

```bash
nano backend/.env
# или
vim backend/.env
# или просто откройте в блокноте/VS Code
```

**Минимальные настройки для старта:**

```env
# База данных (оставьте как есть для Docker)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=knowledge_base
DB_USER=kbuser
DB_PASSWORD=your_secure_password_here  # ← ИЗМЕНИТЕ ЭТО!

# JWT секрет (сгенерируйте случайную строку)
JWT_SECRET=your_super_secret_jwt_key_here  # ← ИЗМЕНИТЕ ЭТО!

# Порт приложения
PORT=3001
```

**Как сгенерировать безопасные пароли:**

```bash
# На Linux/macOS
openssl rand -base64 32

# Или просто используйте любой длинный случайный текст
```

### 3.3 LDAP и SMTP (опционально)

Если хотите использовать корпоративную аутентификацию LDAP или email-уведомления — оставьте это на потом. Настроить можно будет через веб-интерфейс после запуска.

---

## Шаг 4: Запуск приложения

### 4.1 Запустите Docker-контейнеры

```bash
# Запустите все сервисы (PostgreSQL, Backend, Frontend)
docker compose up -d
```

**Что происходит:**
- Скачиваются образы Docker (первый раз займет 5-10 минут)
- Создаются контейнеры для базы данных, бэкенда и фронтенда
- Запускаются все сервисы в фоновом режиме

### 4.2 Проверьте что все запустилось

```bash
docker compose ps
```

Вы должны увидеть 3 контейнера в статусе `running`:
- `kladovka-postgres-1`
- `kladovka-backend-1`
- `kladovka-frontend-1`

### 4.3 Инициализируйте базу данных

```bash
# Создайте структуру базы данных
docker compose exec backend npm run init-db

# Создайте системные настройки
docker compose exec backend npm run init-settings
```

**Вы должны увидеть:**
```
✓ Database initialized successfully
✓ System settings initialized
```

---

## Шаг 5: Первый вход

### 5.1 Откройте приложение в браузере

Перейдите по адресу: **http://localhost**

(Если установили на сервере — замените `localhost` на IP-адрес сервера)

### 5.2 Войдите как администратор

**Учетные данные по умолчанию:**
- Email: `admin@example.com`
- Пароль: `admin123`

### 5.3 Смените пароль (обязательно!)

После входа:
1. Нажмите на имя пользователя в правом верхнем углу
2. Выберите "Профиль" или "Настройки"
3. Смените пароль на безопасный

---

## Шаг 6: Базовая настройка

### 6.1 LDAP (если нужна корпоративная аутентификация)

1. Перейдите в **Админ-панель** → **Настройки** → **LDAP**
2. Включите LDAP
3. Заполните:
   - LDAP сервер: `ldap://your-server:389`
   - Bind DN: `cn=admin,dc=example,dc=com`
   - Search Base: `ou=users,dc=example,dc=com`
   - Search Filter: `(uid={{username}})`
4. Нажмите **"Тест подключения"**
5. Сохраните

### 6.2 SMTP (для email-уведомлений)

1. Перейдите в **Админ-панель** → **Настройки** → **SMTP**
2. Включите SMTP
3. Заполните:
   - SMTP хост: `smtp.gmail.com` (или ваш SMTP-сервер)
   - SMTP порт: `587` (для TLS) или `465` (для SSL)
   - Пользователь: ваш email
   - Пароль: пароль приложения (для Gmail создайте в настройках аккаунта)
   - От кого: `noreply@example.com`
4. Нажмите **"Отправить тестовое письмо"**
5. Сохраните

---

## 🎉 Готово!

Ваша база знаний Kladovka работает!

### Что делать дальше:

1. **Создайте категории** - Админ-панель → Категории
2. **Пригласите пользователей** - Админ-панель → Пользователи → Добавить
3. **Напишите первую статью** - Главная → Создать статью
4. **Настройте подписки** - Откройте статью → Подписаться на комментарии

---

## 🔧 Управление приложением

### Остановить приложение

```bash
cd kladovka
docker compose stop
```

### Запустить снова

```bash
cd kladovka
docker compose start
```

### Перезапустить (после изменений в .env)

```bash
cd kladovka
docker compose restart
```

### Полностью удалить (с данными!)

```bash
cd kladovka
docker compose down -v  # ⚠️ УДАЛИТ ВСЕ ДАННЫЕ!
```

### Посмотреть логи

```bash
# Все сервисы
docker compose logs -f

# Только backend
docker compose logs -f backend

# Только frontend
docker compose logs -f frontend
```

### Обновить приложение

```bash
cd kladovka
git pull
docker compose pull
docker compose up -d
```

---

## 🆘 Проблемы и решения

### Порт 80 занят

Если порт 80 уже используется другим приложением:

1. Откройте `docker-compose.yml`
2. Найдите строку `"80:80"`
3. Измените на `"8080:80"` (или любой другой свободный порт)
4. Перезапустите: `docker compose up -d`
5. Теперь приложение на http://localhost:8080

### База данных не инициализируется

```bash
# Удалите данные и пересоздайте
docker compose down -v
docker compose up -d
# Подождите 10 секунд
docker compose exec backend npm run init-db
docker compose exec backend npm run init-settings
```

### Ошибка "Cannot connect to Docker daemon"

```bash
# Убедитесь что Docker запущен
sudo systemctl start docker  # Linux
# или запустите Docker Desktop на Mac/Windows

# Проверьте права
sudo usermod -aG docker $USER
newgrp docker
```

### Frontend показывает "Cannot connect to backend"

Проверьте что backend работает:

```bash
# Проверьте статус
docker compose ps

# Проверьте логи
docker compose logs backend

# Перезапустите backend
docker compose restart backend
```

### LDAP не подключается

- Проверьте что LDAP-сервер доступен из Docker-контейнера
- Если LDAP на `localhost` — используйте IP-адрес хоста: `host.docker.internal` (Mac/Windows) или IP-адрес сети (Linux)
- Проверьте firewall и сетевые настройки

---

## 📚 Дополнительная документация

- **[QUICKSTART.md](./QUICKSTART.md)** - Быстрый старт с новыми функциями v1.1.0
- **[PORTABILITY.md](./PORTABILITY.md)** - Информация о портабельности приложения
- **[TESTING.md](./TESTING.md)** - Запуск тестов и разработка
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Чеклист для продакшен-развертывания
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Архитектура приложения

---

## 💡 Полезные команды

```bash
# Зайти внутрь контейнера backend
docker compose exec backend bash

# Зайти в PostgreSQL
docker compose exec postgres psql -U kbuser -d knowledge_base

# Посмотреть использование ресурсов
docker stats

# Очистить неиспользуемые Docker-образы
docker system prune -a

# Сделать backup базы данных
docker compose exec postgres pg_dump -U kbuser knowledge_base > backup.sql

# Восстановить из backup
docker compose exec -T postgres psql -U kbuser knowledge_base < backup.sql
```

---

## 🔐 Безопасность

**Для продакшен-развертывания:**

1. ✅ Измените пароль администратора
2. ✅ Смените `JWT_SECRET` и `DB_PASSWORD` в `.env`
3. ✅ Используйте HTTPS (настройте reverse proxy nginx/traefik)
4. ✅ Ограничьте доступ к портам через firewall
5. ✅ Настройте регулярные backup базы данных
6. ✅ Включите логирование и мониторинг

Подробнее: **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)**

---

## 🤝 Нужна помощь?

- 📖 Прочитайте [QUICKSTART.md](./QUICKSTART.md)
- 🐛 Создайте [Issue на GitHub](https://github.com/Dililion/kladovka/issues)
- 💬 Посмотрите логи: `docker compose logs -f`

---

**Готово!** Приятной работы с Kladovka! 🎉
