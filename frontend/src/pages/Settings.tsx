import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SettingsData {
  ldap: {
    [key: string]: { value: string; description: string };
  };
  smtp: {
    [key: string]: { value: string; description: string };
  };
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [_settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'ldap' | 'smtp'>('ldap');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testingLdap, setTestingLdap] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [ldapForm, setLdapForm] = useState({
    ldap_enabled: '',
    ldap_server: '',
    ldap_bind_dn: '',
    ldap_bind_password: '',
    ldap_search_base: '',
    ldap_search_filter: '',
    ldap_username_attribute: '',
    ldap_email_attribute: '',
    ldap_name_attribute: ''
  });

  const [smtpForm, setSmtpForm] = useState({
    smtp_enabled: '',
    smtp_host: '',
    smtp_port: '',
    smtp_secure: '',
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          navigate('/');
          return;
        }
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);

      if (data.ldap) {
        const ldapData: any = {};
        Object.keys(data.ldap).forEach(key => {
          ldapData[key] = data.ldap[key].value;
        });
        setLdapForm(ldapData);
      }

      if (data.smtp) {
        const smtpData: any = {};
        Object.keys(data.smtp).forEach(key => {
          smtpData[key] = data.smtp[key].value;
        });
        setSmtpForm(smtpData);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Ошибка загрузки настроек' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const allSettings = { ...ldapForm, ...smtpForm };

      const response = await fetch('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ settings: allSettings })
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setMessage({ type: 'success', text: 'Настройки успешно сохранены' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Ошибка сохранения настроек' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/settings/test-smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('SMTP test failed');
      }

      const data = await response.json();
      setMessage({ type: 'success', text: `Тестовое письмо отправлено на ${data.email}` });
    } catch (error) {
      console.error('Error testing SMTP:', error);
      setMessage({ type: 'error', text: 'Ошибка отправки тестового письма' });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleTestLdap = async () => {
    setTestingLdap(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/settings/test-ldap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ testUsername: 'testuser' })
      });

      if (!response.ok) {
        throw new Error('LDAP test failed');
      }

      setMessage({ type: 'success', text: 'LDAP подключение успешно' });
    } catch (error) {
      console.error('Error testing LDAP:', error);
      setMessage({ type: 'error', text: 'Ошибка подключения к LDAP' });
    } finally {
      setTestingLdap(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>Настройки системы</h1>

      {message && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            background: message.type === 'success' ? '#10B981' : '#EF4444',
            color: 'white'
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ borderBottom: '2px solid #1E293B', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('ldap')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'ldap' ? '2px solid #38BDF8' : '2px solid transparent',
            color: activeTab === 'ldap' ? '#38BDF8' : '#94A3B8',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 500
          }}
        >
          LDAP аутентификация
        </button>
        <button
          onClick={() => setActiveTab('smtp')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'smtp' ? '2px solid #38BDF8' : '2px solid transparent',
            color: activeTab === 'smtp' ? '#38BDF8' : '#94A3B8',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 500
          }}
        >
          SMTP почта
        </button>
      </div>

      {activeTab === 'ldap' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                checked={ldapForm.ldap_enabled === 'true'}
                onChange={(e) => setLdapForm({ ...ldapForm, ldap_enabled: e.target.checked ? 'true' : 'false' })}
                style={{ width: '20px', height: '20px' }}
              />
              <span>Включить LDAP аутентификацию</span>
            </label>
          </div>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94A3B8' }}>
                LDAP сервер
              </label>
              <input
                type="text"
                value={ldapForm.ldap_server}
                onChange={(e) => setLdapForm({ ...ldapForm, ldap_server: e.target.value })}
                placeholder="ldap://ldap.company.com:389"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#F8FAFC'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94A3B8' }}>
                Bind DN
              </label>
              <input
                type="text"
                value={ldapForm.ldap_bind_dn}
                onChange={(e) => setLdapForm({ ...ldapForm, ldap_bind_dn: e.target.value })}
                placeholder="cn=admin,dc=company,dc=com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#F8FAFC'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94A3B8' }}>
                Bind пароль
              </label>
              <input
                type="password"
                value={ldapForm.ldap_bind_password}
                onChange={(e) => setLdapForm({ ...ldapForm, ldap_bind_password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#F8FAFC'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94A3B8' }}>
                Search Base
              </label>
              <input
                type="text"
                value={ldapForm.ldap_search_base}
                onChange={(e) => setLdapForm({ ...ldapForm, ldap_search_base: e.target.value })}
                placeholder="ou=users,dc=company,dc=com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#F8FAFC'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94A3B8' }}>
                Search Filter
              </label>
              <input
                type="text"
                value={ldapForm.ldap_search_filter}
                onChange={(e) => setLdapForm({ ...ldapForm, ldap_search_filter: e.target.value })}
                placeholder="(uid={{username}})"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#F8FAFC'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94A3B8' }}>
                  Username Attribute
                </label>
                <input
                  type="text"
                  value={ldapForm.ldap_username_attribute}
                  onChange={(e) => setLdapForm({ ...ldapForm, ldap_username_attribute: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#F8FAFC'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94A3B8' }}>
                  Email Attribute
                </label>
                <input
                  type="text"
                  value={ldapForm.ldap_email_attribute}
                  onChange={(e) => setLdapForm({ ...ldapForm, ldap_email_attribute: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#F8FAFC'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94A3B8' }}>
                  Name Attribute
                </label>
                <input
                  type="text"
                  value={ldapForm.ldap_name_attribute}
                  onChange={(e) => setLdapForm({ ...ldapForm, ldap_name_attribute: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#F8FAFC'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
              onClick={handleTestLdap}
              disabled={testingLdap || ldapForm.ldap_enabled !== 'true'}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#334155',
                border: 'none',
                borderRadius: '6px',
                color: '#F8FAFC',
                cursor: ldapForm.ldap_enabled === 'true' ? 'pointer' : 'not-allowed',
                opacity: ldapForm.ldap_enabled === 'true' ? 1 : 0.5
              }}
            >
              {testingLdap ? 'Тестирование...' : 'Тест подключения'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'smtp' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                checked={smtpForm.smtp_enabled === 'true'}
                onChange={(e) => setSmtpForm({ ...smtpForm, smtp_enabled: e.target.checked ? 'true' : 'false' })}
                style={{ width: '20px', height: '20px' }}
              />
              <span>Включить отправку email</span>
            </label>
          </div>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94A3B8' }}>
                  SMTP хост
                </label>
                <input
                  type="text"
                  value={smtpForm.smtp_host}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#F8FAFC'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94A3B8' }}>
                  Порт
                </label>
                <input
                  type="text"
                  value={smtpForm.smtp_port}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtp_port: e.target.value })}
                  placeholder="587"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#F8FAFC'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={smtpForm.smtp_secure === 'true'}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtp_secure: e.target.checked ? 'true' : 'false' })}
                  style={{ width: '20px', height: '20px' }}
                />
                <span>Использовать TLS/SSL</span>
              </label>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94A3B8' }}>
                Пользователь
              </label>
              <input
                type="text"
                value={smtpForm.smtp_user}
                onChange={(e) => setSmtpForm({ ...smtpForm, smtp_user: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#F8FAFC'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94A3B8' }}>
                Пароль
              </label>
              <input
                type="password"
                value={smtpForm.smtp_password}
                onChange={(e) => setSmtpForm({ ...smtpForm, smtp_password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#F8FAFC'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94A3B8' }}>
                Email отправителя
              </label>
              <input
                type="email"
                value={smtpForm.smtp_from_email}
                onChange={(e) => setSmtpForm({ ...smtpForm, smtp_from_email: e.target.value })}
                placeholder="noreply@company.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#F8FAFC'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94A3B8' }}>
                Имя отправителя
              </label>
              <input
                type="text"
                value={smtpForm.smtp_from_name}
                onChange={(e) => setSmtpForm({ ...smtpForm, smtp_from_name: e.target.value })}
                placeholder="Kladovka"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#F8FAFC'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
              onClick={handleTestSmtp}
              disabled={testingSmtp || smtpForm.smtp_enabled !== 'true'}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#334155',
                border: 'none',
                borderRadius: '6px',
                color: '#F8FAFC',
                cursor: smtpForm.smtp_enabled === 'true' ? 'pointer' : 'not-allowed',
                opacity: smtpForm.smtp_enabled === 'true' ? 1 : 0.5
              }}
            >
              {testingSmtp ? 'Отправка...' : 'Отправить тестовое письмо'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #334155' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.75rem 2rem',
            background: '#38BDF8',
            border: 'none',
            borderRadius: '6px',
            color: '#0F172A',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>

        <button
          onClick={() => navigate('/admin')}
          style={{
            padding: '0.75rem 2rem',
            background: '#334155',
            border: 'none',
            borderRadius: '6px',
            color: '#F8FAFC',
            cursor: 'pointer'
          }}
        >
          Отмена
        </button>
      </div>
    </div>
  );
};

export default Settings;
