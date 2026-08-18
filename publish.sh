#!/bin/bash

echo "============================================"
echo "  Публикация Kladovka на GitHub"
echo "============================================"
echo ""

# Проверка git конфигурации
if ! git config user.name > /dev/null 2>&1; then
    echo "⚠️  Git не настроен. Настройте его:"
    echo ""
    read -p "Введите ваше имя: " name
    read -p "Введите ваш email: " email
    git config --global user.name "$name"
    git config --global user.email "$email"
    echo "✅ Git настроен"
    echo ""
fi

# Показать текущий статус
echo "📊 Статус репозитория:"
git log --oneline -1
echo ""

# Проверить remote
if git remote -v | grep origin > /dev/null 2>&1; then
    echo "✅ Remote origin уже настроен:"
    git remote -v
    echo ""
    read -p "Хотите изменить URL? (y/N): " change
    if [[ "$change" == "y" || "$change" == "Y" ]]; then
        read -p "Введите новый URL репозитория: " repo_url
        git remote set-url origin "$repo_url"
        echo "✅ URL обновлен"
    fi
else
    echo "❌ Remote origin не настроен"
    echo ""
    echo "Создайте репозиторий на GitHub:"
    echo "1. Перейдите на https://github.com/new"
    echo "2. Название: kladovka"
    echo "3. Описание: Knowledge Base System with Markdown, versioning, and analytics"
    echo "4. НЕ добавляйте README, .gitignore или LICENSE"
    echo ""
    read -p "Введите URL репозитория (например: https://github.com/username/kladovka.git): " repo_url
    git remote add origin "$repo_url"
    echo "✅ Remote добавлен"
fi

echo ""
echo "📤 Готово к публикации!"
echo ""
read -p "Отправить код на GitHub? (y/N): " confirm

if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
    echo ""
    echo "🚀 Отправка на GitHub..."
    git push -u origin main

    if [ $? -eq 0 ]; then
        echo ""
        echo "============================================"
        echo "  ✅ Проект успешно опубликован на GitHub!"
        echo "============================================"
        echo ""
        echo "📝 Следующие шаги:"
        echo ""
        echo "1. Добавьте описание репозитория на GitHub"
        echo "2. Добавьте Topics: knowledge-base, markdown, react, typescript, nodejs, postgresql, docker"
        echo "3. Сделайте скриншоты и добавьте их в README"
        echo "4. Настройте GitHub Pages (если нужно)"
        echo ""
        echo "🔗 Ваш репозиторий:"
        git remote get-url origin | sed 's/.git$//'
    else
        echo ""
        echo "❌ Ошибка при отправке. Проверьте настройки и попробуйте снова."
    fi
else
    echo ""
    echo "Отменено. Когда будете готовы, выполните:"
    echo "  git push -u origin main"
fi
