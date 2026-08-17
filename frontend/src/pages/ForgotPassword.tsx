import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '500px' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <h1 style={{ marginBottom: '0.5rem', fontSize: '2rem', textAlign: 'center' }}>
          Восстановление пароля
        </h1>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Если указанный email зарегистрирован, на него отправлено письмо со ссылкой для сброса пароля.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
              Проверьте папку «Спам», если письмо не появилось в течение нескольких минут.
            </p>
            <Link to="/login" className="btn btn-primary">
              Вернуться ко входу
            </Link>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2rem' }}>
              Введите email — отправим ссылку для сброса пароля
            </p>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Email
                </label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading ? 'Отправка...' : 'Отправить ссылку'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)' }}>
              <Link to="/login" style={{ color: 'var(--accent-primary)' }}>
                Вернуться ко входу
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
