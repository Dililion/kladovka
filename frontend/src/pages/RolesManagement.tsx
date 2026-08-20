import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string;
  permissions: any;
  is_system: boolean;
  created_at: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const RolesManagement = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, []);

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await api.get('/roles');

      setRoles(response.data);
      setLoading(false);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('У вас нет прав для просмотра ролей (требуется роль администратора)');
      } else {
        setError(err.response?.data?.error || 'Failed to load roles');
      }
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');

      setUsers(response.data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    }
  };

  const changeUserRole = async (userId: number, newRole: string) => {
    try {
      await api.put(`/admin/users/${userId}`, { role: newRole });

      setSuccess(`Роль пользователя успешно изменена на "${newRole}"`);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change user role');
    }
  };

  const getPermissionLabel = (_resource: string, _action: string, value: any): string => {
    if (value === true) return '✅';
    if (value === false) return '❌';
    if (value === 'own') return '👤'; // Только свои
    return '❓';
  };

  const resourceLabels: { [key: string]: string } = {
    articles: 'Статьи',
    categories: 'Категории',
    users: 'Пользователи',
    settings: 'Настройки',
    analytics: 'Аналитика',
    audit: 'Аудит',
    api: 'API'
  };

  const actionLabels: { [key: string]: string } = {
    create: 'Создание',
    read: 'Чтение',
    update: 'Редактирование',
    delete: 'Удаление',
    publish: 'Публикация',
    block: 'Блокировка',
    use: 'Использование'
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>👥 Управление ролями и правами доступа</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Управление системой ролей и прав доступа к ресурсам.
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        {/* Список ролей */}
        <div>
          <h2 style={{ marginBottom: '1rem' }}>Роли в системе</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {roles.map((role) => (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role)}
                style={{
                  background: selectedRole?.id === role.id ? 'var(--accent-primary-light)' : 'var(--bg-secondary)',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  border: selectedRole?.id === role.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <h3>{role.display_name}</h3>
                  {role.is_system && (
                    <span style={{
                      background: 'var(--accent-secondary)',
                      color: '#FFF',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      СИСТЕМНАЯ
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  {role.description}
                </p>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Код: <code>{role.name}</code>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Права выбранной роли */}
        <div>
          {selectedRole ? (
            <>
              <h2 style={{ marginBottom: '1rem' }}>Права роли: {selectedRole.display_name}</h2>
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Легенда: ✅ = Разрешено | ❌ = Запрещено | 👤 = Только свои
                  </div>
                </div>

                {Object.keys(selectedRole.permissions).map((resource) => (
                  <div key={resource} style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>
                      {resourceLabels[resource] || resource}
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: '0.5rem'
                    }}>
                      {Object.keys(selectedRole.permissions[resource]).map((action) => {
                        const value = selectedRole.permissions[resource][action];
                        return (
                          <div
                            key={action}
                            style={{
                              background: 'var(--bg-tertiary)',
                              padding: '0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <span>{actionLabels[action] || action}</span>
                            <span style={{ fontSize: '1.1rem' }}>
                              {getPermissionLabel(resource, action, value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '3rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              Выберите роль для просмотра прав доступа
            </div>
          )}
        </div>
      </div>

      {/* Управление ролями пользователей */}
      <div>
        <h2 style={{ marginBottom: '1rem' }}>Назначение ролей пользователям</h2>
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          {users.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Пользователи не найдены</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Пользователь</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Текущая роль</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Изменить роль</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem' }}>{user.name}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          background: 'var(--accent-primary-light)',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}>
                          {roles.find(r => r.name === user.role)?.display_name || user.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <select
                          className="input"
                          value={user.role}
                          onChange={(e) => changeUserRole(user.id, e.target.value)}
                          style={{ width: 'auto', minWidth: '150px' }}
                        >
                          {roles.map((role) => (
                            <option key={role.name} value={role.name}>
                              {role.display_name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RolesManagement;
