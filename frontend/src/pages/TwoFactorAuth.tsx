import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
  message: string;
}

const TwoFactorAuth = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/api/2fa/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEnabled(response.data.enabled);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load 2FA status');
      setLoading(false);
    }
  };

  const startSetup = async () => {
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/2fa/setup`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSetup(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to setup 2FA');
    }
  };

  const verifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (verificationCode.length !== 6) {
      setError('Код должен быть 6 цифр');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/2fa/verify`,
        { code: verificationCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBackupCodes(response.data.backupCodes);
      setSuccess(response.data.message);
      setSetup(null);
      setVerificationCode('');
      setEnabled(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to verify code');
    }
  };

  const disable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (disableCode.length !== 6) {
      setError('Код должен быть 6 цифр');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/2fa/disable`,
        { code: disableCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('2FA успешно отключен');
      setDisableCode('');
      setEnabled(false);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to disable 2FA');
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    alert('Backup коды скопированы в буфер обмена!');
  };

  const downloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kladovka-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>🔐 Двухфакторная аутентификация (2FA)</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Защитите свой аккаунт дополнительным уровнем безопасности. При входе потребуется код из приложения-аутентификатора.
      </p>

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

      {success && (
        <div style={{
          background: '#E8F5E9',
          color: '#2E7D32',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '1px solid #A5D6A7'
        }}>
          {success}
        </div>
      )}

      {backupCodes.length > 0 && (
        <div style={{
          background: '#FFF3E0',
          color: '#E65100',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '1px solid #FFE0B2'
        }}>
          <h3 style={{ marginBottom: '1rem', color: '#E65100' }}>⚠️ Сохраните резервные коды!</h3>
          <p style={{ marginBottom: '1rem' }}>
            Эти коды позволят вам войти, если вы потеряете доступ к приложению-аутентификатору.
            Каждый код можно использовать только один раз.
          </p>
          <div style={{
            background: '#FFF',
            padding: '1rem',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            marginBottom: '1rem',
            border: '1px solid #FFE0B2',
            color: '#000',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            {backupCodes.map((code, idx) => (
              <div key={idx}>{code}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={copyBackupCodes} className="btn btn-primary">
              📋 Копировать
            </button>
            <button onClick={downloadBackupCodes} className="btn btn-secondary">
              💾 Скачать
            </button>
            <button onClick={() => setBackupCodes([])} className="btn btn-secondary">
              Закрыть
            </button>
          </div>
        </div>
      )}

      {!enabled && !setup && (
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '2rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>2FA не активирован</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Рекомендуем включить двухфакторную аутентификацию для защиты вашего аккаунта.
          </p>
          <button onClick={startSetup} className="btn btn-primary">
            Включить 2FA
          </button>
        </div>
      )}

      {setup && (
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '2rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>Настройка 2FA</h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Шаг 1: Сканируйте QR код</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Откройте приложение Google Authenticator или Authy и отсканируйте этот QR код:
            </p>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <img src={setup.qrCode} alt="QR Code" style={{ maxWidth: '250px' }} />
            </div>
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--accent-primary)' }}>
                Или введите код вручную
              </summary>
              <div style={{
                background: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                marginTop: '0.5rem',
                wordBreak: 'break-all'
              }}>
                {setup.secret}
              </div>
            </details>
          </div>

          <form onSubmit={verifyAndEnable}>
            <h3 style={{ marginBottom: '0.5rem' }}>Шаг 2: Введите код подтверждения</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Введите 6-значный код из приложения-аутентификатора:
            </p>
            <input
              type="text"
              className="input"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
              maxLength={6}
              style={{ marginBottom: '1rem', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                Подтвердить и включить 2FA
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetup(null);
                  setVerificationCode('');
                  setError('');
                }}
                className="btn btn-secondary"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {enabled && !setup && (
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '2rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '2rem' }}>✅</span>
            <div>
              <h2 style={{ marginBottom: '0.25rem' }}>2FA активирован</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Ваш аккаунт защищен двухфакторной аутентификацией
              </p>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-tertiary)',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>Отключить 2FA</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Для отключения двухфакторной аутентификации введите код из приложения:
            </p>
            <form onSubmit={disable2FA}>
              <input
                type="text"
                className="input"
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                maxLength={6}
                style={{ marginBottom: '1rem', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
              />
              <button type="submit" className="btn" style={{
                background: 'var(--error)',
                color: '#FFF'
              }}>
                Отключить 2FA
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwoFactorAuth;
