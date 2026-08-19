import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

interface NewApiKey extends ApiKey {
  api_key: string;
  message: string;
}

const ApiKeys = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('');
  const [createdKey, setCreatedKey] = useState<NewApiKey | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/api/user/api-keys`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setKeys(response.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load API keys');
      setLoading(false);
    }
  };

  const createApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newKeyName.trim()) {
      setError('Please enter a name for the API key');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/user/api-keys`,
        {
          name: newKeyName.trim(),
          expiresInDays: expiresInDays || null
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setCreatedKey(response.data);
      setNewKeyName('');
      setExpiresInDays('');
      setShowCreateForm(false);
      fetchApiKeys();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create API key');
    }
  };

  const deleteApiKey = async (id: number, name: string) => {
    if (!confirm(`Удалить API ключ "${name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/user/api-keys/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchApiKeys();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('API ключ скопирован в буфер обмена!');
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '1rem' }}>API Ключи</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Используйте API ключи для доступа к REST API Kladovka из внешних приложений.
        </p>

        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            + Создать новый ключ
          </button>
        ) : (
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>Создать новый API ключ</h3>
            <form onSubmit={createApiKey}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Название
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Например: Production API"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Срок действия (дней, опционально)
                </label>
                <input
                  type="number"
                  className="input"
                  placeholder="Оставьте пустым для бессрочного ключа"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : '')}
                  min={1}
                  max={365}
                />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  Если не указано, ключ будет действовать бессрочно
                </small>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn btn-primary">
                  Создать ключ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewKeyName('');
                    setExpiresInDays('');
                  }}
                  className="btn btn-secondary"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          background: '#FEE',
          color: '#C00',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '1px solid #FCC'
        }}>
          {error}
        </div>
      )}

      {createdKey && (
        <div style={{
          background: '#E8F5E9',
          color: '#2E7D32',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '1px solid #A5D6A7'
        }}>
          <h3 style={{ marginBottom: '1rem', color: '#2E7D32' }}>✓ API ключ создан!</h3>
          <p style={{ marginBottom: '1rem' }}>
            <strong>Важно:</strong> Сохраните этот ключ сейчас — он больше не будет показан!
          </p>
          <div style={{
            background: '#FFF',
            padding: '1rem',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            marginBottom: '1rem',
            wordBreak: 'break-all',
            border: '1px solid #C8E6C9',
            color: '#000'
          }}>
            {createdKey.api_key}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => copyToClipboard(createdKey.api_key)}
              className="btn btn-primary"
            >
              📋 Копировать ключ
            </button>
            <button
              onClick={() => setCreatedKey(null)}
              className="btn btn-secondary"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      <div>
        <h2 style={{ marginBottom: '1rem' }}>Активные ключи ({keys.length}/10)</h2>

        {keys.length === 0 ? (
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '3rem',
            borderRadius: '8px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            У вас пока нет API ключей. Создайте первый ключ для доступа к REST API.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {keys.map((key) => (
              <div
                key={key.id}
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ marginBottom: '0.5rem' }}>{key.name}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)'
                      }}>
                        {key.key_prefix}...
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Создан: {new Date(key.created_at).toLocaleDateString('ru-RU')}
                      </span>
                      {key.last_used_at && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Последнее использование: {new Date(key.last_used_at).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                      {key.expires_at && (
                        <span style={{
                          fontSize: '0.85rem',
                          color: new Date(key.expires_at) < new Date() ? 'var(--error)' : 'var(--text-muted)'
                        }}>
                          Истекает: {new Date(key.expires_at).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteApiKey(key.id, key.name)}
                    style={{
                      background: 'transparent',
                      color: 'var(--error)',
                      border: '1px solid var(--error)',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        marginTop: '3rem',
        padding: '1.5rem',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>📚 Как использовать API</h3>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Передавайте API ключ в заголовке Authorization или в query параметре:
        </p>
        <pre style={{
          background: 'var(--bg-tertiary)',
          padding: '1rem',
          borderRadius: '6px',
          fontSize: '0.85rem',
          overflow: 'auto'
        }}>
{`# С заголовком Authorization
curl -H "Authorization: Bearer kb_xxxxxxxx" \\
  ${API_URL}/api/v1/articles

# Или с query параметром
curl "${API_URL}/api/v1/articles?api_key=kb_xxxxxxxx"`}
        </pre>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
          Документация API: <a href="/api/docs" style={{ color: 'var(--accent-primary)' }}>{API_URL}/api/docs</a>
        </p>
      </div>
    </div>
  );
};

export default ApiKeys;
