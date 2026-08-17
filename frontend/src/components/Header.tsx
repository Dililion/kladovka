import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <header style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      padding: '1rem 0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '2rem',
      }}>
        <Link to="/" style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--accent-primary)',
          textDecoration: 'none',
        }}>
          Kladovka
        </Link>

        <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: '500px' }}>
          <input
            type="search"
            className="input"
            placeholder="Поиск статей..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {token ? (
            <>
              <Link to="/favorites" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}>
                ★ Избранное
              </Link>
              <Link to="/create" className="btn btn-primary">
                Создать статью
              </Link>
              {user?.role === 'admin' && (
                <>
                  <Link to="/admin" style={{ color: '#F97316', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}>
                    Админ
                  </Link>
                  <Link to="/analytics" style={{ color: '#F97316', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}>
                    📊 Аналитика
                  </Link>
                </>
              )}
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {user?.name}
              </span>
              <button onClick={handleLogout} className="btn btn-secondary">
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary">
                Войти
              </Link>
              <Link to="/register" className="btn btn-primary">
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
