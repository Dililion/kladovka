import { TreeNode } from '../types';
import { Link } from 'react-router-dom';
import { useState, useRef } from 'react';
import { articlesService } from '../services/articles';
import { api } from '../services/api';

interface SidebarProps {
  tree: TreeNode[];
  onTreeChange: () => void;
}

const TreeNodeItem = ({
  node,
  onTreeChange,
  currentUserId,
  isAdmin,
}: {
  node: TreeNode;
  onTreeChange: () => void;
  currentUserId: number | null;
  isAdmin: boolean;
}) => {
  const [expanded, setExpanded] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showActions, setShowActions] = useState(false);
  const canManage = isAdmin || node.author_id === currentUserId;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('nodeId', String(node.id));
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (node.is_folder) {
      e.preventDefault();
      setDragOver(true);
    }
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const draggedId = parseInt(e.dataTransfer.getData('nodeId'));
    if (draggedId === node.id) return;
    try {
      await articlesService.moveArticle(draggedId, node.id);
      onTreeChange();
    } catch {}
  };

  const handleRename = async () => {
    if (!renameValue.trim()) return;
    try {
      await api.patch(`/admin/folders/${node.id}`, { title: renameValue.trim() });
      onTreeChange();
    } catch (err: any) {
      // fallback: try non-admin rename if not admin
      try {
        await api.patch(`/articles/${node.id}/rename`, { title: renameValue.trim() });
        onTreeChange();
      } catch {}
    }
    setRenaming(false);
    setShowActions(false);
  };

  const handleDelete = async () => {
    if (!confirm('Удалить папку? Содержимое переместится на уровень выше.')) return;
    try {
      await api.delete(`/admin/folders/${node.id}`);
      onTreeChange();
    } catch {}
    setShowActions(false);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ borderRadius: '4px', background: dragOver ? 'var(--bg-tertiary)' : 'transparent' }}
    >
      <div
        draggable={canManage && !renaming}
        onDragStart={handleDragStart}
        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        onMouseEnter={() => canManage && node.is_folder && setShowActions(true)}
        onMouseLeave={() => !renaming && setShowActions(false)}
      >
        {node.children.length > 0 || node.is_folder ? (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0 }}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span style={{ width: '14px', flexShrink: 0 }} />
        )}

        {node.is_folder ? (
          renaming ? (
            <div style={{ display: 'flex', gap: '0.3rem', flex: 1, alignItems: 'center' }}>
              <input
                className="input"
                style={{ flex: 1, padding: '0.25rem 0.4rem', fontSize: '0.875rem' }}
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setRenaming(false); setShowActions(false); } }}
                autoFocus
                onClick={e => e.stopPropagation()}
              />
              <button onClick={handleRename} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#34D399', fontSize: '0.85rem', padding: '0 2px' }}>✓</button>
              <button onClick={() => { setRenaming(false); setShowActions(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0 2px' }}>✕</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              <span
                onClick={() => setExpanded(!expanded)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.4rem 0.5rem', borderRadius: '4px', fontSize: '0.9rem',
                  cursor: 'pointer', flex: 1, userSelect: 'none',
                  color: 'var(--text-secondary)', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {expanded ? '📂' : '📁'} {node.title}
                {node.is_private && ' 🔒'}
              </span>
              {showActions && (
                <div style={{ display: 'flex', gap: '0.15rem', flexShrink: 0 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setRenameValue(node.title); setRenaming(true); }}
                    title="Переименовать"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '2px 3px', borderRadius: '3px' }}
                  >✏️</button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(); }}
                    title="Удалить папку"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '0.8rem', padding: '2px 3px', borderRadius: '3px' }}
                  >🗑</button>
                </div>
              )}
            </div>
          )
        ) : (
          <Link
            to={`/article/${node.slug}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.4rem 0.5rem', borderRadius: '4px', fontSize: '0.9rem',
              color: node.is_private ? 'var(--accent-warm)' : 'inherit', flex: 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            📄 {node.is_private && '🔒 '}{node.title}
          </Link>
        )}
      </div>

      {expanded && node.children.length > 0 && (
        <div style={{ marginLeft: '1.25rem', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem' }}>
          {node.children.map(child => (
            <TreeNodeItem
              key={child.id}
              node={child}
              onTreeChange={onTreeChange}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ tree, onTreeChange }: SidebarProps) => {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const userData = localStorage.getItem('user');
  const currentUser = userData ? JSON.parse(userData) : null;
  const currentUserId: number | null = currentUser?.id ?? null;
  const isAdmin = currentUser?.role === 'admin';
  const isLoggedIn = !!currentUser;

  const handleDropRoot = async (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = parseInt(e.dataTransfer.getData('nodeId'));
    if (!draggedId) return;
    try {
      await articlesService.moveArticle(draggedId, null);
      onTreeChange();
    } catch {}
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    setCreating(true);
    try {
      await articlesService.createFolder(folderName.trim());
      setFolderName('');
      setShowNewFolder(false);
      onTreeChange();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка создания папки');
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside style={{
      width: '280px',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      padding: '1rem',
      overflowY: 'auto',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
          Страницы
        </h3>
        {isLoggedIn && (
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <Link
              to="/create"
              title="Новая страница"
              style={{ fontSize: '1rem', color: 'var(--text-muted)', textDecoration: 'none', padding: '0.15rem 0.3rem' }}
            >
              +📄
            </Link>
            <button
              onClick={() => { setShowNewFolder(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              title="Новая папка"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-muted)', padding: '0.15rem 0.3rem' }}
            >
              +📁
            </button>
            {isAdmin && (
              <Link
                to="/admin"
                title="Админка"
                style={{ fontSize: '1rem', color: 'var(--text-muted)', textDecoration: 'none', padding: '0.15rem 0.3rem' }}
              >
                ⚙️
              </Link>
            )}
          </div>
        )}
      </div>

      {showNewFolder && (
        <form onSubmit={handleCreateFolder} style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.35rem' }}>
          <input
            ref={inputRef}
            className="input"
            style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.875rem' }}
            placeholder="Название папки"
            value={folderName}
            onChange={e => setFolderName(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setShowNewFolder(false)}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} disabled={creating}>
            {creating ? '...' : 'ОК'}
          </button>
        </form>
      )}

      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDropRoot}
        style={{ minHeight: '100px' }}
      >
        {tree.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Нет страниц</p>
        ) : (
          tree.map(node => (
            <TreeNodeItem
              key={node.id}
              node={node}
              onTreeChange={onTreeChange}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ))
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
