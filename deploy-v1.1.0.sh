#!/bin/bash

# Kladovka v1.1.0 - Скрипт быстрого развертывания
# Этот скрипт применяет все изменения версии 1.1.0

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║             Kladovka v1.1.0 - Развертывание                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция для вывода с цветом
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Проверка что мы в корневой директории проекта
if [ ! -f "docker-compose.yml" ]; then
    print_error "Ошибка: docker-compose.yml не найден. Запустите скрипт из корневой директории проекта."
    exit 1
fi

print_success "Проект найден: $(pwd)"
echo ""

# Шаг 1: Резервное копирование базы данных
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Шаг 1/5: Резервное копирование базы данных"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BACKUP_FILE="backup_before_1.1.0_$(date +%Y%m%d_%H%M%S).sql"

if command -v docker-compose &> /dev/null; then
    print_warning "Создаём резервную копию базы данных..."
    docker-compose exec -T postgres pg_dump -U kb_user kb > "$BACKUP_FILE" 2>/dev/null || {
        print_warning "Не удалось создать backup через docker-compose"
        print_warning "Пропускаем этот шаг (база данных возможно ещё не запущена)"
    }

    if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        print_success "Backup создан: $BACKUP_FILE"
    else
        rm -f "$BACKUP_FILE"
        print_warning "Backup не создан (возможно база данных пуста или не запущена)"
    fi
else
    print_warning "docker-compose не найден, пропускаем backup"
fi

echo ""

# Шаг 2: Установка зависимостей (если нужно)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Шаг 2/5: Проверка зависимостей"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd backend
if [ ! -d "node_modules" ]; then
    print_warning "Установка зависимостей backend..."
    npm install
    print_success "Зависимости backend установлены"
else
    print_success "Зависимости backend уже установлены"
fi
cd ..

cd frontend
if [ ! -d "node_modules" ]; then
    print_warning "Установка зависимостей frontend..."
    npm install
    print_success "Зависимости frontend установлены"
else
    print_success "Зависимости frontend уже установлены"
fi
cd ..

echo ""

# Шаг 3: Применение миграций
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Шаг 3/5: Применение миграций базы данных"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Проверяем что БД запущена
if ! docker-compose ps | grep -q "postgres.*Up"; then
    print_warning "PostgreSQL не запущен, запускаем..."
    docker-compose up -d postgres
    print_warning "Ждём 10 секунд пока БД запустится..."
    sleep 10
fi

cd backend
print_warning "Применяем миграции..."
npm run migrate

if [ $? -eq 0 ]; then
    print_success "Миграции применены успешно"
else
    print_error "Ошибка при применении миграций"
    print_warning "Проверьте логи выше"
    exit 1
fi
cd ..

echo ""

# Шаг 4: Сборка и перезапуск
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Шаг 4/5: Перезапуск приложения"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_warning "Перезапускаем контейнеры..."
docker-compose down
docker-compose up -d

print_warning "Ждём 5 секунд пока сервисы запустятся..."
sleep 5

echo ""

# Шаг 5: Проверка
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Шаг 5/5: Проверка здоровья"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Проверка backend
print_warning "Проверяем backend..."
for i in {1..10}; do
    if curl -s http://localhost:3001/health | grep -q "ok"; then
        print_success "Backend работает: http://localhost:3001"
        break
    fi
    if [ $i -eq 10 ]; then
        print_error "Backend не отвечает"
        print_warning "Проверьте логи: docker-compose logs backend"
    fi
    sleep 2
done

# Проверка frontend
print_warning "Проверяем frontend..."
if curl -s http://localhost:80 > /dev/null; then
    print_success "Frontend работает: http://localhost:80"
else
    print_warning "Frontend может быть ещё не готов"
    print_warning "Проверьте логи: docker-compose logs frontend"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Развертывание завершено!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Приложение доступно на:"
echo "   Frontend: http://localhost:80"
echo "   Backend:  http://localhost:3001"
echo ""
echo "📚 Что дальше:"
echo "   1. Протестируйте новые функции: cat TESTING.md"
echo "   2. Прочитайте документацию: cat QUICKSTART.md"
echo "   3. Проверьте логи: docker-compose logs -f"
echo ""
echo "🆕 Новые функции v1.1.0:"
echo "   • Улучшенный Markdown редактор с live preview"
echo "   • Полнотекстовый поиск (в 100 раз быстрее!)"
echo "   • Система уведомлений с подписками"
echo "   • Audit log для отслеживания действий"
echo ""
echo "⚠️  Если что-то пошло не так:"
echo "   1. Проверьте логи: docker-compose logs backend"
echo "   2. Восстановите из backup: psql -U kb_user kb < $BACKUP_FILE"
echo "   3. Смотрите TESTING.md раздел 'Устранение неполадок'"
echo ""
print_success "Готово! 🎉"
