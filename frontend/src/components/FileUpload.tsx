import { useState } from 'react';
import { api } from '../services/api';

interface UploadedFile {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  url: string;
}

interface FileUploadProps {
  onUploadComplete?: (files: UploadedFile[]) => void;
  multiple?: boolean;
  accept?: string;
}

const FileUpload = ({ onUploadComplete, multiple = false, accept }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();

      if (multiple) {
        Array.from(files).forEach((file) => {
          formData.append('files', file);
        });

        const { data } = await api.post<{ files: UploadedFile[] }>('/uploads/multiple', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setUploadedFiles((prev) => [...prev, ...data.files]);
        if (onUploadComplete) onUploadComplete(data.files);
      } else {
        formData.append('file', files[0]);

        const { data } = await api.post<UploadedFile>('/uploads', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setUploadedFiles((prev) => [...prev, data]);
        if (onUploadComplete) onUploadComplete([data]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки файла');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      await api.delete(`/uploads/${filename}`);
      setUploadedFiles((prev) => prev.filter((f) => f.filename !== filename));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка удаления файла');
    }
  };

  const copyToClipboard = (file: UploadedFile) => {
    const fullUrl = `${window.location.origin}${file.url}`;
    let markdownText = '';

    if (file.mimetype.startsWith('image/')) {
      // Для изображений - markdown изображения
      markdownText = `![${file.originalName}](${fullUrl})`;
    } else {
      // Для документов и других файлов - markdown ссылки
      markdownText = `[${file.originalName}](${fullUrl})`;
    }

    navigator.clipboard.writeText(markdownText);
    alert('Markdown ссылка скопирована в буфер обмена');
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.includes('pdf')) return '📄';
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
    if (mimetype.includes('sheet') || mimetype.includes('excel')) return '📊';
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return '📊';
    if (mimetype.includes('zip') || mimetype.includes('rar')) return '🗜️';
    if (mimetype.includes('text')) return '📃';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <label
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: 'var(--accent-primary)',
            color: 'white',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? 'Загрузка...' : multiple ? 'Выбрать файлы' : 'Выбрать файл'}
          <input
            type="file"
            multiple={multiple}
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
        {accept && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Разрешенные типы: изображения, PDF, Office документы, текстовые файлы, архивы (макс. 50MB)
          </p>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            background: '#FEE2E2',
            color: '#DC2626',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div>
          <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>Загруженные файлы:</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {uploadedFiles.map((file) => (
              <div
                key={file.filename}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                }}
              >
                {file.mimetype.startsWith('image/') ? (
                  <img
                    src={file.url}
                    alt={file.originalName}
                    style={{
                      width: '60px',
                      height: '60px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '4px',
                    }}
                  >
                    {getFileIcon(file.mimetype)}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{file.originalName}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {formatFileSize(file.size)} • {file.mimetype}
                  </div>
                </div>
                <button
                  className="btn"
                  onClick={() => copyToClipboard(file)}
                  style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                >
                  Копировать ссылку
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDelete(file.filename)}
                  style={{ fontSize: '0.875rem', padding: '0.5rem 0.75rem' }}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
