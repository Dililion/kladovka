import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { AuthResponse } from '../types';

const Setup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });

  useEffect(() => {
    api.get('/setup/status').then(({ data }) => {
      if (!data.setupRequired) {
        navigate('/');
      } else {
        setLoading(false);
      }
    }).catch(() => navigate('/'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post<AuthResponse>('/setup/init', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/admin');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка инициализации');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '520px' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚙️</div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Первый запуск</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Создайте учётную запись администратора для управления Kladovka
          </p>
        </div>

        <div style={{
          background: 'rgba(249,115,22,0.1)',
          border: '1px solid rgba(249,115,22,0.3)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '2rem',
          fontSize: '0.875rem',
          color: '#F97316',
        }}>
          Эта страница доступна только при пустой базе данных. После создания первого пользователя она будет заблокирована.
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Имя</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
              minLength={2}
              placeholder="Иван Иванов"
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email</label>
            <input
              type="email"
              className="input"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="admin@example.com"
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Пароль</label>
            <input
              type="password"
              className="input"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Подтверждение пароля</label>
            <input
              type="password"
              className="input"
              value={formData.confirmPassword}
              onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {submitting ? 'Создание...' : 'Создать администратора'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Setup;
