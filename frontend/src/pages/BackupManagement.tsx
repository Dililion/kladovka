import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Backup {
  id: number;
  filename: string;
  type: string;
  size_bytes: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
  created_by_name: string;
}

interface BackupSettings {
  enabled: boolean;
  schedule: string;
  retention_days: number;
  backup_types: string[];
  notification_email: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
}

const BackupManagement: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [settings, setSettings] = useState<BackupSettings>({
    enabled: false,
    schedule: 'daily',
    retention_days: 30,
    backup_types: ['full'],
    notification_email: null,
    last_run_at: null,
    next_run_at: null,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'backups' | 'settings'>('backups');

  useEffect(() => {
    loadBackups();
    loadSettings();
  }, []);

  const loadBackups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/backups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBackups(response.data);
    } catch (error) {
      console.error('Error loading backups:', error);
      showMessage('error', 'Failed to load backups');
    }
  };

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/backups/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSettings(response.data);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const createBackup = async (type: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/backups`,
        { type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMessage('success', `Backup creation started: ${response.data.filename}`);
      setTimeout(loadBackups, 2000); // Обновим список через 2 секунды
    } catch (error) {
      console.error('Error creating backup:', error);
      showMessage('error', 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (id: number) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/backups/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showMessage('success', 'Backup deleted successfully');
      loadBackups();
    } catch (error) {
      console.error('Error deleting backup:', error);
      showMessage('error', 'Failed to delete backup');
    }
  };

  const updateSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/backups/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showMessage('success', 'Settings updated successfully');
      loadSettings();
    } catch (error) {
      console.error('Error updating settings:', error);
      showMessage('error', 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldBackups = async () => {
    if (!confirm('This will delete all backups older than the retention period. Continue?')) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/backups/cleanup`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showMessage('success', `Cleanup completed: ${response.data.deleted} backups deleted`);
      loadBackups();
    } catch (error) {
      console.error('Error cleaning up backups:', error);
      showMessage('error', 'Failed to cleanup backups');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded text-sm ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      full: 'bg-blue-100 text-blue-800',
      articles: 'bg-purple-100 text-purple-800',
      categories: 'bg-indigo-100 text-indigo-800',
      database: 'bg-pink-100 text-pink-800',
    };
    return (
      <span className={`px-2 py-1 rounded text-sm ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type}
      </span>
    );
  };

  const toggleBackupType = (type: string) => {
    setSettings(prev => ({
      ...prev,
      backup_types: prev.backup_types.includes(type)
        ? prev.backup_types.filter(t => t !== type)
        : [...prev.backup_types, type]
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Backup Management</h1>

      {message && (
        <div className={`mb-4 p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="mb-6 border-b">
        <div className="flex space-x-4">
          <button
            className={`px-4 py-2 ${activeTab === 'backups' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('backups')}
          >
            Backups
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'settings' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>
      </div>

      {activeTab === 'backups' && (
        <div>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Create New Backup</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => createBackup('full')}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
              >
                Full Backup
              </button>
              <button
                onClick={() => createBackup('articles')}
                disabled={loading}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300"
              >
                Articles Only
              </button>
              <button
                onClick={() => createBackup('categories')}
                disabled={loading}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-gray-300"
              >
                Categories Only
              </button>
              <button
                onClick={() => createBackup('database')}
                disabled={loading}
                className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 disabled:bg-gray-300"
              >
                Database Backup
              </button>
              <button
                onClick={cleanupOldBackups}
                disabled={loading}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300 ml-auto"
              >
                Cleanup Old Backups
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Backup History</h2>
              {backups.length === 0 ? (
                <p className="text-gray-500">No backups found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Filename</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Size</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Created By</th>
                        <th className="px-4 py-2 text-left">Created At</th>
                        <th className="px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {backups.map(backup => (
                        <tr key={backup.id}>
                          <td className="px-4 py-3 text-sm font-mono">{backup.filename}</td>
                          <td className="px-4 py-3">{getTypeBadge(backup.type)}</td>
                          <td className="px-4 py-3 text-sm">{formatFileSize(backup.size_bytes)}</td>
                          <td className="px-4 py-3">{getStatusBadge(backup.status)}</td>
                          <td className="px-4 py-3 text-sm">{backup.created_by_name}</td>
                          <td className="px-4 py-3 text-sm">{formatDate(backup.created_at)}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => deleteBackup(backup.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
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
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Automated Backup Settings</h2>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="enabled" className="font-medium">Enable Automated Backups</label>
            </div>

            <div>
              <label className="block font-medium mb-2">Schedule</label>
              <select
                value={settings.schedule}
                onChange={(e) => setSettings({ ...settings, schedule: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2">Retention Period (days)</label>
              <input
                type="number"
                value={settings.retention_days}
                onChange={(e) => setSettings({ ...settings, retention_days: parseInt(e.target.value) })}
                className="w-full p-2 border rounded"
                min="1"
                max="365"
              />
              <p className="text-sm text-gray-500 mt-1">
                Backups older than this will be automatically deleted
              </p>
            </div>

            <div>
              <label className="block font-medium mb-2">Backup Types</label>
              <div className="space-y-2">
                {['full', 'articles', 'categories', 'database'].map(type => (
                  <div key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`type-${type}`}
                      checked={settings.backup_types.includes(type)}
                      onChange={() => toggleBackupType(type)}
                      className="mr-2"
                    />
                    <label htmlFor={`type-${type}`} className="capitalize">{type}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium mb-2">Notification Email (optional)</label>
              <input
                type="email"
                value={settings.notification_email || ''}
                onChange={(e) => setSettings({ ...settings, notification_email: e.target.value || null })}
                className="w-full p-2 border rounded"
                placeholder="admin@example.com"
              />
              <p className="text-sm text-gray-500 mt-1">
                Receive notifications about backup status
              </p>
            </div>

            {settings.last_run_at && (
              <div className="p-4 bg-gray-50 rounded">
                <p className="text-sm">
                  <span className="font-medium">Last run:</span> {formatDate(settings.last_run_at)}
                </p>
                {settings.next_run_at && (
                  <p className="text-sm mt-1">
                    <span className="font-medium">Next run:</span> {formatDate(settings.next_run_at)}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={updateSettings}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupManagement;
