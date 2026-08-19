-- Automated backup system
-- История бэкапов

CREATE TABLE IF NOT EXISTS backups (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'full', 'articles', 'categories', 'database'
  size_bytes BIGINT,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_backups_created_at ON backups(created_at DESC);
CREATE INDEX idx_backups_type ON backups(type);
CREATE INDEX idx_backups_status ON backups(status);

-- Настройки автоматических бэкапов
CREATE TABLE IF NOT EXISTS backup_settings (
  id SERIAL PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  schedule VARCHAR(50) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'monthly'
  retention_days INTEGER DEFAULT 30, -- Хранить бэкапы N дней
  backup_types JSONB DEFAULT '["full"]', -- Типы бэкапов для автоматического создания
  notification_email VARCHAR(255),
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Вставляем настройки по умолчанию
INSERT INTO backup_settings (enabled, schedule, retention_days, backup_types)
VALUES (false, 'daily', 30, '["full"]')
ON CONFLICT DO NOTHING;
