import { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// Configure marked for better code highlighting support
marked.setOptions({
  breaks: true,
  gfm: true,
});

const MarkdownEditor = ({ value, onChange, placeholder, minHeight = '400px' }: MarkdownEditorProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);

  // Auto-save to localStorage as draft
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value) {
        localStorage.setItem('article_draft', value);
        localStorage.setItem('article_draft_timestamp', new Date().toISOString());
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [value]);

  const renderMarkdown = useCallback(() => {
    if (!value) return '';
    const html = marked(value);
    return DOMPurify.sanitize(html as string);
  }, [value]);

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.getElementById('markdown-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newValue = value.substring(0, start) + before + selectedText + after + value.substring(end);

    onChange(newValue);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    const textarea = document.getElementById('markdown-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const loadDraft = () => {
    const draft = localStorage.getItem('article_draft');
    const timestamp = localStorage.getItem('article_draft_timestamp');

    if (draft && timestamp) {
      const draftDate = new Date(timestamp);
      if (confirm(`Найден черновик от ${draftDate.toLocaleString('ru')}. Загрузить?`)) {
        onChange(draft);
      }
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('article_draft');
    localStorage.removeItem('article_draft_timestamp');
  };

  useEffect(() => {
    // Check for draft on mount
    const draft = localStorage.getItem('article_draft');
    const timestamp = localStorage.getItem('article_draft_timestamp');

    if (draft && timestamp && !value) {
      const draftDate = new Date(timestamp);
      const diffMinutes = (Date.now() - draftDate.getTime()) / (1000 * 60);

      // Only prompt if draft is less than 24 hours old
      if (diffMinutes < 1440) {
        setTimeout(() => loadDraft(), 500);
      }
    }
  }, []);

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.75rem',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    borderRadius: '4px 4px 0 0',
    flexWrap: 'wrap',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '0.4rem 0.75rem',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'all 0.2s',
  };

  const editorContainerStyle: React.CSSProperties = {
    display: isSplitView ? 'grid' : 'block',
    gridTemplateColumns: isSplitView ? '1fr 1fr' : '1fr',
    gap: isSplitView ? '1rem' : '0',
    marginTop: '0',
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '4px' }}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => insertMarkdown('**', '**')}
          title="Жирный"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => insertMarkdown('*', '*')}
          title="Курсив"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => insertMarkdown('`', '`')}
          title="Код"
        >
          {'</>'}
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => insertAtCursor('\n```\n\n```\n')}
          title="Блок кода"
        >
          {'{ }'}
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => insertAtCursor('\n## ')}
          title="Заголовок"
        >
          H2
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => insertAtCursor('\n### ')}
          title="Заголовок 3"
        >
          H3
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => insertMarkdown('[', '](url)')}
          title="Ссылка"
        >
          🔗
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => insertAtCursor('\n- ')}
          title="Список"
        >
          • List
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => insertAtCursor('\n> ')}
          title="Цитата"
        >
          ❝ Quote
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => insertAtCursor('\n---\n')}
          title="Разделитель"
        >
          ─
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            style={{
              ...buttonStyle,
              backgroundColor: isSplitView ? 'var(--primary)' : 'var(--bg)',
              color: isSplitView ? 'white' : 'inherit',
            }}
            onClick={() => {
              setIsSplitView(!isSplitView);
              setShowPreview(!isSplitView);
            }}
            title="Разделенный вид"
          >
            ⚏ Split
          </button>
          <button
            type="button"
            style={{
              ...buttonStyle,
              backgroundColor: showPreview && !isSplitView ? 'var(--primary)' : 'var(--bg)',
              color: showPreview && !isSplitView ? 'white' : 'inherit',
            }}
            onClick={() => {
              if (!isSplitView) setShowPreview(!showPreview);
            }}
            title="Предпросмотр"
          >
            👁 Preview
          </button>
        </div>
      </div>

      {/* Editor/Preview Container */}
      <div style={editorContainerStyle}>
        {/* Editor */}
        {(!showPreview || isSplitView) && (
          <textarea
            id="markdown-textarea"
            className="input"
            style={{
              minHeight,
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              resize: 'vertical',
              border: 'none',
              borderRadius: isSplitView ? '0 0 0 4px' : '0 0 4px 4px',
              padding: '1rem',
            }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        )}

        {/* Preview */}
        {showPreview && (
          <div
            style={{
              minHeight,
              padding: '1rem',
              borderLeft: isSplitView ? '1px solid var(--border)' : 'none',
              overflow: 'auto',
              backgroundColor: 'var(--bg)',
              borderRadius: isSplitView ? '0 0 4px 0' : '0 0 4px 4px',
            }}
          >
            <div
              className="markdown-preview"
              dangerouslySetInnerHTML={{ __html: renderMarkdown() }}
              style={{
                lineHeight: '1.7',
                color: 'var(--text)',
              }}
            />
          </div>
        )}
      </div>

      {/* Draft notification */}
      {value && (
        <div style={{
          padding: '0.5rem 1rem',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>💾 Черновик автоматически сохранен</span>
          <button
            type="button"
            onClick={clearDraft}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.8rem',
              border: 'none',
              background: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Очистить черновик
          </button>
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;
