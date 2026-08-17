const Footer = () => {
  return (
    <footer style={{
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-color)',
      padding: '2rem 0',
      marginTop: '4rem',
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          © {new Date().getFullYear()} Kladovka. Все права защищены.
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            О проекте
          </a>
          <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Контакты
          </a>
          <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Помощь
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
