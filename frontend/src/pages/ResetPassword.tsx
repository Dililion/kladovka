import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/auth';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) setError('Токен не найден. Запросите новую ссылку.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword(token!, password);
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка сброса пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '500px' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <h1 style={{ marginBottom: '0.5rem', fontSize: '2rem', textAlign: 'center' }}>
          Новый пароль
        </h1>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Пароль успешно изменён.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              Войти
            </button>
          </div>
        ) : error && !token ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--error)', marginBottom: '1.5rem' }}>{error}</p>
            <Link to="/forgot-password" className="btn btn-primary">
              Запросить новую ссылку
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {error}
              </p>
            )}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Новый пароль
                </label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Повторите пароль
                </label>
                <input
                  type="password"
                  className="input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading ? 'Сохранение...' : 'Сохранить пароль'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
