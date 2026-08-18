import { pool } from '../config/database.js';

async function initSettings() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const defaultSettings = [
      // LDAP settings
      { key: 'ldap_enabled', value: 'false', category: 'ldap' },
      { key: 'ldap_server', value: 'ldap://localhost:389', category: 'ldap' },
      { key: 'ldap_bind_dn', value: 'cn=admin,dc=example,dc=com', category: 'ldap' },
      { key: 'ldap_bind_password', value: '', category: 'ldap' },
      { key: 'ldap_search_base', value: 'dc=example,dc=com', category: 'ldap' },
      { key: 'ldap_search_filter', value: '(uid={{username}})', category: 'ldap' },
      { key: 'ldap_username_attribute', value: 'uid', category: 'ldap' },
      { key: 'ldap_email_attribute', value: 'mail', category: 'ldap' },
      { key: 'ldap_name_attribute', value: 'cn', category: 'ldap' },

      // SMTP settings
      { key: 'smtp_enabled', value: 'false', category: 'smtp' },
      { key: 'smtp_host', value: 'smtp.gmail.com', category: 'smtp' },
      { key: 'smtp_port', value: '587', category: 'smtp' },
      { key: 'smtp_secure', value: 'false', category: 'smtp' },
      { key: 'smtp_user', value: '', category: 'smtp' },
      { key: 'smtp_password', value: '', category: 'smtp' },
      { key: 'smtp_from_email', value: 'noreply@kladovka.local', category: 'smtp' },
      { key: 'smtp_from_name', value: 'Kladovka', category: 'smtp' }
    ];

    for (const setting of defaultSettings) {
      await client.query(
        `INSERT INTO system_settings (key, value, category)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO NOTHING`,
        [setting.key, setting.value, setting.category]
      );
    }

    await client.query('COMMIT');
    console.log('✓ System settings initialized');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing settings:', error);
    throw error;
  } finally {
    client.release();
  }
}

initSettings()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
