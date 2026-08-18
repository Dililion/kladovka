import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Settings {
  ldap: {
    [key: string]: string;
  };
  smtp: {
    [key: string]: string;
  };
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'ldap' | 'smtp'>('ldap');
  const [testEmail, setTestEmail] = useState('');
  const [testUsername, setTestUsername] = useState('');
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (category: 'ldap' | 'smtp', key: string, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value
      }
    });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setTestStatus(null);
    try {
      const token = localStorage.getItem('token');
      const flatSettings: { [key: string]: string } = {};

      Object.entries(settings).forEach(([_category, categorySettings]) => {
        Object.entries(categorySettings).forEach(([key, value]) => {
          flatSettings[key] = value as string;
        });
      });

      await axios.put(
        'http://localhost:3000/api/settings',
        { settings: flatSettings },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTestStatus({ type: 'success', message: 'Настройки сохранены' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setTestStatus({ type: 'error', message: 'Ошибка сохранения настроек' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSMTP = async () => {
    setTestStatus(null);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:3000/api/settings/test-smtp',
        { testEmail: testEmail || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTestStatus({ type: 'success', message: `Тестовое письмо отправлено на ${testEmail || 'ваш email'}` });
    } catch (error) {
      console.error('Error testing SMTP:', error);
      setTestStatus({ type: 'error', message: 'Ошибка отправки тестового письма' });
    }
  };

  const handleTestLDAP = async () => {
    setTestStatus(null);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:3000/api/settings/test-ldap',
        { testUsername },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTestStatus({ type: 'success', message: 'LDAP подключение успешно' });
    } catch (error) {
      console.error('Error testing LDAP:', error);
      setTestStatus({ type: 'error', message: 'Ошибка подключения к LDAP' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
        <div className="text-[#F8FAFC]">Загрузка...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
        <div className="text-red-400">Ошибка загрузки настроек</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14]">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => navigate('/admin')}
              className="text-[#38BDF8] hover:text-[#22D3EE] mb-4 flex items-center gap-2"
            >
              ← Назад к админке
            </button>
            <h1 className="text-3xl font-bold text-[#F8FAFC]">Системные настройки</h1>
          </div>
        </div>

        <div className="bg-[#1E293B] rounded-lg border border-slate-700 overflow-hidden">
          <div className="border-b border-slate-700 flex">
            <button
              onClick={() => setActiveTab('ldap')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'ldap'
                  ? 'bg-[#0B0E14] text-[#38BDF8] border-b-2 border-[#38BDF8]'
                  : 'text-slate-400 hover:text-[#F8FAFC]'
              }`}
            >
              LDAP
            </button>
            <button
              onClick={() => setActiveTab('smtp')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'smtp'
                  ? 'bg-[#0B0E14] text-[#38BDF8] border-b-2 border-[#38BDF8]'
                  : 'text-slate-400 hover:text-[#F8FAFC]'
              }`}
            >
              SMTP
            </button>
          </div>

          <div className="p-6">
            {testStatus && (
              <div className={`mb-6 p-4 rounded-lg ${
                testStatus.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {testStatus.message}
              </div>
            )}

            {activeTab === 'ldap' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  {Object.entries(settings.ldap).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-[#F8FAFC] mb-2">
                        {key.replace('ldap_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </label>
                      {key === 'ldap_enabled' ? (
                        <select
                          value={value}
                          onChange={(e) => handleChange('ldap', key, e.target.value)}
                          className="w-full px-4 py-2 bg-[#0B0E14] border border-slate-600 rounded-lg text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
                        >
                          <option value="false">Отключено</option>
                          <option value="true">Включено</option>
                        </select>
                      ) : key.includes('password') ? (
                        <input
                          type="password"
                          value={value}
                          onChange={(e) => handleChange('ldap', key, e.target.value)}
                          className="w-full px-4 py-2 bg-[#0B0E14] border border-slate-600 rounded-lg text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
                        />
                      ) : (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleChange('ldap', key, e.target.value)}
                          className="w-full px-4 py-2 bg-[#0B0E14] border border-slate-600 rounded-lg text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-slate-700">
                  <h3 className="text-lg font-medium text-[#F8FAFC] mb-4">Тестирование LDAP</h3>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={testUsername}
                      onChange={(e) => setTestUsername(e.target.value)}
                      placeholder="Введите username для теста"
                      className="flex-1 px-4 py-2 bg-[#0B0E14] border border-slate-600 rounded-lg text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
                    />
                    <button
                      onClick={handleTestLDAP}
                      disabled={!testUsername}
                      className="px-6 py-2 bg-[#38BDF8] text-[#0B0E14] rounded-lg hover:bg-[#22D3EE] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      Тест
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'smtp' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  {Object.entries(settings.smtp).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-[#F8FAFC] mb-2">
                        {key.replace('smtp_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </label>
                      {key === 'smtp_enabled' || key === 'smtp_secure' ? (
                        <select
                          value={value}
                          onChange={(e) => handleChange('smtp', key, e.target.value)}
                          className="w-full px-4 py-2 bg-[#0B0E14] border border-slate-600 rounded-lg text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
                        >
                          <option value="false">Нет</option>
                          <option value="true">Да</option>
                        </select>
                      ) : key.includes('password') ? (
                        <input
                          type="password"
                          value={value}
                          onChange={(e) => handleChange('smtp', key, e.target.value)}
                          className="w-full px-4 py-2 bg-[#0B0E14] border border-slate-600 rounded-lg text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
                        />
                      ) : key === 'smtp_port' ? (
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => handleChange('smtp', key, e.target.value)}
                          className="w-full px-4 py-2 bg-[#0B0E14] border border-slate-600 rounded-lg text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
                        />
                      ) : (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleChange('smtp', key, e.target.value)}
                          className="w-full px-4 py-2 bg-[#0B0E14] border border-slate-600 rounded-lg text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-slate-700">
                  <h3 className="text-lg font-medium text-[#F8FAFC] mb-4">Отправка тестового письма</h3>
                  <div className="flex gap-4">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="Email (оставьте пустым для отправки на ваш email)"
                      className="flex-1 px-4 py-2 bg-[#0B0E14] border border-slate-600 rounded-lg text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]"
                    />
                    <button
                      onClick={handleTestSMTP}
                      className="px-6 py-2 bg-[#38BDF8] text-[#0B0E14] rounded-lg hover:bg-[#22D3EE] font-medium"
                    >
                      Отправить
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-[#0F172A] border-t border-slate-700 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-[#F97316] text-white rounded-lg hover:bg-[#EA580C] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
