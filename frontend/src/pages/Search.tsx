import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { articlesService } from '../services/articles';
import { categoriesService } from '../services/categories';
import { tagsService } from '../services/tags';
import { Article } from '../types';

interface Author {
  id: number;
  name: string;
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  // Фильтры
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [authorId, setAuthorId] = useState(searchParams.get('authorId') || '');
  const [categoryIds, setCategoryIds] = useState<string[]>(searchParams.get('categoryIds')?.split(',').filter(Boolean) || []);
  const [tags, setTags] = useState<string[]>(searchParams.get('tags')?.split(',').filter(Boolean) || []);
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'date');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');

  // Данные для фильтров
  const [authors, setAuthors] = useState<Author[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadFilterData();
  }, []);

  useEffect(() => {
    performSearch();
  }, [searchParams]);

  const loadFilterData = async () => {
    try {
      const [authorsRes, categoriesRes, tagsRes] = await Promise.all([
        articlesService.getAuthors(),
        categoriesService.getCategories(),
        tagsService.getTags(),
      ]);
      setAuthors(authorsRes);
      setCategories(categoriesRes);
      setAvailableTags(tagsRes.map(tag => tag.name));
    } catch (err) {
      console.error('Error loading filter data:', err);
    }
  };

  const performSearch = async () => {
    try {
      setLoading(true);
      const params: any = {
        q: searchParams.get('q') || undefined,
        authorId: searchParams.get('authorId') || undefined,
        categoryIds: searchParams.get('categoryIds') || undefined,
        tags: searchParams.get('tags') || undefined,
        dateFrom: searchParams.get('dateFrom') || undefined,
        dateTo: searchParams.get('dateTo') || undefined,
        sortBy: searchParams.get('sortBy') || 'date',
        sortOrder: searchParams.get('sortOrder') || 'desc',
        page: parseInt(searchParams.get('page') || '1'),
        limit: 10,
      };

      const data = await articlesService.searchArticles(params);
      setArticles(data.articles);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const params: any = {};
    if (query) params.q = query;
    if (authorId) params.authorId = authorId;
    if (categoryIds.length > 0) params.categoryIds = categoryIds.join(',');
    if (tags.length > 0) params.tags = tags.join(',');
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;
    params.page = '1';

    setSearchParams(params);
  };

  const handleReset = () => {
    setQuery('');
    setAuthorId('');
    setCategoryIds([]);
    setTags([]);
    setDateFrom('');
    setDateTo('');
    setSortBy('date');
    setSortOrder('desc');
    setSearchParams({});
  };

  const toggleCategory = (catId: string) => {
    setCategoryIds(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const toggleTag = (tag: string) => {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>Поиск</h1>

      {/* Основной поиск */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="input"
          placeholder="Поиск по названию, содержимому..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1, minWidth: '250px' }}
        />
        <button className="btn btn-primary" onClick={handleSearch}>
          Искать
        </button>
        <button className="btn" onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
        </button>
      </div>

      {/* Расширенные фильтры */}
      {showFilters && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Фильтры</h3>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Автор */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Автор
              </label>
              <select
                className="input"
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
              >
                <option value="">Все авторы</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Категории (множественный выбор) */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Категории
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      background: categoryIds.includes(cat.id.toString())
                        ? 'var(--accent-primary)'
                        : 'transparent',
                      color: categoryIds.includes(cat.id.toString())
                        ? 'white'
                        : 'var(--text-primary)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={categoryIds.includes(cat.id.toString())}
                      onChange={() => toggleCategory(cat.id.toString())}
                      style={{ display: 'none' }}
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Теги (множественный выбор) */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Теги
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {availableTags.map((tag) => (
                  <label
                    key={tag}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      background: tags.includes(tag)
                        ? 'var(--accent-primary)'
                        : 'transparent',
                      color: tags.includes(tag) ? 'white' : 'var(--text-primary)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={tags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                      style={{ display: 'none' }}
                    />
                    #{tag}
                  </label>
                ))}
              </div>
            </div>

            {/* Период */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Дата от
                </label>
                <input
                  type="date"
                  className="input"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Дата до
                </label>
                <input
                  type="date"
                  className="input"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            {/* Сортировка */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Сортировать по
                </label>
                <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="date">Дате</option>
                  <option value="popularity">Популярности</option>
                  <option value="title">Названию</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Порядок
                </label>
                <select className="input" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                  <option value="desc">По убыванию</option>
                  <option value="asc">По возрастанию</option>
                </select>
              </div>
            </div>

            {/* Кнопки */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary" onClick={handleSearch}>
                Применить фильтры
              </button>
              <button className="btn" onClick={handleReset}>
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Результаты */}
      {loading ? (
        <p>Загрузка...</p>
      ) : articles.length > 0 ? (
        <>
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
            Найдено: {pagination.total} {pagination.total === 1 ? 'результат' : 'результатов'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {articles.map((article) => (
              <Link
                key={article.id}
                to={`/articles/${article.slug}`}
                className="card"
                style={{
                  padding: '1.5rem',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>{article.title}</h2>
                {article.excerpt && (
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    {article.excerpt}
                  </p>
                )}
                <div
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>Автор: {article.author_name}</span>
                  {article.category_name && <span>Категория: {article.category_name}</span>}
                  <span>Просмотров: {article.views_count}</span>
                  <span>{new Date(article.created_at).toLocaleDateString('ru')}</span>
                </div>
                {article.tags && article.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    {article.tags.map((tag) => (
                      <span key={tag} className="badge">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Пагинация */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`btn ${page === pagination.page ? 'btn-primary' : ''}`}
                  onClick={() => {
                    const params = Object.fromEntries(searchParams.entries());
                    params.page = page.toString();
                    setSearchParams(params);
                  }}
                  style={{ minWidth: '40px' }}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
          Ничего не найдено. Попробуйте изменить параметры поиска.
        </p>
      )}
    </div>
  );
};

export default Search;
