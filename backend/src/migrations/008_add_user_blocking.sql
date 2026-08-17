-- Добавить колонку для блокировки пользователей
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Добавить колонку с username если её нет
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);

-- Обновить username для существующих пользователей (использовать часть email до @)
UPDATE users SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;

-- Сделать username уникальным
ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
