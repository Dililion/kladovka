-- Create system settings table for LDAP and SMTP configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

-- Create index on category for faster lookups
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- Insert default LDAP settings
INSERT INTO system_settings (key, value, category, description) VALUES
  ('ldap_enabled', 'false', 'ldap', 'Enable LDAP authentication'),
  ('ldap_server', '', 'ldap', 'LDAP server URL (e.g., ldap://ldap.company.com:389)'),
  ('ldap_bind_dn', '', 'ldap', 'LDAP bind DN (e.g., cn=admin,dc=company,dc=com)'),
  ('ldap_bind_password', '', 'ldap', 'LDAP bind password'),
  ('ldap_search_base', '', 'ldap', 'LDAP search base (e.g., ou=users,dc=company,dc=com)'),
  ('ldap_search_filter', '(uid={{username}})', 'ldap', 'LDAP search filter'),
  ('ldap_username_attribute', 'uid', 'ldap', 'LDAP username attribute'),
  ('ldap_email_attribute', 'mail', 'ldap', 'LDAP email attribute'),
  ('ldap_name_attribute', 'cn', 'ldap', 'LDAP name attribute')
ON CONFLICT (key) DO NOTHING;

-- Insert default SMTP settings
INSERT INTO system_settings (key, value, category, description) VALUES
  ('smtp_enabled', 'false', 'smtp', 'Enable SMTP email sending'),
  ('smtp_host', '', 'smtp', 'SMTP server host'),
  ('smtp_port', '587', 'smtp', 'SMTP server port'),
  ('smtp_secure', 'false', 'smtp', 'Use TLS/SSL'),
  ('smtp_user', '', 'smtp', 'SMTP username'),
  ('smtp_password', '', 'smtp', 'SMTP password'),
  ('smtp_from_email', '', 'smtp', 'From email address'),
  ('smtp_from_name', 'Kladovka', 'smtp', 'From name')
ON CONFLICT (key) DO NOTHING;
