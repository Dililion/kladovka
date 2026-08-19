-- Enhanced role-based access control (RBAC)
-- Расширенная система ролей и прав доступа

-- Добавляем новые роли
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT '{}';

-- Таблица ролей с детальными разрешениями
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Системные роли
INSERT INTO roles (name, display_name, description, permissions, is_system) VALUES
('admin', 'Администратор', 'Полный доступ ко всем функциям системы', '{
  "articles": {"create": true, "read": true, "update": true, "delete": true, "publish": true},
  "categories": {"create": true, "read": true, "update": true, "delete": true},
  "users": {"create": true, "read": true, "update": true, "delete": true, "block": true},
  "settings": {"read": true, "update": true},
  "analytics": {"read": true},
  "audit": {"read": true},
  "api": {"use": true}
}', true),
('editor', 'Редактор', 'Создание и редактирование статей, управление контентом', '{
  "articles": {"create": true, "read": true, "update": true, "delete": false, "publish": true},
  "categories": {"create": true, "read": true, "update": true, "delete": false},
  "users": {"create": false, "read": true, "update": false, "delete": false, "block": false},
  "settings": {"read": true, "update": false},
  "analytics": {"read": true},
  "audit": {"read": false},
  "api": {"use": true}
}', true),
('author', 'Автор', 'Создание и редактирование своих статей', '{
  "articles": {"create": true, "read": true, "update": "own", "delete": "own", "publish": false},
  "categories": {"create": false, "read": true, "update": false, "delete": false},
  "users": {"create": false, "read": false, "update": false, "delete": false, "block": false},
  "settings": {"read": false, "update": false},
  "analytics": {"read": false},
  "audit": {"read": false},
  "api": {"use": true}
}', true),
('reader', 'Читатель', 'Только чтение статей и комментирование', '{
  "articles": {"create": false, "read": true, "update": false, "delete": false, "publish": false},
  "categories": {"create": false, "read": true, "update": false, "delete": false},
  "users": {"create": false, "read": false, "update": false, "delete": false, "block": false},
  "settings": {"read": false, "update": false},
  "analytics": {"read": false},
  "audit": {"read": false},
  "api": {"use": false}
}', true);

-- Права доступа на уровне категорий
CREATE TABLE IF NOT EXISTS category_permissions (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_name VARCHAR(50) REFERENCES roles(name) ON DELETE CASCADE,
  can_read BOOLEAN DEFAULT true,
  can_write BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT category_permissions_user_or_role CHECK (
    (user_id IS NOT NULL AND role_name IS NULL) OR
    (user_id IS NULL AND role_name IS NOT NULL)
  )
);

CREATE INDEX idx_category_permissions_category ON category_permissions(category_id);
CREATE INDEX idx_category_permissions_user ON category_permissions(user_id);
CREATE INDEX idx_category_permissions_role ON category_permissions(role_name);

-- Права доступа на уровне статей (для приватных статей)
CREATE TABLE IF NOT EXISTS article_permissions (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_name VARCHAR(50) REFERENCES roles(name) ON DELETE CASCADE,
  can_read BOOLEAN DEFAULT true,
  can_write BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT article_permissions_user_or_role CHECK (
    (user_id IS NOT NULL AND role_name IS NULL) OR
    (user_id IS NULL AND role_name IS NOT NULL)
  )
);

CREATE INDEX idx_article_permissions_article ON article_permissions(article_id);
CREATE INDEX idx_article_permissions_user ON article_permissions(user_id);
CREATE INDEX idx_article_permissions_role ON article_permissions(role_name);

-- Функция для проверки прав доступа
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id INTEGER,
  p_resource VARCHAR(50),
  p_action VARCHAR(50),
  p_resource_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR(50);
  role_perms JSONB;
  has_permission BOOLEAN;
BEGIN
  -- Получаем роль пользователя
  SELECT role INTO user_role FROM users WHERE id = p_user_id;

  -- Админы имеют все права
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Получаем права роли
  SELECT permissions INTO role_perms FROM roles WHERE name = user_role;

  -- Проверяем базовое право
  has_permission := (role_perms -> p_resource ->> p_action)::BOOLEAN;

  RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql;
