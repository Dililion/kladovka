import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ImportExport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importFile, setImportFile] = useState<File | null>(null);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const handleExport = async (type: 'articles' | 'categories' | 'full') => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/api/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let filename = `kladovka-${type}-${Date.now()}.json`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`Данные успешно экспортированы: ${filename}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (type: 'articles' | 'categories') => {
    if (!importFile) {
      setError('Выберите файл для импорта');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Читаем файл
      const fileContent = await importFile.text();
      const jsonData = JSON.parse(fileContent);

      if (!jsonData.data || !Array.isArray(jsonData.data)) {
        setError('Неверный формат файла импорта');
        return;
      }

      const response = await axios.post(
        `${API_URL}/api/import/${type}`,
        {
          data: jsonData.data,
          mode: importMode
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSuccess(
        `Импорт завершен! Импортировано: ${response.data.imported}, Пропущено: ${response.data.skipped}`
      );
      setImportFile(null);
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('Неверный формат JSON файла');
      } else {
        setError(err.response?.data?.error || 'Failed to import data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
      setError('');
      setSuccess('');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>📦 Импорт и экспорт данных</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Экспортируйте данные для резервного копирования или импортируйте из других источников.
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

      {/* Экспорт */}
      <div style={{
        background: 'var(--bg-secondary)',
        padding: '2rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>📤 Экспорт</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Скачайте данные в формате JSON для резервного копирования или переноса.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px'
          }}>
            <div>
              <h3 style={{ marginBottom: '0.25rem' }}>Статьи</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Все статьи с метаданными, категориями и тегами
              </p>
            </div>
            <button
              onClick={() => handleExport('articles')}
              disabled={loading}
              className="btn btn-primary"
            >
              📄 Экспорт статей
            </button>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px'
          }}>
            <div>
              <h3 style={{ marginBottom: '0.25rem' }}>Категории</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Все категории с описаниями
              </p>
            </div>
            <button
              onClick={() => handleExport('categories')}
              disabled={loading}
              className="btn btn-primary"
            >
              📂 Экспорт категорий
            </button>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px',
            border: '2px solid var(--accent-primary)'
          }}>
            <div>
              <h3 style={{ marginBottom: '0.25rem' }}>
                Полный экспорт
                <span style={{
                  marginLeft: '0.5rem',
                  background: 'var(--accent-primary)',
                  color: '#FFF',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 600
                }}>
                  ADMIN
                </span>
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Все данные системы: статьи, категории, теги, пользователи
              </p>
            </div>
            <button
              onClick={() => handleExport('full')}
              disabled={loading}
              className="btn btn-primary"
            >
              💾 Полный бэкап
            </button>
          </div>
        </div>
      </div>

      {/* Импорт */}
      <div style={{
        background: 'var(--bg-secondary)',
        padding: '2rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>📥 Импорт</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Загрузите данные из ранее экспортированного JSON файла.
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Выберите файл для импорта:
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{
              padding: '0.75rem',
              border: '2px dashed var(--border-color)',
              borderRadius: '8px',
              width: '100%',
              cursor: 'pointer',
              background: 'var(--bg-tertiary)'
            }}
          />
          {importFile && (
            <div style={{
              marginTop: '0.5rem',
              padding: '0.5rem',
              background: 'var(--accent-primary-light)',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}>
              ✅ Выбран файл: <strong>{importFile.name}</strong>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Режим импорта:
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                value="append"
                checked={importMode === 'append'}
                onChange={(e) => setImportMode(e.target.value as 'append')}
                style={{ marginRight: '0.5rem' }}
              />
              <span>Добавить к существующим</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                value="replace"
                checked={importMode === 'replace'}
                onChange={(e) => setImportMode(e.target.value as 'replace')}
                style={{ marginRight: '0.5rem' }}
              />
              <span style={{ color: '#D32F2F' }}>Заменить все (admin only)</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => handleImport('articles')}
            disabled={loading || !importFile}
            className="btn btn-primary"
          >
            📄 Импорт статей
          </button>
          <button
            onClick={() => handleImport('categories')}
            disabled={loading || !importFile}
            className="btn btn-primary"
          >
            📂 Импорт категорий
          </button>
        </div>

        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#FFF3E0',
          borderRadius: '8px',
          border: '1px solid #FFE0B2'
        }}>
          <h4 style={{ marginBottom: '0.5rem', color: '#E65100' }}>⚠️ Важно:</h4>
          <ul style={{ color: '#E65100', fontSize: '0.9rem', paddingLeft: '1.5rem' }}>
            <li>Импортируйте только файлы, экспортированные из Kladovka</li>
            <li>Режим "Заменить все" удалит существующие данные (только для админов)</li>
            <li>При дублировании slug статьи будут обновлены</li>
            <li>Категории и теги будут созданы автоматически, если их нет</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ImportExport;
