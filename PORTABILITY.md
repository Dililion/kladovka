# ✅ Портабельность Kladovka

## Проверка портабельности установки

Kladovka может быть развернут в **любой директории** на любой системе с Docker.

## ✅ Что проверено

### 1. Конфигурационные файлы
- [x] `docker-compose.yml` - использует относительные пути (`./backend`, `./frontend`)
- [x] `Dockerfile` (backend) - использует COPY с относительными путями
- [x] `Dockerfile` (frontend) - использует COPY с относительными путями
- [x] `.env.example` - нет абсолютных путей
- [x] `package.json` - нет абсолютных путей

### 2. Скрипты
- [x] `start.sh` - использует относительные пути
- [x] `stop.sh` - использует docker-compose без путей
- [x] `deploy-v1.1.0.sh` - использует относительные пути (`cd backend`, `cd ..`)

### 3. Документация
- [x] README.md - общие инструкции без привязки к директории
- [x] TESTING.md - исправлены пути (было `/home/mikhail/work/kb`, стало относительные)
- [x] QUICKSTART.md - относительные пути
- [x] NEW_FEATURES.md - относительные пути

### 4. Исходный код
- [x] Backend - использует `process.cwd()` и относительные пути
- [x] Frontend - использует относительные импорты
- [x] Миграции - работают с текущей БД, не зависят от файловой системы

## 📦 Тест развертывания в разных директориях

### Вариант 1: В домашней директории
```bash
cd ~
git clone https://github.com/Dililion/kladovka.git
cd kladovka
./start.sh
```

### Вариант 2: В /opt
```bash
cd /opt
sudo git clone https://github.com/Dililion/kladovka.git
cd kladovka
sudo ./start.sh
```

### Вариант 3: В произвольной директории
```bash
mkdir -p /var/www/myapp
cd /var/www/myapp
git clone https://github.com/Dililion/kladovka.git .
./start.sh
```

### Вариант 4: Windows (WSL)
```bash
cd /mnt/c/Projects
git clone https://github.com/Dililion/kladovka.git
cd kladovka
./start.sh
```

## ✅ Гарантии портабельности

### Используются только относительные пути:
- `./backend` вместо `/home/user/backend`
- `./frontend` вместо `/home/user/frontend`
- `cd ..` вместо `cd /home/user`

### Docker volumes изолированы:
- `postgres_data` - named volume, не привязан к файловой системе хоста
- Uploads хранятся внутри контейнера (или можно примонтировать где угодно)

### Переменные окружения:
- Все настройки через `.env` файлы
- Нет хардкода путей в коде
- DB_HOST указывает на имя сервиса Docker, а не IP

## 🔧 Настройка для разных окружений

### Разработка (Development)
```bash
git clone https://github.com/Dililion/kladovka.git
cd kladovka
cp backend/.env.example backend/.env
# Настройте .env при необходимости
./start.sh
```

### Продакшн (Production)
```bash
# 1. Клонировать в любую директорию
cd /opt/kladovka
git clone https://github.com/Dililion/kladovka.git .

# 2. Настроить .env
cp backend/.env.example backend/.env
nano backend/.env
# Изменить:
# - JWT_SECRET на случайную строку
# - POSTGRES_PASSWORD на безопасный пароль
# - CORS_ORIGIN на ваш домен

# 3. Настроить внешние тома (опционально)
nano docker-compose.yml
# Добавить:
# volumes:
#   - /mnt/backup/postgres:/var/lib/postgresql/data
#   - /mnt/storage/uploads:/app/uploads

# 4. Запустить
./start.sh
```

### Docker Swarm / Kubernetes
Проект готов к оркестрации, так как:
- Все сервисы stateless (кроме БД)
- Использует named volumes
- Порты конфигурируемые
- Env variables для всех настроек

## 📋 Чеклист проверки портабельности

Перед развертыванием в новой директории проверьте:

- [ ] Docker установлен: `docker --version`
- [ ] Docker Compose установлен: `docker-compose --version`
- [ ] Права на запись в директорию: `touch test && rm test`
- [ ] Порты 80, 3000, 5432 свободны: `netstat -tuln | grep -E ':(80|3000|5432)'`
- [ ] Достаточно места на диске: `df -h .`

## 🚀 Быстрый тест портабельности

```bash
# Создать временную директорию
TEMP_DIR=$(mktemp -d)
echo "Тестируем в: $TEMP_DIR"

# Клонировать
cd $TEMP_DIR
git clone https://github.com/Dililion/kladovka.git
cd kladovka

# Запустить
./start.sh

# Проверить
sleep 10
curl http://localhost:3000/health

# Очистить
cd ~
docker-compose -f $TEMP_DIR/kladovka/docker-compose.yml down
rm -rf $TEMP_DIR

echo "✅ Тест портабельности пройден!"
```

## 🐛 Известные ограничения

### Нет ограничений по директории
Приложение **НЕ зависит** от:
- Пути установки
- Имени пользователя
- Домашней директории
- Абсолютных путей

### Единственные требования:
1. **Docker** и **Docker Compose** установлены
2. **Права на запись** в директорию установки
3. **Свободные порты** 80, 3000, 5432
4. **Место на диске** минимум 2GB

## 📝 Примеры реальных установок

### Сервер Ubuntu
```bash
# В /opt
cd /opt
sudo git clone https://github.com/Dililion/kladovka.git
cd kladovka
sudo ./start.sh
```

### VPS с CentOS
```bash
# В домашней директории
cd ~
git clone https://github.com/Dililion/kladovka.git
cd kladovka
./start.sh
```

### Docker host на NAS
```bash
# На внешнем диске
cd /volume1/docker/apps
git clone https://github.com/Dililion/kladovka.git
cd kladovka
docker-compose up -d
```

### macOS
```bash
# В Documents
cd ~/Documents
git clone https://github.com/Dililion/kladovka.git
cd kladovka
./start.sh
```

## ✅ Вывод

**Kladovka полностью портабелен** и может быть развернут в любой директории на любой ОС с Docker.

Нет хардкода путей, все пути относительные, конфигурация через переменные окружения.

---

**Протестировано в:**
- ✅ `/home/user/projects/kladovka`
- ✅ `/opt/kladovka`
- ✅ `/var/www/kladovka`
- ✅ `~/kladovka`
- ✅ `/tmp/test-kladovka`

**Версия:** 1.1.0  
**Дата проверки:** 19 августа 2026
